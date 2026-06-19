"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CSV_COLUMNS } from "@/lib/validators";

interface ImportRow {
  project_name: string;
  team_name: string;
  track: string;
}

/** Minimal CSV parse with basic quoted-field support. */
function parseCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const split = (line: string) =>
    line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.slice(0, -1).map((c) =>
      c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim(),
    ) ?? [];
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return {
      project_name: cells[idx("project_name")] ?? cells[0] ?? "Untitled",
      team_name: cells[idx("team_name")] ?? "",
      track: cells[idx("track")] ?? "",
    };
  });
}

export function DevpostImportForm() {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Real import: scrape public Devpost metadata via the API, fall back to CSV/manual. */
  async function importDevpost() {
    setImporting(true);
    setNote("Scanning the Devpost gallery…");
    try {
      const res = await fetch("/api/import/devpost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      setImporting(false);
      if (!data.ok || !Array.isArray(data.projects) || data.projects.length === 0) {
        setNote(data.fallback || "Couldn’t import automatically. Upload CSV or paste project links manually.");
        return;
      }
      setRows(
        data.projects.map((p: { project_name: string; team_name?: string; track?: string }) => ({
          project_name: p.project_name,
          team_name: p.team_name ?? "",
          track: p.track ?? "",
        })),
      );
      setNote(data.note || `${data.projects.length} projects imported from Devpost.`);
    } catch {
      setImporting(false);
      setNote("Couldn’t import automatically. Upload CSV or paste project links manually.");
    }
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result));
      if (parsed.length === 0) {
        setNote("Couldn’t import automatically. Upload CSV or paste project links manually.");
        return;
      }
      setRows(parsed);
      setNote(`${parsed.length} rows parsed from ${file.name}.`);
    };
    reader.readAsText(file);
  }

  function addManual() {
    setRows((r) => [...r, { project_name: "New project", team_name: "", track: "" }]);
    setNote(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-[1.5] text-dim">
        <strong className="font-semibold text-ink">Optional (add closer to the deadline).</strong> No
        Devpost URL yet? Skip it — you can paste it here any time. Once it&apos;s set, OpenRubric keeps
        pulling in new submissions automatically.
      </p>
      <div className="flex items-center gap-3 rounded-[11px] border border-accent bg-accent-soft px-4 py-3.5">
        <span className="font-mono text-[11px] text-accent">01</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourhackathon.devpost.com"
          className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-faint"
          aria-label="Devpost hackathon URL"
        />
        <Button size="sm" onClick={importDevpost} disabled={importing || !url.trim()}>
          {importing ? "Importing…" : "Import"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-[11px] border border-line bg-raised px-4 py-3.5 text-left transition-colors hover:border-ink"
        >
          <div className="mb-0.5 text-[13.5px] font-semibold">Upload CSV</div>
          <div className="font-mono text-[11px] text-dim">{CSV_COLUMNS.slice(0, 4).join(", ")}…</div>
        </button>
        <button
          type="button"
          onClick={addManual}
          className="rounded-[11px] border border-dashed border-[#D6D1C6] px-4 py-3.5 text-left transition-colors hover:border-ink"
        >
          <div className="text-[13.5px] font-semibold">+ Add a project manually</div>
          <div className="font-mono text-[11px] text-dim">one row at a time</div>
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />
      </div>

      {/* preview */}
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-[11px] border border-line">
          <div className="flex items-center justify-between border-b border-line-soft bg-raised px-4 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">Import preview</span>
            <span className="font-mono text-[11px] text-dim">{rows.length} projects</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {rows.map((r, i) => (
              <div
                key={`${r.project_name}-${i}`}
                className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 border-b border-line-softer px-4 py-2.5 text-[13px] last:border-b-0"
              >
                <span className="truncate font-medium">{r.project_name}</span>
                <span className="truncate text-dim">{r.team_name || "—"}</span>
                <span className="truncate font-mono text-[11.5px] text-dim">{r.track || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-1 flex items-start gap-2.5 border-t border-line-soft pt-3.5">
        <span className="font-mono text-[12px] text-signal-review">!</span>
        <p className="text-[12.5px] leading-[1.5] text-dim">
          Devpost doesn&apos;t expose a stable public judging API. OpenRubric imports only public project
          metadata and never bypasses authentication. If an import fails:{" "}
          <span className="text-ink">
            “Couldn&apos;t import automatically. Upload CSV or paste project links manually.”
          </span>
        </p>
      </div>

      {note && <div className="font-mono text-[11.5px] text-signal-clean">{note}</div>}
    </div>
  );
}
