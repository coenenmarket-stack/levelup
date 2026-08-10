/**
 * Lightweight block foundation.
 * blockId is deterministic: blockerUid__blockedUid
 */

export function blockDocId(blockerUid: string, blockedUid: string): string {
  return `${blockerUid}__${blockedUid}`;
}

export function isBlockedEitherWay(
  blockerA: string,
  blockerB: string,
  blockSet: Set<string>,
): boolean {
  return (
    blockSet.has(blockDocId(blockerA, blockerB)) || blockSet.has(blockDocId(blockerB, blockerA))
  );
}

export function canSendFriendRequest(opts: {
  fromUid: string;
  toUid: string;
  blockedEitherWay: boolean;
  existingStatus: "none" | "pending" | "accepted";
}): { ok: true } | { ok: false; reason: string } {
  if (opts.fromUid === opts.toUid) return { ok: false, reason: "self" };
  if (opts.blockedEitherWay) return { ok: false, reason: "blocked" };
  if (opts.existingStatus === "accepted") return { ok: false, reason: "already_friends" };
  if (opts.existingStatus === "pending") return { ok: false, reason: "already_pending" };
  return { ok: true };
}
