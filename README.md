# midiShad

MIDI-controllable shader/module player with LFO modulation, built with React + TypeScript + Vite.

## Changelog

### Unreleased (since 0.0.0)

#### LFO Engine
- 4 LFO slots with sine, triangle, square, sawtooth, sample & hold shapes
- Drive control (0-1): waveshaping from clean to hard-clipped
- Symmetry control (0-1): morphs triangle/saw (ramp up <-> triangle <-> ramp down), controls pulse width on square
- S&H "Random Freq" mode: hold times use random musical subdivisions (1/16 to 4x) instead of uniform steps
- `shapedWave()` as single source of truth for all waveform generation
- Per-LFO noise state (no cross-talk between slots)
- Speed modes: BPM-synced (1/4, 1/2, 1, 2, 4 dividers) or free Hz
- Bipolar/unipolar output modes

#### LFO-to-LFO Modulation
- Any LFO param (strength, hz, drive, symmetry) can be modulated by another LFO or MIDI CC
- DFS cycle detection prevents circular routing
- Topological sort (Kahn's algorithm) ensures correct computation order
- CC learn mode for LFO params (separate from module param learn)
- Previews and overlay reflect modulated waveforms in real-time

#### LFO Overlay
- Toggleable 4-square waveform display (top-left corner, 150px each)
- All previews share the same clock — relative speed differences are visible
- Shows effective (modulated) waveforms including drive, symmetry, strength, bipolar

#### URL Parameters
- `?module=<kebab-slug>` — load a module by name (e.g. `?module=fragment-shader` loads `FragmentShader`)
- Module IDs are auto-converted from PascalCase to kebab-case at build time
- Overrides persisted module selection

#### Asset Loading
- Base-path agnostic: `assetUrl()`, `readText()`, `loadJson()` use `import.meta.env.BASE_URL`
- Works with any Vite `base` config (e.g. `/particles/`)
- Fonts loaded via relative CSS imports (Vite-resolved)

#### UI
- Draggable floating panel with position persistence
- shadcn ButtonGroup for all selectors (shape, speed mode, divider, LFO slot, clock source, UI scale)
- Silver pixel font for UI chrome, Roboto Mono for modules
- UI scale setting (Small / Normal / Big) persisted to localStorage
- CSS isolation: Tailwind/shadcn scoped to `.ui-chrome`, modules get clean slate via `.module-container`
- Accurate scrolling waveform preview per LFO (uses engine's `shapedWave`)
- Collapsible param/option/action sections in module controls
- App settings dialog: MIDI device, clock source, BPM, UI scale
- Top-right icon buttons (Lucide: Component, Settings) for tablet-friendly panel/config access

#### MIDI
- MIDI device selection with hot-plug support
- MIDI clock sync (BPM derived from clock messages)
- CC learn for module params and LFO params
- CC routing to LFO parameters

#### Persistence
- LFO definitions, assignments, base values saved to localStorage
- LFO param modulation routing persisted
- Panel position, open state, UI scale persisted
- Active module and param values persisted
