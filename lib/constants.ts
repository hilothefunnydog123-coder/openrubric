/** Shared, env-overridable constants. */

export const SITE = {
  name: "OpenRubric",
  tagline: "Open judging infrastructure for fairer hackathons.",
  /** External GitHub repo — override with NEXT_PUBLIC_GITHUB_URL. */
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/openrubric/openrubric",
} as const;

export const ROUTES = {
  home: "/",
  docs: "/docs",
  signIn: "/sign-in",
  signUp: "/sign-up",
  verify: "/verify",
  getStarted: "/get-started",
  organize: "/organize",
  organizerImport: "/organizer/import",
  organizerDashboard: "/dashboard/organizer",
  rankings: "/dashboard/organizer/rankings",
  judgeDashboard: "/dashboard/judge",
  teamDashboard: "/dashboard/team",
  submit: "/submit",
  project: (id: string) => `/judge/project/${id}`,
} as const;

/**
 * localStorage key holding a not-yet-created signup ({email, fullName, role,
 * password, invite}) between submitting the form and verifying the email. Lets the
 * email "Continue" magic link finish the deferred signup in the same browser.
 */
export const PENDING_SIGNUP_KEY = "openrubric-pending-signup";
