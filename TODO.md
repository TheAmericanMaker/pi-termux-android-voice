# Pi Termux Android Voice TODO

## 1. Setup reliability

- [x] Add this project TODO list.
- [x] Add `npm run doctor` to check the local Android/Termux/Pi voice setup.
- [x] Add a Pi command, `/voice-doctor`, that runs similar checks from inside Pi.
- [x] Add clearer troubleshooting for common Termux / Termux:API install failures.

## 2. Installation polish

- [x] Add exact Pi install command once finalized against the current Pi docs.
- [x] Add a known-good environment section: Android version, Termux version, Termux:API version, Node version, Pi version.
- [x] Add a shorter quickstart for users who already have Termux and Pi installed.

## 3. Voice output features

- [x] Persist auto-speak, rate, and pitch across reloads.
- [x] Add assistant-callable `android_tts_config` for toggling verbal replies.
- [x] Add duplicate-speech suppression after explicit `android_tts_speak` calls.
- [x] Add best-effort `/voice-stop` and `ctrl+shift+q` shortcut.
- [x] Investigate a more reliable Android TTS cancel/flush path than an empty utterance.
- [x] Add optional engine/language/voice settings if Termux:API exposes enough reliable controls.

## 4. Voice input docs

- [x] Add Gboard voice typing setup notes.
- [x] Add Samsung voice input setup notes.
- [x] Explain that Pi receives dictated text as normal keyboard input.

## 5. Packaging

- [x] Package this as a cleaner Pi installable package/extension if Pi package support fits this use case.
- [x] Add release notes and tags once the workflow is stable.

## 6. Demo and examples

- [x] Add screenshots or a short demo video/GIF placeholder and demo transcript.
- [x] Add GitHub issue templates for bugs, Android setup help, and TTS engine reports.
- [x] Add example prompts for enabling/disabling verbal mode.
- [x] Add a longer TTS test paragraph command.
- [ ] Replace demo placeholder with a real screenshot, GIF, or short video.

## 7. Re-evaluation / next validation

- [ ] Test package-style install from GitHub on a clean or second Termux/Pi setup:
  ```bash
  pi install https://github.com/TheAmericanMaker/pi-termux-android-voice
  ```
- [ ] Confirm package-style install loads commands without manual `npm run install:android-tts` copy.
- [ ] Create a GitHub release page for tag `v0.1.0` using `RELEASE_NOTES.md`.
- [ ] Decide whether to publish to npm or keep GitHub-only installs.
- [ ] Collect compatibility reports for more Android devices, Termux versions, and TTS engines.
- [ ] Revisit `/voice-stop` if Termux:API adds a real TTS stop/cancel command.
- [ ] Consider chunking very long spoken replies into smaller TTS calls.
