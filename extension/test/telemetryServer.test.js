const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const originalLoad = Module._load;

Module._load = function loadWithVscodeMock(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      window: {
        warnings: [],
        showWarningMessage(message) {
          this.warnings.push(message);
        },
      },
      Disposable: class Disposable {},
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

const { TelemetryServer } = require('../out/telemetryServer.js');
const WebSocket = require('ws');

function createOutput() {
  const lines = [];
  return {
    lines,
    appendLine(line) {
      lines.push(line);
    },
  };
}

function createServer() {
  return new TelemetryServer(createOutput(), 0);
}

function payload(overrides = {}) {
  return {
    protocolVersion: 1,
    source: 'test',
    runtimeId: 'runtime-a',
    label: 'Runtime A',
    timestamp: '2026-05-06T00:00:00.000Z',
    stateMachine: 'State Machine 1',
    inputs: [
      { name: 'enabled', type: 'boolean', value: true },
      { name: 'progress', type: 'number', value: 1 },
      { name: 'fire', type: 'trigger', value: null },
    ],
    viewModel: {
      supported: true,
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      properties: [{ name: 'count', type: 'number', value: 1 }],
    },
    ...overrides,
  };
}

test('invalid payloads are ignored without changing panel state', () => {
  const server = createServer();

  server.handleMessage('{bad json');
  server.handleMessage(
    JSON.stringify({
      source: 'test',
      runtimeId: '',
      label: 'Runtime',
      timestamp: 'now',
      stateMachine: 'State Machine 1',
      inputs: [],
    }),
  );

  assert.equal(server.panelState.payloads.length, 0);
  assert.equal(server.panelState.activePayload, null);
});

test('valid payloads update state and runtime selection', () => {
  const server = createServer();

  server.handleMessage(JSON.stringify(payload()));
  server.handleMessage(
    JSON.stringify(
      payload({
        runtimeId: 'runtime-b',
        label: 'Runtime B',
        inputs: [{ name: 'visible', type: 'boolean', value: false }],
      }),
    ),
  );

  assert.equal(server.panelState.runtimes.length, 2);
  assert.equal(server.panelState.activeRuntimeId, 'runtime-a');
  assert.equal(server.selectRuntime('runtime-b'), true);
  assert.equal(server.panelState.activeRuntimeId, 'runtime-b');
  assert.equal(server.selectRuntime('missing-runtime'), false);
});

test('snapshots capture input and ViewModel diffs', () => {
  const server = createServer();

  server.handleMessage(JSON.stringify(payload()));
  assert.equal(server.captureSnapshot('runtime-a'), true);

  server.handleMessage(
    JSON.stringify(
      payload({
        inputs: [
          { name: 'enabled', type: 'boolean', value: false },
          { name: 'progress', type: 'number', value: 1 },
        ],
        viewModel: {
          supported: true,
          viewModelName: 'DemoVM',
          instanceName: 'Default',
          properties: [{ name: 'count', type: 'number', value: 2 }],
        },
      }),
    ),
  );

  assert.deepEqual(server.panelState.activeDiffs, [
    {
      name: 'enabled',
      type: 'boolean',
      snapshotValue: true,
      currentValue: false,
      status: 'changed',
    },
    {
      name: 'fire',
      type: 'trigger',
      snapshotValue: null,
      currentValue: null,
      status: 'removed',
    },
  ]);
  assert.deepEqual(server.panelState.activeViewModelDiffs, [
    {
      name: 'count',
      type: 'number',
      from: 1,
      to: 2,
      changed: true,
    },
  ]);
});

test('status reports stale telemetry when clients disconnect', () => {
  const server = createServer();

  assert.equal(server.status.telemetryStale, false);
  server.handleMessage(JSON.stringify(payload()));

  assert.equal(server.status.clientCount, 0);
  assert.equal(server.status.telemetryStale, true);
  assert.ok(server.status.lastTelemetryAt);
});

test('commands are broadcast to open clients', () => {
  const server = createServer();
  const sent = [];
  const client = {
    readyState: WebSocket.OPEN,
    send(message) {
      sent.push(message);
    },
  };

  server.clients.add(client);

  const command = {
    type: 'setInput',
    runtimeId: 'runtime-a',
    stateMachine: 'State Machine 1',
    inputName: 'enabled',
    inputType: 'boolean',
    value: false,
  };

  assert.equal(server.sendCommand(command), true);
  assert.deepEqual(sent.map((message) => JSON.parse(message)), [command]);
});
