import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestigationCard } from "@/components/investigation-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Page } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { getProfileByUserId, listReporterInvestigations } from "@/lib/data";
import { loginPath } from "@/lib/paths";
import { redirect } from "next/navigation";

export default async function InvestigationsManagePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(loginPath("/profile/investigations"));
  }
  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    notFound();
  }
  const investigations = await listReporterInvestigations(user.id);

  return (
    <Page>
      <p className="fh-kicker">Your reporting</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="fh-title">Investigations</h1>
          <p className="mt-2 max-w-2xl fh-lede">
            Organize firsthand reports into a reporter-defined sequence. This grouping does not mean
            Firsthand verified your conclusions.
          </p>
        </div>
        <Link href="/profile/investigations/new" className={buttonClass("primary")}>
          Create investigation
        </Link>
      </div>
      {investigations.length === 0 ? (
        <EmptyState title="You have not started an investigation yet.">
          <p className="mt-2">
            <Link href="/profile/investigations/new" className="underline">
              Create one
            </Link>
          </p>
        </EmptyState>
      ) : (
        <div className="fh-grid mt-8">
          {investigations.map((item) => (
            <div key={item.id}>
              <InvestigationCard investigation={item} />
              <p className="mt-2 fh-meta">
                {item.status}
                {" · "}
                <Link href={`/profile/investigations/${item.id}`} className="underline">
                  Edit
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
