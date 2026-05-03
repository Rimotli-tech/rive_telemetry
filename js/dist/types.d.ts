export type RiveTelemetryInputType = 'boolean' | 'number' | 'trigger' | 'unknown';
export interface RiveTelemetryInput {
    name: string;
    type: RiveTelemetryInputType;
    value: boolean | number | null;
}
export interface RiveViewModelPropertyTelemetry {
    name: string;
    type: string;
    value: unknown;
}
export interface RiveViewModelTelemetry {
    supported: boolean;
    reason?: string;
    viewModelName?: string;
    instanceName?: string;
    properties: RiveViewModelPropertyTelemetry[];
}
export interface RiveTelemetryPayload {
    protocolVersion: 1;
    source: string;
    runtimeId: string;
    label: string;
    timestamp: string;
    stateMachine: string;
    inputs: RiveTelemetryInput[];
    viewModel?: RiveViewModelTelemetry;
}
export type RiveTelemetryCommand = {
    type: 'setInput';
    runtimeId: string;
    stateMachine: string;
    inputName: string;
    inputType: 'boolean';
    value: boolean;
} | {
    type: 'setInput';
    runtimeId: string;
    stateMachine: string;
    inputName: string;
    inputType: 'number';
    value: number;
} | {
    type: 'fireTrigger';
    runtimeId: string;
    stateMachine: string;
    inputName: string;
} | {
    type: 'setViewModelProperty';
    runtimeId: string;
    viewModelName: string;
    instanceName: string;
    propertyName: string;
    propertyType: 'number' | 'boolean' | 'string' | 'color' | 'enum';
    value: number | boolean | string;
} | {
    type: 'setViewModelProperty';
    runtimeId: string;
    viewModelName: string;
    instanceName: string;
    propertyName: string;
    propertyType: 'trigger';
};
export interface RiveTelemetryOptions {
    rive?: unknown;
    stateMachine?: unknown;
    runtimeId?: string;
    label?: string;
    source?: string;
    stateMachineName?: string;
    viewModelName?: string;
    viewModelInstanceName?: string;
    viewModelInstance?: unknown;
    socketUrl?: string;
    pollingIntervalMs?: number;
    debug?: boolean;
    WebSocketImpl?: typeof WebSocket;
}
