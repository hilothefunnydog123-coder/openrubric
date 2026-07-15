"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Participant "see your score" flow: search a hackathon by name → pick your project →
 * submit a request → watch its status → once an owner approves, render the revealed score
 * at the granted detail level. Self-restricts via the approval gate on the server.
 */

interface HackathonHit {
  id: string;
  name: string;
  slug: string;
}
interface ProjectHit {
  id: string;
  project_name: string;
  team_name: string;
}
interface ScoreBreakdown {
  total: number;
  max: number;
  judgesDone: number;
  judgesTotal: number;
  perCriterion?: { criterion_id: string; name: string; avg: number; max: number }[];
  feedback?: string[];
}

type Status = "none" | "pending" | "approved" | "denied";

export function ScoreRequestFlow() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<HackathonHit[]>([]);
  const [hackathon, setHackathon] = useState<HackathonHit | null>(null);
  const [projects, setProjects] = useState<ProjectHit[]>([]);
  const [project, setProject] = useState<ProjectHit | null>(null);
  const [status, setStatus] = useState<Status>("none");
  const [detailLevel, setDetailLevel] = useState<string | null>(null);
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced hackathon search.
  useEffect(() => {
    if (hackathon) return;
    if (!query.trim()) {
      setHits([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hackathons?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setHits(data.hackathons ?? []);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, hackathon]);

  async function pickHackathon(h: HackathonHit) {
    setHackathon(h);
    setHits([]);
    setQuery(h.name);
    try {
      const res = await fetch(`/api/hackathons/${h.id}/projects`);
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      setProjects([]);
    }
  }

  async function refreshStatus(submissionId: string) {
    try {
      const res = await fetch(`/api/score-requests/mine?submission_id=${submissionId}`);
      const data = await res.json();
      setStatus((data.status as Status) ?? "none");
      setDetailLevel(data.detail_level ?? null);
      setScore(data.score ?? null);
    } catch {
      /* leave as-is */
    }
  }

  async function submitRequest() {
    if (!hackathon || !project) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/score-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: hackathon.id, submission_id: project.id }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || "Could not submit your request.");
      } else {
        setStatus((data.status as Status) ?? "pending");
        await refreshStatus(project.id);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setHackathon(null);
    setProjects([]);
    setProject(null);
    setStatus("none");
    setDetailLevel(null);
    setScore(null);
    setQuery("");
    setError("");
  }

  const card = "rounded-[14px] border border-line bg-surface p-6";
  const label = "mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim";

  return (
    <div className="flex flex-col gap-5">
      {/* Step 1, find the hackathon */}
      <div className={card}>
        <div className={label}>Step 1 · Find your hackathon</div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (hackathon) reset();
          }}
          placeholder="Type the hackathon name…"
          className="w-full rounded-[9px] border border-line bg-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"
        />
        {!hackathon && hits.length > 0 && (
          <ul className="mt-2 divide-y divide-line-softer overflow-hidden rounded-[9px] border border-line">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => pickHackathon(h)}
                  className="block w-full px-3.5 py-2.5 text-left text-[13.5px] transition-colors hover:bg-sunken"
                >
                  {h.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Step 2, pick the project */}
      {hackathon && (
        <div className={card}>
          <div className={label}>Step 2 · Pick your project</div>
          {projects.length === 0 ? (
            <p className="text-[13.5px] text-dim">No projects found for this hackathon yet.</p>
          ) : (
            <div className="grid gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProject(p)}
                  className={`flex items-center justify-between rounded-[9px] border px-3.5 py-2.5 text-left text-[13.5px] transition-colors ${
                    project?.id === p.id ? "border-ink bg-sunken font-semibold" : "border-line hover:border-ink"
                  }`}
                >
                  <span>{p.project_name}</span>
                  {p.team_name && <span className="font-mono text-[11px] text-dim">{p.team_name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3, submit / status */}
      {hackathon && project && (
        <div className={card}>
          <div className={label}>Step 3 · Request your score</div>
          {status === "none" && (
            <>
              <p className="mb-4 text-[13.5px] leading-[1.6] text-dim">
                Submitting sends a request to <strong>{hackathon.name}</strong>&apos;s organizers. They
                approve or deny it and choose how much detail to share.
              </p>
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="rounded-[9px] bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </>
          )}

          {status === "pending" && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] text-dim">
                Request submitted, waiting on an organizer to review it.
              </p>
              <button
                onClick={() => refreshStatus(project.id)}
                className="rounded-[9px] border border-line px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-ink"
              >
                Refresh
              </button>
            </div>
          )}

          {status === "denied" && (
            <p className="text-[13.5px] text-dim">
              Your request wasn&apos;t approved. Reach out to the organizers if you think this is a
              mistake.
            </p>
          )}

          {status === "approved" && score && (
            <div>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold tracking-[-0.02em]">{score.total}</span>
                <span className="text-[15px] text-dim">/ {score.max}</span>
                <span className="ml-auto font-mono text-[11.5px] text-dim">
                  {score.judgesDone}/{score.judgesTotal} judges
                </span>
              </div>
              {score.perCriterion && score.perCriterion.length > 0 && (
                <div className="mb-4 divide-y divide-line-softer rounded-[9px] border border-line">
                  {score.perCriterion.map((c) => (
                    <div key={c.criterion_id} className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-[13px]">{c.name}</span>
                      <span className="font-mono text-[12.5px] font-semibold">
                        {c.avg} / {c.max}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {score.feedback && score.feedback.length > 0 && (
                <div className="rounded-[9px] border border-line bg-raised p-4">
                  <div className={label}>Judge feedback</div>
                  <ul className="space-y-2">
                    {score.feedback.map((f, i) => (
                      <li key={i} className="text-[13px] leading-[1.55] text-ink">
                        “{f}”
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!score.perCriterion && (
                <p className="text-[12.5px] text-dim">
                  The organizer shared your overall score{detailLevel ? "" : ""}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
