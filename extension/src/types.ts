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

export interface RiveTelemetryServerStatus {
  clientCount: number;
  serverRunning: boolean;
  serverError: string | null;
  lastTelemetryAt: string | null;
}

export type RiveTelemetryCommand =
  | {
      type: 'setInput';
      stateMachine: string;
      inputName: string;
      inputType: 'boolean';
      value: boolean;
    }
  | {
      type: 'setInput';
      stateMachine: string;
      inputName: string;
      inputType: 'number';
      value: number;
    }
  | {
      type: 'fireTrigger';
      stateMachine: string;
      inputName: string;
    };
