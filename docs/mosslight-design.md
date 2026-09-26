# Mosslight Wardens design and validation

Updated 2026-09-27 for the premium forest revision.

## World and rendering

Three original island layouts now use layered beveled earth, individually shaped rock shelves, clustered tree canopies, exposed roots, stepping stones, mushrooms, grass and lantern posts. A closer tracking camera follows a rounded lantern keeper with a backpack, boots, face, hands and a moving lantern. Enemies have distinguishable silhouettes: grounded stalkers, floating ringed casters, larger brutes and a horned final guardian. The shared PV3D renderer supplies shadow-map lighting, fog and bloom; the scene contains no external artwork, models or audio. Particle geometry does not cast shadows. Foreground canopies fade when close enough to obscure the player. Static terrain arrays are cached by island.

The interface uses forest greens, warm brass controls, a cinematic translucent camp menu, explicit cooldowns and a visible Bloom meter. The mobile control deck preserves touch movement and five distinct actions. Reduced motion disables decorative world animation and camera smoothing. WebGL loss pauses the game; local saves and the fallback message remain supported.

## Combat and choices

- Pulse: automatic radial targeting, 0.62-second cooldown (0.48 in a garden). Three successful attacks with no gap above 2.2 seconds produce a wider third pulse with +1 damage. A miss or damage breaks the chain.
- Stalkers: amber directional warning, then a fixed-direction rush and recovery window.
- Casters: keep range, warn, then shoot a three-bolt fan. Bolts move through space and can be sidestepped or dashed through.
- Brutes: clearly marked ground circle before a damaging slam.
- Final guardian: at half vitality, changes into a second phase, alternating rushes with ground slams and a five-bolt fan. The second slam marker warns at the player's previous position.
- Bloom: starts at 25/100 per island. Hits (+10), defeats (+12), seeds (+8) and a shrine (+35) build energy. At 100, R/the Bloom button clears flying bolts, damages enemies within 6.5 world units, staggers survivors for 2 seconds, restores 1 vitality and grants 1 second of invulnerability. Damage is 4, or 6 with Wildflare. A defeat from Bloom can contribute normal defeat energy toward the next charge.
- Garden: remains 14 seconds, heals 0.48 vitality/second, adds 1 pulse damage, recovers a charge every 18 seconds up to three. Quest seeds are never consumed.
- Optional northwest shrine: after three island victories, attune it with E and select one blessing for this island. Renewal heals 2, grants a garden charge and reduces regeneration to 12 seconds. Wildflare strengthens Bloom. Both grant 35 energy. Selection pauses combat, is single-use and resets on the next island.
- Beacon progression retains the earlier root/pulse/wind build choices and three-island ending.

## State and localization

The v1 checkpoint format remains compatible. Checkpoints intentionally represent island entrances, so shrine choices and momentary combat state are reset on Continue. Daily seeds and dated share links keep the exact shared UTC hash algorithm. All new UI, onboarding, guides, shrine choices and messages are translated into English, Korean, Japanese, Chinese and Spanish. Statistics are written once for a genuine win/loss. Ads remain delegated to the existing terminal-result controller; no new ad provider or in-combat ad is introduced.

## Validation

`node --test tests/mosslight.test.js`: 18 passing tests. Coverage includes deterministic dates, all quest/shrine reachability, collision bounds, garden economics, telegraph-before-damage, combo timing, caster volleys, brute warning delays, Bloom charging/clearing/staggering, shrine eligibility/single-use/reset, boss phase transition, pause freezing, full three-island completion, v1 save validation and result de-duplication.

Headless Edge desktop and Korean mobile previews reported no JavaScript errors and no horizontal overflow. Desktop and mobile visual screenshots were inspected. Root integration performs the final cross-game browser/renderer checks.
