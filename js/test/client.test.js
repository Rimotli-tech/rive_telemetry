import assert from 'node:assert/strict';
import test from 'node:test';
import { RiveTelemetry } from '../dist/index.js';

test('payload serializes web runtime state machine inputs', () => {
  const rive = {
    stateMachineInputs(name) {
      assert.equal(name, 'State Machine 1');
      return [
        { name: 'isHovered', value: true },
        { name: 'amount', value: 42 },
        { name: 'explode', fire() {} },
      ];
    },
  };

  const telemetry = new RiveTelemetry({
    rive,
    runtimeId: 'runtime-a',
    label: 'Runtime A',
    source: 'test',
    stateMachineName: 'State Machine 1',
  });

  const payload = telemetry.payload();

  assert.equal(payload.protocolVersion, 1);
  assert.equal(payload.runtimeId, 'runtime-a');
  assert.equal(payload.label, 'Runtime A');
  assert.equal(payload.source, 'test');
  assert.equal(payload.stateMachine, 'State Machine 1');
  assert.deepEqual(payload.inputs, [
    { name: 'isHovered', type: 'boolean', value: true },
    { name: 'amount', type: 'number', value: 42 },
    { name: 'explode', type: 'trigger', value: null },
  ]);
});

test('applyCommand mutates boolean and number inputs', () => {
  const inputs = [
    { name: 'enabled', value: false },
    { name: 'progress', value: 0 },
  ];
  const rive = {
    advanced: 0,
    stateMachineInputs() {
      return inputs;
    },
    advance() {
      this.advanced += 1;
    },
  };
  const telemetry = new RiveTelemetry({
    rive,
    runtimeId: 'runtime-a',
    stateMachineName: 'State Machine 1',
  });

  assert.equal(
    telemetry.applyCommand({
      type: 'setInput',
      runtimeId: 'runtime-a',
      stateMachine: 'State Machine 1',
      inputName: 'enabled',
      inputType: 'boolean',
      value: true,
    }),
    true,
  );
  assert.equal(inputs[0].value, true);

  assert.equal(
    telemetry.applyCommand({
      type: 'setInput',
      runtimeId: 'runtime-a',
      stateMachine: 'State Machine 1',
      inputName: 'progress',
      inputType: 'number',
      value: 9,
    }),
    true,
  );
  assert.equal(inputs[1].value, 9);
  assert.equal(rive.advanced, 2);
});

test('applyCommand fires trigger inputs', () => {
  let fired = 0;
  const telemetry = new RiveTelemetry({
    rive: {
      stateMachineInputs() {
        return [{ name: 'fire', fire: () => fired++ }];
      },
    },
    runtimeId: 'runtime-a',
    stateMachineName: 'State Machine 1',
  });

  assert.equal(
    telemetry.applyCommand({
      type: 'fireTrigger',
      runtimeId: 'runtime-a',
      stateMachine: 'State Machine 1',
      inputName: 'fire',
    }),
    true,
  );
  assert.equal(fired, 1);
});

test('applyCommand ignores runtime and state machine mismatches', () => {
  const input = { name: 'enabled', value: false };
  const telemetry = new RiveTelemetry({
    rive: {
      stateMachineInputs() {
        return [input];
      },
    },
    runtimeId: 'runtime-a',
    stateMachineName: 'State Machine 1',
  });

  assert.equal(
    telemetry.applyCommand({
      type: 'setInput',
      runtimeId: 'other-runtime',
      stateMachine: 'State Machine 1',
      inputName: 'enabled',
      inputType: 'boolean',
      value: true,
    }),
    false,
  );
  assert.equal(input.value, false);

  assert.equal(
    telemetry.applyCommand({
      type: 'setInput',
      runtimeId: 'runtime-a',
      stateMachine: 'Other State Machine',
      inputName: 'enabled',
      inputType: 'boolean',
      value: true,
    }),
    false,
  );
  assert.equal(input.value, false);
});

test('payload captures ViewModel properties and applyCommand mutates them', () => {
  const count = { value: 3 };
  const visible = { value: false };
  const title = { value: 'Cat' };
  const accent = { value: 0xff336699 };
  const mood = { value: 'sleepy' };
  const items = { size: 4 };
  let triggered = 0;
  const instance = {
    name: 'Default',
    properties: [
      { name: 'count', type: 'number' },
      { name: 'visible', type: 'boolean' },
      { name: 'title', type: 'string' },
      { name: 'accent', type: 'color' },
      { name: 'mood', type: 'enumType' },
      { name: 'items', type: 'list' },
      { name: 'wake', type: 'trigger' },
      { name: 'avatar', type: 'image' },
    ],
    number(name) {
      return name === 'count' ? count : undefined;
    },
    boolean(name) {
      return name === 'visible' ? visible : undefined;
    },
    string(name) {
      return name === 'title' ? title : undefined;
    },
    color(name) {
      return name === 'accent' ? accent : undefined;
    },
    enum(name) {
      return name === 'mood' ? mood : undefined;
    },
    list(name) {
      return name === 'items' ? items : undefined;
    },
    trigger(name) {
      return name === 'wake'
        ? {
            trigger() {
              triggered += 1;
            },
          }
        : undefined;
    },
  };
  const telemetry = new RiveTelemetry({
    runtimeId: 'runtime-a',
    viewModelName: 'DemoVM',
    viewModelInstance: instance,
  });

  assert.deepEqual(telemetry.payload().viewModel, {
    supported: true,
    viewModelName: 'DemoVM',
    instanceName: 'Default',
    properties: [
      { name: 'count', type: 'number', value: 3 },
      { name: 'visible', type: 'boolean', value: false },
      { name: 'title', type: 'string', value: 'Cat' },
      { name: 'accent', type: 'color', value: '#ff336699' },
      { name: 'mood', type: 'enum', value: 'sleepy' },
      { name: 'items', type: 'list', value: 4 },
      { name: 'wake', type: 'trigger', value: null },
      { name: 'avatar', type: 'image', value: null },
    ],
  });

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'count',
      propertyType: 'number',
      value: 8,
    }),
    true,
  );
  assert.equal(count.value, 8);

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'visible',
      propertyType: 'boolean',
      value: true,
    }),
    true,
  );
  assert.equal(visible.value, true);

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'title',
      propertyType: 'string',
      value: 'Dog',
    }),
    true,
  );
  assert.equal(title.value, 'Dog');

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'accent',
      propertyType: 'color',
      value: '#336699',
    }),
    true,
  );
  assert.equal(accent.value, 0xff336699);

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'accent',
      propertyType: 'color',
      value: '#80336699',
    }),
    true,
  );
  assert.equal(accent.value, 0x80336699);

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'accent',
      propertyType: 'color',
      value: '#12345g',
    }),
    false,
  );
  assert.equal(accent.value, 0x80336699);

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'mood',
      propertyType: 'enum',
      value: 'awake',
    }),
    true,
  );
  assert.equal(mood.value, 'awake');

  assert.equal(
    telemetry.applyCommand({
      type: 'setViewModelProperty',
      runtimeId: 'runtime-a',
      viewModelName: 'DemoVM',
      instanceName: 'Default',
      propertyName: 'wake',
      propertyType: 'trigger',
    }),
    true,
  );
  assert.equal(triggered, 1);
});

test('payload uses explicit ViewModel instance name for JS runtime instances', () => {
  const telemetry = new RiveTelemetry({
    runtimeId: 'runtime-a',
    viewModelName: 'DemoVM',
    viewModelInstanceName: 'catVMInstance',
    viewModelInstance: {
      properties: [],
    },
  });

  assert.deepEqual(telemetry.payload().viewModel, {
    supported: true,
    viewModelName: 'DemoVM',
    instanceName: 'catVMInstance',
    properties: [],
  });
});

test('payload reports unsupported ViewModel telemetry without an instance', () => {
  const telemetry = new RiveTelemetry({
    runtimeId: 'runtime-a',
    viewModelName: 'DemoVM',
  });

  assert.deepEqual(telemetry.payload().viewModel, {
    supported: false,
    reason: 'No ViewModelInstance provided',
    viewModelName: 'DemoVM',
    properties: [],
  });
});

test('polling does not rebroadcast for ViewModel-only changes', async () => {
  const originalWindow = globalThis.window;
  globalThis.window = globalThis;

  const sockets = [];
  class MockWebSocket {
    static OPEN = 1;

    readyState = MockWebSocket.OPEN;
    sent = [];
    listeners = new Map();

    constructor() {
      sockets.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    send(message) {
      this.sent.push(message);
    }

    close() {}

    emit(type, data = {}) {
      this.listeners.get(type)?.(data);
    }
  }

  try {
    const count = { value: 1 };
    const telemetry = new RiveTelemetry({
      runtimeId: 'runtime-a',
      stateMachineName: 'State Machine 1',
      pollingIntervalMs: 20,
      WebSocketImpl: MockWebSocket,
      rive: {
        stateMachineInputs() {
          return [{ name: 'enabled', value: true }];
        },
      },
      viewModelName: 'DemoVM',
      viewModelInstance: {
        name: 'Default',
        properties: [{ name: 'count', type: 'number' }],
        number(name) {
          return name === 'count' ? count : undefined;
        },
      },
    });

    telemetry.start();
    sockets[0].emit('open');
    assert.equal(sockets[0].sent.length, 1);

    count.value = 2;
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(sockets[0].sent.length, 1);

    telemetry.dispose();
  } finally {
    globalThis.window = originalWindow;
  }
});
