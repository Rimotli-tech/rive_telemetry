export type RiveTelemetryInputType = 'boolean' | 'number' | 'trigger' | 'unknown';

export interface RiveTelemetryInput {
  name: string;
  type: RiveTelemetryInputType;
  value: boolean | number | null;
}

export interface RiveTelemetryPayload {
  source: string;
  runtimeId: string;
  label: string;
  timestamp: string;
  stateMachine: string;
  inputs: RiveTelemetryInput[];
  viewModel?: unknown;
}

export type RiveSnapshotInputType = 'boolean' | 'number' | 'trigger';

export interface InputSnapshot {
  name: string;
  type: RiveSnapshotInputType;
  value: boolean | number | null;
}

export interface RuntimeSnapshot {
  runtimeId: string;
  label: string;
  stateMachine: string;
  capturedAt: string;
  inputs: InputSnapshot[];
}

export interface InputSnapshotDiff {
  name: string;
  type: RiveSnapshotInputType;
  snapshotValue: boolean | number | null;
  currentValue: boolean | number | null;
  status: 'changed' | 'added' | 'removed';
}

export interface RiveRuntimeSummary {
  runtimeId: string;
  label: string;
  source: string;
  stateMachine: string;
  timestamp: string;
}

export interface RiveTelemetryPanelState {
  runtimes: RiveRuntimeSummary[];
  payloads: RiveTelemetryPayload[];
  activeRuntimeId: string | null;
  activePayload: RiveTelemetryPayload | null;
  snapshots: RuntimeSnapshot[];
  activeSnapshot: RuntimeSnapshot | null;
  activeDiffs: InputSnapshotDiff[];
}

export interface RiveTelemetryServerStatus {
  clientCount: number;
  serverRunning: boolean;
  serverError: string | null;
  lastTelemetryAt: string | null;
}

export type RiveTelemetryCommand =
  | {
      type: 'setInput';
      runtimeId: string;
      stateMachine: string;
      inputName: string;
      inputType: 'boolean';
      value: boolean;
    }
  | {
      type: 'setInput';
      runtimeId: string;
      stateMachine: string;
      inputName: string;
      inputType: 'number';
      value: number;
    }
  | {
      type: 'fireTrigger';
      runtimeId: string;
      stateMachine: string;
      inputName: string;
    };
