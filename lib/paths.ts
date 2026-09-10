export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  return value;
}

export function loginPath(next?: string | null) {
  const safe = safeNextPath(next);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

export function signupPath(next?: string | null) {
  const safe = safeNextPath(next);
  return safe ? `/signup?next=${encodeURIComponent(safe)}` : "/signup";
}

export function withNext(href: string, next?: string | null) {
  const safe = safeNextPath(next);
  if (!safe) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}next=${encodeURIComponent(safe)}`;
}
