"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import {
  sendEmail,
  sendBatch,
  groupInviteEmail,
  publicGroupAnnouncementEmail,
} from "@/lib/email";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "medexamhub.org";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function generateInviteCode(): string {
  return randomBytes(8).toString("base64url");
}

async function assertGroupMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!m) throw new Error("Not a member of this group");
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

export type CreatePostState = { ok?: boolean; error?: string; postId?: string } | null;

const CreatePostSchema = z.object({
  kind: z.enum(["POST", "QUESTION", "ARTICLE"]),
  groupId: z.string().optional().nullable(),
  title: z.string().max(200).optional(),
  body: z.string().min(2).max(20_000),
  imageUrl: z.string().url().optional(),
  imagePathname: z.string().max(500).optional(),
  linkUrl: z.string().url().optional(),
  linkLabel: z.string().max(120).optional(),
});

export async function createPostAction(
  _prev: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const user = await requireUser();

  const parsed = CreatePostSchema.safeParse({
    kind: formData.get("kind"),
    groupId: String(formData.get("groupId") ?? "").trim() || null,
    title: String(formData.get("title") ?? "").trim() || undefined,
    body: String(formData.get("body") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || undefined,
    imagePathname: String(formData.get("imagePathname") ?? "").trim() || undefined,
    linkUrl: String(formData.get("linkUrl") ?? "").trim() || undefined,
    linkLabel: String(formData.get("linkLabel") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // QUESTION and ARTICLE require a title.
  if ((parsed.data.kind === "QUESTION" || parsed.data.kind === "ARTICLE") && !parsed.data.title) {
    return { error: "A title is required for questions and articles." };
  }

  // If posting to a group, must be a member.
  if (parsed.data.groupId) {
    const m = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: parsed.data.groupId, userId: user.id } },
    });
    if (!m) return { error: "You're not a member of this group." };
  }

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      groupId: parsed.data.groupId || null,
      kind: parsed.data.kind,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      imageUrl: parsed.data.imageUrl ?? null,
      imagePathname: parsed.data.imagePathname ?? null,
      linkUrl: parsed.data.linkUrl ?? null,
      linkLabel: parsed.data.linkLabel ?? null,
    },
  });

  // Posts in any group fan out as in-app notifications to the other
  // members of that group (no email — only the dashboard bell). Public
  // group creation and private group invites still trigger email; this
  // is the lighter-weight ongoing engagement signal.
  // Public-feed posts (groupId === null) stay covered by the daily
  // digest; no per-post fan-out — would be too noisy.
  if (parsed.data.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true, name: true },
    });
    if (group) {
      const otherMembers = await prisma.groupMember.findMany({
        where: {
          groupId: group.id,
          userId: { not: user.id },
        },
        select: { userId: true },
        take: 1000,
      });

      const authorLabel = user.name?.split(" ")[0] ?? user.email.split("@")[0];
      const kindLabel =
        parsed.data.kind === "QUESTION"
          ? "asked a question"
          : parsed.data.kind === "ARTICLE"
            ? "posted an article"
            : "posted an update";
      const emoji =
        parsed.data.kind === "QUESTION" ? "❓" : parsed.data.kind === "ARTICLE" ? "📰" : "💬";
      const heading = parsed.data.title
        ? parsed.data.title
        : parsed.data.body.slice(0, 100) + (parsed.data.body.length > 100 ? "…" : "");

      await Promise.allSettled(
        otherMembers.map((m) =>
          createNotification({
            userId: m.userId,
            category: "system",
            emoji,
            title: `${authorLabel} ${kindLabel} in ${group.name}`,
            body: heading,
            href: `/community/post/${post.id}`,
          })
        )
      );
    }
  }

  revalidatePath("/community");
  if (parsed.data.groupId) revalidatePath(`/community/groups/${parsed.data.groupId}`);
  return { ok: true, postId: post.id };
}

export async function deletePostAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, groupId: true, group: { select: { ownerId: true } } },
  });
  if (!post) return;
  // Only the author or the group owner can delete.
  if (post.authorId !== user.id && post.group?.ownerId !== user.id) return;

  await prisma.post.delete({ where: { id } });
  revalidatePath("/community");
  if (post.groupId) revalidatePath(`/community/groups/${post.groupId}`);
}

const CommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export type CommentState = { ok?: boolean; error?: string } | null;

export async function addCommentAction(
  _prev: CommentState,
  formData: FormData
): Promise<CommentState> {
  const user = await requireUser();
  const parsed = CommentSchema.safeParse({
    postId: formData.get("postId"),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) return { error: "Comment can't be empty." };

  const post = await prisma.post.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true, authorId: true, groupId: true, kind: true, title: true },
  });
  if (!post) return { error: "Post not found." };

  // If post is in a group, the commenter must be a member.
  if (post.groupId) {
    const m = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: post.groupId, userId: user.id } },
    });
    if (!m) return { error: "You're not a member of this group." };
  }

  await prisma.postComment.create({
    data: {
      postId: post.id,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  // Notify post author (skip self-replies).
  if (post.authorId !== user.id) {
    try {
      await createNotification({
        userId: post.authorId,
        category: "system",
        emoji: post.kind === "QUESTION" ? "💬" : "💭",
        title:
          post.kind === "QUESTION"
            ? "New answer on your question"
            : "New comment on your post",
        body:
          (post.title ? `"${post.title}" — ` : "") +
          (parsed.data.body.length > 140 ? parsed.data.body.slice(0, 137) + "…" : parsed.data.body),
        href: `/community/post/${post.id}`,
      });
    } catch {}
  }

  revalidatePath(`/community/post/${post.id}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────────────────────────

export type CreateGroupState = { ok?: boolean; error?: string } | null;

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  isPublic: z.boolean(),
});

export async function createGroupAction(
  _prev: CreateGroupState,
  formData: FormData
): Promise<CreateGroupState> {
  const user = await requireUser();
  const parsed = CreateGroupSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    isPublic:
      formData.get("isPublic") === "on" || formData.get("isPublic") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const group = await prisma.group.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isPublic: parsed.data.isPublic,
      inviteCode: generateInviteCode(),
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });

  // Public groups get announced to all opted-in users so they can join.
  // Private groups stay invite-only and never trigger this fan-out.
  // We don't gate on emailVerifiedAt — the marketing opt-in is the
  // authoritative consent and many users never clicked the verify link.
  if (parsed.data.isPublic) {
    const recipients = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        emailMarketing: true,
      },
      select: { id: true, email: true, name: true },
      take: 1000,
    });
    console.log(`[community] public group "${group.name}" → fanning out to ${recipients.length} users`);

    const origin = await siteOrigin();
    const tpl = publicGroupAnnouncementEmail({
      creatorName: user.name?.split(" ")[0] ?? user.email.split("@")[0],
      groupName: group.name,
      description: group.description,
      groupUrl: `${origin}/community/groups/${group.id}`,
    });

    // Rate-limit-aware batched fan-out so we don't blow past Resend's
    // per-second cap (which would silently drop most sends).
    const result = await sendBatch(recipients, () => ({
      subject: tpl.subject,
      category: "public_group_announcement",
      html: tpl.html,
    }));
    console.log(
      `[community] public group "${group.name}" fan-out: attempted=${result.attempted} sent=${result.sent} failed=${result.failed}`
    );
  }

  revalidatePath("/community/groups");
  redirect(`/community/groups/${group.id}`);
}

export async function joinPublicGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id }, select: { isPublic: true } });
  if (!group?.isPublic) return;
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    update: {},
    create: { groupId: id, userId: user.id, role: "member" },
  });
  revalidatePath(`/community/groups/${id}`);
  revalidatePath("/community/groups");
}

export async function leaveGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id }, select: { ownerId: true } });
  if (!group) return;
  // Owners can't leave their own group — they'd have to delete it.
  if (group.ownerId === user.id) return;
  await prisma.groupMember.deleteMany({
    where: { groupId: id, userId: user.id },
  });
  revalidatePath(`/community/groups/${id}`);
  revalidatePath("/community/groups");
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id }, select: { ownerId: true } });
  if (!group || group.ownerId !== user.id) return;
  await prisma.group.delete({ where: { id } });
  revalidatePath("/community/groups");
  redirect("/community/groups");
}

/**
 * Owner-only: flip a group between public (🌐 discoverable + joinable) and
 * private (🔒 invite-only + hidden from non-members).
 */
export async function setGroupVisibilityAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const isPublic = formData.get("isPublic") === "true";
  if (!id) return;
  const group = await prisma.group.findUnique({ where: { id }, select: { ownerId: true } });
  if (!group || group.ownerId !== user.id) return;
  await prisma.group.update({
    where: { id },
    data: { isPublic },
  });
  revalidatePath(`/community/groups/${id}`);
  revalidatePath("/community/groups");
  revalidatePath("/community");
}

// ─────────────────────────────────────────────────────────────────────────────
// Invitations
// ─────────────────────────────────────────────────────────────────────────────

export type InviteState = { ok?: boolean; error?: string; sent?: number } | null;

const InviteSchema = z.object({
  groupId: z.string().min(1),
  emails: z.string().min(3).max(2000),
});

export async function inviteToGroupAction(
  _prev: InviteState,
  formData: FormData
): Promise<InviteState> {
  const user = await requireUser();
  const parsed = InviteSchema.safeParse({
    groupId: formData.get("groupId"),
    emails: String(formData.get("emails") ?? ""),
  });
  if (!parsed.success) return { error: "Invalid input" };

  // Owner or admin can invite.
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: parsed.data.groupId, userId: user.id } },
    include: { group: { select: { name: true, ownerId: true } } },
  });
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return { error: "Only group owners and admins can send invites." };
  }

  const emails = Array.from(
    new Set(
      parsed.data.emails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    )
  ).slice(0, 50);

  if (emails.length === 0) {
    return { error: "Please enter at least one valid email address." };
  }

  const origin = await siteOrigin();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Create all invite rows up front so the email links resolve even if
  // a later send fails halfway through.
  const inviteRows = await Promise.all(
    emails.map((email) =>
      prisma.groupInvite.create({
        data: {
          groupId: parsed.data.groupId,
          invitedById: user.id,
          email,
          expiresAt,
        },
      })
    )
  );

  // Batch the actual sends so we don't blow past Resend's rate limit.
  const tmplFor = (invite: { id: string }) =>
    groupInviteEmail({
      inviterName: user.name?.split(" ")[0] ?? user.email.split("@")[0],
      groupName: member.group.name,
      acceptUrl: `${origin}/community/groups/join/${invite.id}`,
    });

  const result = await sendBatch(
    inviteRows.map((inv) => ({ id: user.id, email: inv.email })),
    (_r) => {
      // Match the recipient row to its invite row by email.
      const invite = inviteRows.find((inv) => inv.email === _r.email)!;
      const t = tmplFor(invite);
      return {
        subject: t.subject,
        category: "group_invite",
        html: t.html,
      };
    }
  );
  console.log(
    `[community] invites for "${member.group.name}": attempted=${result.attempted} sent=${result.sent} failed=${result.failed}`
  );

  return { ok: true, sent: result.sent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Accepting an invite (used from the join page server action)
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");
  if (!inviteId) return;

  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
    include: { group: { select: { id: true } } },
  });
  if (!invite) return;
  if (invite.acceptedAt) return;
  if (invite.expiresAt < new Date()) return;

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
      update: {},
      create: { groupId: invite.groupId, userId: user.id, role: "member" },
    }),
    prisma.groupInvite.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date(), acceptedBy: user.id },
    }),
  ]);

  await assertGroupMember(invite.groupId, user.id).catch(() => {});

  revalidatePath(`/community/groups/${invite.groupId}`);
  redirect(`/community/groups/${invite.groupId}`);
}
