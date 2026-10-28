export function isPostgresDatabase(url = process.env.DATABASE_URL) {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url));
}

/** Match a typed search on either SQLite or Postgres. Postgres comparisons are case-sensitive unless asked. */
export function textContains(term: string, postgres = isPostgresDatabase()) {
  return postgres ? { contains: term, mode: "insensitive" as const } : { contains: term };
}
