import { AuthForm } from "@/components/auth-form";
import { Page } from "@/components/ui/page";
import { isMockMode } from "@/lib/data/mode";
import { safeNextPath } from "@/lib/paths";

type SignupPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error, next } = await searchParams;

  return (
    <Page>
      <AuthForm
        mode="signup"
        error={error}
        next={safeNextPath(next) ?? undefined}
        demoHint={isMockMode()}
      />
    </Page>
  );
}
