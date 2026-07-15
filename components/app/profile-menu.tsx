"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useImageDrop } from "@/components/ui/use-image-drop";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, LogOut, Settings, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { cn, initials } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/** Round avatar, uploaded image, or initials on the user's color. */
function Avatar({
  name,
  color,
  url,
  size,
}: {
  name: string;
  color: string;
  url: string | null;
  size: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function ProfileMenu() {
  const { user, loading, refresh, signOut } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // A present Supabase auth cookie ("sb-…") means the user IS signed in and the profile
  // is just still resolving, show a neutral avatar placeholder, never a misleading
  // "Sign in". The sign-in affordance only appears when there's genuinely no session.
  const hasAuthCookie =
    typeof document !== "undefined" && /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
  if (!loading && !user && !hasAuthCookie) {
    return (
      <Link
        href={ROUTES.signIn}
        className="rounded-control border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
      >
        Sign in
      </Link>
    );
  }
  if (!user) {
    return <span className="h-8 w-8 rounded-full bg-sunken" aria-hidden />;
  }

  async function handleSignOut() {
    await signOut();
    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        aria-label="Account menu"
      >
        <Avatar name={user.name} color={user.color} url={user.avatarUrl} size={34} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[14px] border border-line bg-surface shadow-card"
          >
            <div className="flex items-center gap-3 border-b border-line-soft p-4">
              <Avatar name={user.name} color={user.color} url={user.avatarUrl} size={40} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">{user.name}</div>
                <div className="truncate font-mono text-[11px] text-faint">{user.email}</div>
              </div>
            </div>
            <div className="p-1.5">
              <span className="mb-1 ml-2.5 mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                {user.role}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-sunken"
              >
                <Settings className="h-4 w-4 text-dim" strokeWidth={1.8} />
                Edit profile
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-signal-high transition-colors hover:bg-[rgba(180,69,60,0.06)]"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <EditProfileModal
            onClose={() => setEditing(false)}
            onSaved={() => {
              void refresh();
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditProfileModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [preview, setPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarDrop = useImageDrop((file) => void uploadAvatar(file));

  async function uploadAvatar(file: File) {
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't upload that image.");
        return;
      }
      setPreview(data.avatar_url);
      onSaved();
    } catch {
      setError("Network error uploading the image.");
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't save your name.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  // Portal to <body> so the modal centers on the viewport, rendering it inside the
  // backdrop-blurred TopNav would anchor `position: fixed` to that header instead.
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] rounded-[18px] border border-line bg-surface p-6 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Edit profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-faint transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            {...avatarDrop.dropProps}
            className={cn(
              "group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 transition-shadow",
              avatarDrop.dragging ? "ring-accent" : "ring-transparent",
            )}
            aria-label="Change profile picture"
          >
            <Avatar name={name || user?.name || ""} color={user?.color ?? "#2563EB"} url={preview} size={64} />
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity group-hover:opacity-100",
                avatarDrop.dragging ? "opacity-100" : "opacity-0",
              )}
            >
              <Camera className="h-5 w-5 text-white" strokeWidth={1.8} />
            </span>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-control border border-line bg-raised px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
            >
              {uploading ? "Uploading…" : "Change picture"}
            </button>
            <p className="mt-1.5 font-mono text-[10.5px] text-faint">
              Drag &amp; drop or click · PNG, JPG, WEBP · max 4 MB
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
            }}
          />
        </div>

        <label htmlFor="profile-name" className="mb-1.5 block text-[12.5px] font-medium text-ink">
          Display name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-control border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-ink"
          placeholder="Your name"
        />

        {error && <p className="mb-3 text-[12.5px] text-signal-high">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-dim transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveName()}
            disabled={saving}
            className="rounded-control bg-ink px-4 py-2 text-[13.5px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
