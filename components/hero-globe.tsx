export function HeroGlobe({ id = "hero" }: { id?: string }) {
  const clip = `${id}-globe-clip`;
  const fill = `${id}-globe-fill`;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem] lg:max-w-none" aria-hidden="true">
      <svg viewBox="0 0 320 320" className="h-full w-full text-geo">
        <defs>
          <clipPath id={clip}>
            <circle cx="160" cy="160" r="132" />
          </clipPath>
          <radialGradient id={fill} cx="34%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#f7fbfb" />
            <stop offset="62%" stopColor="#d5e3e5" />
            <stop offset="100%" stopColor="#9bb6b9" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="140" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="6" />
        <circle cx="160" cy="160" r="132" fill={`url(#${fill})`} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.25" />
        <g clipPath={`url(#${clip})`} fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1">
          <ellipse cx="160" cy="160" rx="132" ry="28" />
          <ellipse cx="160" cy="160" rx="132" ry="56" />
          <ellipse cx="160" cy="160" rx="132" ry="88" />
          <ellipse cx="160" cy="160" rx="132" ry="116" />
          <ellipse cx="160" cy="160" rx="28" ry="132" />
          <ellipse cx="160" cy="160" rx="56" ry="132" />
          <ellipse cx="160" cy="160" rx="88" ry="132" />
          <ellipse cx="160" cy="160" rx="116" ry="132" />
          <line x1="28" y1="160" x2="292" y2="160" />
          <line x1="160" y1="28" x2="160" y2="292" />
        </g>
        <g fill="var(--color-earth)">
          <circle cx="122" cy="126" r="4" />
          <circle cx="204" cy="138" r="4" />
          <circle cx="154" cy="186" r="4" />
          <circle cx="218" cy="202" r="3.5" />
        </g>
      </svg>
      <span className="fh-place absolute left-[8%] top-[18%] hidden text-geo/70 lg:block">Berlin</span>
      <span className="fh-place absolute right-[6%] top-[28%] hidden text-geo/70 lg:block">New York</span>
      <span className="fh-place absolute bottom-[22%] left-[4%] hidden text-geo/70 lg:block">Nairobi</span>
      <span className="fh-place absolute bottom-[12%] right-[8%] hidden text-geo/70 lg:block">Seoul</span>
    </div>
  );
}
