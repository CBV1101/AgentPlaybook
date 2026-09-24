import type { ReportMedia } from "@/lib/database.types";
import { formatWhen } from "@/lib/format";
import {
  combinedProvenanceHeadline,
  normalizeProvenanceType,
  provenanceHeadline,
} from "@/lib/media/provenance";

const providerLabel: Record<ReportMedia["provider"], string> = {
  "cloudflare-stream": "Cloudflare Stream",
  "supabase-storage": "Supabase Storage",
  local: "Local media store",
};

export function MediaProvenance({
  media,
  reporterName,
}: {
  media: ReportMedia[];
  reporterName: string;
}) {
  if (media.length === 0) {
    return null;
  }

  const types = media.map((item) => normalizeProvenanceType(item.provenance_type));

  return (
    <div className="mt-4">
      <p className="fh-meta">{combinedProvenanceHeadline(types)}</p>
      <details className="mt-2">
        <summary className="cursor-pointer fh-meta underline">Media origin</summary>
        <p className="mt-3 fh-meta">
          This describes where Firsthand got the file, not whether the report is true. Firsthand does
          not determine authenticity.
        </p>
        <ul className="mt-4 space-y-4">
          {media.map((item) => {
            const type = normalizeProvenanceType(item.provenance_type);
            return (
              <li key={item.id} className="border-t border-line pt-3">
                <p className="text-sm font-medium text-ink">
                  {item.original_filename || (item.media_type === "video" ? "Video" : "Photo")}
                </p>
                <p className="mt-1 fh-meta">{provenanceHeadline(type)}</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="fh-label">Creator</dt>
                    <dd className="mt-1 text-sm text-ink">{reporterName}</dd>
                  </div>
                  <div>
                    <dt className="fh-label">Type</dt>
                    <dd className="mt-1 text-sm text-ink">{item.media_type === "video" ? "Video" : "Photo"}</dd>
                  </div>
                  <div>
                    <dt className="fh-label">Captured</dt>
                    <dd className="mt-1 text-sm text-ink">
                      {item.captured_at ? formatWhen(item.captured_at) : "Not supplied"}
                    </dd>
                  </div>
                  <div>
                    <dt className="fh-label">Uploaded</dt>
                    <dd className="mt-1 text-sm text-ink">{formatWhen(item.uploaded_at)}</dd>
                  </div>
                  <div>
                    <dt className="fh-label">Provider</dt>
                    <dd className="mt-1 text-sm text-ink">{providerLabel[item.provider] ?? item.provider}</dd>
                  </div>
                  <div>
                    <dt className="fh-label">Provider asset</dt>
                    <dd className="mt-1 break-all text-sm text-ink">{item.provider_asset_id || "Not stored"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="fh-label">Original file SHA-256</dt>
                    <dd className="mt-1 break-all text-sm text-ink">
                      {item.original_sha256 || "Not stored for this asset"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="fh-label">Provenance record</dt>
                    <dd className="mt-1 text-sm text-ink">{type}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
