import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-actions";
import { loginPath, signupPath } from "@/lib/paths";

type AuthFormProps = {
  mode: "login" | "signup";
  error?: string;
  next?: string;
  demoHint?: boolean;
};

const errorCopy: Record<string, string> = {
  supabase:
    "Supabase is not configured yet. Copy .env.example to .env.local and add your project URL and anon key.",
  missing: "Enter both an email address and a password.",
};

function messageForError(error?: string) {
  if (!error) {
    return null;
  }
  return errorCopy[error] ?? error;
}

export function AuthForm({ mode, error, next, demoHint }: AuthFormProps) {
  const isSignup = mode === "signup";
  const action = isSignup ? signUp : signIn;

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
        {isSignup ? "Create an account" : "Log in"}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        {isSignup
          ? "Sign up to request coverage or publish a firsthand report."
          : "Welcome back. Use the email and password for your Firsthand account."}
      </p>
      {demoHint ? (
        <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Local demo account: <span className="font-medium">jordan@firsthand.local</span> /{" "}
          <span className="font-medium">firsthand</span>
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {messageForError(error)}
        </p>
      ) : null}
      <form action={action} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-stone-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          {isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href={loginPath(next)} className="underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href={signupPath(next)} className="underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
