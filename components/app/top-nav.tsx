import { Eyebrow } from "@/components/ui/eyebrow";
import { ProfileMenu } from "@/components/app/profile-menu";
import { ThemeToggle } from "@/components/app/theme-toggle";

/** Sticky, blurred page header used across dashboard screens. */
export function TopNav({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-background/85 px-8 py-[22px] backdrop-blur-[12px]">
      <div>
        <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
        <ThemeToggle variant="icon" />
        <ProfileMenu />
      </div>
    </div>
  );
}
