#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

PI_NPM_DIR="${PI_NPM_DIR:-$HOME/.pi/agent/npm}"
EXT_DIR="$PI_NPM_DIR/node_modules/@codexstar/pi-listen/extensions/voice"
LOADER="$EXT_DIR/sherpa-loader.ts"
ENGINE="$EXT_DIR/sherpa-engine.ts"

if [ ! -d "$PI_NPM_DIR" ]; then
  echo "Pi npm dir not found: $PI_NPM_DIR" >&2
  exit 1
fi
if [ ! -f "$LOADER" ] || [ ! -f "$ENGINE" ]; then
  echo "pi-listen voice files not found under: $EXT_DIR" >&2
  exit 1
fi

cd "$PI_NPM_DIR"
echo "Installing WASM Sherpa and aliasing it as sherpa-onnx-node..."
npm install sherpa-onnx@1.13.2 sherpa-onnx-node@npm:sherpa-onnx@1.13.2

backup_once() {
  local file="$1"
  if [ ! -f "$file.termux-wasm-fix.bak" ]; then
    cp "$file" "$file.termux-wasm-fix.bak"
  fi
}

backup_once "$LOADER"
backup_once "$ENGINE"

export LOADER_PATH="$LOADER"
export ENGINE_PATH="$ENGINE"
python - <<'PY'
from pathlib import Path
import os

loader = Path(os.environ.get('LOADER_PATH', str(Path.home() / '.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-loader.ts')))
engine = Path(os.environ.get('ENGINE_PATH', str(Path.home() / '.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-engine.ts')))

loader_text = loader.read_text()
old_loader = '''\t\tconst ns = await import("sherpa-onnx-node");
\t\tconst top = ns as any;
\t\tconst def = (ns as any).default;
\t\tconst topHasCreateAsync = typeof top?.OfflineTts?.createAsync === "function";
\t\tconst defHasCreateAsync = typeof def?.OfflineTts?.createAsync === "function";
\t\tsherpaModule = topHasCreateAsync ? top : (defHasCreateAsync ? def : top);
\t\tsherpaInitialized = true;
\t\treturn true;'''
new_loader = '''\t\tconst ns = await import("sherpa-onnx-node");
\t\tconst top = ns as any;
\t\tconst def = (ns as any).default;
\t\tconst topHasCreateAsync = typeof top?.OfflineTts?.createAsync === "function";
\t\tconst defHasCreateAsync = typeof def?.OfflineTts?.createAsync === "function";
\t\tsherpaModule = topHasCreateAsync ? top : (defHasCreateAsync ? def : (def || top));

\t\t// Termux/Android workaround: npm has no native sherpa-onnx-node
\t\t// android-arm64 binary, but the WASM package (`sherpa-onnx`) loads here.
\t\t// If the package was installed as an npm alias
\t\t//   sherpa-onnx-node@npm:sherpa-onnx
\t\t// expose a tiny native-compatible OfflineRecognizer constructor for STT.
\t\tif (!sherpaModule?.OfflineRecognizer && typeof sherpaModule?.createOfflineRecognizer === "function") {
\t\t\tconst wasmSherpa = sherpaModule;
\t\t\tsherpaModule = {
\t\t\t\t...wasmSherpa,
\t\t\t\tOfflineRecognizer: class OfflineRecognizer {
\t\t\t\t\tprivate recognizer: any;
\t\t\t\t\tconstructor(config: any) {
\t\t\t\t\t\tthis.recognizer = wasmSherpa.createOfflineRecognizer(config);
\t\t\t\t\t}
\t\t\t\t\tcreateStream() { return this.recognizer.createStream(); }
\t\t\t\t\tdecode(stream: any) { return this.recognizer.decode(stream); }
\t\t\t\t\tasync decodeAsync(stream: any) { return this.recognizer.decode(stream); }
\t\t\t\t\tgetResult(stream: any) { return this.recognizer.getResult(stream); }
\t\t\t\t\tfree() { return this.recognizer.free?.(); }
\t\t\t\t},
\t\t\t};
\t\t}

\t\tsherpaInitialized = true;
\t\treturn true;'''
if new_loader not in loader_text:
    if old_loader not in loader_text:
        raise SystemExit('Could not find expected sherpa-loader.ts block; file may have changed or already be differently patched.')
    loader.write_text(loader_text.replace(old_loader, new_loader))

engine_text = engine.read_text()
old_engine = '''\tconst stream = recognizer.createStream();
\tstream.acceptWaveform({ sampleRate: 16000, samples });
\tawait recognizer.decodeAsync(stream);

\tconst result = recognizer.getResult(stream);'''
new_engine = '''\tconst stream = recognizer.createStream();
\t// Native sherpa-onnx-node uses acceptWaveform({ sampleRate, samples });
\t// WASM sherpa-onnx uses acceptWaveform(sampleRate, samples).
\tif (stream.acceptWaveform.length >= 2) {
\t\tstream.acceptWaveform(16000, samples);
\t} else {
\t\tstream.acceptWaveform({ sampleRate: 16000, samples });
\t}
\tif (typeof recognizer.decodeAsync === "function") {
\t\tawait recognizer.decodeAsync(stream);
\t} else {
\t\trecognizer.decode(stream);
\t}

\tconst result = recognizer.getResult(stream);'''
if new_engine not in engine_text:
    if old_engine not in engine_text:
        raise SystemExit('Could not find expected sherpa-engine.ts block; file may have changed or already be differently patched.')
    engine.write_text(engine_text.replace(old_engine, new_engine))
PY

echo "Done. Restart Pi or run /reload."
