"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Organizer approval queue for participant "see your score" requests. The owner (or a
 * co-owner) approves/denies each request and chooses how much detail to reveal, plus a
 * per-hackathon default. The decision is always a human's — nothing is revealed automatically.
 */

interface RequestRow {
  id: string;
  submission_id: string;
  requester_email: string;
  status: "pending" | "approved" | "denied";
  detail_level: string | null;
  created_at: string;
  submission?: { project_name?: string; team_name?: string } | null;
}

const DETAIL_OPTIONS = [
  { value: "score_only", label: "Score only" },
  { value: "score_rubric", label: "Score + rubric breakdown" },
  { value: "score_rubric_feedback", label: "Score + rubric + feedback" },
];

const VISIBILITY_OPTIONS = [
  { value: "none", label: "Nothing by default (approve each)" },
  ...DETAIL_OPTIONS,
];

export function ApprovalsQueue({
  hackathonId,
  scoreVisibility,
}: {
  hackathonId: string | null;
  scoreVisibility: string;
}) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState(scoreVisibility || "none");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!hackathonId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/score-requests?hackathon_id=${hackathonId}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveVisibility(value: string) {
    setVisibility(value);
    if (!hackathonId) return;
    try {
      await fetch(`/api/hackathons/${hackathonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score_visibility: value }),
      });
    } catch {
      /* best-effort */
    }
  }

  async function decide(
    id: string,
    status: "approved" | "denied",
    detail_level: string,
    notify: boolean,
  ) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/score-requests/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, detail_level, notify }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.toString?.() || "Could not save the decision.");
      } else {
        await load();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!hackathonId) {
    return (
      <div className="rounded-[14px] border border-line bg-surface p-6 text-[13.5px] text-dim">
        Create a hackathon first — score requests will appear here once participants ask to see
        their scores.
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="flex flex-col gap-5">
      {/* Default sharing policy */}
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
          Default score sharing
        </div>
        <p className="mb-3 max-w-[60ch] text-[13px] leading-[1.55] text-dim">
          The detail level suggested when you approve a request. Approval is always required —
          nothing is revealed automatically.
        </p>
        <select
          value={visibility}
          onChange={(e) => saveVisibility(e.target.value)}
          className="rounded-[9px] border border-line bg-raised px-3 py-2 text-[13.5px] outline-none focus:border-ink"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {loading ? (
        <div className="rounded-[14px] border border-line bg-surface p-6 text-[13.5px] text-dim">
          Loading requests…
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-surface p-6 text-[13.5px] text-dim">
          No pending score requests.
        </div>
      ) : (
        pending.map((r) => (
          <PendingCard
            key={r.id}
            row={r}
            defaultLevel={visibility === "none" ? "score_only" : visibility}
            busy={busyId === r.id}
            onDecide={decide}
          />
        ))
      )}

      {decided.length > 0 && (
        <div className="rounded-[14px] border border-line bg-surface p-5">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
            Decided
          </div>
          <ul className="divide-y divide-line-softer">
            {decided.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5 text-[13px]">
                <span>
                  {r.submission?.project_name ?? "Project"} · {r.requester_email}
                </span>
                <span
                  className={`font-mono text-[11.5px] ${
                    r.status === "approved" ? "text-green-600" : "text-dim"
                  }`}
                >
                  {r.status}
                  {r.detail_level ? ` · ${r.detail_level.replace(/_/g, " ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PendingCard({
  row,
  defaultLevel,
  busy,
  onDecide,
}: {
  row: RequestRow;
  defaultLevel: string;
  busy: boolean;
  onDecide: (id: string, status: "approved" | "denied", level: string, notify: boolean) => void;
}) {
  const [level, setLevel] = useState(defaultLevel);
  const [notify, setNotify] = useState(true);

  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">
            {row.submission?.project_name ?? "Project"}
          </div>
          <div className="mt-0.5 font-mono text-[11.5px] text-dim">{row.requester_email}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-[12.5px] text-dim">Share</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-[9px] border border-line bg-raised px-3 py-2 text-[13px] outline-none focus:border-ink"
        >
          {DETAIL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[12.5px] text-dim">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          Email them
        </label>
      </div>

      <div className="flex gap-2.5">
        <button
          disabled={busy}
          onClick={() => onDecide(row.id, "approved", level, notify)}
          className="rounded-[9px] bg-ink px-4 py-2 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => onDecide(row.id, "denied", level, notify)}
          className="rounded-[9px] border border-line px-4 py-2 text-[13px] font-medium transition-colors hover:border-ink disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
