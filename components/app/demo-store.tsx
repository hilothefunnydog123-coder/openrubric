"use client";

/**
 * Judge scoring store.
 *
 * Holds the CURRENT judge's mutable scoring state across the whole app so the judge
 * dashboard, grading workspace, and (read-only) organizer views stay in sync as you
 * score. On mount it hydrates the judge's own saved scores from Supabase (so work
 * follows them across devices) and persists to localStorage for instant reloads.
 *
 * Autosave is real: any edit is debounced (850ms) and POSTed to /api/scores/autosave,
 * keyed by (submission_id, judge_id) so judges never overwrite each other. When every
 * criterion is scored, that same autosave auto-finalizes the submission (status →
 * Completed), there's no separate "submit" step. The indicator reflects the network
 * result (saved / saving / unsaved).
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
import { useSession } from "@/lib/session";
import type { AutosaveStatus, PresentationMap, ScoreMap } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  /** Tell the store which criteria a submission has, so autosave can auto-finalize. */
  registerCriteria: (submissionId: string, criterionIds: string[]) => void;
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
  const [scores, setScores] = useState<Record<string, ScoreMap>>({});
  const [presentation, setPresentation] = useState<Record<string, PresentationMap>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [finalized, setFinalized] = useState<Record<string, boolean>>({});
  const [autosave, setAutosave] = useState<AutosaveStatus>("saved");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  // Criterion ids per submission (registered by the grading view) → lets autosave decide
  // when a submission is fully scored and should auto-finalize.
  const criteriaRef = useRef<Record<string, string[]>>({});

  // Attribute autosaves to the real logged-in judge.
  const { user } = useSession();
  const judgeIdRef = useRef<string>("");
  judgeIdRef.current = user?.id ?? "";

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

  // Pull this judge's saved scores from the server so work follows them across devices.
  // The server is the source of truth; it merges over whatever localStorage had.
  useEffect(() => {
    const judgeId = user?.id;
    if (!judgeId || !UUID.test(judgeId)) return;
    let cancelled = false;
    fetch(`/api/scores/autosave?judge_id=${encodeURIComponent(judgeId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.scores && Object.keys(d.scores).length) {
          setScores((prev) => ({ ...prev, ...d.scores }));
        }
        if (d.presentation && Object.keys(d.presentation).length) {
          setPresentation((prev) => ({ ...prev, ...d.presentation }));
        }
        if (d.finalized && Object.keys(d.finalized).length) {
          setFinalized((prev) => ({ ...prev, ...d.finalized }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      // Completeness drives auto-finalize: every registered criterion scored → Completed,
      // and back to In Progress if a score is later lowered to 0.
      const ids = criteriaRef.current[submissionId];
      const sc = scoresRef.current[submissionId] ?? {};
      const complete = ids && ids.length ? ids.every((id) => (sc[id] || 0) > 0) : undefined;
      if (complete !== undefined) {
        setFinalized((prev) => (prev[submissionId] === complete ? prev : { ...prev, [submissionId]: complete }));
      }
      try {
        const res = await fetch("/api/scores/autosave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submission_id: submissionId,
            judge_id: judgeIdRef.current,
            scores: sc,
            presentation: presentationRef.current[submissionId] ?? {},
            comment: commentsRef.current[submissionId] ?? "",
            ...(complete !== undefined ? { complete } : {}),
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

  const registerCriteria = useCallback((submissionId: string, criterionIds: string[]) => {
    criteriaRef.current[submissionId] = criterionIds;
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
      registerCriteria,
    }),
    [autosave, scores, presentation, comments, finalized, setScore, setPresentationValue, setComment, finalizeSubmission, registerCriteria],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within <DemoProvider>");
  return ctx;
}
