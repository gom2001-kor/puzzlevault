# Mosslight Wardens

An original small-scope WebGL action RPG built for PuzzleVault. The player is a lantern keeper restoring a forest across three deliberately placed 19×19-unit islands. All geometry is generated in source with the shared PV3D primitive renderer; sound uses the existing synthesized SFX. There are no downloaded models, textures, characters, music or external engine dependencies.

## Complete run

Each island contains five visible glowseeds, a central beacon and 5–6 crystal creatures. Collect all seeds and defeat all creatures, then interact within 2.2 units of the beacon. The first two beacons present three build choices; the third concludes the run. The final island includes an 18-vitality guardian with a longer warning/rush cycle. Failure produces a result screen and retry route. Local scores are personal, never represented as a verified ranking.

## Distinctive rule

The keeper plants a temporary living garden. It lasts 14 seconds, heals 0.48 vitality/second and adds one pulse damage while the keeper stands within its 2.3-unit radius. A garden also increases pulse reach from 2.15 to 3 units. Each island supplies two charges, and one regrows every 18 seconds, capped at three. Quest seeds are separate, so healing can never soft-lock beacon completion. Choosing where to stand matters more than repeated attack inputs alone.

Enemies warn in amber before a fixed-direction rush and recover afterward. They cannot hurt the player merely by touching during stalking or recovery. A dash grants 0.35 seconds of protection. Damage has a 1.15-second grace period to prevent overlapping creatures from instantly exhausting vitality. Trees and boundaries collide with both sides; all collectible and enemy locations are reachable (tested by flood fill).

## Controls and persistence

WASD/arrows move; Space/J pulses; Shift/K dashes; Q/L plants; E restores; P/Escape pauses. Touch provides persistent direction controls and four reachable actions. Movement supports multiple simultaneous pointers and clears on cancellation, focus loss and tab hiding. Both focus loss and hidden tabs pause gameplay. WebGL context loss pauses play; after restoration the player explicitly resumes.

Expedition stores an island-entry checkpoint (seed, zone, earned score, time and upgrades). Continue restarts that island with full vitality and its original seeds/enemies. Starting fresh replaces the checkpoint. Daily always starts from island one using getDailySeed('mosslight'); it is replayable and does not inherit an expedition build. A shared result uses the actual game URL and language, plus daily mode when applicable. No mid-combat advertising or pay-to-win mechanics. The disabled-by-default provider gets a single interstitial opportunity after a genuine terminal result; controls stay disabled while that promise settles.

## Validation

`node --test tests/mosslight.test.js` covers deterministic encounters, directional movement, obstacles and world bounds, reachability of every objective, garden resources/healing/damage, telegraphed enemy attacks, invulnerability, pause freezing, three-island victory, nonstacking upgrade rejection, save validation and completion deduplication. Page copy and the gameplay interface include English, Korean, Japanese, Chinese and Spanish.
