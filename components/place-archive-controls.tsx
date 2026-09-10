import Link from "next/link";
import type { PlaceArchiveFilters } from "@/lib/data/discovery";

type PlaceArchiveControlsProps = {
  slug: string;
  filters: PlaceArchiveFilters;
};

const sorts: Array<{ id: PlaceArchiveFilters["sort"]; label: string }> = [
  { id: "newest_uploaded", label: "Newest uploaded" },
  { id: "newest_captured", label: "Newest captured" },
  { id: "oldest", label: "Oldest" },
  { id: "most_requested", label: "Most requested coverage response" },
];

export function PlaceArchiveControls({ slug, filters }: PlaceArchiveControlsProps) {
  function href(next: Partial<PlaceArchiveFilters>) {
    const params = new URLSearchParams();
    const sort = next.sort ?? filters.sort;
    if (sort !== "newest_uploaded") {
      params.set("sort", sort);
    }
    const kinds = next.kinds ?? filters.kinds;
    for (const kind of kinds) {
      params.append("kind", kind);
    }
    const usage = next.usage ?? filters.usage;
    for (const item of usage) {
      params.append("usage", item);
    }
    const query = params.toString();
    return `/place/${slug}${query ? `?${query}` : ""}#archive`;
  }

  function toggleKind(kind: "video" | "photo") {
    const kinds = filters.kinds.includes(kind)
      ? filters.kinds.filter((item) => item !== kind)
      : [...filters.kinds, kind];
    return href({ kinds });
  }

  function toggleUsage(value: "view_only" | "licensing_available") {
    const usage = filters.usage.includes(value)
      ? filters.usage.filter((item) => item !== value)
      : [...filters.usage, value];
    return href({ usage });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Sort archive</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {sorts.map((sort) => (
            <Link
              key={sort.id}
              href={href({ sort: sort.id })}
              className={`min-h-10 rounded-full px-3 py-2 text-sm ${
                filters.sort === sort.id
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 text-stone-800"
              }`}
            >
              {sort.label}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Filters</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={toggleKind("video")} className={chip(filters.kinds.includes("video"))}>
            Video
          </Link>
          <Link href={toggleKind("photo")} className={chip(filters.kinds.includes("photo"))}>
            Photos
          </Link>
          <Link href={toggleUsage("view_only")} className={chip(filters.usage.includes("view_only"))}>
            View only
          </Link>
          <Link
            href={toggleUsage("licensing_available")}
            className={chip(filters.usage.includes("licensing_available"))}
          >
            Licensing available
          </Link>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Filters narrow this place archive. They are not an engagement ranking.
        </p>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return `min-h-10 rounded-full px-3 py-2 text-sm ${
    active ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-800"
  }`;
}
