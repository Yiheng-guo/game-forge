---
name: game-playtest-release
description: Validate a complete game loop, collect privacy-conscious playtest evidence and publish a verified shareable artifact. Use for game acceptance, playtesting and release.
---

# Playable artifact to shareable evidence

## Technical acceptance

Exercise initial load, instruction comprehension, one legal and illegal action, progress feedback, win, loss, undo where provided, retry, level change and reload. For touch games use an actual touch-capable browser context; record that emulation is not a physical-device check. Test keyboard-only focus and the narrowest supported viewport. Check console errors, asset requests and layout overflow. Separately test denied/corrupt storage and media activation.

For deterministic puzzles, verify all shipped levels have a legal solution inside the move budget. Ensure a winning final move takes precedence over budget failure and a displayed hint is legal in the current state. Repeated retry must not multiply event handlers or rewards.

## Experience validation

Observe first-time players without narrating controls. Before sessions, write the task and threshold. Measure time to first intentional action, first success, retry and help use; ask what the player expected at the confusing moment. Separate observations, player quotes and interpretations. Do not fabricate sessions or treat automated agents as evidence of human enjoyment.

Keep telemetry local and bounded unless remote collection is needed and authorized. Offer export/clear controls and disclose what leaves the browser. Report sample size and device context; do not present a small convenience sample as a population result.

## Release

Preserve the user's hosting choice. Use a clean checkout and relative asset paths; test repository subpath deployment. Source push, build, deployment, HTTP reachability and rendered play are separate outcomes. Check the final public URL without private credentials where a public demo is requested. A localhost address is not a teammate share link.

Keep rollback tied to an immutable commit/tag. Do not enable paid services, alter an existing repository's visibility, overwrite a release, or broaden publication beyond existing authorization. The final handoff states the repository, usable URL, controls and material untested platforms. See [release evidence schema](assets/release-evidence.json) for machine-readable results; null means unknown, never passed.
