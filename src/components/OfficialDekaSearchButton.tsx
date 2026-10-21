import { ExternalLink } from "lucide-react";

type OfficialDekaSearchButtonProps = {
  decisionNumber: string;
  className?: string;
};

/**
 * Opens the Supreme Court's own search page in a new tab and submits
 * the decision number through its search form. This is a manual review link;
 * it does not scrape, verify, or modify any decision data.
 */
export default function OfficialDekaSearchButton({
  decisionNumber,
  className = "",
}: OfficialDekaSearchButtonProps) {
  return (
    <form
      action="https://deka.supremecourt.or.th/search"
      method="post"
      target="_blank"
      rel="noreferrer"
      className={className}
    >
      <input type="hidden" name="word" value={decisionNumber} />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={`เปิดคำพิพากษาศาลฎีกาที่ ${decisionNumber} ในเว็บไซต์ศาลฎีกา`}
        title="เปิดค้นหาคำพิพากษานี้ในเว็บไซต์ศาลฎีกา (แท็บใหม่)"
      >
        <ExternalLink className="h-4 w-4" />
        ตรวจสอบต้นฉบับศาลฎีกา
      </button>
    </form>
  );
}
