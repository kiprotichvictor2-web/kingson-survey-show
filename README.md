# Kingson Survey Show

Build a polished, fully functional, standalone browser game for a TikTok LIVE host called "KINGSON SURVEY SHOW" (an original family-survey game-show experience; do not use Family Feud trademarks, logos, copyrighted graphics, or copied question banks).

PRIMARY GOAL
Make it extremely easy for one host to operate alone from a single browser tab while streaming. Viewers watch the game on screen and answer verbally or in TikTok comments. Do not require sign-in, room codes, multiple devices, or player accounts.

VISUAL DESIGN
- Full-screen 16:9 game-show stage, premium black / midnight navy background, electric blue and warm metallic gold accents, tasteful spotlights, subtle glow, clean readable typography.
- Strong TV game-show atmosphere without visual clutter. Large answer boards and scores readable on a livestream.
- Responsive for desktop/laptop first, still usable on tablet/mobile.
- Original branding: KINGSON SURVEY SHOW. No official Family Feud branding or copied assets.

GAMEPLAY
- Main stage shows current survey question prominently, six large numbered answer tiles, two team podiums named TEAM A and TEAM B, large scores, and a three-strike display.
- Six answer slots start hidden. Host clicks a tile to reveal the answer and its points. Correct answers add their points to the active team's round bank. Prevent revealing the same tile twice.
- Host can select which team is active. Provide clear controls for award points / bank round points so the host can choose whether points go to the active team or remain in the round bank.
- Three strikes per team/turn. A strike control increments strikes and visibly shows X marks. Reset strikes when starting a new turn/round.
- Steal chance: after three strikes, allow switching to the opposing team for one guess. Host can reveal an unrevealed answer or mark the steal unsuccessful. If successful, bank the round points to the stealing team; if unsuccessful, award the round bank to the original team.
- Next question / next round controls. Include a clear round reset that does not erase match scores. Add a new match/reset match option with confirmation.
- Include at least 12 original, family-friendly survey questions, each with six plausible answers and points totaling 100. Examples: things people do after waking up; popular foods at a celebration; items people forget when travelling; things found in a kitchen; reasons people arrive late. Keep answers and points editable by the host.
- Question selector / question list with used and unused status. Random next question option.
- Winner announcement when host ends the game, with tie handling.
- A host control area that is clearly separated from the audience-facing stage. Include a "Stage view" toggle or clean display mode to hide controls for streaming.
- Include a short how-to-play overlay or help panel.
- Persist current game state locally in the browser so accidental refresh does not wipe scores and progress; provide reset controls.

QUALITY / FUNCTIONAL REQUIREMENTS
- All buttons and controls must work. No placeholder buttons.
- Use local state/localStorage; no backend or authentication required.
- Make it possible to test solo: one person can operate both teams from the same screen.
- Add keyboard shortcuts where sensible (1-6 reveal corresponding answer, X add strike, N next question) and show them in help.
- Ensure score math is correct and prevent double-counting.
- Add a polished initial demo game state with a first question ready to play, not an empty setup.
- Test the main flow: reveal answer, award points, strikes, steal, next question, refresh persistence, reset match. Fix issues before declaring ready.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kingson-survey-show.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0871d544-0513-46d7-a4f1-2c08a523110b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
