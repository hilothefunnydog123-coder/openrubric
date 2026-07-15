"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** How often we re-pull the Devpost gallery once a URL is saved (until the deadline). */
const AUTO_IMPORT_MS = 2 * 60 * 1000;

type Stage = "pending" | "importing" | "scanning" | "done" | "error";
type Row = { id?: string; name: string; stage: Stage };

const STAGE_LABEL: Record<Stage, string> = {
  pending: "Queued",
  importing: "Saving…",
  scanning: "Scanning GitHub + AI…",
  done: "Ready",
  error: "Skipped",
};

export function LiveImport({
  hackathonId,
  devpostUrl = null,
  submissionDeadline = null,
}: {
  hackathonId: string;
  devpostUrl?: string | null;
  submissionDeadline?: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(devpostUrl ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const busyRef = useRef(false); // guards the auto-import interval against overlap

  const deadlineMs = submissionDeadline ? new Date(submissionDeadline).getTime() : null;
  const pastDeadline = deadlineMs != null && !Number.isNaN(deadlineMs) && Date.now() > deadlineMs;

  /** Persist projects, then scan+summarize each one sequentially so they stream in. */
  async function ingest(projects: Record<string, unknown>[], auto = false) {
    if (!projects.length) {
      if (!auto) setNote("Nothing to import, that gallery looks empty.");
      return;
    }
    setBusy(true);
    busyRef.current = true;
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
      busyRef.current = false;
      if (!auto) setNote(typeof data.error === "string" ? data.error : "Import failed.");
      setRows([]);
      return;
    }
    // Dedup on the server may leave nothing new, that's the steady state when polling.
    if (data.submissions.length === 0) {
      setBusy(false);
      busyRef.current = false;
      setRows([]);
      setNote(auto ? null : "All caught up, no new submissions.");
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
    busyRef.current = false;
    setNote(`Imported ${data.submissions.length} new project${data.submissions.length === 1 ? "" : "s"}.`);
    router.refresh();
  }

  const importDevpost = useCallback(
    async (targetUrl?: string, auto = false) => {
      const source = (targetUrl ?? "").trim();
      if (!source) return;
      if (auto && busyRef.current) return; // don't stack auto-runs
      busyRef.current = true;
      setBusy(true);
      if (!auto) setNote("Scanning the Devpost gallery…");
      try {
        // Persist the URL so the server cron + future visits keep auto-importing.
        fetch(`/api/hackathons/${hackathonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ devpost_url: source }),
        }).catch(() => {});

        const res = await fetch("/api/import/devpost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: source }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data.ok || !data.projects?.length) {
          setBusy(false);
          busyRef.current = false;
          if (!auto) setNote(data.fallback || "Couldn't reach that Devpost gallery. Contact us if you're not on Devpost.");
          return;
        }
        await ingest(data.projects, auto);
      } catch {
        setBusy(false);
        busyRef.current = false;
        if (!auto) setNote("Couldn't reach Devpost. Contact us if your submissions live elsewhere.");
      }
    },
    // ingest is stable enough for our use; hackathonId is the only external dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hackathonId],
  );

  // Once a Devpost URL is saved, pull new submissions now and every couple of minutes -
  // but only while submissions are still open. After the deadline we stop (judging phase).
  useEffect(() => {
    if (!devpostUrl) return;
    if (deadlineMs != null && Date.now() > deadlineMs) return;
    void importDevpost(devpostUrl, true);
    const id = setInterval(() => {
      if (deadlineMs != null && Date.now() > deadlineMs) {
        clearInterval(id);
        return;
      }
      void importDevpost(devpostUrl, true);
    }, AUTO_IMPORT_MS);
    return () => clearInterval(id);
  }, [devpostUrl, deadlineMs, importDevpost]);

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
          placeholder="yourhackathon.devpost.com"
          disabled={busy}
          className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-faint"
        />
        <Button size="sm" onClick={() => importDevpost(url)} disabled={busy || !url.trim()}>
          {busy ? "Importing…" : "Import"}
        </Button>
      </div>

      <p className="mt-2 text-[11.5px] leading-[1.5] text-faint">
        {pastDeadline
          ? "Submissions are closed, auto-sync is paused. You can still re-import manually."
          : devpostUrl
            ? "Auto-importing new submissions every couple of minutes until your deadline."
            : "Optional, add it whenever you have it. Once imported, new submissions keep flowing in automatically until your deadline."}
      </p>

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
