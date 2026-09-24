export const LICENSING_INTENDED_USES = [
  { id: "news_broadcast", label: "News broadcast" },
  { id: "documentary", label: "Documentary" },
  { id: "online_publication", label: "Online publication" },
  { id: "research", label: "Research" },
  { id: "commercial_use", label: "Commercial use" },
  { id: "other", label: "Other" },
] as const;

export type LicensingIntendedUse = (typeof LICENSING_INTENDED_USES)[number]["id"];

export const LICENSING_INQUIRY_STATUSES = ["inquiry", "discussing", "agreed", "declined"] as const;

export type LicensingInquiryStatus = (typeof LICENSING_INQUIRY_STATUSES)[number];

export function isLicensingIntendedUse(value: string): value is LicensingIntendedUse {
  return LICENSING_INTENDED_USES.some((item) => item.id === value);
}

export function isLicensingInquiryStatus(value: string): value is LicensingInquiryStatus {
  return (LICENSING_INQUIRY_STATUSES as readonly string[]).includes(value);
}

export function intendedUseLabel(id: string) {
  return LICENSING_INTENDED_USES.find((item) => item.id === id)?.label ?? id;
}

export function inquiryStatusLabel(status: string) {
  if (status === "completed") {
    return "Agreed";
  }
  if (status === "cancelled") {
    return "Declined";
  }
  if (status === "discussing") {
    return "Discussing";
  }
  if (status === "agreed") {
    return "Agreed";
  }
  if (status === "declined") {
    return "Declined";
  }
  return "Inquiry";
}

export function normalizeInquiryStatus(status: string): LicensingInquiryStatus {
  if (status === "completed" || status === "agreed") {
    return "agreed";
  }
  if (status === "cancelled" || status === "declined") {
    return "declined";
  }
  if (status === "discussing") {
    return "discussing";
  }
  return "inquiry";
}

export type LicensingInboxItem = {
  id: string;
  createdAt: string;
  status: LicensingInquiryStatus;
  organizationName: string;
  contactEmail: string;
  intendedUse: string;
  message: string;
  reportId: string;
  reportTitle: string;
  mediaId: string | null;
  mediaLabel: string;
  requesterName: string;
};
