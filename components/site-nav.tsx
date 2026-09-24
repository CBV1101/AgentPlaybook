"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { ReporterAvatar } from "@/components/reporter-avatar";
import { SearchBox } from "@/components/search-box";
import { signOut } from "@/lib/auth-actions";
import { exploreIsActive, REPORT_ACTIONS, reportActionHref } from "@/lib/nav";
import { loginPath, signupPath } from "@/lib/paths";

export type SiteNavProps = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  unread: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type OpenMenu = "report" | "profile" | null;

const navLinkClass =
  "rounded-md px-1 py-1 text-sm text-muted hover:text-ink fh-focus";
const menuItemClass =
  "block rounded-md px-3 py-2.5 text-left hover:bg-canvas fh-focus";
const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink hover:bg-canvas fh-focus";

export function SiteNav({
  isAuthenticated,
  isAdmin,
  unread,
  username,
  displayName,
  avatarUrl,
}: SiteNavProps) {
  const pathname = usePathname();
  const [openState, setOpenState] = useState<{ menu: OpenMenu; path: string }>({
    menu: null,
    path: pathname,
  });
  if (openState.path !== pathname) {
    setOpenState({ menu: null, path: pathname });
  }
  const openMenu = openState.menu;

  const closeMenus = useCallback(() => {
    setOpenState({ menu: null, path: pathname });
  }, [pathname]);

  function toggleMenu(menu: Exclude<OpenMenu, null>) {
    setOpenState((current) => ({
      menu: current.menu === menu ? null : menu,
      path: pathname,
    }));
  }

  function setOpenMenu(menu: Exclude<OpenMenu, null>) {
    setOpenState({ menu, path: pathname });
  }

  const reportMenuId = useId();
  const profileMenuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const reportButtonDesktopRef = useRef<HTMLButtonElement>(null);
  const reportButtonMobileRef = useRef<HTMLButtonElement>(null);
  const profileButtonDesktopRef = useRef<HTMLButtonElement>(null);
  const profileButtonMobileRef = useRef<HTMLButtonElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        headerRef.current?.contains(target) ||
        bottomNavRef.current?.contains(target) ||
        reportMenuRef.current?.contains(target) ||
        profileMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeMenus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        const desktopTrigger =
          openMenu === "report" ? reportButtonDesktopRef.current : profileButtonDesktopRef.current;
        const mobileTrigger =
          openMenu === "report" ? reportButtonMobileRef.current : profileButtonMobileRef.current;
        const trigger =
          desktopTrigger && desktopTrigger.offsetParent !== null ? desktopTrigger : mobileTrigger;
        closeMenus();
        trigger?.focus();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const menu = openMenu === "report" ? reportMenuRef.current : profileMenuRef.current;
      const items = menu?.querySelectorAll<HTMLElement>("[role='menuitem']");
      if (!items?.length) {
        return;
      }
      event.preventDefault();
      const index = [...items].findIndex((item) => item === document.activeElement);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = index < 0 ? 0 : (index + delta + items.length) % items.length;
      items[next]?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu, closeMenus]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const menu = openMenu === "report" ? reportMenuRef.current : profileMenuRef.current;
    const first = menu?.querySelector<HTMLElement>("[role='menuitem']");
    first?.focus();
  }, [openMenu]);

  const publicProfileHref = username ? `/u/${username}` : "/profile";
  const exploreActive = exploreIsActive(pathname);
  const wantedActive = pathname === "/wanted";
  const searchActive = pathname === "/search";
  const followingActive = pathname === "/following";
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/") || pathname.startsWith("/u/");

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 md:py-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-ink fh-focus"
            >
              Firsthand
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
              <Link
                href="/browse"
                className={navLinkClass}
                aria-current={exploreActive ? "page" : undefined}
              >
                Explore
              </Link>
              <Link
                href="/wanted"
                className={navLinkClass}
                aria-current={wantedActive ? "page" : undefined}
              >
                Coverage wanted
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/following"
                  className={navLinkClass}
                  aria-current={followingActive ? "page" : undefined}
                >
                  Following
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-3">
            <Link
              href="/search"
              aria-label="Search"
              aria-current={searchActive ? "page" : undefined}
              className={`${iconButtonClass} lg:hidden`}
            >
              <SearchIcon />
            </Link>
            <div className="hidden lg:block">
              <SearchBox size="compact" />
            </div>
            <button
              ref={reportButtonDesktopRef}
              type="button"
              className="hidden h-10 items-center rounded-md bg-ink px-3.5 text-sm font-medium text-surface hover:bg-ink/90 fh-focus md:inline-flex"
              aria-expanded={openMenu === "report"}
              aria-haspopup="menu"
              aria-controls={reportMenuId}
              onClick={() => toggleMenu("report")}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpenMenu("report");
                }
              }}
            >
              + Report
            </button>

            {isAuthenticated ? (
              <>
                <NotificationBell unread={unread} />
                <button
                  ref={profileButtonDesktopRef}
                  type="button"
                  className={`${iconButtonClass} hidden overflow-hidden border-0 p-0 md:inline-flex`}
                  aria-label="Account menu"
                  aria-expanded={openMenu === "profile"}
                  aria-haspopup="menu"
                  aria-controls={profileMenuId}
                  onClick={() => toggleMenu("profile")}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setOpenMenu("profile");
                    }
                  }}
                >
                  <ReporterAvatar
                    name={displayName || "Reporter"}
                    username={username || "reporter"}
                    avatarUrl={avatarUrl}
                    size="sm"
                  />
                </button>
              </>
            ) : (
              <>
                <Link href={loginPath()} className={`${navLinkClass} hidden md:inline`}>
                  Log in
                </Link>
                <Link
                  href={signupPath()}
                  className="inline-flex h-10 items-center rounded-md bg-ink px-3 text-sm font-medium text-surface hover:bg-ink/90 fh-focus"
                >
                  Sign up
                </Link>
              </>
            )}

            {openMenu === "report" ? (
              <ReportMenu
                id={reportMenuId}
                menuRef={reportMenuRef}
                isAuthenticated={isAuthenticated}
                className="fixed inset-x-3 bottom-24 z-50 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-80"
              />
            ) : null}
            {openMenu === "profile" && isAuthenticated ? (
              <ProfileMenu
                id={profileMenuId}
                menuRef={profileMenuRef}
                publicProfileHref={publicProfileHref}
                isAdmin={isAdmin}
                className="fixed inset-x-3 bottom-24 z-50 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-64"
              />
            ) : null}
          </div>
        </div>

        {openMenu ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-ink/30 md:hidden"
            aria-label="Close menu"
            onClick={closeMenus}
          />
        ) : null}
      </header>

      <nav
        ref={bottomNavRef}
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-5xl grid-cols-5 items-end px-2 pt-2">
          <li>
            <MobileNavLink href="/browse" label="Explore" active={exploreActive} icon="explore" />
          </li>
          <li>
            <MobileNavLink href="/wanted" label="Wanted" active={wantedActive} icon="wanted" />
          </li>
          <li className="flex justify-center">
            <button
              ref={reportButtonMobileRef}
              type="button"
              className="-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-md bg-ink text-surface hover:bg-ink/90 fh-focus"
              aria-label="Report"
              aria-expanded={openMenu === "report"}
              aria-haspopup="menu"
              aria-controls={reportMenuId}
              onClick={() => toggleMenu("report")}
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[10px] font-medium">Report</span>
            </button>
          </li>
          <li>
            <MobileNavLink
              href={isAuthenticated ? "/following" : loginPath("/following")}
              label="Following"
              active={followingActive}
              icon="following"
            />
          </li>
          <li>
            {isAuthenticated ? (
              <button
                ref={profileButtonMobileRef}
                type="button"
                className={`flex w-full flex-col items-center gap-0.5 pb-2 text-[11px] fh-focus ${
                  profileActive || openMenu === "profile" ? "text-ink" : "text-muted"
                }`}
                aria-label="Profile menu"
                aria-expanded={openMenu === "profile"}
                aria-haspopup="menu"
                aria-controls={profileMenuId}
                onClick={() => toggleMenu("profile")}
              >
                <MobileIcon name="profile" />
                Profile
              </button>
            ) : (
              <MobileNavLink href={loginPath()} label="Log in" active={pathname === "/login"} icon="profile" />
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}

function ReportMenu({
  id,
  menuRef,
  isAuthenticated,
  className,
}: {
  id: string;
  menuRef: RefObject<HTMLDivElement | null>;
  isAuthenticated: boolean;
  className: string;
}) {
  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label="Report actions"
      className={`fh-menu ${className}`}
    >
      {REPORT_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={reportActionHref(action.href, isAuthenticated)}
          role="menuitem"
          className={menuItemClass}
        >
          <span className="block text-sm font-medium text-ink">{action.title}</span>
          <span className="mt-0.5 block fh-meta">{action.description}</span>
        </Link>
      ))}
    </div>
  );
}

function ProfileMenu({
  id,
  menuRef,
  publicProfileHref,
  isAdmin,
  className,
}: {
  id: string;
  menuRef: RefObject<HTMLDivElement | null>;
  publicProfileHref: string;
  isAdmin: boolean;
  className: string;
}) {
  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label="Account"
      className={`fh-menu ${className}`}
    >
      <Link href={publicProfileHref} role="menuitem" className={menuItemClass}>
        <span className="block text-sm font-medium text-ink">My reporter profile</span>
        <span className="mt-0.5 block fh-meta">Your public reporting page.</span>
      </Link>
      <Link href="/profile" role="menuitem" className={menuItemClass}>
        <span className="block text-sm font-medium text-ink">Edit profile</span>
      </Link>
      <Link href="/notifications" role="menuitem" className={menuItemClass}>
        <span className="block text-sm font-medium text-ink">Notifications</span>
        <span className="mt-0.5 block fh-meta">Inbox and notification settings.</span>
      </Link>
      <Link href="/profile/licensing" role="menuitem" className={menuItemClass}>
        <span className="block text-sm font-medium text-ink">Licensing</span>
      </Link>
      {isAdmin ? (
        <Link href="/admin/moderation" role="menuitem" className={menuItemClass}>
          <span className="block text-sm font-medium text-ink">Admin moderation</span>
        </Link>
      ) : null}
      <form action={signOut}>
        <button type="submit" role="menuitem" className={`${menuItemClass} w-full text-sm font-medium text-ink`}>
          Log out
        </button>
      </form>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.75]">
      <circle cx="11" cy="11" r="6" />
      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function MobileNavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: "explore" | "wanted" | "following" | "profile";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 pb-2 text-[11px] fh-focus ${
        active ? "text-ink" : "text-muted"
      }`}
    >
      <MobileIcon name={icon} />
      {label}
    </Link>
  );
}

function MobileIcon({ name }: { name: "explore" | "wanted" | "following" | "profile" }) {
  const paths = {
    explore: "M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    wanted: "M4 6h16M4 12h16M4 18h10",
    following:
      "M15 11a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0zM5 20a6 6 0 0 1 12 0M19 8.5a2.5 2.5 0 1 0-2 4.2M21 20a5 5 0 0 0-3-4.6",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 20a6 6 0 0 1 12 0",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.75]">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}
