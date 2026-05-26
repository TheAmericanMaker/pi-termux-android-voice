# Pi Termux Android Voice

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

## Step-by-step Android setup

These steps assume you are setting this up directly on an Android device.

> **Recommended workflow:** install the Pi coding agent early, clone this repo, then open Pi inside the repo and ask it to walk you through the setup. Pi can inspect your Termux environment, check installed packages, run verification commands, and help with device-specific issues.

### 1. Install Termux and Termux:API apps

You need **both** Android apps:

1. **Termux** - the terminal app.
2. **Termux:API** - the Android companion app that exposes Android features like TTS, toast, battery status, etc.

Recommended APK sources:

- Termux GitHub releases: <https://github.com/termux/termux-app/releases>
- Termux:API GitHub releases: <https://github.com/termux/termux-api/releases>
- F-Droid Termux page: <https://f-droid.org/packages/com.termux/>

Install both apps from the same source/signing family so their signatures match. In testing, the newest APKs from the official GitHub release pages were more reliable than older/stale builds. If the F-Droid build crashes or behaves strangely on your device, uninstall both Termux apps and install the latest GitHub release APKs for both Termux and Termux:API.

If Android blocks an APK as “built for an older version of Android,” use the newest APK from the official GitHub releases. Do not mix Play Store builds with F-Droid/GitHub builds.

### 2. Install Termux packages

Open Termux and run:

```bash
pkg update
pkg upgrade
pkg install termux-api git nodejs
```

Useful optional packages:

```bash
pkg install nano openssh gh
```

### 3. Install Pi coding agent

Install Pi using the official Pi install instructions for your environment. After Pi is installed, verify:

```bash
pi --version
```

If you previously installed `pi-listen`, remove it:

```bash
pi remove npm:@codexstar/pi-listen
```

### 4. Clone this repo

```bash
mkdir -p ~/github
cd ~/github
git clone <this-repo-url>
cd pi-termux-android-voice
```

If you downloaded a ZIP instead, extract it and `cd` into the extracted folder.

### 5. Let Pi help from inside the repo

Start Pi from the repo folder:

```bash
cd ~/github/pi-termux-android-voice
pi
```

Then ask Pi something like:

```text
Help me set up this Android Termux voice extension on this device. Check Termux:API, install the extension, and verify TTS.
```

Pi can run the checks below for you, but they are also listed manually.

You can also run the project doctor script:

```bash
npm run doctor
```

For an audible speech test:

```bash
npm run doctor:speak
```

### 6. Verify Termux:API works

Make sure the Termux:API Android app is installed, then run:

```bash
termux-toast "hello"
termux-battery-status
termux-tts-speak "Termux API works"
```

If `termux-tts-speak` talks, Android TTS is working.

### 7. Install the Android TTS Pi extension

```bash
npm run install:android-tts
```

Equivalent manual install:

```bash
mkdir -p ~/.pi/agent/extensions
cp extensions/android-tts.ts ~/.pi/agent/extensions/android-tts.ts
```

### 8. Reload or restart Pi

Inside Pi, run:

```text
/reload
```

Or fully quit and start Pi again.

### 9. Test inside Pi

```text
/android-speak-test
/say This is Android text to speech running through Termux API.
```

To check voice setup from inside Pi:

```text
/voice-doctor
```

To automatically speak assistant replies:

```text
/voice-auto on
```

To turn automatic speech back off:

```text
/voice-auto off
```

To stop a current spoken reply and turn auto-speak off:

```text
/voice-stop
```

There is also a shortcut registered for this:

```text
ctrl+shift+q
```

This is best-effort because Termux:API does not currently ship a dedicated `termux-tts-stop` command. The extension sends an empty Android TTS utterance to interrupt/flush the current speech, then disables auto-speak so the next replies are text-only.

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
/voice-doctor
/voice-stop
/voice-settings-android rate=1.0 pitch=1.0
```

The assistant also has tools named:

- `android_tts_speak` - speak a specific message aloud when explicitly asked.
- `android_tts_config` - turn automatic voice replies on/off when the user asks for verbal responses or asks to stop speaking.

Example user requests the assistant can handle:

- “Please respond verbally to me.” → enable auto-speak.
- “Stop talking out loud.” → disable auto-speak.

## Auto-speak behavior

`/voice-auto on` speaks only finalized assistant messages from Pi's `message_end` event. The setting is saved in:

```text
~/.pi/agent/android-tts-settings.json
```

That means it survives `/reload` and Pi restarts.

It intentionally does **not** speak:

- tool calls
- tool results
- bash output
- file edit diffs
- internal command output
- streaming partial tokens
- the next assistant summary after `android_tts_speak` already spoke explicit text

If a spoken reply is too long, use `/voice-stop` or `ctrl+shift+q` to do a best-effort interruption and switch back to text-only replies.

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

## Voice selection and cadence tuning

Android TTS voice selection is mostly controlled by Android itself, not Pi.

### Change the selected Android voice

On most Android devices:

1. Open **Android Settings**.
2. Search for **Text-to-speech output**.
3. Choose the preferred TTS engine, such as Google Speech Services, Samsung TTS, etc.
4. Open that engine's settings/gear icon.
5. Pick the language, voice, and downloaded voice data you want.
6. Use the Android **Play** or **Listen to an example** button to test it.

The exact menu names vary by Android version and vendor. Useful search terms in Android Settings:

- `Text-to-speech output`
- `TTS`
- `Speech Services`
- `Preferred engine`
- `Install voice data`

### Check available Termux TTS engines

In Termux:

```bash
termux-tts-engines
```

You can test a specific engine with:

```bash
termux-tts-speak -e engine.name.here "Testing this Android TTS engine."
```

Most users should change the preferred engine/voice in Android Settings first. The Pi extension currently uses Android's default selected TTS engine.

### Adjust rate and pitch

Cadence is controlled by a mix of Android TTS settings and Termux options:

- Android Settings → Text-to-speech output → speech rate / pitch
- Android Settings → Text-to-speech output → preferred engine / voice
- Termux command options:

  ```bash
  termux-tts-speak -r 1.0 -p 1.0 "Test sentence one. Test sentence two."
  ```

Inside Pi, use:

```text
/voice-settings-android rate=1.0 pitch=1.0
```

The extension also adds extra pauses around sentence endings and line breaks before sending text to Android TTS. If the keyboard dictation does not add punctuation, the TTS engine has less information to work with, so saying punctuation while dictating can help, for example: “period”, “comma”, or “new line”.

## Next features to consider

- Add `/voice-stop` or `/voice-cancel` if Android/Termux provides a reliable way to interrupt speech.
- Chunk very long assistant replies into smaller TTS calls.
- Package the local extension as a reusable Pi package once the workflow stabilizes.
