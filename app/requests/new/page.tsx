import { RequestForm } from "@/components/request-form";
import { Page } from "@/components/ui/page";
import { requireUser } from "@/lib/require-user";

type NewRequestPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  await requireUser("/requests/new");
  const { error } = await searchParams;

  return (
    <Page width="narrow">
      <h1 className="fh-title">Request coverage</h1>
      <p className="mt-2 fh-lede">
        Ask someone to go to a place and report what is happening there firsthand.
      </p>
      <div className="mt-8">
        <RequestForm error={error} />
      </div>
    </Page>
  );
}
