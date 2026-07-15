"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Devpost fallback, add a submission by hand when a project didn't scrape in time.
 *
 * The minimum is a team name + product name; it's saved straight to the active
 * hackathon and inherits that hackathon's rubric and tracks automatically (the rubric
 * lives on the hackathon, not the submission). Optional repo / Devpost links can be
 * added so GitHub review and AI summaries still work.
 */
export function ManualSubmissionForm({
  hackathonId,
  prefillProjectName = "",
  submitLabel = "Add submission",
  onAdded,
}: {
  hackathonId: string | null;
  /** Pre-fill the product name (e.g. with what a judge typed into search). */
  prefillProjectName?: string;
  /** Override the submit button label. */
  submitLabel?: string;
  /**
   * Called after a successful add with the new submission. When provided, the caller
   * controls what happens next (e.g. navigate straight to grading); otherwise the form
   * resets and refreshes the current route.
   */
  onAdded?: (submission: { id: string; project_name: string } | null) => void;
}) {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState(prefillProjectName);
  const [repoUrl, setRepoUrl] = useState("");
  const [devpostUrl, setDevpostUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const canSubmit = projectName.trim() && teamName.trim() && hackathonId && status !== "saving";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/submissions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          source: "manual",
          projects: [
            {
              project_name: projectName.trim(),
              team_name: teamName.trim(),
              repo_url: repoUrl.trim() || null,
              devpost_url: devpostUrl.trim() || null,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("saved");
        setLastAdded(projectName.trim());
        const submission = Array.isArray(data.submissions) ? data.submissions[0] ?? null : null;
        if (onAdded) {
          onAdded(submission);
        } else {
          setProjectName("");
          setTeamName("");
          setRepoUrl("");
          setDevpostUrl("");
          router.refresh();
        }
      } else {
        setStatus("error");
        setError(typeof data.error === "string" ? data.error : "Couldn't save that submission.");
      }
    } catch {
      setStatus("error");
      setError("Network error, please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-1 text-[15px] font-semibold tracking-[-0.01em]">Add a submission manually</div>
      <p className="mb-4 text-[13px] leading-[1.55] text-dim">
        Didn&apos;t scrape in time? Add it by hand, just the team and product name. It joins this
        hackathon with the same rubric and tracks. Links are optional.
      </p>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ms-team" className="mb-2 block">
            Team name
          </Label>
          <Input
            id="ms-team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team Beacon"
            required
          />
        </div>
        <div>
          <Label htmlFor="ms-project" className="mb-2 block">
            Product name
          </Label>
          <Input
            id="ms-project"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Lighthouse"
            required
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ms-repo" className="mb-2 block">
            GitHub repo <span className="text-faint">(optional)</span>
          </Label>
          <Input
            id="ms-repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="github.com/team/project"
          />
        </div>
        <div>
          <Label htmlFor="ms-devpost" className="mb-2 block">
            Devpost URL <span className="text-faint">(optional)</span>
          </Label>
          <Input
            id="ms-devpost"
            value={devpostUrl}
            onChange={(e) => setDevpostUrl(e.target.value)}
            placeholder="devpost.com/software/project"
          />
        </div>
      </div>

      {!hackathonId && (
        <p className="mb-3 text-[13px] text-signal-high">
          Create your hackathon first, then you can add submissions here.
        </p>
      )}
      {error && <p className="mb-3 text-[13px] text-signal-high">{error}</p>}
      {status === "saved" && lastAdded && (
        <p className="mb-3 text-[13px] text-signal-clean">Added “{lastAdded}”. Add another below.</p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {status === "saving" ? "Adding…" : submitLabel}
      </Button>
    </form>
  );
}
