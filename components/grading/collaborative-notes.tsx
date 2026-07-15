"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { colorForId, initials } from "@/lib/utils";

/**
 * Shared judging notes, a live, Google-Docs-style thread for the whole panel.
 *
 * Real-time over a Supabase channel keyed by submission:
 *  - comments persist to judge_comments (via /api/comments) and stream to everyone,
 *  - "X is typing…" is broadcast as judges type,
 *  - presence powers the avatar stack of who's in the notes right now.
 *
 * In demo mode (no Supabase) it degrades to a local-only thread so the UI still works.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CommentDTO {
  id: string;
  submission_id: string;
  judge_id: string;
  comment: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

interface Viewer {
  id: string;
  name: string;
  color: string;
  avatarUrl: string | null;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function Avatar({ name, color, url, size = 20 }: { name: string; color: string; url: string | null; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initials(name)}
    </span>
  );
}

export function CollaborativeNotes({ submissionId }: { submissionId: string }) {
  const { user } = useSession();

  const me: Viewer = useMemo(
    () =>
      user
        ? { id: user.id, name: user.name, color: user.color, avatarUrl: user.avatarUrl }
        : { id: "you", name: "You", color: colorForId("you"), avatarUrl: null },
    [user],
  );

  const live = Boolean(getSupabaseBrowserClient()) && UUID.test(submissionId) && Boolean(user);

  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [typing, setTyping] = useState<Viewer[]>([]);

  // typing timestamps by id, pruned on an interval
  const typingRef = useRef<Map<string, { viewer: Viewer; at: number }>>(new Map());
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>["channel"]> | null>(null);
  const lastTypingSent = useRef(0);

  // Load existing thread.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?submission_id=${encodeURIComponent(submissionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.comments)) setComments(d.comments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  // Realtime channel: presence + typing + new comments. Fully guarded, if Realtime
  // is unavailable/blocked on the project, the notes still work (post + reload), it
  // just won't live-sync. Nothing here can crash the Comments tab.
  useEffect(() => {
    if (!live) return;
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    let channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>["channel"]> | null = null;
    let prune: ReturnType<typeof setInterval> | null = null;

    try {
      channel = sb.channel(`grade:${submissionId}`, { config: { presence: { key: me.id } } });
      channelRef.current = channel;

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel!.presenceState() as Record<string, Array<Record<string, unknown>>>;
            const next: Viewer[] = Object.entries(state).map(([id, metas]) => {
              const m = (metas[0] ?? {}) as Partial<Viewer>;
              return {
                id,
                name: (m.name as string) ?? "Judge",
                color: (m.color as string) ?? colorForId(id),
                avatarUrl: (m.avatarUrl as string | null) ?? null,
              };
            });
            setViewers(next);
          } catch {
            /* ignore presence parse errors */
          }
        })
        .on("broadcast", { event: "comment" }, ({ payload }) => {
          const c = payload as CommentDTO;
          if (c?.id) setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const v = payload as Viewer;
          if (!v?.id || v.id === me.id) return;
          typingRef.current.set(v.id, { viewer: v, at: Date.now() });
          setTyping(Array.from(typingRef.current.values()).map((e) => e.viewer));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel!.track({ name: me.name, color: me.color, avatarUrl: me.avatarUrl }).catch(() => {});
          }
        });

      prune = setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [id, e] of typingRef.current) {
          if (now - e.at > 2600) {
            typingRef.current.delete(id);
            changed = true;
          }
        }
        if (changed) setTyping(Array.from(typingRef.current.values()).map((e) => e.viewer));
      }, 1000);
    } catch {
      /* realtime unavailable, notes still post + reload, just no live sync */
    }

    return () => {
      if (prune) clearInterval(prune);
      try {
        if (channel) sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
      channelRef.current = null;
    };
  }, [live, submissionId, me.id, me.name, me.color, me.avatarUrl]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (!live || now - lastTypingSent.current < 1100) return;
    lastTypingSent.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: me,
    });
  }, [live, me]);

  const post = useCallback(async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, comment: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.comment) {
        const c = data.comment as CommentDTO;
        setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        channelRef.current?.send({ type: "broadcast", event: "comment", payload: c });
      }
      setDraft("");
    } catch {
      /* keep the draft so nothing is lost */
    } finally {
      setPosting(false);
    }
  }, [draft, posting, submissionId]);

  // Avatar stack = everyone present (me first), de-duped.
  const stack = useMemo(() => {
    const map = new Map<string, Viewer>();
    map.set(me.id, me);
    viewers.forEach((v) => map.set(v.id, v));
    return Array.from(map.values());
  }, [viewers, me]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold">Shared notes</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(46,138,94,0.25)] bg-[rgba(46,138,94,0.08)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal-clean">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal-clean-dot" />
            {live ? "Live" : "Local"}
          </span>
        </div>
        <div className="flex items-center">
          {stack.slice(0, 4).map((v, i) => (
            <span
              key={v.id}
              className="rounded-full border-2 border-surface"
              style={{ marginLeft: i === 0 ? 0 : -7 }}
              title={v.id === me.id ? `${v.name} (you)` : v.name}
            >
              <Avatar name={v.name} color={v.color} url={v.avatarUrl} size={24} />
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {comments.length === 0 && (
          <p className="text-[13px] text-faint">
            No notes yet. Start the conversation, everyone on the panel sees it live.
          </p>
        )}

        <AnimatePresence initial={false}>
          {comments.map((c) => {
            const color = c.judge_id === me.id ? me.color : colorForId(c.judge_id);
            const mine = c.judge_id === me.id;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="border-l-2 pl-3.5"
                style={{ borderColor: color }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Avatar name={c.author_name} color={color} url={c.author_avatar} size={20} />
                  <span className="text-[12.5px] font-medium text-ink">{c.author_name}</span>
                  {mine && <span className="font-mono text-[10px] text-faint">(you)</span>}
                  <span className="font-mono text-[10px] text-faint">{fmtTime(c.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-[1.55] text-dim">{c.comment}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* live typing indicator */}
        <AnimatePresence>
          {typing.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 pl-3.5"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                style={{ background: typing[0].color }}
              >
                {initials(typing[0].name)}
              </span>
              <span className="text-[12px] text-faint">
                {typing.length === 1
                  ? `${typing[0].name.split(" ")[0]} is typing`
                  : `${typing.length} judges are typing`}
              </span>
              <span className="flex gap-0.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1 w-1 animate-pulse-dot rounded-full bg-faint"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* composer */}
        <div className="border-l-2 border-ink pl-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Avatar name={me.name} color={me.color} url={me.avatarUrl} size={20} />
            <span className="text-[12.5px] font-medium text-ink">{me.name}</span>
            <span className="font-mono text-[10px] text-faint">(you)</span>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              broadcastTyping();
            }}
            onKeyDown={(e) => {
              // Enter posts; Shift+Enter (or ⌘/Ctrl+Enter) inserts a newline.
              if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                void post();
              }
            }}
            placeholder="Add to the shared notes, everyone on the panel sees this live. Enter to post."
            className="min-h-[90px]"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            <span className="font-mono text-[10.5px] text-faint">↵ to post · ⇧↵ newline</span>
            <button
              type="button"
              onClick={() => void post()}
              disabled={!draft.trim() || posting}
              className="rounded-control bg-ink px-3.5 py-2 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {posting ? "Posting…" : "Post note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
