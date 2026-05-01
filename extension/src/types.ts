export type RiveTelemetryInputType = 'boolean' | 'number' | 'trigger' | 'unknown';

export interface RiveTelemetryInput {
  name: string;
  type: RiveTelemetryInputType;
  value: boolean | number | null;
}

export interface RiveTelemetryPayload {
  source: string;
  timestamp: string;
  stateMachine: string;
  inputs: RiveTelemetryInput[];
}
