import type { Metadata } from "next";
import { QueuePage } from "@/components/case/QueuePage";

export const metadata: Metadata = { title: "Become an attorney", description: "Defend a stranger's ridiculous crime in front of a jury of the internet." };

export default async function DefendPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <QueuePage role="DEFENSE" searchParams={await searchParams} />;
}
