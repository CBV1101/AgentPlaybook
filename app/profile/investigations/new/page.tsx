import Link from "next/link";
import { GeocodedLocationField } from "@/components/geocoded-location-field";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea, TextInput } from "@/components/ui/field";
import { ErrorState, Notice, Page } from "@/components/ui/page";
import { createInvestigation } from "@/lib/investigation-actions";
import { requireCompleteReporterProfile } from "@/lib/require-profile";

type NewInvestigationPageProps = {
  searchParams: Promise<{ error?: string; attach?: string }>;
};

export default async function NewInvestigationPage({ searchParams }: NewInvestigationPageProps) {
  await requireCompleteReporterProfile("/profile/investigations/new");
  const { error, attach } = await searchParams;

  return (
    <Page width="narrow">
      <p className="fh-kicker">
        <Link href="/profile/investigations" className="underline">
          Investigations
        </Link>
      </p>
      <h1 className="mt-2 fh-title">Create investigation</h1>
      <p className="mt-2 fh-lede">
        A multi-part firsthand reporting series. Readers follow your order, not upload time.
      </p>
      <Notice>
        Firsthand organizes firsthand accounts. Publishing an investigation does not certify that your
        conclusions are true.
      </Notice>
      {error ? <ErrorState>{error === "title" ? "Add a title." : error}</ErrorState> : null}
      <form action={createInvestigation} className="mt-6 space-y-5">
        {attach ? <input type="hidden" name="attach_report_id" value={attach} /> : null}
        <Field label="Title" htmlFor="title">
          <TextInput id="title" name="title" required maxLength={200} placeholder="Fraud investigation — Minnesota" />
        </Field>
        <Field label="Description" htmlFor="description" hint="What is this reporting about? Optional.">
          <Textarea id="description" name="description" rows={5} maxLength={20000} />
        </Field>
        <GeocodedLocationField />
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
        <Button type="submit">Create investigation</Button>
      </form>
    </Page>
  );
}
