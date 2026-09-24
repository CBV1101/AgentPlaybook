import { AuthRequiredLink } from "@/components/auth-required-link";

const steps = [
  {
    n: "1",
    title: "Request it",
    body: "Ask what you want to see from anywhere in the world.",
  },
  {
    n: "2",
    title: "Someone answers",
    body: "People nearby see the request and choose to cover it.",
  },
  {
    n: "3",
    title: "See it firsthand",
    body: "Watch their live stream or see the photos, video, and firsthand report.",
  },
];

export function HowFirsthandWorks({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mt-10 sm:mt-12">
      <p className="fh-kicker">How Firsthand works</p>
      <h2 className="mt-2 max-w-xl fh-title">What&apos;s actually happening there? Ask someone who&apos;s there.</h2>
      <p className="mt-3 max-w-2xl fh-lede">
        Request who, what, or where you want to see. People nearby can answer the call with photos, video, or
        live reporting — giving you a firsthand view from the ground.
      </p>
      <ol className="mt-7 grid gap-8 sm:grid-cols-3 sm:gap-10">
        {steps.map((step, index) => (
          <li key={step.n} className="relative">
            {index < steps.length - 1 ? (
              <span className="absolute -right-6 top-[0.85rem] hidden text-geo sm:block" aria-hidden="true">
                →
              </span>
            ) : null}
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-geo text-sm font-semibold text-surface">
                {step.n}
              </span>
              <div>
                <h3 className="fh-report-title">{step.title}</h3>
                <p className="mt-1 fh-meta">{step.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6">
        <AuthRequiredLink href="/requests/new" isAuthenticated={signedIn} className="text-sm font-medium text-brand underline underline-offset-2">
          Ask someone on the ground
        </AuthRequiredLink>
      </p>
    </section>
  );
}
