"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileSetupBanner({ show }: { show: boolean }) {
  const pathname = usePathname();
  if (!show || pathname === "/profile" || pathname.startsWith("/profile/")) {
    return null;
  }

  return (
    <div className="border-b border-line bg-warn-soft">
      <p className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-ink">
        <span>Finish your reporter profile so people can find your public page.</span>
        <Link href="/profile" className="font-medium underline">
          Finish your reporter profile
        </Link>
      </p>
    </div>
  );
}
