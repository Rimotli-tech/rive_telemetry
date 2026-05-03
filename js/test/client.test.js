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
  const instance = {
    name: 'Default',
    properties: [
      { name: 'count', type: 'number' },
      { name: 'visible', type: 'boolean' },
    ],
    number(name) {
      return name === 'count' ? count : undefined;
    },
    boolean(name) {
      return name === 'visible' ? visible : undefined;
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
});
