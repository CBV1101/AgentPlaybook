import Link from "next/link";
import type { CoverageRequest } from "@/lib/types";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function RequestCard({ request }: { request: CoverageRequest }) {
  const locationContent = request.locationSlug ? (
    <Link href={`/place/${request.locationSlug}`} className="hover:underline">
      {request.location}
    </Link>
  ) : (
    request.location
  );

  const title = (
    <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg text-stone-900">
      {request.title}
    </h3>
  );

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-stone-500">{locationContent}</p>
      {isUuid(request.id) ? (
        <Link href={`/requests/${request.id}`} className="block hover:underline">
          {title}
        </Link>
      ) : (
        title
      )}
      <p className="mt-3 text-sm text-stone-600">
        {request.supporterCount} {request.supporterCount === 1 ? "person wants" : "people want"} this
        covered
      </p>
    </article>
  );
}
