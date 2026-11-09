"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { clock } from "@/server/clock";

/** Notification ids are cuids; anything else (e.g. a NUL byte in a crafted call) never reaches the database. */
const isId = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]{10,40}$/i.test(v);

export async function markToastedAction(ids: string[]): Promise<void> {
  const user = await getCurrentUser();
  const valid = Array.isArray(ids) ? ids.slice(0, 20).filter(isId) : [];
  if (!user || valid.length === 0) return;
  await db.notification.updateMany({
    where: { userId: user.id, id: { in: valid } },
    data: { toastedAt: clock.now() },
  });
}

export async function markAllReadAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: clock.now() } });
  refresh();
}

export async function markReadAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !isId(id)) return;
  await db.notification.updateMany({ where: { userId: user.id, id }, data: { readAt: clock.now() } });
}
