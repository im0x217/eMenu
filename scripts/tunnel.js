const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;
const cloudflaredPath = path.join(__dirname, '..', 'bin', 'cloudflared.exe');

console.log('\n============================================================');
console.log('       e-Menu Cloudflare Quick Tunnel Service');
console.log('============================================================\n');

// 1. Verify if local server is running on PORT
function checkServer(callback) {
  const req = http.get(`http://localhost:${PORT}/api/categories`, (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.setTimeout(2000, () => {
    req.destroy();
    callback(false);
  });
}

function startTunnel() {
  console.log(`[Tunnel] Initializing Cloudflare Quick Tunnel for http://localhost:${PORT}...`);
  console.log('[Tunnel] Requesting ephemeral SSL certificate from Cloudflare Edge...\n');

  const cf = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let urlDetected = false;

  const handleOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !urlDetected) {
      urlDetected = true;
      const tunnelUrl = match[0];
      console.log('\n============================================================');
      console.log('  \x1b[32m\x1b[1mCLOUDFLARE QUICK TUNNEL ONLINE (HTTPS Active)\x1b[0m');
      console.log('============================================================');
      console.log(`\n  \x1b[36m\x1b[1mPublic URL:\x1b[0m \x1b[4m${tunnelUrl}\x1b[0m\n`);
      console.log(`  \x1b[33m\x1b[1mMobile Sandbox / Prototype:\x1b[0m`);
      console.log(`  -> Main Store:   ${tunnelUrl}/`);
      console.log(`  -> Shop 2:       ${tunnelUrl}/?shop=shop2`);
      console.log(`  -> Prototype V2: ${tunnelUrl}/#/preview\n`);
      console.log('  Open this link on your iPhone or Android phone to test');
      console.log('  touch interactions, haptics, and PWA capabilities.');
      console.log('============================================================\n');
    }
  };

  cf.stdout.on('data', handleOutput);
  cf.stderr.on('data', handleOutput);

  cf.on('close', (code) => {
    console.log(`[Tunnel] Process exited with code ${code}`);
  });
}

checkServer((running) => {
  if (!running) {
    console.log(`[Notice] Server is not running on port ${PORT}. Starting server...`);
    const srv = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    setTimeout(() => {
      startTunnel();
    }, 2500);
  } else {
    console.log(`[Server] Local server detected on http://localhost:${PORT}.`);
    startTunnel();
  }
});
