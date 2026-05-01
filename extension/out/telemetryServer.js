"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryServer = void 0;
const vscode = __importStar(require("vscode"));
const ws_1 = require("ws");
class TelemetryServer {
    constructor(output, port = 8080) {
        this.port = port;
        this.listeners = new Set();
        this.output = output;
    }
    get latest() {
        return this.latestPayload;
    }
    start() {
        if (this.server) {
            return;
        }
        try {
            const server = new ws_1.WebSocketServer({ port: this.port });
            this.server = server;
            server.on('listening', () => {
                this.output.appendLine(`RiveTelemetry WebSocket server listening on ws://localhost:${this.port}`);
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
            server.on('error', (error) => {
                this.output.appendLine(`RiveTelemetry server error: ${error.message}`);
                if (error.code === 'EADDRINUSE') {
                    vscode.window.showWarningMessage(`RiveTelemetry could not start because port ${this.port} is already in use.`);
                }
                server.close();
                this.server = undefined;
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.output.appendLine(`RiveTelemetry server failed to start: ${message}`);
            vscode.window.showWarningMessage(`RiveTelemetry WebSocket server failed to start: ${message}`);
        }
    }
    onTelemetry(listener) {
        this.listeners.add(listener);
        return {
            dispose: () => {
                this.listeners.delete(listener);
            },
        };
    }
    dispose() {
        this.listeners.clear();
        this.server?.close();
        this.server = undefined;
    }
    handleMessage(rawMessage) {
        let parsed;
        try {
            parsed = JSON.parse(rawMessage);
        }
        catch {
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
exports.TelemetryServer = TelemetryServer;
function isTelemetryPayload(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (typeof value.source === 'string' &&
        typeof value.timestamp === 'string' &&
        typeof value.stateMachine === 'string' &&
        Array.isArray(value.inputs) &&
        value.inputs.every(isTelemetryInput));
}
function isTelemetryInput(value) {
    if (!isRecord(value)) {
        return false;
    }
    const inputType = value.type;
    const inputValue = value.value;
    return (typeof value.name === 'string' &&
        (inputType === 'boolean' ||
            inputType === 'number' ||
            inputType === 'trigger' ||
            inputType === 'unknown') &&
        (typeof inputValue === 'boolean' ||
            typeof inputValue === 'number' ||
            inputValue === null));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
//# sourceMappingURL=telemetryServer.js.map