import * as vscode from 'vscode';
import WebSocket, { WebSocketServer } from 'ws';
import {
  InputSnapshot,
  InputSnapshotDiff,
  RiveTelemetryCommand,
  RiveTelemetryInput,
  RiveTelemetryPanelState,
  RiveTelemetryPayload,
  RiveViewModelPropertyTelemetry,
  RiveViewModelTelemetry,
  RuntimeSnapshot,
  RiveRuntimeSummary,
  RiveTelemetryServerStatus,
  ViewModelSnapshotDiff,
} from './types';

type TelemetryListener = (state: RiveTelemetryPanelState) => void;
type StatusListener = (status: RiveTelemetryServerStatus) => void;

export class TelemetryServer implements vscode.Disposable {
  private server?: WebSocketServer;
  private readonly latestPayloads = new Map<string, RiveTelemetryPayload>();
  private readonly snapshots = new Map<string, RuntimeSnapshot>();
  private activeRuntimeId: string | null = null;
  private serverRunning = false;
  private serverError: string | null = null;
  private lastTelemetryAt: string | null = null;
  private readonly clients = new Set<WebSocket>();
  private readonly listeners = new Set<TelemetryListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private readonly output: vscode.OutputChannel;

  constructor(
    output: vscode.OutputChannel,
    private readonly port = 8080,
  ) {
    this.output = output;
  }

  get panelState(): RiveTelemetryPanelState {
    const payloads = [...this.latestPayloads.values()];
    const runtimes = payloads.map(toRuntimeSummary);
    const activePayload =
      this.activeRuntimeId === null
        ? null
        : this.latestPayloads.get(this.activeRuntimeId) ?? null;
    const activeSnapshot =
      this.activeRuntimeId === null
        ? null
        : this.snapshots.get(this.activeRuntimeId) ?? null;

    return {
      runtimes,
      payloads,
      activeRuntimeId: activePayload?.runtimeId ?? null,
      activePayload,
      snapshots: [...this.snapshots.values()],
      activeSnapshot,
      activeDiffs:
        activePayload !== null && activeSnapshot !== null
          ? diffSnapshot(activeSnapshot, activePayload)
          : [],
      activeViewModelDiffs:
        activePayload !== null && activeSnapshot !== null
          ? diffViewModelSnapshot(activeSnapshot, activePayload)
          : [],
    };
  }

  get status(): RiveTelemetryServerStatus {
    return {
      clientCount: this.clients.size,
      serverRunning: this.serverRunning,
      serverError: this.serverError,
      lastTelemetryAt: this.lastTelemetryAt,
    };
  }

  start(): void {
    if (this.server) {
      return;
    }

    try {
      const server = new WebSocketServer({ port: this.port });
      this.server = server;

      server.on('listening', () => {
        this.serverRunning = true;
        this.serverError = null;
        this.output.appendLine(
          `RiveTelemetry WebSocket server listening on ws://localhost:${this.port}`,
        );
        this.notifyStatus();
      });

      server.on('connection', (socket) => {
        this.clients.add(socket);
        this.output.appendLine('RiveTelemetry client connected');
        this.notifyStatus();

        socket.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        socket.on('close', () => {
          this.clients.delete(socket);
          this.output.appendLine('RiveTelemetry client disconnected');
          this.notifyStatus();
        });

        socket.on('error', (error) => {
          this.clients.delete(socket);
          this.output.appendLine(`RiveTelemetry client error: ${error.message}`);
          this.notifyStatus();
        });
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        this.serverRunning = false;
        this.serverError = error.message;
        this.output.appendLine(`RiveTelemetry server error: ${error.message}`);
        if (error.code === 'EADDRINUSE') {
          vscode.window.showWarningMessage(
            `RiveTelemetry could not start because port ${this.port} is already in use.`,
          );
        }
        server.close();
        this.server = undefined;
        this.notifyStatus();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.serverRunning = false;
      this.serverError = message;
      this.output.appendLine(`RiveTelemetry server failed to start: ${message}`);
      vscode.window.showWarningMessage(
        `RiveTelemetry WebSocket server failed to start: ${message}`,
      );
      this.notifyStatus();
    }
  }

  onTelemetry(listener: TelemetryListener): vscode.Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  onStatus(listener: StatusListener): vscode.Disposable {
    this.statusListeners.add(listener);
    return {
      dispose: () => {
        this.statusListeners.delete(listener);
      },
    };
  }

  sendCommand(command: RiveTelemetryCommand): boolean {
    const openClients = [...this.clients].filter(
      (client) => client.readyState === WebSocket.OPEN,
    );

    if (openClients.length === 0) {
      this.output.appendLine(
        'RiveTelemetry command ignored because no Flutter client is connected',
      );
      vscode.window.showWarningMessage(
        'RiveTelemetry has no connected Flutter client.',
      );
      return false;
    }

    const message = JSON.stringify(command);
    for (const client of openClients) {
      try {
        client.send(message);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.output.appendLine(`RiveTelemetry command send failed: ${detail}`);
      }
    }

    return true;
  }

  dispose(): void {
    this.listeners.clear();
    this.statusListeners.clear();
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.server?.close();
    this.server = undefined;
    this.serverRunning = false;
  }

  selectRuntime(runtimeId: string): boolean {
    if (!this.latestPayloads.has(runtimeId)) {
      return false;
    }

    this.activeRuntimeId = runtimeId;
    this.notifyTelemetry();
    return true;
  }

  captureSnapshot(runtimeId: string): boolean {
    const payload = this.latestPayloads.get(runtimeId);
    if (!payload) {
      return false;
    }

    this.snapshots.set(runtimeId, {
      runtimeId: payload.runtimeId,
      label: payload.label,
      stateMachine: payload.stateMachine,
      capturedAt: new Date().toISOString(),
      inputs: payload.inputs.flatMap(toInputSnapshot),
      viewModel: toViewModelSnapshot(payload.viewModel),
    });
    this.notifyTelemetry();
    return true;
  }

  clearSnapshot(runtimeId: string): boolean {
    const removed = this.snapshots.delete(runtimeId);
    if (removed) {
      this.notifyTelemetry();
    }
    return removed;
  }

  private handleMessage(rawMessage: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMessage);
    } catch {
      this.output.appendLine('RiveTelemetry ignored malformed JSON payload');
      return;
    }

    if (!isTelemetryPayload(parsed)) {
      this.output.appendLine('RiveTelemetry ignored invalid telemetry payload');
      return;
    }

    this.latestPayloads.set(parsed.runtimeId, parsed);
    if (
      this.activeRuntimeId === null ||
      !this.latestPayloads.has(this.activeRuntimeId)
    ) {
      this.activeRuntimeId = parsed.runtimeId;
    }
    this.lastTelemetryAt = new Date().toISOString();
    this.notifyTelemetry();
    this.notifyStatus();
  }

  private notifyTelemetry(): void {
    const state = this.panelState;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private notifyStatus(): void {
    const status = this.status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}

function isTelemetryPayload(value: unknown): value is RiveTelemetryPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.source === 'string' &&
    typeof value.runtimeId === 'string' &&
    value.runtimeId.length > 0 &&
    typeof value.label === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.stateMachine === 'string' &&
    Array.isArray(value.inputs) &&
    value.inputs.every(isTelemetryInput)
  );
}

function toRuntimeSummary(payload: RiveTelemetryPayload): RiveRuntimeSummary {
  return {
    runtimeId: payload.runtimeId,
    label: payload.label,
    source: payload.source,
    stateMachine: payload.stateMachine,
    timestamp: payload.timestamp,
  };
}

function isTelemetryInput(value: unknown): value is RiveTelemetryInput {
  if (!isRecord(value)) {
    return false;
  }

  const inputType = value.type;
  const inputValue = value.value;

  return (
    typeof value.name === 'string' &&
    (inputType === 'boolean' ||
      inputType === 'number' ||
      inputType === 'trigger' ||
      inputType === 'unknown') &&
    (typeof inputValue === 'boolean' ||
      typeof inputValue === 'number' ||
      inputValue === null)
  );
}

function toInputSnapshot(input: RiveTelemetryInput): InputSnapshot[] {
  if (
    input.type !== 'boolean' &&
    input.type !== 'number' &&
    input.type !== 'trigger'
  ) {
    return [];
  }

  return [
    {
      name: input.name,
      type: input.type,
      value: input.value,
    },
  ];
}

function diffSnapshot(
  snapshot: RuntimeSnapshot,
  payload: RiveTelemetryPayload,
): InputSnapshotDiff[] {
  const currentInputs = new Map(
    payload.inputs.flatMap(toInputSnapshot).map((input) => [input.name, input]),
  );
  const snapshotInputs = new Map(
    snapshot.inputs.map((input) => [input.name, input]),
  );
  const diffs: InputSnapshotDiff[] = [];

  for (const [name, current] of currentInputs) {
    const previous = snapshotInputs.get(name);
    if (!previous) {
      diffs.push({
        name,
        type: current.type,
        snapshotValue: null,
        currentValue: current.value,
        status: 'added',
      });
      continue;
    }

    if (previous.type !== current.type || previous.value !== current.value) {
      diffs.push({
        name,
        type: current.type,
        snapshotValue: previous.value,
        currentValue: current.value,
        status: 'changed',
      });
    }
  }

  for (const [name, previous] of snapshotInputs) {
    if (!currentInputs.has(name)) {
      diffs.push({
        name,
        type: previous.type,
        snapshotValue: previous.value,
        currentValue: null,
        status: 'removed',
      });
    }
  }

  return diffs;
}

function toViewModelSnapshot(
  viewModel: RiveViewModelTelemetry | undefined,
): RiveViewModelTelemetry | undefined {
  if (!viewModel?.supported) {
    return undefined;
  }

  return {
    supported: true,
    viewModelName: viewModel.viewModelName,
    instanceName: viewModel.instanceName,
    properties: normalizeViewModelProperties(viewModel.properties),
  };
}

function normalizeViewModelProperties(
  properties: RiveViewModelPropertyTelemetry[] | undefined,
): RiveViewModelPropertyTelemetry[] {
  if (!Array.isArray(properties)) {
    return [];
  }

  return properties
    .filter((property) => isRecord(property))
    .map((property) => ({
      name: typeof property.name === 'string' ? property.name : '',
      type: typeof property.type === 'string' ? property.type : 'unknown',
      value: property.value ?? null,
    }))
    .filter((property) => property.name.length > 0);
}

function diffViewModelSnapshot(
  snapshot: RuntimeSnapshot,
  payload: RiveTelemetryPayload,
): ViewModelSnapshotDiff[] {
  const snapshotViewModel = snapshot.viewModel;
  const currentViewModel = toViewModelSnapshot(payload.viewModel);
  if (!snapshotViewModel?.supported || !currentViewModel?.supported) {
    return [];
  }

  if (
    snapshotViewModel.viewModelName !== currentViewModel.viewModelName ||
    snapshotViewModel.instanceName !== currentViewModel.instanceName
  ) {
    return diffDifferentViewModelInstances(snapshotViewModel, currentViewModel);
  }

  const snapshotProperties = new Map(
    normalizeViewModelProperties(snapshotViewModel.properties).map(
      (property) => [property.name, property],
    ),
  );
  const currentProperties = new Map(
    normalizeViewModelProperties(currentViewModel.properties).map((property) => [
      property.name,
      property,
    ]),
  );
  const diffs: ViewModelSnapshotDiff[] = [];

  for (const [name, current] of currentProperties) {
    const previous = snapshotProperties.get(name);
    if (!previous) {
      diffs.push({
        name,
        type: current.type,
        from: null,
        to: current.value,
        changed: true,
      });
      continue;
    }

    if (
      previous.type !== current.type ||
      !areViewModelValuesEqual(previous.value, current.value)
    ) {
      diffs.push({
        name,
        type: current.type,
        from: previous.value,
        to: current.value,
        changed: true,
      });
    }
  }

  for (const [name, previous] of snapshotProperties) {
    if (!currentProperties.has(name)) {
      diffs.push({
        name,
        type: previous.type,
        from: previous.value,
        to: null,
        changed: true,
      });
    }
  }

  return diffs;
}

function diffDifferentViewModelInstances(
  snapshotViewModel: RiveViewModelTelemetry,
  currentViewModel: RiveViewModelTelemetry,
): ViewModelSnapshotDiff[] {
  const snapshotProperties = new Map(
    normalizeViewModelProperties(snapshotViewModel.properties).map(
      (property) => [property.name, property],
    ),
  );
  const currentProperties = new Map(
    normalizeViewModelProperties(currentViewModel.properties).map((property) => [
      property.name,
      property,
    ]),
  );
  const names = new Set([...snapshotProperties.keys(), ...currentProperties.keys()]);

  return [...names].map((name) => {
    const previous = snapshotProperties.get(name);
    const current = currentProperties.get(name);
    return {
      name,
      type: current?.type ?? previous?.type ?? 'unknown',
      from: previous?.value ?? null,
      to: current?.value ?? null,
      changed: true,
    };
  });
}

function areViewModelValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
