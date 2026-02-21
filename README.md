# midiShad

MIDI-controllable visual module player with LFO modulation, built with React + TypeScript + Vite.

Loads visual modules (2D canvas, Three.js 3D, p5.js, D3) from a `nw_wrld/modules/` folder at runtime. Modules expose params as sliders that can be mapped to MIDI CC knobs and modulated by up to 4 LFOs with cross-modulation, drive, symmetry, and per-assignment dividers.

## Features

- **Module system**: hot-reloading JS modules extending `ModuleBase` (2D) or `BaseThreeJsModule` (3D) with declarative params, options, and actions
- **MIDI CC mapping**: learn mode, absolute/relative knob support, per-device mappings
- **MIDI clock sync**: BPM derived from incoming MIDI clock
- **4 LFOs**: sine, triangle, square, sawtooth, S&H, perlin noise; BPM-synced or free Hz; LFO-to-LFO cross-modulation with cycle detection
- **CC Monitor**: real-time graphs for CC values
- **MIDI Debug Log**: decoded live MIDI message stream
- **FPS Meter**: frame rate overlay
- **Fullscreen mode**: hides all UI chrome
- **Persistence**: manual save (Cmd+S) of all state to localStorage

## Quick Start

```bash
npm install
npm run dev
```

Dev server runs at `http://localhost:5173/particles/`.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Toggle controls panel |
| `f` | Toggle fullscreen |
| `l` | Toggle LFO panel |
| `m` | Toggle CC monitor (when MIDI connected) |
| `d` | Toggle MIDI debug log (when MIDI connected) |
| `p` | Toggle FPS meter |
| `c` | Toggle settings |
| `Cmd+S` | Save state |

## Module Development

See [nw_wrld/MODULE_DEVELOPMENT.md](./nw_wrld/MODULE_DEVELOPMENT.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
