import { selfize, type NotificationKind } from "./selfize"

/**
 * 發通知（互動的氧氣）。自己對自己的動作不發；失敗靜默，
 * 絕不讓通知炸掉主要動作。
 */
export async function notify(args: {
  user_id: string
  actor_id: string
  kind: NotificationKind
  ref_id?: string
  ref_title?: string
  link?: string
}): Promise<void> {
  if (!args.user_id || args.user_id === args.actor_id) return
  try {
    await selfize.create("notifications", {
      user_id: args.user_id,
      actor_id: args.actor_id,
      kind: args.kind,
      ref_id: args.ref_id || null,
      ref_title: args.ref_title || null,
      link: args.link || null,
      read: false,
    })
  } catch {
    // 靜默
  }
}
