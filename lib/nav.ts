import { loginPath } from "@/lib/paths";

export const REPORT_ACTIONS = [
  {
    href: "/reports/new",
    title: "Publish firsthand report",
    description: "Share firsthand photos or video.",
  },
  {
    href: "/live/new",
    title: "Go live",
    description: "Broadcast what is happening now.",
  },
  {
    href: "/requests/new",
    title: "Request coverage",
    description: "Ask someone to show what is happening somewhere.",
  },
  {
    href: "/events/new",
    title: "Create event",
    description: "Group reports around something happening at a place.",
  },
] as const;

export function reportActionHref(href: string, isAuthenticated: boolean) {
  return isAuthenticated ? href : loginPath(href);
}

export function exploreIsActive(pathname: string) {
  return (
    pathname === "/browse" ||
    pathname.startsWith("/country/") ||
    pathname.startsWith("/city/") ||
    pathname.startsWith("/place/")
  );
}
