# Release Notes

## v0.1.0 - Initial Android Termux voice workflow

Initial usable release for running Pi with Android-native voice on Termux.

### Added

- Android TTS Pi extension using Termux:API `termux-tts-speak`.
- Commands:
  - `/say <text>`
  - `/android-speak <text>`
  - `/android-speak-test`
  - `/voice-test-long`
  - `/voice-auto on|off|status`
  - `/voice-doctor`
  - `/voice-stop`
  - `/voice-settings-android ...`
- Assistant tools:
  - `android_tts_speak`
  - `android_tts_config`
- Persistent settings in `~/.pi/agent/android-tts-settings.json`.
- Optional TTS settings for rate, pitch, engine, language, region, variant, and audio stream.
- Best-effort TTS stop shortcut: `ctrl+shift+q`.
- `npm run doctor` and `npm run doctor:speak` setup checks.
- GitHub/package-style Pi install support through the `pi` manifest in `package.json`.
- Android setup, troubleshooting, voice input, and TTS voice-selection docs.

### Notes

- Voice input uses Android keyboard dictation; Pi receives normal text.
- Voice output uses Android system TTS through Termux:API.
- `pi-listen` / Sherpa offline TTS is intentionally not used on Android/Termux because the native Sherpa TTS path is not available in this environment.
- `/voice-stop` is best-effort because Termux:API does not currently provide a dedicated `termux-tts-stop` command.
