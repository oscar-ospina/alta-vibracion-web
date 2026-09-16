# Frontend verification notes

Working notes from the landing fidelity pass. The rules that change how code is
written live in `CLAUDE.md`; this file keeps the longer how-to details.

## Verify CSS against a fresh build, not dev HMR

Turbopack dev HMR can serve stale CSS for class changes: a new arbitrary utility or
variant may not appear until a full rebuild, so a `getComputedStyle` probe can
falsely read `none`. Verify with `rm -rf .next && npm run dev`, or
`npm run build && npm run start`.

Headless harness used across the fidelity work: Playwright from the global npx
cache against the server on a fixed port:

```bash
NODE_PATH=~/.npm/_npx/<hash>/node_modules node script.js
```

## Exact Figma matches

- `bg-card` = `#ffffff` (Figma card background)
- `text-foreground` = `#363744` (Figma body text)

## Tailwind v4 quirks (details)

- `group-open:` compiles to nothing in this consumer. For a `<details>` chevron
  target the open ancestor: `[[open]_&]:rotate-90`. v4 `rotate-*` sets the CSS
  `rotate:` property, so animate with `transition-[rotate]`, not
  `transition-transform`.
- Gradient text: use `.text-gradient-brand` from `app/brand.css` (clips
  `--grad-text` to the glyphs, with a `@supports` solid-color fallback). Tailwind
  v4 does emit the `-webkit-background-clip` alias, so inline
  `bg-clip-text text-transparent` is not invisible on modern browsers; the class
  exists for the pre-prefix tail and the acceptance criteria. This is unrelated to
  the DS Button focus-ring box-shadow that genuinely does not render.
- Bleed-image cards: the DS `Card` defaults to `rounded-2xl border py-6`; for a
  flush bleed image override with `rounded-[2rem] border-0 p-0` and pad the
  content cell instead.
