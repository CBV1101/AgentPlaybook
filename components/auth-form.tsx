import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState, Notice } from "@/components/ui/page";
import { Field, TextInput } from "@/components/ui/field";
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
    <div className="mx-auto w-full max-w-md">
      <h1 className="fh-title">{isSignup ? "Create an account" : "Log in"}</h1>
      <p className="mt-2 fh-meta">
        {isSignup
          ? "Sign up to request coverage or publish a firsthand report."
          : "Welcome back. Use the email and password for your Firsthand account."}
      </p>
      {demoHint ? (
        <Notice>
          Local demo account: <span className="font-medium">jordan@firsthand.local</span> /{" "}
          <span className="font-medium">firsthand</span>
        </Notice>
      ) : null}
      {error ? <ErrorState>{messageForError(error)}</ErrorState> : null}
      <form action={action} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label="Email" htmlFor="email">
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={6}
          />
        </Field>
        <Button type="submit" className="w-full">
          {isSignup ? "Sign up" : "Log in"}
        </Button>
      </form>
      <p className="mt-4 fh-meta">
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
