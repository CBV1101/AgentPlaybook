type ReporterAvatarProps = {
  name: string;
  username: string;
  avatarUrl?: string | null;
  size?: "md" | "lg";
};

export function ReporterAvatar({ name, username, avatarUrl, size = "lg" }: ReporterAvatarProps) {
  const dimension = size === "lg" ? "h-24 w-24 text-2xl" : "h-12 w-12 text-sm";
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
        className={`${dimension} rounded-full border border-stone-200 object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${dimension} flex items-center justify-center rounded-full bg-stone-800 font-medium text-stone-50`}
      title={`@${username}`}
    >
      {initials || username.slice(0, 2).toUpperCase()}
    </div>
  );
}
