export function LicensingRequestPlaceholder() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium text-stone-900">Available for licensing</p>
      <p className="mt-1 text-sm text-stone-600">
        The creator is open to commercial licensing requests for this media. Licensing transactions
        are not available yet.
      </p>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Licensing transactions are coming later"
        className="mt-3 min-h-12 w-full cursor-not-allowed rounded-full bg-stone-200 px-4 py-3 text-sm font-medium text-stone-500 sm:w-auto"
      >
        Request licensing
      </button>
      <p className="mt-2 text-xs text-stone-500">Coming later — no purchase or payment yet.</p>
    </div>
  );
}
