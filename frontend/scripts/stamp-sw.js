const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const stamp = process.env.REACT_APP_BUILD_TS || Date.now().toString(36);

// 1. Stamp sw.js (CRA does NOT interpolate env vars in public/*.js)
const swPath = path.join(buildDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  content = content.replace(/__BUILD_TS__/g, stamp);
  fs.writeFileSync(swPath, content);
  console.log(`[stamp-sw] sw.js stamped: ${stamp}`);
} else {
  console.warn('[stamp-sw] build/sw.js not found');
}

// 2. Generate version.json
const versionPath = path.join(buildDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify({ v: stamp, t: Date.now() }));
console.log(`[stamp-sw] version.json generated: ${stamp}`);

// 3. Verify index.html was stamped by CRA
const htmlPath = path.join(buildDir, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes(stamp)) {
    console.log(`[stamp-sw] index.html: CRA embedded stamp correctly`);
  } else if (html.includes('REACT_APP_BUILD_TS')) {
    console.warn(`[stamp-sw] WARNING: CRA did not interpolate REACT_APP_BUILD_TS`);
    // Fallback: stamp manually
    const patched = html.replace(/%REACT_APP_BUILD_TS%/g, stamp);
    fs.writeFileSync(htmlPath, patched);
    console.log(`[stamp-sw] index.html: fallback manual stamp applied`);
  } else {
    console.log(`[stamp-sw] index.html: stamp present (via CRA or prior run)`);
  }
}
