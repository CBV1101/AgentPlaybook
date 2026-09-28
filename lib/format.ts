export function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatWhenUtc(value: string) {
  const date = new Date(value);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function formatRelativeTime(value: string, now = Date.now()) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return formatWhen(value);
  }
  const seconds = Math.round((now - then) / 1000);
  const abs = Math.abs(seconds);
  const future = seconds < 0;
  if (abs < 45) {
    return future ? "in a few seconds" : "just now";
  }
  const minutes = Math.round(abs / 60);
  if (minutes < 60) {
    return relativeCount(minutes, "minute", future);
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return relativeCount(hours, "hour", future);
  }
  const days = Math.round(hours / 24);
  if (days < 14) {
    return relativeCount(days, "day", future);
  }
  return formatWhen(value);
}

export function formatDuration(startedAt: string, endedAt: string) {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return null;
  }
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) {
    return "less than a minute";
  }
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${hours}h ${rest}m`;
}

export function formatWatchingCount(count: number) {
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  const whole = Math.round(count);
  if (whole < 1000) {
    return `${whole} watching`;
  }
  const thousands = whole / 1000;
  const compact = thousands >= 10 ? Math.round(thousands).toString() : thousands.toFixed(1).replace(/\.0$/, "");
  return `${compact}K watching`;
}

function relativeCount(count: number, unit: string, future: boolean) {
  const label = `${count} ${count === 1 ? unit : `${unit}s`}`;
  return future ? `in ${label}` : `${label} ago`;
}
