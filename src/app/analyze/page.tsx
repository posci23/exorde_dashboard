import { AnalyzeView } from "@/components/analyze/AnalyzeView";

export const metadata = {
  title: "Analysis — Seescape",
  description: "Chart the sentiment in an export you already downloaded, without uploading it.",
};

export default function AnalyzePage() {
  return <AnalyzeView />;
}
