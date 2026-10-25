---
name: web-game-core
description: Build small browser-native games with DOM or SVG, ES modules, keyboard and touch, deterministic rules and static subpath hosting. Use for board, card or turn-based prototypes without a required engine.
---

# Browser-native game core

Use DOM/SVG for modest board/card/turn-based games; select an engine for continuous physics, large sprite counts or an existing engine project. No dependency is needed just to rotate a tile or render a score.

1. Export pure state creation and action reduction from a rules module. Content lives in validated data; rendering reads state. Normalize rotations and coordinates. Traverse networks with a visited set and reciprocal connection checks.
2. Use semantic buttons for interactive cells with state-specific accessible names. Keep an accessible textual objective outside SVG. Arrow keys may move cell focus; Enter/Space invokes the same action as a click. Ignore global game shortcuts in form fields or open dialogs.
3. Prevent double-firing on touch by using one activation path. Do not disable page zoom. Size primary targets at least 44 CSS pixels where possible and verify no horizontal overflow at 360px.
4. Store versioned bounded preferences/progress behind try/catch; validate fields on read. Continue in memory if storage is denied and tell the player that records will not persist. No external tracking is needed for a local prototype.
5. Initialize audio only from a user action; retain mute and support reduced motion. Prefer CSS transitions for discrete board effects; an idle turn-based board does not need an endless simulation loop.
6. Resolve assets and module imports relative to the app, so deployment under a GitHub repository subpath works. Serve through HTTP for development. A file URL is not a reliable module/persistence environment.

Acceptance: one complete loop works with mouse, keyboard and touch emulation; storage exceptions do not prevent play; direct public-subpath reload succeeds; automated rules tests cover all levels plus the final-action boundary.

Primary references: [DOM events](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
