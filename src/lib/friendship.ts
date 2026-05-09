import { prisma } from "@/lib/db";

export type FriendshipState =
  | "self"
  | "friends"
  | "request_sent"     // I sent a request, awaiting their decision
  | "request_received" // They sent me a request, I can accept/reject
  | "rejected"
  | "none";

/** Canonical ordering: smaller id is userA, larger is userB. */
export function pair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function getFriendshipState(
  meId: string,
  theirId: string
): Promise<FriendshipState> {
  if (meId === theirId) return "self";
  const { userAId, userBId } = pair(meId, theirId);
  const row = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true, requestedBy: true },
  });
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  if (row.status === "rejected") return "rejected";
  // pending — depends on who sent it.
  if (row.requestedBy === meId) return "request_sent";
  return "request_received";
}

/** Returns the user IDs of every accepted friend of `meId`. */
export async function getFriendIds(meId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ userAId: meId }, { userBId: meId }],
    },
    select: { userAId: true, userBId: true },
  });
  return rows.map((r) => (r.userAId === meId ? r.userBId : r.userAId));
}
