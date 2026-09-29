const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp|heic|heif)$/i;

function isUuid(value: string) {
  return UUID.test(value);
}

export function isOwnedReportImagePath(path: string, ownerId: string, reportId: string) {
  if (!ownerId || !reportId || !isUuid(ownerId) || !isUuid(reportId)) {
    return false;
  }
  if (!path || path.includes("\\") || path.includes("..") || path.startsWith("/") || path.includes("//")) {
    return false;
  }
  const parts = path.split("/");
  if (parts.length !== 3) {
    return false;
  }
  const [userSegment, reportSegment, objectName] = parts;
  if (!userSegment || !reportSegment || !objectName) {
    return false;
  }
  if (userSegment !== ownerId || reportSegment !== reportId) {
    return false;
  }
  return OBJECT_NAME.test(objectName);
}
