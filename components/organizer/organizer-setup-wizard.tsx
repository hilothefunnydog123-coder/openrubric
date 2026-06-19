"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { DEFAULT_CRITERIA, DEFAULT_TRACK_NAMES, DEMO_JUDGE_ROWS } from "@/lib/demo-data";
import { DevpostImportForm } from "./devpost-import-form";
import { RubricBuilder, type DraftCriterion } from "./rubric-builder";
import { TrackBuilder } from "./track-builder";
import { JudgeInviteForm } from "./judge-invite-form";

const STEPS = ["Hackathon", "Import", "Rubric", "Tracks", "Judges"];
const TITLES = ["", "Hackathon details", "Import submissions", "Define your rubric", "Set up tracks", "Invite judges"];
const SUBS = [
  "",
  "The basics judges and participants will see.",
  "Pull projects in from Devpost, CSV, or add them by hand.",
  "Paste your rubric and we’ll turn it into scorable criteria.",
  "Group submissions into the prizes you’re awarding.",
  "Add judges and decide what each one scores.",
];

// Devpost URL lives on the Import step (it's optional and usually added closer to the
// deadline), not here in the basics.
const FIELDS: { key: string; label: string; span2?: boolean; type?: string }[] = [
  { key: "name", label: "Hackathon name", span2: true },
  { key: "website_url", label: "Website URL", span2: true },
  { key: "start_time", label: "Start time", type: "datetime-local" },
  { key: "submission_deadline", label: "Submission deadline", type: "datetime-local" },
  { key: "judging_deadline", label: "Judging deadline", span2: true, type: "datetime-local" },
];

export function OrganizerSetupWizard({ initialStep = 1 }: { initialStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(5, Math.max(1, initialStep)));

  // Form state preserved across steps.
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    website_url: "",
    devpost_url: "",
    start_time: "2026-02-14T09:00",
    submission_deadline: "2026-02-16T18:00",
    judging_deadline: "2026-02-17T20:00",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<DraftCriterion[]>(
    DEFAULT_CRITERIA.map((c) => ({ name: c.name, max: c.max_points })),
  );
  const [tracks, setTracks] = useState<string[]>(DEFAULT_TRACK_NAMES);
  const [judges, setJudges] = useState<typeof DEMO_JUDGE_ROWS>([]);

  const isLast = step === 5;

  async function next() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    // Final step → persist the hackathon (+ tracks + rubric) to Supabase.
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          website_url: form.website_url,
          devpost_url: form.devpost_url,
          start_time: form.start_time,
          submission_deadline: form.submission_deadline,
          judging_deadline: form.judging_deadline,
          tracks,
          criteria,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok || !data.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't create the hackathon.");
        return;
      }
      router.push(ROUTES.organizerDashboard);
    } catch {
      setSaving(false);
      setError("Network error creating the hackathon.");
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-line bg-background/85 px-8 py-[22px] backdrop-blur-[12px]">
        <Eyebrow className="mb-1.5">New hackathon</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Set up judging</h1>
      </div>

      <div className="mx-auto w-full max-w-wizard px-8 pb-20 pt-[30px]">
        {/* stepper */}
        <div className="mb-[30px] flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(n)}
                className="flex flex-1 items-center gap-2.5"
              >
                <span
                  className={cn(
                    "flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold",
                    active || done ? "border-ink bg-ink text-canvas" : "border-line bg-surface text-faint",
                  )}
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={cn(
                    "hidden whitespace-nowrap text-[12.5px] font-semibold sm:inline",
                    active ? "text-ink" : "text-dim",
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="h-px min-w-2 flex-1 bg-line" />}
              </button>
            );
          })}
        </div>

        <div className="rounded-[16px] border border-line bg-surface p-7">
          <h2 className="mb-1 text-[19px] font-semibold tracking-[-0.01em]">{TITLES[step]}</h2>
          <p className="mb-6 text-sm text-dim">{SUBS[step]}</p>

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.span2 ? "sm:col-span-2" : ""}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type={f.type ?? "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && <DevpostImportForm />}
          {step === 3 && <RubricBuilder criteria={criteria} onChange={setCriteria} />}
          {step === 4 && <TrackBuilder tracks={tracks} onChange={setTracks} />}
          {step === 5 && <JudgeInviteForm judges={judges} onChange={setJudges} />}
        </div>

        {error && <p className="mt-3 text-[13px] text-signal-high">{error}</p>}

        {/* footer nav */}
        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || saving}
          >
            ← Back
          </Button>
          <Button onClick={next} disabled={saving}>
            {saving ? "Creating…" : isLast ? "Finish & open dashboard" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
