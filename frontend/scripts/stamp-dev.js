const fs = require('fs');
const path = require('path');

const stamp = Date.now().toString(36);
const publicDir = path.join(__dirname, '..', 'public');

// 1. Stamp public/sw.js — replace __BUILD_TS__ OR any previously written stamp
const swPath = path.join(publicDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/const SW_BUILD = '[^']*';/, `const SW_BUILD = '${stamp}';`);
  fs.writeFileSync(swPath, sw);
  console.log(`[stamp-dev] sw.js → ${stamp}`);
} else {
  console.error('[stamp-dev] public/sw.js not found');
  process.exit(1);
}

// 2. Write public/version.json
const versionPath = path.join(publicDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify({ v: stamp, t: Date.now() }));
console.log(`[stamp-dev] version.json → ${stamp}`);

// 3. Write .env.local with REACT_APP_BUILD_TS
const envLocalPath = path.join(__dirname, '..', '.env.local');
fs.writeFileSync(envLocalPath, `REACT_APP_BUILD_TS=${stamp}\n`);
console.log(`[stamp-dev] .env.local → REACT_APP_BUILD_TS=${stamp}`);

console.log(`[stamp-dev] Done. Deploy stamp: ${stamp}`);
