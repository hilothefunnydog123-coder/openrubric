"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechIcon } from "@/components/ui/tech-icon";

/**
 * The hero "infrastructure UI" panel — a realistic, *interactive* OpenRubric
 * workspace. Dark rounded panel that behaves like a real macOS window:
 *
 *   • Search filters the track list by project / team / participant, and selecting
 *     a project repaints the left column (summary + rubric) and the GitHub timeline.
 *   • The rubric rows are real sliders — drag to score and the total + track rank
 *     update live, so visitors can "try it" on the first try.
 *   • The three traffic-light dots work like the macOS title bar:
 *       red = close, yellow = minimize (collapse to the bar), green = zoom (maximize).
 *   • ⌘K (or Ctrl+K) focuses the search field.
 *
 * It stays visually dark in the (now light-only) site — it reads as a product
 * screenshot / mockup, not the site theme.
 */

type Project = {
  id: string;
  rank: string;
  name: string;
  team: string;
  track: string;
  members: string[];
  score: number;
  clean: boolean;
  summary: string;
  tags: string[];
  rubric: { name: string; value: number; max: number }[];
  timeline: { label: string; meta: string }[];
  timelineNote: string;
};

const PROJECTS: Project[] = [
  {
    id: "lighthouse",
    rank: "01",
    name: "Lighthouse",
    team: "Team Beacon",
    track: "Health AI",
    members: ["Ava Reyes", "Daniel Cho", "Priya Nair"],
    score: 87,
    clean: true,
    summary:
      "A triage assistant for rural clinics that routes patient intake photos to the right specialist. Built on a fine-tuned vision model with an offline-first PWA front end.",
    tags: ["Next.js", "PyTorch", "Supabase"],
    rubric: [
      { name: "Innovation", value: 22, max: 25 },
      { name: "Technical", value: 26, max: 30 },
      { name: "Functionality", value: 21, max: 25 },
      { name: "Design / UX", value: 18, max: 20 },
    ],
    timeline: [
      { label: "Repo created", meta: "Feb 14 · 9:12 AM · within window" },
      { label: "First commit", meta: "Feb 14 · 10:40 AM · 3 contributors" },
      { label: "Last commit", meta: "Feb 16 · 5:55 PM · before deadline" },
    ],
    timelineNote: "All commits within event window",
  },
  {
    id: "mediscan",
    rank: "02",
    name: "MediScan",
    team: "Team Vital",
    track: "Health AI",
    members: ["Liam O'Brien", "Sofia Alvarez"],
    score: 83,
    clean: true,
    summary:
      "An OCR pipeline that turns handwritten prescriptions into structured, pharmacist-checkable orders — with a confidence score and a human-in-the-loop review queue.",
    tags: ["FastAPI", "Tesseract", "Postgres"],
    rubric: [
      { name: "Innovation", value: 21, max: 25 },
      { name: "Technical", value: 25, max: 30 },
      { name: "Functionality", value: 20, max: 25 },
      { name: "Design / UX", value: 17, max: 20 },
    ],
    timeline: [
      { label: "Repo created", meta: "Feb 14 · 8:40 AM · within window" },
      { label: "First commit", meta: "Feb 14 · 11:20 AM · 2 contributors" },
      { label: "Last commit", meta: "Feb 16 · 6:48 PM · before deadline" },
    ],
    timelineNote: "All commits within event window",
  },
  {
    id: "campusloop",
    rank: "03",
    name: "CampusLoop",
    team: "Team Quad",
    track: "Health AI",
    members: ["Mateo Rossi", "Hana Kim", "Jordan Blake"],
    score: 79,
    clean: false,
    summary:
      "A peer mental-health check-in app for universities that nudges at-risk students toward campus resources, with anonymized cohort trends for counseling centers.",
    tags: ["React Native", "Node", "Redis"],
    rubric: [
      { name: "Innovation", value: 20, max: 25 },
      { name: "Technical", value: 23, max: 30 },
      { name: "Functionality", value: 20, max: 25 },
      { name: "Design / UX", value: 16, max: 20 },
    ],
    timeline: [
      { label: "Repo created", meta: "Feb 10 · 2:05 PM · before window" },
      { label: "First commit", meta: "Feb 14 · 9:55 AM · 3 contributors" },
      { label: "Last commit", meta: "Feb 16 · 5:12 PM · before deadline" },
    ],
    timelineNote: "Repo created before the event window",
  },
  {
    id: "studyforge",
    rank: "04",
    name: "StudyForge",
    team: "Team Anvil",
    track: "Health AI",
    members: ["Noah Patel", "Emma Lindqvist"],
    score: 76,
    clean: true,
    summary:
      "A spaced-repetition tutor that generates rubric-aligned practice questions from a syllabus and tracks mastery per learning objective for med-school prep.",
    tags: ["Svelte", "Bun", "SQLite"],
    rubric: [
      { name: "Innovation", value: 19, max: 25 },
      { name: "Technical", value: 23, max: 30 },
      { name: "Functionality", value: 18, max: 25 },
      { name: "Design / UX", value: 16, max: 20 },
    ],
    timeline: [
      { label: "Repo created", meta: "Feb 14 · 10:02 AM · within window" },
      { label: "First commit", meta: "Feb 14 · 12:15 PM · 2 contributors" },
      { label: "Last commit", meta: "Feb 16 · 4:30 PM · before deadline" },
    ],
    timelineNote: "All commits within event window",
  },
];

type WindowState = "open" | "minimized" | "closed";

export function ProductPreviewPanel() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(PROJECTS[0].id);
  const [windowState, setWindowState] = useState<WindowState>("open");
  const [maximized, setMaximized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search field, like the real app.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (windowState !== "open") setWindowState("open");
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && maximized) setMaximized(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [windowState, maximized]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROJECTS;
    return PROJECTS.filter((p) =>
      [p.name, p.team, p.track, ...p.members].some((f) => f.toLowerCase().includes(q)),
    );
  }, [query]);

  // Keep the selection valid against the current filter: if the selected project
  // is filtered out, fall back to the first match so the left column stays in sync.
  const selected =
    filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? PROJECTS.find((p) => p.id === selectedId)!;

  // Editable rubric scores per project — visitors can drag the sliders right here.
  const [rubricScores, setRubricScores] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(PROJECTS.map((p) => [p.id, p.rubric.map((r) => r.value)])),
  );
  const values = rubricScores[selected.id] ?? selected.rubric.map((r) => r.value);
  const liveTotal = values.reduce((a, b) => a + b, 0);
  const scoreFor = (p: Project) =>
    (rubricScores[p.id] ?? p.rubric.map((r) => r.value)).reduce((a, b) => a + b, 0);

  function setCriterion(index: number, value: number) {
    setRubricScores((prev) => {
      const current = prev[selected.id] ?? selected.rubric.map((r) => r.value);
      const next = current.slice();
      next[index] = value;
      return { ...prev, [selected.id]: next };
    });
  }

  const bodyVisible = windowState === "open";

  return (
    <>
      {maximized && (
        <button
          type="button"
          aria-label="Exit maximized preview"
          onClick={() => setMaximized(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm"
        />
      )}

      <div
        className={cn(
          "overflow-hidden rounded-panel border border-line-dark bg-panel-900 shadow-panel transition-all duration-300",
          maximized
            ? "fixed inset-3 z-50 flex flex-col sm:inset-8 lg:inset-12"
            : "relative",
        )}
      >
        {/* browser bar */}
        <div className="flex items-center gap-2 border-b border-line-darker bg-panel-700 px-[18px] py-3">
          <div className="flex items-center gap-2">
            <WindowDot color="#FF5F57" label="Close preview" onClick={() => setWindowState("closed")} />
            <WindowDot
              color="#FEBC2E"
              label="Minimize preview"
              onClick={() => setWindowState((s) => (s === "minimized" ? "open" : "minimized"))}
            />
            <WindowDot
              color="#28C840"
              label={maximized ? "Restore preview" : "Maximize preview"}
              onClick={() => {
                if (windowState !== "open") setWindowState("open");
                setMaximized((m) => !m);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => windowState !== "open" && setWindowState("open")}
            className="flex flex-1 cursor-default justify-center"
            aria-label={windowState !== "open" ? "Reopen preview" : "openrubric.vercel.app"}
          >
            <div className="rounded-md border border-[#1A1A1A] bg-[#080808] px-4 py-[5px] font-mono text-[12px] text-[#6B6B6B]">
              openrubric.vercel.app
            </div>
          </button>
        </div>

        {windowState === "closed" ? (
          <ClosedState onReopen={() => setWindowState("open")} />
        ) : (
          <div
            className={cn(
              "relative overflow-hidden transition-[max-height,opacity] duration-300",
              maximized && "flex-1 overflow-y-auto",
              bodyVisible ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="relative p-[22px]">
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(#121212 1px,transparent 1px),linear-gradient(90deg,#121212 1px,transparent 1px)",
                  backgroundSize: "34px 34px",
                }}
                aria-hidden
              />

              {/* search */}
              <div className="relative mb-[18px] flex items-center gap-2.5 rounded-[11px] border border-line-dark bg-panel px-4 py-3 focus-within:border-accent/60">
                <Search className="h-[15px] w-[15px] text-dim" strokeWidth={1.6} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search project, team, or participant…"
                  className="flex-1 bg-transparent font-mono text-[13.5px] text-white placeholder:text-[#9A9A9A] focus:outline-none"
                  aria-label="Search project, team, or participant"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="font-mono text-[11px] text-dim transition-colors hover:text-white"
                    aria-label="Clear search"
                  >
                    clear
                  </button>
                )}
                <span className="rounded-[5px] border border-line-dark px-[7px] py-[2px] font-mono text-[11px] text-dim">
                  ⌘K
                </span>
              </div>

              <div className="relative grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr]">
                {/* left column */}
                <div className="flex flex-col gap-3.5">
                  {/* selected project */}
                  <div className="rounded-[13px] border border-line-dark bg-panel-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[18px] font-semibold tracking-[-0.01em] text-white">
                          {selected.name}
                        </div>
                        <div className="mt-1 font-mono text-[11.5px] text-[#7A7A7A]">
                          {selected.team} · {selected.track}
                        </div>
                      </div>
                      {selected.clean ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(79,178,134,0.22)] bg-[rgba(79,178,134,0.08)] px-[11px] py-[5px] font-mono text-[11px] text-signal-clean-dot">
                          <span className="h-1.5 w-1.5 rounded-full bg-signal-clean-dot" />
                          Clean timeline
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(217,164,65,0.24)] bg-[rgba(217,164,65,0.09)] px-[11px] py-[5px] font-mono text-[11px] text-[#D9A441]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
                          Flagged
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI summary */}
                  <div className="rounded-[13px] border border-line-dark bg-panel-800 p-4">
                    <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent">
                      AI Summary
                    </div>
                    <p className="text-[13.5px] leading-relaxed text-[#C4C4C4]">{selected.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-[7px]">
                      {selected.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 rounded-md border border-line-dark px-[9px] py-[3px] font-mono text-[11px] text-[#9A9A9A]"
                        >
                          <TechIcon name={t} className="h-[13px] w-[13px]" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* rubric score */}
                  <div className="rounded-[13px] border border-line-dark bg-panel-800 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#7A7A7A]">
                          Rubric Score
                        </span>
                        <span className="rounded border border-line-dark px-1.5 py-px font-mono text-[8.5px] uppercase tracking-[0.08em] text-[#6A6A6A]">
                          drag to try
                        </span>
                      </div>
                      <div className="text-[15px] font-semibold">
                        <span className="tabular-nums text-white">{liveTotal}</span>
                        <span className="text-dim"> / 100</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {selected.rubric.map((row, i) => {
                        const v = values[i] ?? row.value;
                        const pct = Math.round((v / row.max) * 100);
                        return (
                          <div key={row.name} className="group flex items-center gap-[11px]">
                            <span className="w-24 flex-shrink-0 text-[12.5px] text-[#B4B4B4]">
                              {row.name}
                            </span>
                            <div className="relative h-[5px] flex-1">
                              <div className="absolute inset-0 rounded-[3px] bg-[#181818]" />
                              <div
                                className="absolute inset-y-0 left-0 rounded-[3px] bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                              <span
                                className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0c0c0c] bg-white shadow-sm transition-transform group-hover:scale-110"
                                style={{ left: `${pct}%` }}
                              />
                              <input
                                type="range"
                                min={0}
                                max={row.max}
                                value={v}
                                onChange={(e) => setCriterion(i, Number(e.target.value))}
                                aria-label={`${row.name} score`}
                                className="absolute -inset-y-2 inset-x-0 w-full cursor-pointer appearance-none bg-transparent opacity-0"
                              />
                            </div>
                            <span className="w-11 text-right font-mono text-[11.5px] tabular-nums text-[#8A8A8A]">
                              {v}/{row.max}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* right column */}
                <div className="flex flex-col gap-3.5">
                  {/* track rank */}
                  <div className="rounded-[13px] border border-line-dark bg-panel-800 p-4">
                    <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#7A7A7A]">
                      Track · {selected.track}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {filtered.length === 0 ? (
                        <div className="px-[9px] py-3 font-mono text-[12px] text-[#7A7A7A]">
                          No projects match “{query}”.
                        </div>
                      ) : (
                        filtered.map((t) => {
                          const active = t.id === selected.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setSelectedId(t.id)}
                              className="flex items-center gap-[11px] rounded-lg px-[9px] py-2 text-left transition-colors hover:bg-white/[0.04]"
                              style={{ background: active ? "rgba(93,95,239,0.14)" : "transparent" }}
                            >
                              <span
                                className="w-[18px] font-mono text-[12px]"
                                style={{ color: active ? "#2563EB" : "#6A6A6A" }}
                              >
                                {t.rank}
                              </span>
                              <span
                                className="flex-1 text-[13px]"
                                style={{
                                  color: active ? "#fff" : "#C4C4C4",
                                  fontWeight: active ? 600 : 400,
                                }}
                              >
                                {t.name}
                              </span>
                              <span className="font-mono text-[12px] tabular-nums text-[#8A8A8A]">
                                {scoreFor(t)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* timeline mini */}
                  <div className="flex-1 rounded-[13px] border border-line-dark bg-panel-800 p-4">
                    <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#7A7A7A]">
                      GitHub Timeline
                    </div>
                    <div className="flex flex-col">
                      {selected.timeline.map((ev) => (
                        <div key={ev.label} className="flex gap-[11px]">
                          <div className="flex flex-col items-center">
                            <span
                              className="mt-[3px] h-2 w-2 rounded-full"
                              style={{ background: selected.clean ? undefined : "#D9A441" }}
                            >
                              {selected.clean && (
                                <span className="block h-full w-full rounded-full bg-signal-clean-dot" />
                              )}
                            </span>
                            <span className="w-px flex-1 bg-line-dark" />
                          </div>
                          <div className="pb-3.5">
                            <div className="text-[12.5px] text-[#C4C4C4]">{ev.label}</div>
                            <div className="mt-0.5 font-mono text-[10.5px] text-[#6A6A6A]">{ev.meta}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px]"
                      style={{ color: selected.clean ? undefined : "#D9A441" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: selected.clean ? undefined : "#D9A441" }}
                      >
                        {selected.clean && (
                          <span className="block h-full w-full rounded-full bg-signal-clean-dot" />
                        )}
                      </span>
                      <span className={selected.clean ? "text-signal-clean-dot" : undefined}>
                        {selected.timelineNote}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** A macOS traffic-light dot — just the red/yellow/green coloring, still clickable. */
function WindowDot({ color, label, onClick }: { color: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-[11px] w-[11px] rounded-full transition-transform hover:brightness-110 active:scale-90"
      style={{ background: color }}
    />
  );
}

/** Body shown when the window is "closed" — a quiet placeholder with a reopen action. */
function ClosedState({ onReopen }: { onReopen: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#6A6A6A]">
        Preview closed
      </div>
      <button
        type="button"
        onClick={onReopen}
        className="rounded-[9px] border border-line-dark bg-panel-800 px-4 py-2 text-[13px] text-[#C4C4C4] transition-colors hover:border-accent/60 hover:text-white"
      >
        Reopen window
      </button>
    </div>
  );
}
