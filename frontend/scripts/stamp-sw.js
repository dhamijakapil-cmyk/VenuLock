const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const stamp = Date.now().toString(36);

// 1. Stamp sw.js
const swPath = path.join(buildDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  content = content.replace(/__BUILD_TS__/g, stamp);
  fs.writeFileSync(swPath, content);
  console.log(`[stamp-sw] sw.js stamped: ${stamp}`);
}

// 2. Stamp index.html
const htmlPath = path.join(buildDir, 'index.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/__BUILD_TS__/g, stamp);
  fs.writeFileSync(htmlPath, html);
  console.log(`[stamp-sw] index.html stamped: ${stamp}`);
}

// 3. Generate version.json
const versionPath = path.join(buildDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify({ v: stamp, t: Date.now() }));
console.log(`[stamp-sw] version.json generated`);
