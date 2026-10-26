// Sends algorithms to a real Roversa robot over Bluetooth (Web Bluetooth),
// so it drives the same puzzle pieces as the robot on the screen.
//
// The robot listens on the Bluetooth UART service. Each message is one line of
// at most 20 bytes:
//   app -> robot   HELLO, CLR, ADD,<letters>, END,<count>, RUN, STOP
//   robot -> app   ROVERSA,<version>,<max steps>  OK,<n>  ERR,...
//                  RUN,<n>  STEP,<i>  DONE  STOPPED
// Letters are the engine's commands: F Forward, B Backward, L Turn Left, R Turn Right.
// See "Driving a real Roversa" in the README.
(function (root) {
  'use strict';

  const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  // Named from the micro:bit's side: it notifies on TX and the app writes to RX.
  const UART_TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
  const UART_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
  // Letters per ADD line, so "ADD," + letters + newline fits in one 20-byte write.
  const ADD_CHUNK = 15;
  const STEP_LETTERS = 'FBLR';

  let device = null;
  let rx = null;
  let info = null;
  let writes = Promise.resolve();
  let buffer = '';
  let waiters = [];
  // Progress of the run started last: the highest STEP seen, and whether it ended.
  let progress = { step: -1, ended: false };
  const listeners = { change: [], message: [] };

  function emit(type, detail) {
    listeners[type].forEach((fn) => { try { fn(detail); } catch (e) { console.error(e); } });
  }

  function connected() {
    return !!(device && device.gatt.connected && rx && info);
  }

  function onData(view) {
    buffer += new TextDecoder().decode(view);
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const [kind, arg] = line.split(',');
      if (kind === 'STEP') progress.step = Math.max(progress.step, Number(arg));
      if (kind === 'DONE' || kind === 'STOPPED') progress.ended = true;
      const w = waiters.find((x) => x.match(line));
      if (w) {
        waiters = waiters.filter((x) => x !== w);
        clearTimeout(w.timer);
        w.resolve(line);
      }
      emit('message', { line, kind, arg });
    }
  }

  // GATT takes one write at a time, so writes queue up behind each other.
  function send(line) {
    const bytes = new TextEncoder().encode(line + '\n');
    writes = writes.catch(() => {}).then(() => (rx ? rx.writeValue(bytes) : Promise.reject(new Error('not connected'))));
    return writes;
  }

  // Resolves with the first line that matches, or null after timeoutMs.
  function waitFor(match, timeoutMs) {
    return new Promise((resolve) => {
      const w = { match, resolve };
      w.timer = setTimeout(() => { waiters = waiters.filter((x) => x !== w); resolve(null); }, timeoutMs);
      waiters.push(w);
    });
  }

  async function request(line, match, timeoutMs = 3000) {
    const reply = waitFor(match, timeoutMs);
    await send(line);
    const got = await reply;
    if (!got) throw new Error('no reply to ' + line);
    return got;
  }

  function dropped() {
    rx = null;
    info = null;
    waiters.forEach((w) => { clearTimeout(w.timer); w.resolve(null); });
    waiters = [];
    emit('change', false);
  }

  async function connect() {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'BBC micro:bit' }],
      optionalServices: [UART_SERVICE],
    });
    device.addEventListener('gattserverdisconnected', dropped);
    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE);
      rx = await service.getCharacteristic(UART_RX);
      const tx = await service.getCharacteristic(UART_TX);
      tx.addEventListener('characteristicvaluechanged', (e) => onData(e.target.value));
      await tx.startNotifications();
      const hello = await request('HELLO', (l) => l.startsWith('ROVERSA,'));
      const parts = hello.split(',');
      info = { name: device.name || 'Roversa', version: parts[1], maxSteps: Number(parts[2]) || 64 };
    } catch (e) {
      // A micro:bit without the Roversa Bluetooth firmware has no UART service or never says hello.
      if (device.gatt.connected) device.gatt.disconnect();
      rx = null;
      info = null;
      throw e;
    }
    emit('change', true);
    return info;
  }

  function disconnect() {
    if (device && device.gatt.connected) device.gatt.disconnect();
  }

  // Loads a list of commands into the robot and starts it.
  async function start(cmds) {
    const letters = cmds.filter((c) => STEP_LETTERS.includes(c)).join('');
    if (!letters.length) return 0;
    if (letters.length > info.maxSteps) throw new Error('too many steps');
    await request('CLR', (l) => l === 'OK,0' || l.startsWith('ERR'));
    for (let i = 0; i < letters.length; i += ADD_CHUNK) await send('ADD,' + letters.slice(i, i + ADD_CHUNK));
    const ok = await request('END,' + letters.length, (l) => l.startsWith('OK,') || l.startsWith('ERR'));
    if (ok.startsWith('ERR')) throw new Error(ok);
    progress = { step: -1, ended: false };
    await send('RUN');
    return letters.length;
  }

  // Resolves once the robot has started step i (counting from 0) of the run, or ended,
  // or after timeoutMs, so a robot that drops out never holds up the game.
  function waitStep(i, timeoutMs = 8000) {
    if (!connected() || progress.step >= i || progress.ended) return Promise.resolve();
    return waitFor(() => progress.step >= i || progress.ended || !connected(), timeoutMs);
  }

  function waitDone(timeoutMs = 8000) {
    if (!connected() || progress.ended) return Promise.resolve();
    return waitFor(() => progress.ended, timeoutMs);
  }

  function stop() {
    if (connected()) send('STOP').catch(() => {});
  }

  root.RoversaRobot = {
    get supported() { return !!(root.navigator && root.navigator.bluetooth); },
    get connected() { return connected(); },
    get info() { return info; },
    connect,
    disconnect,
    start,
    stop,
    waitStep,
    waitDone,
    on(type, fn) { listeners[type].push(fn); },
  };
})(globalThis);
