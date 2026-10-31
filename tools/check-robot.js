#!/usr/bin/env node
// Checks js/robot.js against a pretend Roversa that speaks the Bluetooth
// protocol: reading HELLO, and connecting to a robot whose Bluetooth menu is
// Open, or Locked (Play pressed, Stop pressed, timed out, cancelled, link lost).
// No real robot or browser needed. Usage: node tools/check-robot.js
const path = require('path');

// Keep the output to the checks (robot.js logs every line it sends and gets).
console.debug = () => {};
console.warn = () => {};

const UART_RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// A pretend robot. `mode` is its Bluetooth setting; `answer` is what happens
// at the Play prompt: 'play', 'stop', 'timeout', 'drop' or 'none'.
function fakeRobot({ mode = 'open', answer = 'play', firmware = 'new' } = {}) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const robot = { mode, answer, waiting: false, sent: [], got: [] };
  const handlers = { notify: [], disconnected: [] };
  const gatt = { connected: false };
  const say = (line) => {
    robot.sent.push(line);
    // Send in 20-byte pieces, as the real robot does.
    const bytes = enc.encode(line + '\n');
    for (let i = 0; i < bytes.length; i += 20) {
      const value = new DataView(bytes.slice(i, i + 20).buffer);
      setTimeout(() => handlers.notify.forEach((fn) => fn({ target: { value } })), 1);
    }
  };
  const drop = () => {
    if (!gatt.connected) return;
    gatt.connected = false;
    setTimeout(() => handlers.disconnected.forEach((fn) => fn()), 1);
  };
  robot.drop = drop;
  const onLine = (line) => {
    robot.got.push(line);
    const cmd = line.split(',')[0];
    if (cmd === 'HELLO') {
      let hello = 'ROVERSA,fw=3.2.0,proto=1,cmdmax=64,caps=prog';
      if (firmware === 'new') hello += '+lock,name=KAT,mode=' + (robot.mode === 'locked' ? 'locked' : 'open') + ',lock=' + (robot.waiting ? 'wait' : 'ok');
      say(hello);
    } else if (cmd === 'STOP') say('STOPPED');
    else if (robot.waiting) say('ERR,LOCKED');
    else if (cmd === 'CLR') say('OK,0');
    else if (cmd === 'END') say('OK,' + line.split(',')[1]);
    else if (cmd === 'RUN') { say('RUN,1'); say('STEP,0'); say('DONE'); }
  };
  gatt.connect = async () => {
    gatt.connected = true;
    robot.waiting = robot.mode === 'locked';
    if (robot.waiting) {
      // Someone at the robot answers the prompt a little later.
      setTimeout(() => {
        if (!gatt.connected) return;
        if (robot.answer === 'play') { robot.waiting = false; say('LOCK,OK'); }
        else if (robot.answer === 'stop') { say('LOCK,NO'); setTimeout(drop, 5); }
        else if (robot.answer === 'timeout') { say('LOCK,TIMEOUT'); setTimeout(drop, 5); }
        else if (robot.answer === 'drop') drop();
      }, 30);
    }
    return {
      getPrimaryService: async () => ({
        getCharacteristic: async (uuid) => uuid === UART_RX
          ? { writeValueWithResponse: async (bytes) => { dec.decode(bytes).split('\n').filter(Boolean).forEach(onLine); } }
          : { addEventListener: (t, fn) => handlers.notify.push(fn), startNotifications: async () => {} },
      }),
    };
  };
  gatt.disconnect = drop;
  robot.device = {
    name: 'Roversa [KAT]',
    gatt,
    addEventListener: (t, fn) => { if (t === 'gattserverdisconnected') handlers.disconnected.push(fn); },
  };
  return robot;
}

// robot.js keeps its state in a closure, so load a fresh copy for each case.
function loadRobotJs(robot) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { bluetooth: { requestDevice: async () => robot.device } },
    configurable: true,
  });
  const file = path.join(__dirname, '..', 'js', 'robot.js');
  delete require.cache[require.resolve(file)];
  require(file);
  return globalThis.RoversaRobot;
}

let failed = false;
function check(ok, what) {
  console.log((ok ? 'ok   ' : 'FAIL ') + what);
  if (!ok) failed = true;
}

async function connectCase(opts, during) {
  const robot = fakeRobot(opts);
  const R = loadRobotJs(robot);
  const events = [];
  R.on('lock', (e) => events.push(e.state));
  let error = null;
  let info = null;
  const p = R.connect().then((i) => { info = i; }, (e) => { error = e; });
  if (during) await during(R, robot);
  await p;
  return { R, robot, events, error, info };
}

(async () => {
  const R0 = loadRobotJs(fakeRobot());
  const h = R0.parseHello('ROVERSA,fw=3.2.0,proto=1,cmdmax=64,caps=prog+lock,name=KAT,mode=locked,lock=wait', 'Roversa [KAT]');
  check(h.mode === 'locked' && h.lock === 'wait' && h.caps.includes('lock'), 'HELLO: reads mode and lock');
  const old = R0.parseHello('ROVERSA,fw=3.2.0,proto=1,cmdmax=64,caps=prog', 'x');
  check(old.mode === 'open' && old.lock === 'ok', 'HELLO: firmware without the Bluetooth menu counts as Open');

  let c = await connectCase({ mode: 'open' });
  check(!c.error && c.R.connected && c.events.length === 0, 'Open: connects straight away, no Play prompt');
  check(await c.R.start(['F']) === 1 && c.robot.got.includes('RUN'), 'Open: a program uploads and runs');

  c = await connectCase({ mode: 'open', firmware: 'old' });
  check(!c.error && c.R.connected, 'Firmware without the Bluetooth menu: connects as before');

  c = await connectCase({ mode: 'locked', answer: 'play' }, async (R) => {
    await new Promise((r) => setTimeout(r, 10));
    check(R.waiting && R.waiting.name === 'Roversa [KAT]' && !R.connected, 'Locked: waits for Play, not yet connected');
  });
  check(!c.error && c.R.connected && c.info.lock === 'ok', 'Locked + Play: connected');
  check(c.events.join() === 'wait,ok' && c.R.waiting === null, 'Locked + Play: lock events wait then ok');
  check(await c.R.start(['F', 'L']) === 2, 'Locked + Play: a program uploads and runs');

  c = await connectCase({ mode: 'locked', answer: 'stop' });
  check(c.error && c.error.code === 'refused' && !c.R.connected, 'Locked + Stop: refused, not connected');

  c = await connectCase({ mode: 'locked', answer: 'timeout' });
  check(c.error && c.error.code === 'timeout' && !c.R.connected, 'Locked + no answer: timed out');

  c = await connectCase({ mode: 'locked', answer: 'drop' });
  check(c.error && c.error.code === 'lost' && !c.R.connected, 'Locked + link lost while waiting: lost');

  c = await connectCase({ mode: 'locked', answer: 'none' }, async (R) => {
    await new Promise((r) => setTimeout(r, 10));
    R.cancel();
  });
  check(c.error && c.error.code === 'cancelled' && !c.robot.device.gatt.connected, 'Locked + Cancel in the app: cancelled and disconnected');

  if (failed) process.exit(1);
  console.log('All robot checks passed.');
})();
