export type LetterActionResult =
  | { ok: true; url: string; warning?: string }
  | { ok: false; error: string };

export function letterActionError(err: unknown, fallback: string): LetterActionResult {
  if (err instanceof Error && err.message && !err.message.includes("Server Components")) {
    return { ok: false, error: err.message };
  }
  return { ok: false, error: fallback };
}
