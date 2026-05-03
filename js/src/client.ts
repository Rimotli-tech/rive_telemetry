import { isRecord, readArray, readString } from './guards.js';
import {
  RiveTelemetryCommand,
  RiveTelemetryInput,
  RiveTelemetryOptions,
  RiveTelemetryPayload,
} from './types.js';
import {
  captureViewModelTelemetry,
  setViewModelProperty,
} from './viewModelTelemetry.js';

let nextGeneratedRuntimeId = 0;

export class RiveTelemetry {
  private socket?: WebSocket;
  private pollTimer?: number;
  private reconnectTimer?: number;
  private reconnectDelayMs = 1000;
  private previousSignature?: string;
  private disposed = false;
  private socketConnected = false;
  private socketConnecting = false;
  private readonly runtimeId: string;
  private readonly label: string;
  private readonly source: string;
  private readonly stateMachineName: string;
  private readonly socketUrl: string;
  private readonly pollingIntervalMs: number;
  private readonly debug: boolean;
  private readonly WebSocketImpl: typeof WebSocket;

  constructor(private readonly options: RiveTelemetryOptions = {}) {
    this.runtimeId =
      options.runtimeId ?? `rive-js-runtime-${++nextGeneratedRuntimeId}`;
    this.label = options.label ?? this.runtimeId;
    this.source = options.source ?? 'javascript-app';
    this.stateMachineName = options.stateMachineName ?? 'State Machine 1';
    this.socketUrl = options.socketUrl ?? 'ws://localhost:8080';
    this.pollingIntervalMs = options.pollingIntervalMs ?? 250;
    this.debug = options.debug ?? false;
    this.WebSocketImpl = options.WebSocketImpl ?? WebSocket;
  }

  start(): void {
    if (this.disposed) {
      return;
    }

    this.connectSocket();
    this.configurePolling();
  }

  dispose(): void {
    this.disposed = true;
    if (this.pollTimer !== undefined) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.closeSocket();
  }

  update(options: Partial<RiveTelemetryOptions>): void {
    Object.assign(this.options, options);
    this.previousSignature = undefined;
    this.broadcastRiveState();
  }

  private connectSocket(): void {
    if (
      this.disposed ||
      !this.socketUrl ||
      this.socket ||
      this.socketConnecting
    ) {
      return;
    }

    try {
      const socket = new this.WebSocketImpl(this.socketUrl);
      this.socket = socket;
      this.socketConnecting = true;

      socket.addEventListener('open', () => {
        if (this.disposed || this.socket !== socket) {
          return;
        }
        this.socketConnecting = false;
        this.socketConnected = true;
        this.reconnectDelayMs = 1000;
        this.broadcastRiveState();
      });

      socket.addEventListener('message', (event) => {
        this.handleSocketMessage(event.data);
      });

      socket.addEventListener('close', () => {
        this.handleSocketClosed(socket);
      });

      socket.addEventListener('error', () => {
        this.handleSocketClosed(socket);
      });
    } catch (error) {
      this.debugLog(`RiveTelemetry WebSocket connection failed: ${error}`);
      this.markSocketDisconnected();
      this.scheduleReconnect();
    }
  }

  private configurePolling(): void {
    if (this.pollTimer !== undefined) {
      window.clearInterval(this.pollTimer);
    }

    this.previousSignature = undefined;
    this.broadcastRiveState();
    this.pollTimer = window.setInterval(() => {
      const signature = this.buildInputSignature();
      if (signature === this.previousSignature) {
        return;
      }
      this.broadcastRiveState();
    }, this.pollingIntervalMs);
  }

  private closeSocket(): void {
    this.socketConnected = false;
    this.socketConnecting = false;
    this.socket?.close();
    this.socket = undefined;
  }

  private markSocketDisconnected(): void {
    this.socketConnected = false;
    this.socketConnecting = false;
  }

  private handleSocketClosed(socket: WebSocket): void {
    if (this.socket !== socket) {
      return;
    }

    this.markSocketDisconnected();
    this.socket = undefined;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (
      this.disposed ||
      !this.socketUrl ||
      this.reconnectTimer !== undefined ||
      this.socket ||
      this.socketConnecting
    ) {
      return;
    }

    const delay = this.reconnectDelayMs;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connectSocket();
    }, delay);
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 5000);
  }

  private buildTelemetryPayload(): RiveTelemetryPayload {
    return {
      source: this.source,
      runtimeId: this.runtimeId,
      label: this.label,
      timestamp: new Date().toISOString(),
      stateMachine: this.stateMachineName,
      inputs: this.readInputs(),
      viewModel: captureViewModelTelemetry({
        instance: this.options.viewModelInstance,
        viewModelName: this.options.viewModelName,
      }),
    };
  }

  private broadcastRiveState(): void {
    if (this.disposed) {
      return;
    }

    const payload = this.buildTelemetryPayload();
    const compactJson = JSON.stringify(payload);
    if (this.debug) {
      console.log(JSON.stringify(payload, null, 2));
    }
    this.previousSignature = this.buildInputSignature();

    if (this.socketConnected && this.socket) {
      this.socket.send(compactJson);
    }
  }

  private buildInputSignature(): string {
    return JSON.stringify(this.readInputs());
  }

  private readInputs(): RiveTelemetryInput[] {
    const stateMachine = this.resolveStateMachine();
    if (!stateMachine) {
      return [];
    }

    const inputs = readArray(
      isRecord(stateMachine) ? stateMachine.inputs : undefined,
    );
    return inputs.map((input) => this.serializeInput(input));
  }

  private serializeInput(input: unknown): RiveTelemetryInput {
    if (!isRecord(input)) {
      return { name: '', type: 'unknown', value: null };
    }

    const name = readString(input.name) ?? '';
    const type = readInputType(input);
    return {
      name,
      type,
      value:
        type === 'boolean' && typeof input.value === 'boolean'
          ? input.value
          : type === 'number' && typeof input.value === 'number'
            ? input.value
            : null,
    };
  }

  private handleSocketMessage(message: unknown): void {
    if (this.disposed) {
      return;
    }

    const rawMessage = typeof message === 'string' ? message : String(message);
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawMessage);
    } catch (error) {
      this.debugLog(`RiveTelemetry ignored malformed command: ${error}`);
      return;
    }

    if (!isTelemetryCommand(decoded)) {
      return;
    }

    const applied =
      decoded.type === 'setInput'
        ? this.applySetInputCommand(decoded)
        : decoded.type === 'fireTrigger'
          ? this.applyFireTriggerCommand(decoded)
          : this.applySetViewModelPropertyCommand(decoded);

    if (!applied) {
      return;
    }

    this.advanceRuntime();
    this.broadcastRiveState();
  }

  private applySetInputCommand(command: RiveTelemetryCommand): boolean {
    if (command.type !== 'setInput') {
      return false;
    }

    if (!this.matchesRuntimeAndStateMachine(command)) {
      return false;
    }

    const input = this.inputByName(command.inputName);
    if (!isRecord(input)) {
      return this.ignoreCommand(`input "${command.inputName}" was not found`);
    }

    if (command.inputType === 'boolean' && typeof command.value === 'boolean') {
      input.value = command.value;
      return true;
    }

    if (command.inputType === 'number' && typeof command.value === 'number') {
      input.value = command.value;
      return true;
    }

    return this.ignoreCommand('type/value mismatch for input');
  }

  private applyFireTriggerCommand(command: RiveTelemetryCommand): boolean {
    if (command.type !== 'fireTrigger') {
      return false;
    }

    if (!this.matchesRuntimeAndStateMachine(command)) {
      return false;
    }

    const input = this.inputByName(command.inputName);
    if (!isRecord(input)) {
      return this.ignoreCommand(
        `trigger input "${command.inputName}" was not found`,
      );
    }

    const fire = input.fire;
    if (typeof fire === 'function') {
      fire.call(input);
      return true;
    }

    return this.ignoreCommand(
      `trigger input "${command.inputName}" cannot be fired`,
    );
  }

  private applySetViewModelPropertyCommand(
    command: RiveTelemetryCommand,
  ): boolean {
    if (command.type !== 'setViewModelProperty') {
      return false;
    }

    if (command.runtimeId !== this.runtimeId) {
      return this.ignoreCommand('runtime mismatch');
    }

    if (command.viewModelName !== this.options.viewModelName) {
      return this.ignoreCommand('view model mismatch');
    }

    return setViewModelProperty({
      instance: this.options.viewModelInstance,
      instanceName: command.instanceName,
      propertyName: command.propertyName,
      propertyType: command.propertyType,
      value: 'value' in command ? command.value : undefined,
    });
  }

  private matchesRuntimeAndStateMachine(
    command: { runtimeId: string; stateMachine: string },
  ): boolean {
    if (command.runtimeId !== this.runtimeId) {
      return this.ignoreCommand('runtime mismatch');
    }
    if (command.stateMachine !== this.stateMachineName) {
      return this.ignoreCommand('state machine mismatch');
    }
    return true;
  }

  private inputByName(name: string): unknown {
    const stateMachine = this.resolveStateMachine();
    const inputs = readArray(
      isRecord(stateMachine) ? stateMachine.inputs : undefined,
    );
    return inputs.find((input) => isRecord(input) && input.name === name);
  }

  private resolveStateMachine(): unknown {
    if (this.options.stateMachine) {
      return this.options.stateMachine;
    }

    const rive = this.options.rive;
    if (!isRecord(rive)) {
      return undefined;
    }

    if (isRecord(rive.stateMachine)) {
      return rive.stateMachine;
    }

    const stateMachine = rive.stateMachineByName;
    if (typeof stateMachine === 'function') {
      return stateMachine.call(rive, this.stateMachineName);
    }

    const stateMachines = readArray(rive.stateMachines);
    return stateMachines.find(
      (candidate) =>
        isRecord(candidate) && candidate.name === this.stateMachineName,
    );
  }

  private advanceRuntime(): void {
    const stateMachine = this.resolveStateMachine();
    for (const target of [stateMachine, this.options.rive]) {
      if (!isRecord(target)) {
        continue;
      }
      for (const methodName of ['requestAdvance', 'advance', 'drawFrame']) {
        const method = target[methodName];
        if (typeof method === 'function') {
          method.call(target);
          return;
        }
      }
    }
  }

  private ignoreCommand(reason: string): false {
    this.debugLog(`RiveTelemetry ignored command: ${reason}`);
    return false;
  }

  private debugLog(message: string): void {
    if (this.debug) {
      console.debug(message);
    }
  }
}

function readInputType(input: Record<string, unknown>) {
  const explicitType = readString(input.type);
  if (
    explicitType === 'boolean' ||
    explicitType === 'number' ||
    explicitType === 'trigger'
  ) {
    return explicitType;
  }

  if (typeof input.value === 'boolean') {
    return 'boolean';
  }

  if (typeof input.value === 'number') {
    return 'number';
  }

  if (typeof input.fire === 'function') {
    return 'trigger';
  }

  return 'unknown';
}

function isTelemetryCommand(value: unknown): value is RiveTelemetryCommand {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (
    value.type === 'setInput' &&
    typeof value.runtimeId === 'string' &&
    typeof value.stateMachine === 'string' &&
    typeof value.inputName === 'string'
  ) {
    return (
      (value.inputType === 'boolean' && typeof value.value === 'boolean') ||
      (value.inputType === 'number' && typeof value.value === 'number')
    );
  }

  if (
    value.type === 'fireTrigger' &&
    typeof value.runtimeId === 'string' &&
    typeof value.stateMachine === 'string' &&
    typeof value.inputName === 'string'
  ) {
    return true;
  }

  return (
    value.type === 'setViewModelProperty' &&
    typeof value.runtimeId === 'string' &&
    typeof value.viewModelName === 'string' &&
    typeof value.instanceName === 'string' &&
    typeof value.propertyName === 'string' &&
    typeof value.propertyType === 'string'
  );
}
