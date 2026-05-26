#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

PI_NPM_DIR="${PI_NPM_DIR:-$HOME/.pi/agent/npm}"
cd "$PI_NPM_DIR"

node - <<'NODE'
const path = require('path');
const { createJiti } = require('jiti');
const jiti = createJiti(path.join(process.cwd(), 'termux-sherpa-test.js'));

(async () => {
  const { LOCAL_MODELS } = jiti('./node_modules/@codexstar/pi-listen/extensions/voice/local.ts');
  const dl = jiti('./node_modules/@codexstar/pi-listen/extensions/voice/model-download.ts');
  const loader = jiti('./node_modules/@codexstar/pi-listen/extensions/voice/sherpa-loader.ts');
  const engine = jiti('./node_modules/@codexstar/pi-listen/extensions/voice/sherpa-engine.ts');

  const model = LOCAL_MODELS.find((m) => m.id === 'moonshine-v2-tiny');
  if (!model) throw new Error('moonshine-v2-tiny not found in LOCAL_MODELS');

  console.log(`Downloading/checking ${model.id} (${model.name})...`);
  const modelDir = await dl.ensureModelDownloaded(
    model.id,
    model.sherpaModel.downloadUrls,
    model.sizeBytes,
    (p) => {
      const mb = Math.round(p.downloadedBytes / 1024 / 1024);
      const total = Math.round(p.totalBytes / 1024 / 1024);
      if (p.downloadedBytes === p.totalBytes || p.downloadedBytes % (5 * 1024 * 1024) < 65536) {
        console.log(`${mb}MB/${total}MB ${p.file}`);
      }
    },
  );

  const ok = await loader.loadSherpa();
  console.log('Sherpa load:', ok, loader.getSherpaError());
  if (!ok) process.exit(1);

  const recognizer = engine.getOrCreateRecognizer(model, modelDir, 'en');
  console.log('Recognizer created. Testing one second of silence...');
  const pcm = Buffer.alloc(16000 * 2);
  const text = await engine.transcribeBuffer(pcm, recognizer);
  console.log('Transcription result:', JSON.stringify(text));
  console.log('OK');
})().catch((err) => {
  console.error(err && err.stack || err);
  process.exit(1);
});
NODE
