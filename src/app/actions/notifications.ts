"use server";

import { refresh } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";
import { clock } from "@/server/clock";

export async function markToastedAction(ids: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !Array.isArray(ids) || ids.length === 0) return;
  await db.notification.updateMany({
    where: { userId: user.id, id: { in: ids.slice(0, 20).map(String) } },
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
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, id: String(id) }, data: { readAt: clock.now() } });
}
