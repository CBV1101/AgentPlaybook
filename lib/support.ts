export function peopleSupportedThisReporting(count: number) {
  const formatted = new Intl.NumberFormat("en-US").format(count);
  return count === 1
    ? `${formatted} person supported this reporting`
    : `${formatted} people supported this reporting`;
}

export function communitySupportLabel(count: number) {
  const formatted = new Intl.NumberFormat("en-US").format(count);
  return count === 1 ? `${formatted} community support` : `${formatted} community supports`;
}
