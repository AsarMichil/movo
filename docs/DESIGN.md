# Movo design language: "Platform"

White paper, near-black ink, one chartreuse number plate for the answer. Square
blocks, hard edges, transit-signage directness. The map is the canvas.

Mockups: mobile https://claude.ai/artifact/WXqkZT1H8LuysibsNypojp (variation A),
desktop https://claude.ai/artifact/WjVXrzxLrKLZdV8oapugAH (floating panel row).

## Principles

1. **The answer is the hero.** Cheapest provider and its price sit on the
   chartreuse plate, readable in under a second. The loser row is hatched and
   quiet, with the difference in `loser` red.
2. **One signal colour.** `signal` (#C6F432) marks the answer, the primary
   Compare action and the Park Here! pin. Nothing decorative uses it. On a
   light surface it only reads with a 2px `rule` frame around it: never put
   unframed signal on white.
3. **Brands stay small.** Evo and Modo colours only appear as a square identity
   dot (10px) next to the provider name, and as the Evo home zone on the map.
4. **Hard edges.** Radius 0 everywhere (except the circular origin marker).
   Frames are `border-2 border-rule`; internal dividers are `border-hair`. The
   only shadow is `shadow-block` on floating map panels.
5. **Type.** Inter Tight. Prices are `font-extrabold tabular-nums` with tight
   tracking. Field labels are `text-xs font-extrabold uppercase tracking-wider`.
   Everything else sentence case.
6. **Tokens only.** No `gray-*`, `slate-*`, `stone-*`, `green-*`, `amber-*`,
   no `dark:` colour overrides: the tokens below switch themselves under
   `.dark`. Touch targets at least 44px.

## Tokens (`src/app.css`)

| Token        | Light             | Dark    | Use                                     |
| ------------ | ----------------- | ------- | --------------------------------------- |
| `bg`         | #F2F3F3           | #0B0C0D | page, panels                            |
| `surface`    | #FFFFFF           | #161819 | cards, inputs, buttons                  |
| `ink`        | #0B0C0D           | #F2F4F3 | text, selected chips (`bg-ink text-bg`) |
| `muted`      | #565C5F           | #A0A6A9 | secondary text                          |
| `rule`       | #0B0C0D           | #F2F4F3 | 2px frames                              |
| `hair`       | #D8DBDC           | #2C3032 | 1px dividers                            |
| `hatch`      | #E4E7E8           | #24282A | `hatch` utility stripes (loser row)     |
| `signal`     | #C6F432           | same    | the answer, primary action, park pin    |
| `on-signal`  | #0B0C0D           | same    | text on signal                          |
| `loser`      | #C4291C           | #FF6B57 | price difference, errors                |
| `evo`/`modo` | #00A3D9 / #2A9D8F |         | identity dots only                      |
| `zone`       | #00BCE2           |         | Evo home zone overlay                   |

## Map styling (MapKit)

- Route: `ink` (light #0B0C0D, dark #F2F4F3), line width 5.
- Park Here! pin: `signal` fill, glyph "P", title "Park Here!".
- Destination: ink marker. Origin: muted marker.

## Layout

Two shells, shared pieces.

- **Mobile (< 768px):** full-screen map. Floating price card at the bottom
  with a "See details" action, a square ink "+" button to plan a trip. The form
  and the details open as a full-height sheet (dialog).
- **Desktop (>= 768px):** full-bleed map with a 400px floating card on the left
  (`top/left/bottom: 20px`, `border-2 border-rule shadow-block`), scrolling on
  its own. It switches between the form and the results. The map is padded on
  the left by the card's width so the fitted route never sits under it.

Shared components: price card (`TripVerdict`), parking note, trip summary,
cost breakdown, Modo plan switch (`Segmented`), form (`TripForm`), theme
toggle, copy link.
