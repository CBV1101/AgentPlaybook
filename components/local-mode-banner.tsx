import { isMockMode } from "@/lib/data/mode";

export function LocalModeBanner() {
  if (!isMockMode()) {
    return null;
  }

  return (
    <div className="border-b border-line bg-warn-soft px-4 py-2 text-center text-sm text-ink">
      Local mock data is on because FIRSTHAND_USE_MOCK is set. This store is development-only and
      cannot run in production.
    </div>
  );
}
