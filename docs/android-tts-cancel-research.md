# Android TTS cancellation notes

Termux:API currently exposes Android TTS through `termux-tts-speak`, but this Termux install does not include a dedicated `termux-tts-stop` command.

Checked commands:

```bash
command -v termux-tts-stop
ls $PREFIX/bin/termux-tts*
termux-tts-speak -h
```

Observed commands:

```text
termux-tts-engines
termux-tts-speak
```

`termux-tts-speak` supports:

```text
-e engine
-l language
-n region
-v variant
-p pitch
-r rate
-s stream
```

It does not document a stop/cancel option.

## Current workaround

The extension implements `/voice-stop` and `ctrl+shift+q` as best-effort cancellation:

1. Save `autoSpeak=false` so future assistant replies are text-only.
2. Send an empty utterance through `termux-tts-speak`.

This may interrupt or flush the current Android TTS queue depending on the Android version and selected TTS engine, but it is not guaranteed.

## Future improvement

A more reliable stop path would need one of:

- an upstream Termux:API `TextToSpeech` stop operation,
- a dedicated `termux-tts-stop` command,
- a small Android companion app/service that calls Android `TextToSpeech.stop()`,
- or a Termux:API intent/action that can flush the queue reliably.

Until then, users should treat `/voice-stop` as best-effort and use Android media/volume controls if the TTS engine continues speaking.
