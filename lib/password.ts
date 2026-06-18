/**
 * Password requirements — the single source of truth shared by the sign-up zod
 * schema (enforcement) and the live checklist UI (feedback as you type).
 */

export type PasswordRule = { id: string; label: string; test: (p: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
];

/** True when every requirement is met. */
export function passwordMeetsRules(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}
