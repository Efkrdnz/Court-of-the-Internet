import type { Metadata } from "next";
import { QueuePage } from "@/components/case/QueuePage";

export const metadata: Metadata = { title: "Become a prosecutor", description: "Read the defense, then argue for a conviction before the jury of the internet." };

export default async function ProsecutePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <QueuePage role="PROSECUTION" searchParams={await searchParams} />;
}
