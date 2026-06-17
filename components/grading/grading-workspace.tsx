"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useDemo } from "@/components/app/demo-store";
import { totalScore } from "@/lib/scoring";
import { prettyUrl } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { DEFAULT_CRITERIA, CURRENT_JUDGE } from "@/lib/demo-data";
import type { ProjectView } from "@/lib/types";

import { AutosaveIndicator } from "./autosave-indicator";
import { RealtimeJudgePresence } from "./realtime-judge-presence";
import { AIProjectSummaryCard } from "./ai-project-summary-card";
import { SuggestedQuestionsCard } from "./suggested-questions-card";
import { RubricScoreEditor } from "./rubric-score-editor";
import { PresentationScoreEditor } from "./presentation-score-editor";
import { GitHubTimelineCard } from "./github-timeline-card";
import { OriginalityFlagCard } from "./originality-flag-card";

function ext(url: string | null): string {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

export function GradingWorkspace({ project }: { project: ProjectView }) {
  const { scoresFor, presentationFor, commentFor, setComment, isFinalized, finalizeSubmission } =
    useDemo();
  const [tab, setTab] = useState("rubric");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");

  const total = totalScore(scoresFor(project.id), DEFAULT_CRITERIA);
  const comment = commentFor(project.id);
  const submitted = isFinalized(project.id);

  async function submitFinal() {
    setSubmitState("submitting");
    try {
      const res = await fetch("/api/scores/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: project.id,
          judge_id: CURRENT_JUDGE.id,
          scores: scoresFor(project.id),
          presentation: presentationFor(project.id),
          comment: commentFor(project.id),
          is_final: true,
        }),
      });
      if (!res.ok) throw new Error(`submit failed (${res.status})`);
      finalizeSubmission(project.id);
      setSubmitState("idle");
    } catch {
      setSubmitState("error");
    }
  }

  const links = [
    { label: "Devpost", url: project.devpost_url },
    { label: "GitHub", url: project.repo_url },
    { label: "Live demo", url: project.live_url },
    { label: "Video", url: project.demo_video_url },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-background/85 px-6 py-3.5 backdrop-blur-[12px]">
        <div className="flex min-w-0 items-center gap-4">
          <Button asChild variant="secondary" size="sm">
            <Link href={ROUTES.judgeDashboard}>← All projects</Link>
          </Button>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold tracking-[-0.01em]">
              {project.project_name}
            </div>
            <div className="font-mono text-[11px] text-dim">
              {project.team_name} · {project.track}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <AutosaveIndicator variant="inline" />
          </div>
          <span className="text-[15px] font-bold tracking-[-0.01em] tabular-nums">
            {total}
            <span className="font-medium text-faint"> / 100</span>
          </span>
          {submitState === "error" && (
            <span className="hidden font-mono text-[11px] text-signal-high sm:inline">
              Couldn’t submit — retry
            </span>
          )}
          <Button
            onClick={submitFinal}
            disabled={submitted || submitState === "submitting"}
            className="whitespace-nowrap"
          >
            {submitted
              ? "Final score submitted ✓"
              : submitState === "submitting"
                ? "Submitting…"
                : "Submit final score"}
          </Button>
        </div>
      </div>

      {/* 3 columns */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* LEFT — identity */}
        <aside className="border-b border-line bg-raised p-6 md:border-b-0 md:border-r">
          <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Project</div>
          <h2 className="mb-1.5 text-[22px] font-semibold tracking-[-0.02em]">{project.project_name}</h2>
          <div className="mb-[18px] font-mono text-[12px] text-dim">{project.team_name}</div>
          <Badge variant="accent" className="mb-5">
            {project.track}
          </Badge>
          <p className="mb-[22px] text-[13.5px] leading-[1.55] text-dim">{project.description}</p>

          <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            Participants
          </div>
          <div className="mb-6 text-[13.5px] leading-[1.5] text-ink">
            {project.participants.map((p) => p.name).join(", ")}
          </div>

          <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">Links</div>
          <div className="flex flex-col gap-[7px]">
            {links.map((lk) => (
              <a
                key={lk.label}
                href={ext(lk.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-[9px] border border-line bg-surface px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-ink"
              >
                <span>{lk.label}</span>
                <span className="font-mono text-[11px] text-faint">{lk.url ? prettyUrl(lk.url) : "—"} ↗</span>
              </a>
            ))}
          </div>
        </aside>

        {/* CENTER — workspace */}
        <section className="min-w-0 px-6 pb-20 pt-6 md:px-[30px]">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-[22px]">
              <TabsTrigger value="rubric">Rubric</TabsTrigger>
              <TabsTrigger value="presentation">Presentation</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <AIProjectSummaryCard ai={project.ai} />
            <SuggestedQuestionsCard questions={project.ai.suggested_questions_json} />

            <TabsContent value="rubric">
              <RubricScoreEditor submissionId={project.id} criteria={DEFAULT_CRITERIA} />
            </TabsContent>
            <TabsContent value="presentation">
              <PresentationScoreEditor submissionId={project.id} />
            </TabsContent>
            <TabsContent value="comments">
              <div className="rounded-[14px] border border-line bg-surface p-5">
                <div className="mb-1.5 text-[15px] font-semibold">Your notes</div>
                <p className="mb-3.5 text-[13px] text-dim">
                  Private to you until you submit. The organizer sees these alongside your scores.
                </p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(project.id, e.target.value)}
                  placeholder="What stood out? What would you ask the team?"
                  className="min-h-[140px]"
                />
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* RIGHT — evidence */}
        <aside className="border-t border-line bg-raised p-6 md:border-l md:border-t-0">
          <RealtimeJudgePresence />
          <AutosaveIndicator variant="chip" />
          <GitHubTimelineCard scan={project.scan} />
          <OriginalityFlagCard scan={project.scan} />
          <div className="rounded-[13px] border border-line bg-surface p-4">
            <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
              Organizer note
            </div>
            <div className="text-[12.5px] leading-[1.5] text-dim">
              No action requested. Score against the rubric as usual.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
