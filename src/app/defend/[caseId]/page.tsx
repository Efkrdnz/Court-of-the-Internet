import type { Metadata } from "next";
import { EditorPage } from "@/components/case/EditorPage";

export const metadata: Metadata = { title: "Write the defense", robots: { index: false } };

export default async function DefendEditor({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <EditorPage role="DEFENSE" caseId={caseId} />;
}
