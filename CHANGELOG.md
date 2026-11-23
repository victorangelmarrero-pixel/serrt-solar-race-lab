# Changelog

## 0.1.0 (2026-11-17)

First version prepared for GitHub.

### Added
- Repository structure: `site/`, `tests/`, `data/`, `docs/`, CI and GitHub Pages workflows.
- `docs/PHYSICS.md` with the energy model and its assumptions.
- `data/pitirre3.json`: every vehicle value with its source and whether it is documented or assumed.
- Text summaries of the four canvases for screen readers, and live regions for the decision card and the race ticker.

### Changed
- Fonts are self-hosted. The page no longer calls Google Fonts.
- Logo and team photo are served as WebP, with the original files as fallback.
- `game.js` is split into `js/shared.js`, `js/draw/`, `js/ui/` and `js/game.js`.
- The running order is sorted once per simulation step instead of on every read.
- The "final 90 minutes" card finds the fastest safe pace by bisection instead of trying every speed.
- The race canvas is repainted only when something changed, so paused and decision screens cost nothing.
- Smallest CSS and chart text raised to 12 px.

### Unchanged
- The physics model. `npm test` prints the same numbers as before this release.
