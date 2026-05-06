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
  groupInviteEmail,
  publicGroupAnnouncementEmail,
  publicGroupPostEmail,
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

  // If posted to a public group, fan out to all opted-in verified users
  // (excluding the author) so they can jump in and engage. Private group
  // posts stay silent. Public-feed posts (groupId === null) keep using
  // the daily digest from the cron, not real-time emails — that's the
  // less-noisy default for the open feed.
  //
  // 30-min per-group throttle: if this group already triggered a fan-out
  // in the last 30 minutes, skip this one so a chatty user can't spam
  // every member's inbox. The throttle is read by checking for any
  // earlier post in this group with groupAnnouncedAt > now-30min.
  if (parsed.data.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true, name: true, isPublic: true },
    });
    if (group?.isPublic) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentlyAnnounced = await prisma.post.findFirst({
        where: {
          groupId: group.id,
          groupAnnouncedAt: { gte: thirtyMinAgo },
          NOT: { id: post.id },
        },
        select: { id: true },
      });

      if (!recentlyAnnounced) {
        const recipients = await prisma.user.findMany({
          where: {
            id: { not: user.id },
            emailMarketing: true,
          },
          select: { id: true, email: true, name: true },
          take: 1000,
        });
        console.log(`[community] post in public group "${group.name}" → fanning out to ${recipients.length} users`);

        const origin = await siteOrigin();
        const tpl = publicGroupPostEmail({
          authorName: user.name?.split(" ")[0] ?? user.email.split("@")[0],
          groupName: group.name,
          kind: parsed.data.kind,
          title: parsed.data.title ?? null,
          body: parsed.data.body,
          postUrl: `${origin}/community/post/${post.id}`,
          groupUrl: `${origin}/community/groups/${group.id}`,
        });

        // Best-effort parallel sends — never block the post creation.
        await Promise.allSettled(
          recipients.map((r) =>
            sendEmail({
              toUserId: r.id,
              toEmail: r.email,
              subject: tpl.subject,
              category: "public_group_post",
              html: tpl.html,
            })
          )
        );

        await prisma.post.update({
          where: { id: post.id },
          data: { groupAnnouncedAt: new Date() },
        });
      }
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

    // Parallel fan-out. Resend + EmailLog handle per-recipient errors and
    // we don't want a single failure to block the redirect.
    await Promise.allSettled(
      recipients.map((r) =>
        sendEmail({
          toUserId: r.id,
          toEmail: r.email,
          subject: tpl.subject,
          category: "public_group_announcement",
          html: tpl.html,
        })
      )
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

  let sent = 0;
  for (const email of emails) {
    const invite = await prisma.groupInvite.create({
      data: {
        groupId: parsed.data.groupId,
        invitedById: user.id,
        email,
        expiresAt,
      },
    });
    const url = `${origin}/community/groups/join/${invite.id}`;
    const tmpl = groupInviteEmail({
      inviterName: user.name?.split(" ")[0] ?? user.email.split("@")[0],
      groupName: member.group.name,
      acceptUrl: url,
    });
    // Best-effort. Failed sends are logged in EmailLog.
    void sendEmail({
      toUserId: user.id, // we don't have the recipient's user id (may not exist yet)
      toEmail: email,
      subject: tmpl.subject,
      category: "group_invite",
      html: tmpl.html,
    }).catch(() => {});
    sent += 1;
  }

  return { ok: true, sent };
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
