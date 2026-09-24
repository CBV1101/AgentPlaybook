import { isMockMode } from "@/lib/data/mode";

export function LocalModeBanner() {
  if (!isMockMode()) {
    return null;
  }

  return (
    <div className="border-b border-line bg-warn-soft px-4 py-2 text-center text-sm text-ink">
      Local mock data is on. Sign up and publish work on this machine until you add Supabase keys.
    </div>
  );
}
