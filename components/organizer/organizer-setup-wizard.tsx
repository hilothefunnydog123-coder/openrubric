"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";
import { useImageDrop } from "@/components/ui/use-image-drop";
import { ROUTES } from "@/lib/constants";
import { DEFAULT_CRITERIA, DEFAULT_TRACK_NAMES, type DemoJudgeRow } from "@/lib/demo-data";
import { DevpostImportForm, type ImportProject } from "./devpost-import-form";
import { RubricBuilder, type DraftCriterion } from "./rubric-builder";
import { TrackBuilder } from "./track-builder";
import { JudgeInviteForm } from "./judge-invite-form";

/** Local `YYYY-MM-DDTHH:mm` (what <input type="datetime-local"> expects), offset from now. */
function localDateTime(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STEPS = ["Hackathon", "Import", "Rubric", "Tracks", "Judges"];
const TITLES = ["", "Hackathon details", "Import submissions", "Define your rubric", "Set up tracks", "Invite judges"];
const SUBS = [
  "",
  "The basics judges and participants will see.",
  "Pull projects straight from your Devpost gallery, we keep syncing new ones automatically.",
  "Start from the OpenRubric default, edit it, or generate one from a photo.",
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

// Common event timezones (IANA). The organizer's detected zone is added on top if
// it isn't already here, so every user can pick their own.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "America/Los_Angeles", label: "Pacific, Los Angeles (PT)" },
  { value: "America/Denver", label: "Mountain, Denver (MT)" },
  { value: "America/Chicago", label: "Central, Chicago (CT)" },
  { value: "America/New_York", label: "Eastern, New York (ET)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European, Paris (CET)" },
  { value: "Europe/Berlin", label: "Central European, Berlin (CET)" },
  { value: "Europe/Athens", label: "Eastern European, Athens (EET)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India, Kolkata (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Shanghai", label: "China, Shanghai (CST)" },
  { value: "Asia/Tokyo", label: "Japan, Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AET)" },
  { value: "Pacific/Auckland", label: "Auckland (NZT)" },
];

interface ExistingHackathon {
  hackathon: {
    id: string;
    name: string;
    logo_url?: string | null;
    website_url: string | null;
    devpost_url: string | null;
    start_time: string;
    submission_deadline: string;
    judging_deadline: string;
    timezone?: string | null;
    judges_per_project?: number | null;
  };
  tracks: string[];
  criteria: { name: string; max: number }[];
}

/** ISO timestamp → browser-local `YYYY-MM-DDTHH:mm` (fallback when no timezone is set). */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The datetime-local inputs hold a NAIVE wall-clock value (no zone). The organizer
 * means that wall time IN THE HACKATHON'S timezone, not the browser's, and definitely
 * not the (UTC) server's. These two helpers convert between the input's wall-clock and
 * a real UTC instant using the selected IANA zone, so a time round-trips unchanged and
 * is stored as the correct moment (which is what the GitHub deadline check relies on).
 */

/** Offset (ms) of `timeZone` from UTC at a given instant. Positive = ahead of UTC. */
function tzOffsetMs(instantMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(instantMs))) map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour; // some engines emit "24" at midnight
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +hour, +map.minute, +map.second);
  return asUTC - instantMs;
}

/** Naive `YYYY-MM-DDTHH:mm` interpreted IN `timeZone` → UTC ISO string. */
function zonedInputToISO(local: string, timeZone?: string | null): string | null {
  if (!local) return null;
  const [datePart, timePart] = local.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  // No zone → interpret in the browser's own zone (legacy behavior).
  if (!timeZone) {
    const dt = new Date(y, m - 1, d, hh, mm);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  const wallAsUTC = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle DST boundaries (the offset can depend on the resolved instant).
  let utc = wallAsUTC - tzOffsetMs(wallAsUTC, timeZone);
  utc = wallAsUTC - tzOffsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

/** UTC ISO string → `YYYY-MM-DDTHH:mm` wall time IN `timeZone`, for a datetime-local input. */
function isoToZonedInput(iso?: string | null, timeZone?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (!timeZone) return isoToLocalInput(iso);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(d)) map[p.type] = p.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/** Custom timezone dropdown, styled to match the wizard inputs (no native <select>). */
function TimezoneSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-[52px] w-full items-center justify-between gap-2 rounded-[13px] border bg-surface px-4 text-left text-[15px] text-ink shadow-sm outline-none transition-all",
          open ? "border-accent ring-2 ring-accent/15" : "border-line hover:border-faint focus:border-accent",
        )}
      >
        <span className={current ? "font-medium" : "text-faint"}>
          {current?.label ?? "Select a timezone"}
        </span>
        <ChevronDown
          className={cn("h-[18px] w-[18px] flex-shrink-0 text-faint transition-transform", open && "rotate-180")}
          strokeWidth={2.25}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-[13px] border border-line bg-surface p-2 shadow-[0_14px_40px_rgba(20,18,14,0.16)]">
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-sunken",
                  selected ? "font-medium text-ink" : "text-dim",
                )}
              >
                <Check
                  className={cn("h-3.5 w-3.5 flex-shrink-0 text-accent", selected ? "opacity-100" : "opacity-0")}
                  strokeWidth={3}
                />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A titled section card used by the single-page edit layout. */
function SectionCard({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-28 rounded-[16px] border border-line bg-surface p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[12px] font-semibold text-canvas">
          {n}
        </span>
        <div>
          <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
          <p className="text-[13px] text-dim">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function OrganizerSetupWizard({
  initialStep = 1,
  existing = null,
}: {
  initialStep?: number;
  existing?: ExistingHackathon | null;
}) {
  const router = useRouter();
  const editing = Boolean(existing);
  const [step, setStep] = useState(Math.min(5, Math.max(1, initialStep)));

  // Form state preserved across steps. Pre-filled from the saved hackathon in edit mode.
  // Dates start empty and are filled after mount, datetime-local values depend on the
  // runtime timezone, so computing them during SSR causes a hydration attribute mismatch.
  const [form, setForm] = useState<Record<string, string>>({
    name: existing?.hackathon.name ?? "",
    logo_url: existing?.hackathon.logo_url ?? "",
    website_url: existing?.hackathon.website_url ?? "",
    devpost_url: existing?.hackathon.devpost_url ?? "",
    start_time: "",
    submission_deadline: "",
    judging_deadline: "",
    timezone: existing?.hackathon.timezone ?? "",
  });

  // Fill dates from the saved hackathon (edit) or sensible defaults (new), client-only.
  // Timezone defaults to the organizer's own detected zone.
  useEffect(() => {
    let detected = "UTC";
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      /* keep UTC */
    }
    // Saved dates are read back IN the hackathon's own timezone, so the wall-clock the
    // organizer sees matches exactly what they entered (no browser/server shift).
    const tz = existing?.hackathon.timezone || detected;
    setForm((f) => ({
      ...f,
      start_time:
        f.start_time || isoToZonedInput(existing?.hackathon.start_time, tz) || localDateTime(0, 9),
      submission_deadline:
        f.submission_deadline ||
        isoToZonedInput(existing?.hackathon.submission_deadline, tz) ||
        localDateTime(2, 18),
      judging_deadline:
        f.judging_deadline ||
        isoToZonedInput(existing?.hackathon.judging_deadline, tz) ||
        localDateTime(3, 20),
      timezone: f.timezone || detected,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<DraftCriterion[]>(
    existing?.criteria?.length
      ? existing.criteria
      : DEFAULT_CRITERIA.map((c) => ({ name: c.name, max: c.max_points })),
  );
  const [tracks, setTracks] = useState<string[]>(existing?.tracks?.length ? existing.tracks : DEFAULT_TRACK_NAMES);
  const [judges, setJudges] = useState<DemoJudgeRow[]>([]);
  const [judgesPerProject, setJudgesPerProject] = useState<number>(existing?.hackathon.judges_per_project ?? 1);
  // Projects scraped during a NEW setup (no hackathon id yet), persisted right after create.
  const [importedProjects, setImportedProjects] = useState<ImportProject[]>([]);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const logoDrop = useImageDrop((file) => void uploadLogo(file));

  // Live website-link check: confirm the URL is a real, reachable site before moving on.
  const [urlStatus, setUrlStatus] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [urlTitle, setUrlTitle] = useState<string | null>(null);
  const urlNormalized = useRef<string | null>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSeq = useRef(0);

  function checkWebsite(value: string) {
    const v = value.trim();
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlNormalized.current = null;
    if (!v) {
      setUrlStatus("idle");
      setUrlTitle(null);
      return;
    }
    setUrlStatus("checking");
    const seq = ++urlSeq.current;
    urlTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/validate-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: v }),
        });
        const data = await res.json().catch(() => ({}));
        if (seq !== urlSeq.current) return; // a newer keystroke superseded this
        if (data.ok && data.reachable) {
          urlNormalized.current = data.url ?? null;
          setUrlTitle(typeof data.title === "string" ? data.title : null);
          setUrlStatus("ok");
        } else {
          setUrlStatus("bad");
          setUrlTitle(null);
        }
      } catch {
        if (seq === urlSeq.current) setUrlStatus("bad");
      }
    }, 650);
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't upload the logo.");
        return;
      }
      setForm((f) => ({ ...f, logo_url: data.url }));
    } catch {
      setError("Network error uploading the logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  const isLast = step === 5;

  /** Confirm the website link is real before leaving the basics / saving. Returns ok. */
  function websiteGate(): boolean {
    if (!form.website_url.trim()) return true;
    if (urlStatus === "checking") {
      setError("Still checking that link, give it a second.");
      return false;
    }
    if (urlStatus === "bad") {
      setError("That website URL isn't reachable. Fix it, or clear the field to continue.");
      return false;
    }
    if (urlNormalized.current) setForm((f) => ({ ...f, website_url: urlNormalized.current! }));
    return true;
  }

  /** Persist projects scraped during new setup, now that the hackathon exists. */
  async function persistImports(hackathonId: string) {
    if (!importedProjects.length) return;
    try {
      const res = await fetch("/api/submissions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: hackathonId, source: "import", projects: importedProjects }),
      });
      const data = await res.json().catch(() => ({}));
      // Kick off the GitHub scan + AI summary for each new submission (fire-and-forget
      // so opening the dashboard isn't blocked; summaries fill in shortly after). Process
      // SEQUENTIALLY with a small gap, firing them all at once would saturate the free
      // AI rate limit and leave some summaries as degraded stubs. The cron repair pass
      // backstops anything that still slips through.
      const subs: { id: string }[] = Array.isArray(data?.submissions) ? data.submissions : [];
      void (async () => {
        for (const s of subs) {
          try {
            await fetch(`/api/submissions/${s.id}/process`, { method: "POST" });
          } catch {
            /* keep going, one failure shouldn't stall the batch */
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      })();
    } catch {
      /* non-fatal, the organizer can re-import from the Import tab */
    }
  }

  /** Create (POST) a new hackathon, or save (PATCH) edits to the existing one. */
  async function submit() {
    if (!websiteGate()) return;
    setSaving(true);
    setError(null);
    // Convert the wall-clock inputs to real UTC instants using the SELECTED timezone, so
    // the moment stored is correct regardless of where the browser or server happen to be.
    const tz = form.timezone || null;
    const payload = {
      name: form.name,
      logo_url: form.logo_url,
      website_url: urlNormalized.current || form.website_url,
      devpost_url: form.devpost_url,
      start_time: zonedInputToISO(form.start_time, tz),
      submission_deadline: zonedInputToISO(form.submission_deadline, tz),
      judging_deadline: zonedInputToISO(form.judging_deadline, tz),
      timezone: form.timezone,
      judges_per_project: judgesPerProject,
      tracks,
      criteria,
    };
    try {
      const res = existing
        ? await fetch(`/api/hackathons/${existing.hackathon.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/hackathons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setSaving(false);
        setError(typeof data.error === "string" ? data.error : "Couldn't save the hackathon.");
        return;
      }
      // New hackathon → flush any projects imported during setup.
      if (!existing && data.id) await persistImports(data.id);
      router.push(ROUTES.organizerDashboard);
      router.refresh();
    } catch {
      setSaving(false);
      setError(`Network error ${existing ? "saving" : "creating"} the hackathon.`);
    }
  }

  async function next() {
    if (step === 1 && !websiteGate()) return;
    if (!isLast) {
      setError(null);
      setStep((s) => s + 1);
      return;
    }
    await submit();
  }

  // ---- Section bodies (shared between the stepper and the single-page edit layout) ----

  const basicsBody = (
    <>
      {/* Logo */}
      <div className="mb-5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          {...logoDrop.dropProps}
          className={cn(
            "flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-dashed bg-raised text-faint transition-colors hover:border-ink",
            logoDrop.dragging ? "border-accent bg-accent-soft text-accent" : "border-line",
          )}
          aria-label="Upload hackathon logo"
        >
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Hackathon logo" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" strokeWidth={1.7} />
          )}
        </button>
        <div>
          <Label>Hackathon logo</Label>
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="mt-1 block rounded-control border border-line bg-raised px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
          >
            {logoUploading ? "Uploading…" : form.logo_url ? "Replace logo" : "Upload logo"}
          </button>
          <p className="mt-1.5 font-mono text-[10.5px] text-faint">
            Drag &amp; drop or click · PNG, JPG, SVG · max 4 MB
          </p>
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadLogo(f);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.span2 ? "sm:col-span-2" : ""}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type={f.type ?? "text"}
              value={form[f.key] ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, [f.key]: v });
                if (f.key === "website_url") checkWebsite(v);
              }}
            />
            {f.key === "website_url" && form.website_url.trim() && (
              <p
                className={cn(
                  "mt-1.5 flex items-center gap-1.5 text-[12px]",
                  urlStatus === "ok" && "text-signal-clean",
                  urlStatus === "bad" && "text-signal-high",
                  urlStatus === "checking" && "text-dim",
                )}
              >
                {urlStatus === "checking" && "Checking the link…"}
                {urlStatus === "ok" && (urlTitle ? `✓ Reachable, ${urlTitle}` : "✓ Reachable")}
                {urlStatus === "bad" && "✗ Couldn't reach that link. Double-check the URL."}
              </p>
            )}
          </div>
        ))}

        {/* Event timezone, used to show GitHub commit times in local time for judges. */}
        <div className="sm:col-span-2">
          <Label htmlFor="timezone">Hackathon timezone</Label>
          <TimezoneSelect
            value={form.timezone}
            options={
              form.timezone && !TIMEZONES.some((t) => t.value === form.timezone)
                ? [{ value: form.timezone, label: `${form.timezone} (detected)` }, ...TIMEZONES]
                : TIMEZONES
            }
            onChange={(next) => setForm({ ...form, timezone: next })}
          />
        </div>
      </div>
    </>
  );

  const importBody = (
    <DevpostImportForm
      hackathonId={existing?.hackathon.id ?? null}
      onProjects={setImportedProjects}
      onDevpostUrl={(devpostUrl) => setForm((f) => ({ ...f, devpost_url: devpostUrl }))}
    />
  );
  const rubricBody = <RubricBuilder criteria={criteria} onChange={setCriteria} />;
  const tracksBody = <TrackBuilder tracks={tracks} onChange={setTracks} />;
  const judgesBody = (
    <div className="flex flex-col gap-6">
      <div>
        <Label>Judges per project</Label>
        <p className="mb-2.5 mt-1 text-[12.5px] leading-[1.5] text-dim">
          How many judges score each project. With more than one, each judge enters their own
          scores and OpenRubric averages them into the final score.
        </p>
        <div className="inline-flex gap-1.5 rounded-control border border-line bg-raised p-1">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setJudgesPerProject(n)}
              className={cn(
                "h-9 w-14 rounded-[8px] text-[14px] font-semibold tabular-nums transition-colors",
                judgesPerProject === n ? "bg-ink text-canvas" : "text-dim hover:text-ink",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <JudgeInviteForm judges={judges} onChange={setJudges} availableTracks={tracks} />
    </div>
  );
  const bodies = [null, basicsBody, importBody, rubricBody, tracksBody, judgesBody];

  // ---- Single-page layout for editing an existing hackathon ----
  if (editing) {
    return (
      <div>
        <div className="sticky top-0 z-20 border-b border-line bg-background/85 px-8 py-[22px] backdrop-blur-[12px]">
          <Eyebrow className="mb-1.5">Edit hackathon</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Your hackathon settings</h1>
          <p className="mt-1 text-[13px] text-dim">
            Everything&apos;s saved, tweak anything below and hit Save changes. You won&apos;t lose your data.
          </p>
        </div>

        <div className="mx-auto w-full max-w-wizard px-8 pb-28 pt-[26px]">
          <div className="space-y-5">
            {[1, 2, 3, 4, 5].map((n) => (
              <SectionCard key={n} n={n} title={TITLES[n]} sub={SUBS[n]}>
                {bodies[n]}
              </SectionCard>
            ))}
          </div>

          {error && <p className="mt-4 text-[13px] text-signal-high">{error}</p>}
        </div>

        {/* sticky save bar */}
        <div className="sticky bottom-0 z-20 border-t border-line bg-background/90 px-8 py-4 backdrop-blur-[12px]">
          <div className="mx-auto flex w-full max-w-wizard items-center justify-between">
            <span className="text-[12.5px] text-dim">Changes apply to your live event.</span>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step-by-step wizard for a brand-new hackathon ----
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
          {bodies[step]}
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
