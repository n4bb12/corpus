# Corpus Design

Visual references: `docs/color-palettes.html`, `docs/type-and-icons.html`.

## Palette (Green mineral)

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#F1F3EE` | `#141A17` |
| Surface | `#FAFBF8` | `#1B231F` |
| Pine | `#245844` | `#79B999` |
| Text | `#1E2823` | derived light |
| Muted text | `#68736C` | derived muted |
| Border | `#D8DED7` | soft pine-tinted |

Pine is the only decorative accent. Red, amber, and semantic green are reserved for feedback.

## Typography

- Self-hosted Figtree variable font
- Wordmark weight 700
- Tabular numerals for dates and counts

## Radius

- 16px cards, dialogs, composer
- 12px fields, menus, drop zones
- 10px buttons and icon controls
- Full pills only for citations and compact status

## Motion

- Hover/press ~120ms
- Menus/tooltips ~150ms
- Dialogs/tabs/panels/layout ~180ms
- Ease-out close to `[0.16, 1, 0.3, 1]`
- Menus fade and move ~4px
- Dialogs fade and scale from ~98.5%
- Notebook cards lift ≤2px
- Reduced motion: near-instant opacity only

## Atmosphere

Auth, library, and empty-state backgrounds may use a fixed pine radial wash plus fine monochrome noise. Cards, menus, source previews, and reading surfaces stay clean.

## Loading

Use production components with placeholder records. Placeholder text is transparent with a soft pine shimmer. Hide dummy content from assistive technology and expose one live loading status.

## Icons

Phosphor regular by default. Filled variants only for selected states.
