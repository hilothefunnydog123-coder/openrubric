import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ROUTES } from "@/lib/constants";

/** Light top bar for participant screens (no organizer/judge sidebar). */
export function SimpleHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-app items-center justify-between px-8 py-4">
        <Link href={ROUTES.home} className="text-ink">
          <Logo />
        </Link>
        <div className="flex items-center gap-5 text-sm text-dim">
          <Link href={ROUTES.submit} className="transition-colors hover:text-ink">
            Submit
          </Link>
          <Link href={ROUTES.teamDashboard} className="transition-colors hover:text-ink">
            My team
          </Link>
          <Link href={ROUTES.signIn} className="transition-colors hover:text-ink">
            Sign out
          </Link>
        </div>
      </div>
    </header>
  );
}
