---
name: game-engine-selection
description: Choose a game stack from player, device, delivery and project constraints; preserve an existing engine unless migration is requested.
---

# Engine selection from constraints

First inspect existing project fingerprints and exact versions. Preserve an existing working engine, package lock and asset pipeline unless the user requests migration or a concrete blocker requires an explained alternative.

For a new game, use the delivery and mechanic rather than skill-count popularity:

| Requirement | Candidate | Cost to check |
|---|---|---|
| Small turn-based grid/card/puzzle, instant URL, keyboard and touch | DOM/SVG + native ES modules, `web-game-core` | State complexity, DOM size, mobile layout |
| Browser action game with sprites, collision, cameras | Phaser with verified pinned release | Bundle size, actual major APIs, mobile performance |
| Browser 3D | three.js with pinned release | Model size, GPU capability, touch controls |
| Desktop/editor-authored 2D or 3D, native exports | Godot | Editor/templates and export constraints |
| Existing Unity pipeline, console/mobile integrations | Unity | Licensing, platform modules and build time |
| High-fidelity 3D requiring Unreal tools | Unreal | Hardware, downloads, packaging and licenses |
| Existing Go/Rust/Lua/Python/Roblox team or ecosystem | Match that ecosystem | Runtime distribution and platform constraints |

Record the chosen stack, two relevant alternatives, the decisive constraint and the reversal trigger. Do not add a heavy engine to a board puzzle to demonstrate coverage. Do not claim a catalog baseline is the current release: verify the project's locked version against its official documentation before using version-sensitive APIs. Record unverified baselines explicitly.

Acceptance: same brief plus an existing Unity project keeps Unity; a shareable mobile board game selects a browser-compatible stack; an offline desktop requirement includes an actual distributable, not a localhost URL.
