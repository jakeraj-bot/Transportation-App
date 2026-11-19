export const SECOND_REVIEW_ROLES = ["super_admin", "reviewer", "office_manager"] as const;

export function userCanSecondReview(user: { role?: string | null; permissionKeys?: string[] | null }) {
  if (user.role && (SECOND_REVIEW_ROLES as readonly string[]).includes(user.role)) return true;
  return Boolean(user.permissionKeys?.includes("second_review"));
}

export function reviewerLabel(
  userName?: string | null,
  typedName?: string | null
) {
  return (userName ?? "").trim() || (typedName ?? "").trim() || "";
}

export function parseReviewerChoice(choice: string, typed: string) {
  const name = typed.trim();
  if (name) return { userId: null as string | null, name };
  const value = choice.trim();
  if (value.startsWith("user:")) return { userId: value.slice(5) || null, name: null as string | null };
  if (value.startsWith("name:")) return { userId: null, name: value.slice(5) || null };
  if (value) return { userId: value, name: null };
  return { userId: null, name: null };
}
