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
  viewModel?: RiveViewModelTelemetry;
}

export interface RiveViewModelTelemetry {
  supported: boolean;
  reason?: string;
  viewModelName?: string;
  instanceName?: string;
  properties: RiveViewModelPropertyTelemetry[];
}

export interface RiveViewModelPropertyTelemetry {
  name: string;
  type: string;
  value: unknown;
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
  viewModel?: RiveViewModelTelemetry;
}

export interface InputSnapshotDiff {
  name: string;
  type: RiveSnapshotInputType;
  snapshotValue: boolean | number | null;
  currentValue: boolean | number | null;
  status: 'changed' | 'added' | 'removed';
}

export interface ViewModelSnapshotDiff {
  name: string;
  type: string;
  from: unknown;
  to: unknown;
  changed: true;
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
  activeViewModelDiffs: ViewModelSnapshotDiff[];
}

export interface RiveTelemetryServerStatus {
  clientCount: number;
  serverRunning: boolean;
  serverError: string | null;
  lastTelemetryAt: string | null;
  telemetryStale: boolean;
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
    }
  | {
      type: 'setViewModelProperty';
      runtimeId: string;
      viewModelName: string;
      instanceName: string;
      propertyName: string;
      propertyType: 'number' | 'boolean' | 'string' | 'color' | 'enum';
      value: number | boolean | string;
    }
  | {
      type: 'setViewModelProperty';
      runtimeId: string;
      viewModelName: string;
      instanceName: string;
      propertyName: string;
      propertyType: 'trigger';
    };
