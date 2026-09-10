import { RequestForm } from "@/components/request-form";
import { requireUser } from "@/lib/require-user";

type NewRequestPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  await requireUser("/requests/new");
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900">
        Request coverage
      </h1>
      <p className="mt-2 text-stone-600">
        Ask someone to go to a place and report what is happening there firsthand.
      </p>
      <div className="mt-8">
        <RequestForm error={error} />
      </div>
    </main>
  );
}
