const CUSTOMER_HOST = /^customer-[a-z0-9]+\.cloudflarestream\.com$/i;

export function isCloudflareCustomerPlayerHost(hostname: string) {
  return CUSTOMER_HOST.test(hostname);
}

export function cloudflareCustomerWhepPlaybackUrl(liveInputId: string, sourceUrl: string): string | null {
  const id = liveInputId.trim();
  if (!id || id.includes("/") || id.includes("?") || id.includes("#")) {
    return null;
  }
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "https:" || !isCloudflareCustomerPlayerHost(parsed.hostname)) {
      return null;
    }
    return `https://${parsed.hostname}/${id}/webRTC/play`;
  } catch {
    return null;
  }
}

export function cloudflareCustomerLiveIframeUrl(liveInputId: string, sourceUrl: string): string | null {
  const id = liveInputId.trim();
  if (!id || id.includes("/") || id.includes("?") || id.includes("#")) {
    return null;
  }
  try {
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== "https:" || !isCloudflareCustomerPlayerHost(parsed.hostname)) {
      return null;
    }
    return `https://${parsed.hostname}/${id}/iframe`;
  } catch {
    return null;
  }
}

export function isCloudflareCustomerLiveIframeUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !isCloudflareCustomerPlayerHost(parsed.hostname)) {
      return false;
    }
    const path = parsed.pathname.replace(/\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    return parts.length === 2 && parts[1] === "iframe";
  } catch {
    return false;
  }
}

export function isGenericCloudflareIframeHost(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  try {
    return new URL(url).hostname === "iframe.cloudflarestream.com";
  } catch {
    return false;
  }
}
