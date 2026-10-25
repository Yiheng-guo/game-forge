---
name: game-product-brief
description: Define a testable game prototype from a short product idea. Use for new games and substantial gameplay scope changes, not isolated bug fixes.
---

# Product brief to playable scope

Turn the user's sentence into a buildable decision. Keep their audience, genre and constraints.

1. Identify the player, intended feeling, repeated action, meaningful tradeoff and success/failure conditions. Distinguish supplied facts from assumptions. Infer reversible details; ask only when an unresolved choice changes the product materially.
2. Specify the smallest complete loop: entry → instruction → action → feedback → win/loss → retry. A title screen is not a prototype. Include one representative later challenge so the first screen cannot hide missing depth.
3. Record target devices, expected session length, delivery platform, acceptable costs, asset rights and whether progress survives reload. Default to no backend or analytics service when the learning question does not need one.
4. Split work into core mechanic, usable loop and delivery. Give each item an observable acceptance example. Put multiplayer, accounts, monetization or generative APIs outside scope unless required by the user.
5. Write one falsifiable learning hypothesis and a decision threshold. Example: first-time players can intentionally complete the first connection in 60 seconds and choose to try the next challenge. This remains a hypothesis until observed with people; automated passes cannot establish fun.

Use [the brief template](assets/brief.md) when a developer or teammate needs a handoff. Player-facing screens contain rules and feedback, not implementation notes or build status.
