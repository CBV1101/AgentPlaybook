type MapPreviewProps = {
  latitude: number | null;
  longitude: number | null;
  label: string;
};

export function MapPreview({ latitude, longitude, label }: MapPreviewProps) {
  if (latitude === null || longitude === null) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-600">
        No map preview for this place yet.
      </div>
    );
  }

  const pad = 0.012;
  const bbox = `${longitude - pad},${latitude - pad},${longitude + pad},${latitude + pad}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
  const external = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <div>
      <iframe
        title={`Map of ${label}`}
        src={src}
        className="h-48 w-full rounded-2xl border border-stone-200 bg-stone-100"
        loading="lazy"
      />
      <p className="mt-2 text-xs text-stone-500">
        <a href={external} className="underline" target="_blank" rel="noreferrer">
          Open {label} on OpenStreetMap
        </a>
      </p>
    </div>
  );
}
