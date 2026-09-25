# Figma fidelity pass: back to the original design

Date: 2026-09-25. Decided by Óscar. The source is the original Figma file ("UI Exercise", exported as `UI Exercise.fig`); the home, the top bar, the footer and the booking calendar were brought back to it after the plan V2.1 work drifted from it.

## Decisions

- **Orange text.** Figma's Orange/500 (`text-orange-500`, #f0601f) only on large text (24px and up, or 18.66px bold), where 3:1 is enough. Smaller orange text and links use `--color-brand-ink`, now #c5460d: Orange/500's hue darkened to the AA floor (4.57:1 on #f6f6f9, 4.93:1 on white). It is the one brand hex outside the DS ramp.
- **Top bar on the home** is transparent over the hero, as in Figma, and only while the page is at the very top; it turns solid (page color plus Figma's Surfaces/s2 hairline) on the first scroll, and without JavaScript. Every other route renders the solid bar. The plan V2.1 menu and both CTAs stay.
- **Agenda:** only the calendar (`month-calendar.tsx`) is restyled now. `agenda-flow.tsx` and `app/agenda/page.tsx` wait for the open PRs #30, #32 and #33; the time-zone select keeps the style of the form's other fields until then.
- **Layout from the Figma breakpoint frames.** `desktop:` is 950px (Figma's "Desktop 950–19..px"), `md:` 768px. `container-page` gives 20/32/96px gutters and caps content at 1248px. Sections pad 80px from 950 and 40px below.

## Deliberate deviations from Figma

- Plan V2.1 content stays: the hero subhead and two CTAs, the menu, FirstSession and Universe in place of "Aplicaciones Prácticas", the "+50 sesiones" badge, no TikTok. FirstSession, ServiceCard and Universe have no frame; they follow the design's cards, type and tag colors.
- WhatsApp button: 56px below 768px (Figma draws 80px) so it does not cover the hero's primary CTA; 80px from 768px.
- "¿Por qué Numerología?" photo: `object-cover`. The Figma instance stretches it; a distorted photo is not the design's intent.
- "Todo tiene sentido" keeps one accordion chevron. Figma's prev/next pair belongs to a carousel the site does not have.
- Selected calendar day: Figma's orange-300 fill plus a 1px orange-500 border, so the state reaches 3:1 against the card.
- Calendar month label keeps "Septiembre de 2026" (Figma shows "Mayo 2025").

## Follow-ups after #30, #32 and #33 merge

- Restyle the agenda form and panels to the Figma kit (inputs, time slots, headings, price), `container-page` on `app/agenda/page.tsx`, and the portrait in `agenda-flow.tsx` to `/lili-portrait.jpg`.
- The selected slot's secondary line (white at 80% on `brand-ink`) is below AA; it got slightly worse with the new `brand-ink`.
- `interest-form.tsx`: let the submit button wrap (at 350px its label is wider than the column), then drop the scoped `[&_button[type=submit]]` override in `app/regalar/page.tsx`.
- New pages from those PRs (`/encuentros/[codigo]`, `/regalar/[codigo]`) should use `container-page`.
