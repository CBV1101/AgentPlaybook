import { CloudflareWhepReferenceClient } from "@/components/cloudflare-whep-reference-client";
import { Page } from "@/components/ui/page";
import { notFound } from "next/navigation";

export default function CloudflareWhepTestPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return (
    <Page width="narrow">
      <p className="fh-kicker">Development</p>
      <h1 className="fh-title mt-2">Cloudflare official WHEP</h1>
      <p className="fh-body mt-4">
        This page uses Cloudflare Stream’s browser WHEP example as literally as practical. It does not use Firsthand’s
        live preview, ICE wait, STUN config, or data channel.
      </p>
      <div className="mt-8">
        <CloudflareWhepReferenceClient />
      </div>
    </Page>
  );
}
