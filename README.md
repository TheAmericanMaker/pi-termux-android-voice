# Android Termux Sherpa Voice Fix

Notes and helper files for getting a Pi voice/listen extension using Sherpa to initialize on Android Termux.

## Problem

On Android/Termux ARM64, `sherpa-onnx-node` installs the JS wrapper but npm does not provide the required native package:

```text
sherpa-onnx-android-arm64/sherpa-onnx.node
```

So local model initialization fails with:

```text
Could not find sherpa-onnx-node. Tried
  ../build/Release/sherpa-onnx.node
  ../build/Debug/sherpa-onnx.node
  ./node_modules/sherpa-onnx-android-arm64/sherpa-onnx.node
  ../sherpa-onnx-android-arm64/sherpa-onnx.node
  ./sherpa-onnx.node
```

Installing the Linux ARM64 native package is not enough on Termux/Android; it fails loading glibc/libstdc++ style dependencies.

## Working approach

Use the WASM package `sherpa-onnx` and alias it as `sherpa-onnx-node` inside Pi's extension npm environment:

```bash
cd ~/.pi/agent/npm
npm install sherpa-onnx@1.13.2 sherpa-onnx-node@npm:sherpa-onnx@1.13.2
```

Then patch the extension loader/engine to tolerate the WASM API shape.

## What was done on this device

From `/data/data/com.termux/files/home/.pi/agent/npm`:

```bash
npm install sherpa-onnx@1.13.2 sherpa-onnx-node@npm:sherpa-onnx@1.13.2
```

Patched these installed extension files:

```text
~/.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-loader.ts
~/.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-engine.ts
```

Downloaded the tiny STT model:

```text
~/.pi/models/moonshine-v2-tiny
```

Verified that Sherpa loads and that a recognizer can be created with the tiny model.

## Apply helper

Run:

```bash
bash scripts/apply-termux-sherpa-wasm-fix.sh
```

Then restart Pi or run `/reload`.

## Caveats

- This is a patch to files inside `node_modules`; reinstalling/updating the extension can overwrite it.
- This targets STT/local transcription compatibility. TTS may need more adapter work because native `OfflineTts.createAsync` and WASM `createOfflineTts` are different APIs.
- WASM inference is synchronous in places where native bindings may be async, so performance/UI behavior can differ.
