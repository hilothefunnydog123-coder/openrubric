"use client";

/**
 * Judge scoring store.
 *
 * Holds the CURRENT judge's mutable scoring state across the whole app so the judge
 * dashboard, grading workspace, and (read-only) organizer views stay in sync as you
 * score. Seeded from lib/demo-data and persisted to localStorage so a refresh keeps
 * your work.
 *
 * Autosave is real: any edit is debounced (850ms) and POSTed to /api/scores/autosave,
 * keyed by (submission_id, judge_id) so judges never overwrite each other. The status
 * reflects the actual network result (saved / saving / unsaved). Submitting a final
 * score is a real round-trip to /api/scores/submit (see grading-workspace).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SEED_COMMENTS, SEED_PRESENTATION, SEED_SCORES, CURRENT_JUDGE } from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import type { AutosaveStatus, PresentationMap, ScoreMap } from "@/lib/types";

interface DemoContextValue {
  autosave: AutosaveStatus;
  scoresFor: (submissionId: string) => ScoreMap;
  presentationFor: (submissionId: string) => PresentationMap;
  commentFor: (submissionId: string) => string;
  isFinalized: (submissionId: string) => boolean;
  setScore: (submissionId: string, criterionId: string, value: number) => void;
  setPresentation: (submissionId: string, key: string, value: number) => void;
  setComment: (submissionId: string, text: string) => void;
  finalizeSubmission: (submissionId: string) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE_KEY = "openrubric-scores-v1";

interface Persisted {
  scores: Record<string, ScoreMap>;
  presentation: Record<string, PresentationMap>;
  comments: Record<string, string>;
  finalized: Record<string, boolean>;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [scores, setScores] = useState<Record<string, ScoreMap>>(SEED_SCORES);
  const [presentation, setPresentation] = useState<Record<string, PresentationMap>>(SEED_PRESENTATION);
  const [comments, setComments] = useState<Record<string, string>>(SEED_COMMENTS);
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});
  const [autosave, setAutosave] = useState<AutosaveStatus>("saved");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  // Attribute autosaves to the real logged-in judge (falls back to the demo id).
  const { user } = useSession();
  const judgeIdRef = useRef<string>(CURRENT_JUDGE.id);
  judgeIdRef.current = user?.id ?? CURRENT_JUDGE.id;

  // Latest-value refs so the debounced save always POSTs current state.
  const scoresRef = useRef(scores);
  const presentationRef = useRef(presentation);
  const commentsRef = useRef(comments);
  scoresRef.current = scores;
  presentationRef.current = presentation;
  commentsRef.current = comments;

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted>;
        if (parsed.scores) setScores(parsed.scores);
        if (parsed.presentation) setPresentation(parsed.presentation);
        if (parsed.comments) setComments(parsed.comments);
        if (parsed.finalized) setFinalized(parsed.finalized);
      }
    } catch {
      /* ignore corrupt storage */
    }
    hydrated.current = true;
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scores, presentation, comments, finalized } satisfies Persisted),
      );
    } catch {
      /* storage may be unavailable */
    }
  }, [scores, presentation, comments, finalized]);

  useEffect(() => () => void (saveTimer.current && clearTimeout(saveTimer.current)), []);

  // Debounced, real autosave to the API for one submission.
  const scheduleSave = useCallback((submissionId: string) => {
    setAutosave("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/scores/autosave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submission_id: submissionId,
            judge_id: judgeIdRef.current,
            scores: scoresRef.current[submissionId] ?? {},
            presentation: presentationRef.current[submissionId] ?? {},
            comment: commentsRef.current[submissionId] ?? "",
          }),
        });
        setAutosave(res.ok ? "saved" : "unsaved");
      } catch {
        setAutosave("unsaved");
      }
    }, 850);
  }, []);

  const setScore = useCallback(
    (submissionId: string, criterionId: string, value: number) => {
      setScores((prev) => ({
        ...prev,
        [submissionId]: { ...(prev[submissionId] ?? {}), [criterionId]: value },
      }));
      scheduleSave(submissionId);
    },
    [scheduleSave],
  );

  const setPresentationValue = useCallback(
    (submissionId: string, key: string, value: number) => {
      setPresentation((prev) => ({
        ...prev,
        [submissionId]: { ...(prev[submissionId] ?? {}), [key]: value },
      }));
      scheduleSave(submissionId);
    },
    [scheduleSave],
  );

  const setComment = useCallback(
    (submissionId: string, text: string) => {
      setComments((prev) => ({ ...prev, [submissionId]: text }));
      scheduleSave(submissionId);
    },
    [scheduleSave],
  );

  const finalizeSubmission = useCallback((submissionId: string) => {
    setFinalized((prev) => ({ ...prev, [submissionId]: true }));
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      autosave,
      scoresFor: (id) => scores[id] ?? {},
      presentationFor: (id) => presentation[id] ?? {},
      commentFor: (id) => comments[id] ?? "",
      isFinalized: (id) => Boolean(finalized[id]),
      setScore,
      setPresentation: setPresentationValue,
      setComment,
      finalizeSubmission,
    }),
    [autosave, scores, presentation, comments, finalized, setScore, setPresentationValue, setComment, finalizeSubmission],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within <DemoProvider>");
  return ctx;
}
