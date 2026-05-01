import * as vscode from 'vscode';
import { WebSocketServer } from 'ws';
import { RiveTelemetryInput, RiveTelemetryPayload } from './types';

type TelemetryListener = (payload: RiveTelemetryPayload) => void;

export class TelemetryServer implements vscode.Disposable {
  private server?: WebSocketServer;
  private latestPayload?: RiveTelemetryPayload;
  private readonly listeners = new Set<TelemetryListener>();
  private readonly output: vscode.OutputChannel;

  constructor(
    output: vscode.OutputChannel,
    private readonly port = 8080,
  ) {
    this.output = output;
  }

  get latest(): RiveTelemetryPayload | undefined {
    return this.latestPayload;
  }

  start(): void {
    if (this.server) {
      return;
    }

    try {
      const server = new WebSocketServer({ port: this.port });
      this.server = server;

      server.on('listening', () => {
        this.output.appendLine(
          `RiveTelemetry WebSocket server listening on ws://localhost:${this.port}`,
        );
      });

      server.on('connection', (socket) => {
        this.output.appendLine('RiveTelemetry client connected');

        socket.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        socket.on('close', () => {
          this.output.appendLine('RiveTelemetry client disconnected');
        });

        socket.on('error', (error) => {
          this.output.appendLine(`RiveTelemetry client error: ${error.message}`);
        });
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        this.output.appendLine(`RiveTelemetry server error: ${error.message}`);
        if (error.code === 'EADDRINUSE') {
          vscode.window.showWarningMessage(
            `RiveTelemetry could not start because port ${this.port} is already in use.`,
          );
        }
        server.close();
        this.server = undefined;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`RiveTelemetry server failed to start: ${message}`);
      vscode.window.showWarningMessage(
        `RiveTelemetry WebSocket server failed to start: ${message}`,
      );
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

  dispose(): void {
    this.listeners.clear();
    this.server?.close();
    this.server = undefined;
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

    this.latestPayload = parsed;
    for (const listener of this.listeners) {
      listener(parsed);
    }
  }
}

function isTelemetryPayload(value: unknown): value is RiveTelemetryPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.source === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.stateMachine === 'string' &&
    Array.isArray(value.inputs) &&
    value.inputs.every(isTelemetryInput)
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
