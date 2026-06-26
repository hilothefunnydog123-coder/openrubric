/** Shared, env-overridable constants. */

export const SITE = {
  name: "OpenRubric",
  tagline: "Open judging infrastructure for fairer hackathons.",
  /** External GitHub repo — override with NEXT_PUBLIC_GITHUB_URL. */
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/aaditmehtacoder/openrubric",
  /**
   * Where organizers reach the team when their platform isn't Devpost (or an import
   * needs a hand). Override with NEXT_PUBLIC_SUPPORT_EMAIL.
   */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "openrubric@gmail.com",
} as const;

export const ROUTES = {
  home: "/",
  docs: "/docs",
  signIn: "/sign-in",
  signUp: "/sign-up",
  verify: "/verify",
  authCallback: "/auth/callback",
  getStarted: "/get-started",
  organize: "/organize",
  organizerImport: "/organizer/import",
  organizerDashboard: "/dashboard/organizer",
  organizerTeam: "/dashboard/organizer/team",
  organizerApprovals: "/dashboard/organizer/approvals",
  rankings: "/dashboard/organizer/rankings",
  judgeDashboard: "/dashboard/judge",
  teamDashboard: "/dashboard/team",
  teamScores: "/dashboard/team/scores",
  submit: "/submit",
  pricing: "/pricing",
  video: "/video",
  contact: "/contact",
  feedback: "/feedback",
  terms: "/terms",
  privacy: "/privacy",
  project: (id: string) => `/judge/project/${id}`,
} as const;

/**
 * localStorage key holding a not-yet-created signup ({email, fullName, role,
 * password, invite}) between submitting the form and verifying the email. Lets the
 * email "Continue" magic link finish the deferred signup in the same browser.
 */
export const PENDING_SIGNUP_KEY = "openrubric-pending-signup";
