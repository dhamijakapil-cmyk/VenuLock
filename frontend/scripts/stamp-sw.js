const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'build', 'sw.js');

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  const stamp = Date.now().toString(36);
  content = content.replace("'__BUILD_TS__'", `'${stamp}'`);
  fs.writeFileSync(swPath, content);
  console.log(`[stamp-sw] Build stamp: ${stamp}`);
} else {
  console.warn('[stamp-sw] build/sw.js not found, skipping');
}
