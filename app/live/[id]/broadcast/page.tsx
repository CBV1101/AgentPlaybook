import { notFound, redirect } from "next/navigation";
import { LiveStudio } from "@/components/live-studio";
import { Page } from "@/components/ui/page";
import { requireUser } from "@/lib/require-user";
import { getLiveStreamPage } from "@/lib/queries";

type BroadcastPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiveBroadcastPage({ params }: BroadcastPageProps) {
  const { id } = await params;
  const user = await requireUser(`/live/${id}/broadcast`);
  const stream = await getLiveStreamPage(id, user.id);
  if (!stream) {
    notFound();
  }
  if (stream.reporterId !== user.id) {
    redirect(`/live/${id}`);
  }
  if (stream.status === "terminated") {
    redirect(`/live/${id}`);
  }

  return (
    <Page width="article">
      <p className="fh-kicker">LIVE FIRSTHAND REPORT</p>
      <h1 className="mt-3 fh-title">{stream.title}</h1>
      <p className="mt-2 fh-lede">{stream.location.label}</p>
      <div className="mt-8">
        <LiveStudio stream={stream} />
      </div>
    </Page>
  );
}
