---
name: game-code-quality
description: Implement maintainable gameplay with explicit state ownership, deterministic rules and targeted regression checks. Use during game implementation or review.
---

# Gameplay code quality

Keep rules separate from rendering, device input and persistence. A small prototype needs a few focused modules, not an enterprise framework.

- Define legal states and transitions, including ready, playing, paused, won and lost where applicable. At a simultaneous terminal event, encode precedence once. Block gameplay input behind menus and terminal screens.
- Translate input into actions. Rules own validity, resources and rewards. The view derives from rules and cannot silently grant progress. Pass randomness/seeds and time into logic that needs replayability.
- Own every listener, timer, sound, animation loop and spawned object. Scene exit/retry disposes or resets them. Pause/focus loss cannot accumulate time or keep controls stuck.
- Validate level/content data before play: unique identifiers, in-bounds cells, legal targets, reachable goals, and known solutions or invariant proofs where feasible.
- Catch persistence and media activation failures at their boundary. A denied storage write must not crash the loop. Do not deserialize arbitrary executable content.
- Pin dependencies and commit locks when dependencies exist. Keep tokens, generated reports containing personal data, vendor caches and local runtime paths out of the repo.
- Test rules at their public boundary: invalid input, exact last-action win, undo, restart, deterministic replay and corrupted save. Include one failure-inducing fixture to prove the check detects a real regression.

Run relevant compiler/tests, then interact with the rendered game. A successful build cannot substitute for starting, playing, failing and restarting. Scope claims to the tested platform and artifact.
