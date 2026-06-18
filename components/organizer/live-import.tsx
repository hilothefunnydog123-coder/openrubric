"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stage = "pending" | "importing" | "scanning" | "done" | "error";
type Row = { id?: string; name: string; stage: Stage };

const STAGE_LABEL: Record<Stage, string> = {
  pending: "Queued",
  importing: "Saving…",
  scanning: "Scanning GitHub + AI…",
  done: "Ready",
  error: "Skipped",
};

/** Minimal CSV parse (project_name,team_name,track,repo_url,devpost_url,live_url,description). */
function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) =>
    l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.slice(0, -1).map((c) =>
      c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim(),
    ) ?? [];
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const at = (cells: string[], k: string) => cells[header.indexOf(k)] ?? "";
  return lines.slice(1).map((l) => {
    const c = split(l);
    return {
      project_name: at(c, "project_name") || c[0] || "Untitled",
      team_name: at(c, "team_name"),
      track: at(c, "track"),
      repo_url: at(c, "repo_url") || null,
      devpost_url: at(c, "devpost_url") || null,
      live_url: at(c, "live_url") || null,
      description: at(c, "description"),
    };
  });
}

export function LiveImport({ hackathonId }: { hackathonId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Persist projects, then scan+summarize each one sequentially so they stream in. */
  async function ingest(projects: Record<string, unknown>[]) {
    if (!projects.length) {
      setNote("Nothing to import. Try a different source or add projects manually.");
      return;
    }
    setBusy(true);
    setNote(null);
    setRows(projects.map((p) => ({ name: String(p.project_name ?? "Untitled"), stage: "importing" })));

    // 1) Persist all submissions.
    const res = await fetch("/api/submissions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hackathon_id: hackathonId, source: "devpost", projects }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok || !data.submissions) {
      setBusy(false);
      setNote(typeof data.error === "string" ? data.error : "Import failed.");
      setRows([]);
      return;
    }
    setRows(data.submissions.map((s: { id: string; project_name: string }) => ({
      id: s.id,
      name: s.project_name,
      stage: "pending" as Stage,
    })));

    // 2) Process each (real GitHub scan + AI summary) one at a time.
    for (let i = 0; i < data.submissions.length; i++) {
      const sub = data.submissions[i];
      setRows((prev) => prev.map((r) => (r.id === sub.id ? { ...r, stage: "scanning" } : r)));
      try {
        await fetch(`/api/submissions/${sub.id}/process`, { method: "POST" });
        setRows((prev) => prev.map((r) => (r.id === sub.id ? { ...r, stage: "done" } : r)));
      } catch {
        setRows((prev) => prev.map((r) => (r.id === sub.id ? { ...r, stage: "error" } : r)));
      }
    }

    setBusy(false);
    setNote(`Imported ${data.submissions.length} projects.`);
    router.refresh();
  }

  async function importDevpost() {
    if (!url.trim()) return;
    setBusy(true);
    setNote("Scanning the Devpost gallery…");
    try {
      const res = await fetch("/api/import/devpost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok || !data.projects?.length) {
        setBusy(false);
        setNote(data.fallback || "Couldn't import from Devpost. Upload a CSV instead.");
        return;
      }
      await ingest(data.projects);
    } catch {
      setBusy(false);
      setNote("Couldn't reach Devpost. Upload a CSV instead.");
    }
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => ingest(parseCsv(String(reader.result)));
    reader.readAsText(file);
  }

  const doneCount = rows.filter((r) => r.stage === "done").length;

  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
        Import projects
      </div>

      <div className="flex items-center gap-2.5 rounded-[11px] border border-line bg-raised px-3.5 py-2.5">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="your-hackathon.devpost.com"
          disabled={busy}
          className="flex-1 border-none bg-transparent text-sm outline-none"
        />
        <Button size="sm" onClick={importDevpost} disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-3 w-full rounded-[11px] border border-dashed border-[#D6D1C6] px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:border-ink disabled:opacity-50"
      >
        …or upload a CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" />

      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[11px] border border-line">
          <div className="flex items-center justify-between border-b border-line-soft bg-raised px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
            <span>Importing</span>
            <span>{doneCount} / {rows.length} ready</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <AnimatePresence initial={false}>
              {rows.map((r) => (
                <motion.div
                  key={r.id ?? r.name}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-3 border-b border-line-softer px-4 py-2.5 text-[13px] last:border-b-0"
                >
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="flex flex-shrink-0 items-center gap-1.5 font-mono text-[11.5px] text-dim">
                    {r.stage === "done" ? (
                      <Check className="h-3.5 w-3.5 text-[#2e8a5e]" strokeWidth={3} />
                    ) : r.stage === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-signal-high" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {STAGE_LABEL[r.stage]}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {note && <p className="mt-3 font-mono text-[11.5px] text-dim">{note}</p>}
    </div>
  );
}
