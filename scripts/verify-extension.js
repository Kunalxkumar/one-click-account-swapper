const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const extPath = path.resolve(__dirname, '../out');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.resolve(__dirname, '../temp-edge-profile-test2');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function putJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'PUT' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  console.log('[Verify] Launching Edge...');
  const edge = spawn(edgePath, [
    '--headless=new',
    `--user-data-dir=${profileDir}`,
    `--load-extension=${extPath}`,
    '--remote-debugging-port=9229',
    'about:blank'
  ]);

  let extId = null;

  for (let attempt = 1; attempt <= 10; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const targets = await getJson('http://127.0.0.1:9229/json');
      for (const t of targets) {
        if (t.url && t.url.includes('/background.js')) {
          const m = t.url.match(/chrome-extension:\/\/([^/]+)/);
          if (m) {
            extId = m[1];
            break;
          }
        }
      }
      if (extId) break;
    } catch (e) {}
  }

  if (!extId) {
    console.error('[Verify] Service worker target not found.');
    edge.kill();
    return;
  }

  console.log('[Verify] Found extension ID:', extId);

  try {
    const pageUrl = `chrome-extension://${extId}/index.html`;
    const newTarget = await putJson(`http://127.0.0.1:9229/json/new?${encodeURIComponent(pageUrl)}`);

    const ws = new WebSocket(newTarget.webSocketDebuggerUrl);

    let idSeq = 1;
    const pendingCallbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingCallbacks.has(msg.id)) {
        pendingCallbacks.get(msg.id)(msg);
        pendingCallbacks.delete(msg.id);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
      }
    };

    function sendCmd(method, params = {}) {
      return new Promise((resolve) => {
        const id = idSeq++;
        pendingCallbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    await sendCmd('Runtime.enable');
    await sendCmd('Page.enable');

    // Wait for setup password screen
    await new Promise(r => setTimeout(r, 3000));

    console.log('[Verify] Submitting master password to setup wallet...');
    await sendCmd('Runtime.evaluate', {
      expression: `
        (function() {
          const inputs = document.querySelectorAll('input[type="password"]');
          if (inputs.length >= 2) {
            // Fill password
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(inputs[0], "MasterSecret2026!");
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));

            // Fill confirm password
            setter.call(inputs[1], "MasterSecret2026!");
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

            // Submit form
            const form = document.querySelector('form');
            form.requestSubmit();
            return 'submitted';
          }
          return 'inputs not found';
        })()
      `
    });

    // Wait for PBKDF2 derivation & Dashboard transition
    await new Promise(r => setTimeout(r, 4000));

    // Evaluate document text after unlock
    const evalRes = await sendCmd('Runtime.evaluate', {
      expression: 'document.body.innerText'
    });
    console.log('[Verify] Rendered Dashboard Inner Text:\n---\n' + (evalRes.result?.result?.value || '') + '\n---');

    // Capture screenshot of Dashboard
    const screenshotRes = await sendCmd('Page.captureScreenshot', { format: 'png' });
    if (screenshotRes.result?.data) {
      const imgBuffer = Buffer.from(screenshotRes.result.data, 'base64');
      fs.writeFileSync(path.resolve(__dirname, '../extension_dashboard_test.png'), imgBuffer);
      console.log('[Verify] Saved Dashboard screenshot to extension_dashboard_test.png');
    }

    ws.close();
  } catch (err) {
    console.error('[Verify] Error:', err);
  } finally {
    edge.kill();
    console.log('[Verify] Test complete.');
  }
}

verify();
