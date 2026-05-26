# Android/Termux Voice Architecture for Pi

## Goal

Replace `pi-listen` with a reliable Android-native voice workflow on Termux.

## Current working pieces

- Input: any Android voice-to-text keyboard. Samsung voice input is just the current keyboard on this device.
- Output: Termux:API command `termux-tts-speak`.
- Pi integration: `~/.pi/agent/extensions/android-tts.ts`.

## Commands

Inside Pi after `/reload`:

- `/say <text>` - speak text using Android TTS.
- `/android-speak <text>` - same as `/say`.
- `/android-speak-test` - longer test phrase.
- `/voice-auto on` - automatically speak assistant replies.
- `/voice-auto off` - stop automatic speaking.
- `/voice-auto status` - show current state.
- `/voice-settings-android rate=1.0 pitch=1.0` - adjust Android TTS rate/pitch.

The assistant also has tools named:

- `android_tts_speak` - speak a specific message aloud when explicitly asked.
- `android_tts_config` - enable/disable automatic spoken replies when the user asks for verbal responses or asks to stop speaking aloud.

Auto-speak state and rate/pitch are persisted in `~/.pi/agent/android-tts-settings.json`.

## Workflow

1. User dictates through any Android voice-to-text keyboard into Pi.
2. Pi receives normal text input.
3. Assistant responds in text.
4. If speech is wanted:
   - user runs `/say ...`, or
   - user asks assistant to speak something, or
   - `/voice-auto on` speaks assistant replies automatically.

## Architecture

```text
Android voice-to-text keyboard
        ↓
Android text input
        ↓
Pi chat/editor
        ↓
Assistant response
        ↓
android-tts.ts extension
        ↓
termux-tts-speak
        ↓
Termux:API Android app
        ↓
Android system TTS voice
```

## Design decisions

- Avoid `pi-listen` because its offline TTS path falls back to WASM and lacks `OfflineTts.createAsync`.
- Use Android's system TTS because it already works on this device.
- Keep speech output explicit by default so every assistant message is not automatically read unless requested.
- Strip code blocks and markdown before speaking to avoid awkward long code narration.
- Add light punctuation/line-break cleanup before speaking so Android TTS has better pause cues.
- Voice cadence is mostly controlled by Android's TTS engine, preferred voice, speech rate, and pitch settings.

## Future features

- Queue/cancel speech command.
- Chunk long replies into smaller speak calls.
- Optional wake/stop phrases if we later add microphone capture.
- A packaged npm/git Pi package once the local extension stabilizes.
