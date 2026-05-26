# Android Termux Voice Notes for Pi

This repo started as notes for making `pi-listen`/Sherpa work on Android Termux. The current direction is different: remove `pi-listen` and use Android-native voice pieces that are already reliable on this device.

## Current working setup

- **Voice input:** any Android voice-to-text keyboard. Samsung voice input is what this device currently uses, but Gboard voice typing or another dictation keyboard should work the same way because Pi only receives normal text.
- **Voice output:** Termux:API using Android system TTS:

  ```bash
  termux-tts-speak "Termux API works"
  ```

- **Pi integration:** local extension:

  ```text
  ~/.pi/agent/extensions/android-tts.ts
  ```

  The tracked copy lives at:

  ```text
  extensions/android-tts.ts
  ```

  Install/update it locally with:

  ```bash
  mkdir -p ~/.pi/agent/extensions
  cp extensions/android-tts.ts ~/.pi/agent/extensions/android-tts.ts
  ```

## Why `pi-listen` was removed

On Android/Termux ARM64, `sherpa-onnx-node` installs the JS wrapper but npm does not provide the required native package:

```text
sherpa-onnx-android-arm64/sherpa-onnx.node
```

The WASM fallback can initialize some Sherpa pieces, but the offline TTS path fails because it expects the native API:

```text
OfflineTts.createAsync
```

The WASM fallback does not expose that API, so `pi-listen` is not a good fit for this device.

The package was removed with the equivalent of:

```bash
pi remove npm:@codexstar/pi-listen
```

## Android TTS commands inside Pi

After `/reload`, the local extension provides:

```text
/say <text>
/android-speak <text>
/android-speak-test
/voice-auto on
/voice-auto off
/voice-auto status
/voice-settings-android rate=1.0 pitch=1.0
```

The assistant also has a tool named `android_tts_speak`, but it should only be used when explicitly asked to speak aloud.

## Auto-speak behavior

`/voice-auto on` speaks only finalized assistant messages from Pi's `message_end` event.

It intentionally does **not** speak:

- tool calls
- tool results
- bash output
- file edit diffs
- internal command output
- streaming partial tokens

The extension checks:

```ts
event.message.role === "assistant"
```

before speaking. Tool result messages have role `toolResult`, so they are skipped.

The spoken text is also cleaned before TTS:

- code blocks are replaced with `code block omitted`
- inline markdown is simplified
- links are reduced to their display text
- extra whitespace is collapsed

## Workflow

```text
Android voice-to-text keyboard
        ↓
Android text input
        ↓
Pi chat/editor
        ↓
Assistant text response
        ↓
android-tts.ts extension
        ↓
termux-tts-speak
        ↓
Termux:API Android app
        ↓
Android system TTS voice
```

## Voice cadence tuning

Cadence is mostly controlled by the Android TTS engine and Android accessibility/TTS settings. Useful places to tune:

- Android Settings → Text-to-speech output → speech rate / pitch
- Android Settings → Text-to-speech output → preferred engine / voice
- Termux command options:

  ```bash
  termux-tts-speak -r 1.0 -p 1.0 "Test sentence one. Test sentence two."
  termux-tts-engines
  ```

Inside Pi, use:

```text
/voice-settings-android rate=1.0 pitch=1.0
```

The extension also adds extra pauses around sentence endings and line breaks before sending text to Android TTS. If the keyboard dictation does not add punctuation, the TTS engine has less information to work with, so saying punctuation while dictating can help, for example: “period”, “comma”, or “new line”.

## Next features to consider

- Persist `/voice-auto` and rate/pitch settings across restarts.
- Add `/voice-stop` or `/voice-cancel` if Android/Termux provides a reliable way to interrupt speech.
- Chunk very long assistant replies into smaller TTS calls.
- Package the local extension as a reusable Pi package once the workflow stabilizes.
