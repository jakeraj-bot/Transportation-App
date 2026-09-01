import { inputClass } from "@/components/ui";
import { getSetting } from "@/lib/data";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const demo = (await getSetting("demoMode", "off")) === "on";
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-[0_16px_50px_rgba(44,58,71,0.08)]">
        <p className="text-xs uppercase tracking-[0.18em] text-teal">Passaic County</p>
        <h1 className="serif mt-2 text-3xl">{demo ? "Transportation demo" : "Transportation office"}</h1>
        <p className="mt-2 text-muted">
          {demo
            ? "This local copy is filled with sample packets so you can learn the screens. The live site will start empty."
            : "Sign in with your county account. This app is only for internal staff."}
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose">
            That email or password did not match. Try again.
          </p>
        ) : null}
        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email</span>
            <input
              className={inputClass}
              name="email"
              type="email"
              required
              defaultValue="jjacobs@doe.nj.gov"
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <input className={inputClass} name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="w-full rounded-xl bg-teal py-3 font-medium text-white hover:bg-teal-dark" type="submit">
            Sign in
          </button>
        </form>
        {demo ? (
          <p className="mt-4 text-sm text-muted">
            Demo password for everyone is Passaic2026!. Try jjacobs@doe.nj.gov, tanisha@passaic.nj.us, mary@passaic.nj.us, or debby@passaic.nj.us.
          </p>
        ) : null}
      </div>
    </div>
  );
}
