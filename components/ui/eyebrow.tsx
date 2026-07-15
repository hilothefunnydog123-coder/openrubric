import { cn } from "@/lib/utils";

type Tone = "dim" | "accent" | "faint" | "ondark";

const toneClass: Record<Tone, string> = {
  dim: "text-ink",
  accent: "text-accent",
  faint: "text-ink",
  ondark: "text-white",
};

/** The mono uppercase metadata label used as a section/eyebrow marker everywhere. */
export function Eyebrow({
  children,
  tone = "dim",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] font-bold uppercase tracking-[0.14em]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
