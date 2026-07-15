"use client";

import { Button } from "@/components/ui/button";

export const RANKINGS_CSV_HEADER = [
  "rank",
  "project",
  "team",
  "track",
  "avg",
  "judges",
  "timeline",
  "eligible",
] as const;

/**
 * Builds a rankings CSV in the browser from real ranked data and triggers a
 * download, no server round-trip. Rows are computed server-side and passed in.
 */
export function ExportButton({
  rows,
  filename = "openrubric-rankings.csv",
}: {
  rows: (string | number)[][];
  filename?: string;
}) {
  function onExport() {
    const csv = [RANKINGS_CSV_HEADER as readonly (string | number)[], ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" size="sm" onClick={onExport} disabled={rows.length === 0}>
      Export CSV ↓
    </Button>
  );
}
