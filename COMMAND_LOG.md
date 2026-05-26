# Command log

This is the rough command history used to diagnose and fix the issue.

## Initial install attempt in `/data/data/com.termux/files/home/github`

```bash
npm install sherpa-onnx-node
npm list sherpa-onnx-node --depth=0
node -e "const sherpa=require('sherpa-onnx-node'); console.log(Object.keys(sherpa)); console.log('loaded')"
```

Result: package installed, native addon missing for `android-arm64`.

Tried Linux ARM64 native package:

```bash
npm install sherpa-onnx-linux-arm64@1.13.2 --force
LD_LIBRARY_PATH=$PWD/node_modules/sherpa-onnx-linux-arm64 node -e "require('./node_modules/sherpa-onnx-linux-arm64/sherpa-onnx.node')"
```

Result: failed on Android/Termux with missing `libstdc++.so.6`.

## Bun attempt

```bash
curl -fsSL https://bun.sh/install | bash
~/.bun/bin/bun --version
pkg install -y bun
```

Result: upstream Bun binary did not run in Termux (`not found`, incompatible loader), and `pkg` had no `bun` package.

## WASM package check

```bash
npm uninstall sherpa-onnx-node sherpa-onnx-linux-arm64
npm install sherpa-onnx
node -e "const sherpa=require('sherpa-onnx'); console.log(Object.keys(sherpa).slice(0,50)); console.log('loaded sherpa-onnx')"
```

Result: `sherpa-onnx@1.13.2` loaded successfully.

## Alias check

```bash
npm install sherpa-onnx-node@npm:sherpa-onnx@1.13.2
node -e "const s=require('sherpa-onnx-node'); console.log(s.version); console.log(Object.keys(s).slice(0,10))"
```

Result: `require('sherpa-onnx-node')` now resolves to the WASM package.

## Apply fix in Pi extension npm environment

```bash
cd ~/.pi/agent/npm
npm install sherpa-onnx@1.13.2 sherpa-onnx-node@npm:sherpa-onnx@1.13.2
```

Patched:

```text
~/.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-loader.ts
~/.pi/agent/npm/node_modules/@codexstar/pi-listen/extensions/voice/sherpa-engine.ts
```

## Download and test tiny model

Used jiti to call the extension's own model catalog/downloader and test `moonshine-v2-tiny`:

```bash
cd ~/.pi/agent/npm
node - <<'NODE'
const path=require('path'); const {createJiti}=require('jiti'); const jiti=createJiti(path.join(process.cwd(),'test.js'));
(async()=>{
 const {LOCAL_MODELS}=jiti('./node_modules/@codexstar/pi-listen/extensions/voice/local.ts');
 const loader=jiti('./node_modules/@codexstar/pi-listen/extensions/voice/sherpa-loader.ts');
 const engine=jiti('./node_modules/@codexstar/pi-listen/extensions/voice/sherpa-engine.ts');
 const m=LOCAL_MODELS.find(x=>x.id==='moonshine-v2-tiny');
 console.log('load', await loader.loadSherpa(), loader.getSherpaError());
 const r=engine.getOrCreateRecognizer(m, '/data/data/com.termux/files/home/.pi/models/moonshine-v2-tiny', 'en');
 console.log('recognizer created', typeof r.createStream, typeof r.decodeAsync);
 const pcm=Buffer.alloc(16000*2);
 const text=await engine.transcribeBuffer(pcm,r);
 console.log('text:', JSON.stringify(text));
})().catch(e=>{console.error(e.stack||e);process.exit(1)})
NODE
```

Result: Sherpa loaded, recognizer created, transcription call completed.
