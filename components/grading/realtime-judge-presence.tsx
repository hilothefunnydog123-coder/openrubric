"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { colorForId, initials } from "@/lib/utils";

/**
 * Live "also viewing" presence.
 *
 * Subscribes to the same `grade:{submissionId}` channel the shared notes track on, so it
 * shows the REAL other judges currently on this project in real time. There are no
 * placeholder names, when nobody else is here, the strip simply doesn't render.
 */

interface Viewer {
  id: string;
  name: string;
  color: string;
}

export function RealtimeJudgePresence({ submissionId }: { submissionId: string }) {
  const { user } = useSession();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const live = Boolean(getSupabaseBrowserClient()) && Boolean(user);

  useEffect(() => {
    if (!live) {
      // No Supabase session → no real peers to show. Never invent judges.
      setViewers([]);
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (!sb || !user) return;

    let channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>["channel"]> | null = null;
    try {
      channel = sb.channel(`grade:${submissionId}`, {
        config: { presence: { key: `view-${user.id}` } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel!.presenceState() as Record<string, Array<Record<string, unknown>>>;
            const others: Viewer[] = [];
            const seen = new Set<string>();
            for (const [key, metas] of Object.entries(state)) {
              const realId = key.replace(/^view-/, "");
              if (realId === user.id || seen.has(realId)) continue;
              seen.add(realId);
              const m = (metas[0] ?? {}) as Record<string, unknown>;
              others.push({
                id: realId,
                name: (m.name as string) ?? "Judge",
                color: (m.color as string) ?? colorForId(realId),
              });
            }
            setViewers(others);
          } catch {
            /* ignore */
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel!.track({ name: user.name, color: user.color, avatarUrl: user.avatarUrl }).catch(() => {});
          }
        });
    } catch {
      /* realtime unavailable, presence just won't show */
    }

    return () => {
      try {
        if (channel) sb.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [live, submissionId, user]);

  if (viewers.length === 0) return null;
  const first = viewers.map((v) => v.name.split(" ")[0]);
  const text =
    viewers.length === 1
      ? `${first[0]} is also viewing`
      : `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]} also viewing`;

  return (
    <div className="mb-[22px] flex items-center gap-2.5">
      <div className="flex">
        {viewers.slice(0, 3).map((v, i) => (
          <span
            key={v.id}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-raised text-[10px] font-semibold text-canvas"
            style={{ marginLeft: i === 0 ? 0 : -7, background: v.color }}
            title={v.name}
          >
            {initials(v.name)}
          </span>
        ))}
      </div>
      <span className="text-[12.5px] text-dim">{text}</span>
    </div>
  );
}
