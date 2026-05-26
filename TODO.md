# Pi Termux Android Voice TODO

## 1. Setup reliability

- [x] Add this project TODO list.
- [x] Add `npm run doctor` to check the local Android/Termux/Pi voice setup.
- [x] Add a Pi command, `/voice-doctor`, that runs similar checks from inside Pi.
- [ ] Add clearer troubleshooting for common Termux / Termux:API install failures.

## 2. Installation polish

- [ ] Add exact Pi install command once finalized against the current Pi docs.
- [ ] Add a known-good environment section: Android version, Termux version, Termux:API version, Node version, Pi version.
- [ ] Add a shorter quickstart for users who already have Termux and Pi installed.

## 3. Voice output features

- [x] Persist auto-speak, rate, and pitch across reloads.
- [x] Add assistant-callable `android_tts_config` for toggling verbal replies.
- [x] Add duplicate-speech suppression after explicit `android_tts_speak` calls.
- [x] Add best-effort `/voice-stop` and `ctrl+shift+q` shortcut.
- [ ] Investigate a more reliable Android TTS cancel/flush path than an empty utterance.
- [ ] Add optional engine/language/voice settings if Termux:API exposes enough reliable controls.

## 4. Voice input docs

- [ ] Add Gboard voice typing setup notes.
- [ ] Add Samsung voice input setup notes.
- [ ] Explain that Pi receives dictated text as normal keyboard input.

## 5. Packaging

- [ ] Package this as a cleaner Pi installable package/extension if Pi package support fits this use case.
- [ ] Add release notes and tags once the workflow is stable.

## 6. Demo and examples

- [ ] Add screenshots or a short demo video/GIF.
- [ ] Add example prompts for enabling/disabling verbal mode.
- [ ] Add a longer TTS test paragraph command.
