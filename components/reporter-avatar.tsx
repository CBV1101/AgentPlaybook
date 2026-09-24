type ReporterAvatarProps = {
  name: string;
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

export function ReporterAvatar({ name, username, avatarUrl, size = "lg" }: ReporterAvatarProps) {
  const dimension =
    size === "lg" ? "h-24 w-24 text-2xl" : size === "md" ? "h-12 w-12 text-sm" : "h-8 w-8 text-[11px]";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${dimension} rounded-full border border-line object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dimension} flex items-center justify-center rounded-full bg-ink font-medium text-surface`}
      title={`@${username}`}
    >
      {initials || username.slice(0, 2).toUpperCase()}
    </div>
  );
}
