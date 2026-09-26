# Cloudweft Passage

An original, self-contained 3D sky-courier adventure. The public game id is `cloudweft` and its Korean subtitle is `구름결 여정`.

## Play loop

- Collect three dawn glyphs and reach the final portal in each of three handcrafted chapters.
- Switch between sun and moon to make alternating bridges solid. All seven islands (six main, one side branch) are permanent safe checkpoints.
- Chapter 2 introduces jumps over missing bridge segments and a moving sentry light. Chapter 3 widens the two gaps, adds another sentry and a small airborne wind nudge.
- Optional exploration finds four mint relics per chapter, including two on the side branch.
- Falling returns the courier to the latest island, retains collections and increments the rescue count once. There are no lives, purchases or ad requirements.
- Completed chapters unlock practice. Campaign and daily expeditions finish after chapter 3; practice finishes after one chapter.

## Controls and technical approach

WASD/arrows move along screen-aligned world X/Z axes. Space jumps; E switches world; Escape pauses. Touch controls support independent captured pointers for movement, jump and phase. Pointer cancellation, focus loss and document visibility changes clear held inputs. A lost WebGL context pauses; restoration still requires explicit resume.

The shared, original `/js/pv3d.js` renderer draws real 3D primitive meshes. Courier, foliage, islands, bridge sections, collectibles and portals are constructed from code. No third-party character, music, model, font, texture or game code is included. Sound uses the project's existing oscillator effects. The camera follows a fixed perspective; reduced-motion mode removes idle bobbing and camera easing without removing gameplay hazards.

`cloudweft-logic.js` exports pure level generation, stepping, support tests, checkpoint rescue, validated save restoration and scoring for Node tests. Physics uses fixed 60 Hz steps, normalized diagonal movement, a coyote jump window and jump buffering. A documented read-only `Cloudweft.inspect()` snapshot helps browser QA without granting a teleport/complete shortcut.

## Honest progression and sharing

Score = max(100, round(2200 + relics × 250 − active seconds × 3 − rescues × 100)). Gold needs all four relics, zero rescues and under 160 seconds; otherwise up to three rescues earns silver, then bronze. The final expedition medal is the lowest of its three chapter medals. Records are local and shared scores are self-reported, not verified online rankings. Regular chapter best scores are shown with a star in the practice menu.

Daily seeds follow the shared `gameId:YYYY-MM-DD` hash convention. They mirror all relevant island/bridge/pickup coordinates together on some days and change hazard phase, preserving the hand-built route. The starting UTC date is saved with the run and used in the result and share link even if midnight passes. Shared daily links retain date, mode and language.

Active runs save checkpoint, world, collections and elapsed statistics locally. A completed campaign chapter saves the next chapter immediately, so refreshing its results cannot resubmit that completion. Only a complete campaign/daily expedition or completed practice chapter calls `updateStats('cloudweft', score, {roundId})`; round IDs are retained across restoration. The normal disabled ad-provider boundary is invoked only after final results. Result buttons are held while that call is pending; starting another run during an ad is blocked.

## Validation

`node --test tests/cloudweft.test.js` covers full ordinary-input traversal of all three courses and daily mirrors, the optional branch round trip, real bridge support changes, coyote jump/no midair double jump, collection-preserving rescue, portal prerequisites/frozen victory, invalid and duplicate save data, course connectivity under mirroring, score/medal rules and five-language string coverage. This tests route reachability through movement rather than teleporting directly to a winning state.

The game includes a crawlable English guide and three FAQs, plus matching Korean, Japanese, Chinese and Spanish runtime guidance. It makes no AdSense approval, revenue or verified-player-count claim. A code originality review is not a worldwide trademark clearance; maintain that distinction when promoting the game.
