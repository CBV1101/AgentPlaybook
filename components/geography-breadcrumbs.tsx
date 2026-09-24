import Link from "next/link";

type Crumb = { href?: string; label: string };

export function GeographyBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="fh-meta">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="px-2 text-faint">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
