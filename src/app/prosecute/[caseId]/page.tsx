import type { Metadata } from "next";
import { EditorPage } from "@/components/case/EditorPage";

export const metadata: Metadata = { title: "Write the prosecution", robots: { index: false } };

export default async function ProsecuteEditor({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <EditorPage role="PROSECUTION" caseId={caseId} />;
}
