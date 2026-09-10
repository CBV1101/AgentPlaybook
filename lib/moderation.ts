export const MODERATION_REASONS = [
  { id: "harassment", label: "Harassment" },
  { id: "threats", label: "Threats" },
  { id: "doxxing", label: "Doxxing/private information" },
  { id: "graphic_content", label: "Graphic content" },
  { id: "copyright", label: "Copyright/ownership issue" },
  { id: "misleading_ownership", label: "Misleading media ownership claim" },
  { id: "illegal_content", label: "Illegal content" },
  { id: "other", label: "Other" },
] as const;

export const MODERATION_STATUSES = ["open", "reviewed", "dismissed", "removed"] as const;

export type ModerationReason = (typeof MODERATION_REASONS)[number]["id"];
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
export type ModerationContentType = "firsthand_report" | "coverage_request";

export function moderationReasonLabel(reason: string) {
  return MODERATION_REASONS.find((item) => item.id === reason)?.label ?? reason;
}

export function contentPath(contentType: ModerationContentType, contentId: string) {
  return contentType === "coverage_request" ? `/requests/${contentId}` : `/reports/${contentId}`;
}

export const PLATFORM_PUBLISHING_RULE =
  "Upload only media you created or have the right to publish. Do not post private personal information, threats, harassment or illegal content.";

export const ALLEGATION_WARNING =
  "Be careful when making allegations about identifiable people. Publish what you observed and the evidence you have, and avoid presenting unverified accusations as established fact.";

export type ModerationQueueItem = {
  id: string;
  submittedBy: string;
  submittedByUsername: string;
  contentType: ModerationContentType;
  contentId: string;
  contentTitle: string;
  contentHref: string;
  contentRemoved: boolean;
  reason: ModerationReason;
  details: string | null;
  createdAt: string;
  status: ModerationStatus;
};
