# Firsthand design system

Firsthand should feel trustworthy, modern, immediate, geographic, media-first, clean, and neutral.

It should not feel like a political site, a traditional newspaper, a generic SaaS dashboard, a crypto product, or an AI-generated collection of cards.

Conceptual references (do not copy visually): Reuters/Bloomberg information clarity, YouTube media prominence, Google Maps geographic intuition, simple creator profiles.

## Tokens

Defined in `app/globals.css` (`@theme inline`):

| Token | Use |
| --- | --- |
| `canvas` | Page background (warm sand/stone) |
| `surface` | Content objects, inputs, menus |
| `ink` | Primary text and primary buttons |
| `muted` | Secondary text, body support |
| `faint` | Labels, metadata de-emphasis |
| `line` | Borders and rules |
| `brand` | Primary burgundy accent (kickers, focus, brand moments) |
| `geo` | Cool geographic accent (place names, map cues) |
| `earth` | Warm secondary accent (sparse highlights) |
| `live` | LIVE badge and go-live actions only |
| `danger` | Destructive actions and errors |

Stronger red is reserved for LIVE, urgent states, and destructive actions. Do not make the product red. Geographic identity comes from real place names, not flags or globes.

## Typography

One family: Source Sans 3 (`--font-body`). Do not add a display/serif face.

| Role | Class |
| --- | --- |
| Page title | `.fh-title` / `.fh-hero` |
| Section heading | `.fh-section` |
| Report / card title | `.fh-report-title` |
| Body | `.fh-body` |
| Supporting copy | `.fh-lede` |
| Metadata | `.fh-meta` |
| Labels | `.fh-label` |
| Brand kicker | `.fh-kicker` (not uppercase tracking) |
| Place identity | `.fh-place` (city, country) |
| Buttons | `Button` / `buttonClass()` |

Avoid newspaper eyebrows (`uppercase tracking-[0.2em]`).

## Spacing and layout

| Rule | Class / value |
| --- | --- |
| Page max width | `.fh-page` (`max-w-5xl`) |
| Narrow forms | `.fh-page-narrow` (`max-w-2xl`) |
| Article / report | `.fh-page-article` (`max-w-3xl`) |
| Mobile gutter | `px-4` |
| Section spacing | `.fh-section-block` (`mt-12`) |
| Grid gap | `.fh-grid` (`gap-4`) |
| Card padding | `p-4` / `p-5` |
| Control height | `h-10` |
| Radius | `rounded-md` controls, `rounded-lg` content cards |

Use whitespace and typography for page structure. Do not wrap every section in a bordered card.

## Components

Import from `@/components/ui/*` and existing product components:

- Buttons: `Button`, `buttonClass` — `primary`, `secondary`, `ghost`, `danger`, `live`
- Fields: `Field`, `TextInput`, `Textarea`, `Select`, `SearchInput`
- Status: `Badge`, `LiveBadge`, `LocationLabel`, `Timestamp`
- Layout: `Page`, `Section`, `Tabs`, `TabLink`, `EmptyState`, `LoadingState`, `ErrorState`, `Notice`, `MenuSurface`
- Overlay: `Modal`, `Dropdown`
- Content objects: `ReportCard`, `RequestCard`, `CoverageWantedCard`, `EventCard`, `LiveCard`
- People: `ReporterAvatar`, `ReporterPreview`

Cards are for actual content objects (reports, coverage requests, events, livestreams). Stats, how-it-works, form shells, and list rows should use type and rules, not card chrome.

## Responsive

Mobile-first. Preserve bottom navigation clearance (`pb-24 md:pb-0`). Pay attention to report viewing, publishing, live, profiles, maps, and navigation.

New UI must use these components and tokens rather than inventing new styles.
