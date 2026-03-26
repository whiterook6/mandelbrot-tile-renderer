# tile-renderer

## Requirements

- Node.js 20+ recommended
- Corepack enabled (for Yarn 4)

This repo is configured for `yarn@4.9.2` (`packageManager` in `package.json`).
If needed, enable Corepack and activate Yarn:

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
```

You can use npm, but Yarn is the default package manager for this project.

## Quick start

Install packages:

```bash
yarn install
```

Run locally:

```bash
yarn dev
```

Then open the local Vite URL shown in your terminal (usually `http://localhost:5173`).

## Controls

- `Mouse wheel`: zoom in/out at the cursor position
- `Left mouse drag`: pan
- `Right mouse drag`: rotate (twist)
- `+`: zoom in
- `-`: zoom out
- `Escape` or `> Home <`: reset to the default view
- `> Snapshot <`: download a PNG of the current canvas

## Status bar

Left to right, the view chips show:

- `view-x`: world X coordinate of the current center
- `view-y`: world Y coordinate of the current center
- `view-zoom`: current world width visible on screen
- `view-rotation`: current rotation in degrees
- purple counter (`queue-count`): number of tiles still waiting to render
