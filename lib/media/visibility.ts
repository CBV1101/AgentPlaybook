export type ReportMediaAccessInput = {
  publishStatus: string | null | undefined;
  removedAt: string | null | undefined;
  ownerId: string | null | undefined;
  viewerId: string | null | undefined;
  isAdmin?: boolean;
};

export function canViewReportMedia(input: ReportMediaAccessInput) {
  if (input.isAdmin) {
    return true;
  }
  if (input.removedAt) {
    return false;
  }
  if (input.publishStatus === "published") {
    return true;
  }
  if (input.publishStatus === "draft" && input.ownerId && input.viewerId && input.ownerId === input.viewerId) {
    return true;
  }
  return false;
}
