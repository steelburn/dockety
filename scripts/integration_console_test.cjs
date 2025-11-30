#!/usr/bin/env node
/* Integration test: Create/register login -> list containers -> run a container if needed -> attach via websocket -> send a command -> print output */

const fetch = globalThis.fetch || require('node-fetch');
const WebSocket = require('ws');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:3001/api';
const hostId = 'local-docker';

async function registerOrLogin(username, password) {
  // try register
  let res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
  });
  const body = await res.json();
  if (res.ok && body.token) return body.token;
  if (res.status === 409) {
    // user exists, login
    res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) throw new Error('Login failed');
    const b2 = await res.json();
    return b2.token;
  }
  if (body && body.token) return body.token;
  throw new Error('Register/login failed: ' + JSON.stringify(body));
}

async function listContainers(token) {
  const res = await fetch(`${API_BASE}/containers?hostId=${encodeURIComponent(hostId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('List containers failed: ' + await res.text());
  return res.json();
}

async function attachAndExecViaWs(token, containerId, command) {
  return new Promise((resolve, reject) => {
    const wsUrl = `ws://localhost:3001/api/ws/exec?token=${encodeURIComponent(token)}&containerId=${encodeURIComponent(containerId)}&hostId=${encodeURIComponent(hostId)}`;
    const ws = new WebSocket(wsUrl);
    const out = [];
    ws.on('open', () => {
      console.log('ws open');
      ws.send(command + '\n');
    });
    ws.on('message', (msg) => {
      console.log('ws message:', String(msg));
      out.push(String(msg));
    });
    ws.on('close', () => {
      console.log('ws close');
      resolve(out.join('\n'));
    });
    ws.on('error', (err) => {
      console.error('ws error', err);
      reject(err);
    });
    // close after 3 seconds
    setTimeout(() => { try { ws.close(); } catch (e) { console.error('close err', e); } }, 3000);
  });
}

(async () => {
  try {
    const username = 'itest';
    const password = 'itest';
    console.log('Registering or logging in');
    const token = await registerOrLogin(username, password);
    console.log('Token obtained, length', token.length);

    console.log('Listing containers');
    let containers = await listContainers(token);
    let running = containers.filter(c => c.state === 'running');
    console.log('Found containers', containers.length, 'running', running.length);

    if (running.length === 0) {
      console.log('No running containers; trying to run busybox sleep 300');
      try {
        execSync('docker run -d --name dockety-integ-test busybox sleep 300');
      } catch (err) {
        console.error('Docker run failed; requires docker in host environment', err.message);
        process.exit(1);
      }
      // re-fetch
      containers = await listContainers(token);
      running = containers.filter(c => c.state === 'running');
      console.log('After run, found running containers:', running.length);
    }

    if (running.length === 0) {
      console.error('No running container to attach to');
      process.exit(1);
    }
    const containerId = running[0].id;
    console.log('Attaching to container', containerId);

    const out = await attachAndExecViaWs(token, containerId, 'echo hello from ws && ls');
    console.log('Output received:\n', out);

    // Cleanup created test container
    if (containers.some(c => c.name === 'dockety-integ-test')) {
      try { execSync('docker rm -f dockety-integ-test'); } catch (e) {}
    }
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
})();
