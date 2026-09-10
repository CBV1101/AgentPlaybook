import { AuthForm } from "@/components/auth-form";
import { isMockMode } from "@/lib/data/mode";
import { safeNextPath } from "@/lib/paths";

type SignupPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <AuthForm
        mode="signup"
        error={error}
        next={safeNextPath(next) ?? undefined}
        demoHint={isMockMode()}
      />
    </main>
  );
}
