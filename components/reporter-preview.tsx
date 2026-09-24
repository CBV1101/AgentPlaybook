import Link from "next/link";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { cn } from "@/lib/cn";

export function ReporterPreview({
  name,
  username,
  avatarUrl,
  meta,
  href,
  className,
}: {
  name: string;
  username: string;
  avatarUrl?: string | null;
  meta?: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <ReporterAvatar name={name} username={username} avatarUrl={avatarUrl} size="md" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate fh-meta">@{username}{meta ? ` · ${meta}` : ""}</p>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block hover:bg-canvas fh-focus">
      {content}
    </Link>
  );
}
