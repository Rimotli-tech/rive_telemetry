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
const ws_1 = __importStar(require("ws"));
class TelemetryServer {
    constructor(output, port = 8080) {
        this.port = port;
        this.latestPayloads = new Map();
        this.snapshots = new Map();
        this.activeRuntimeId = null;
        this.serverRunning = false;
        this.serverError = null;
        this.lastTelemetryAt = null;
        this.clients = new Set();
        this.listeners = new Set();
        this.statusListeners = new Set();
        this.output = output;
    }
    get panelState() {
        const payloads = [...this.latestPayloads.values()];
        const runtimes = payloads.map(toRuntimeSummary);
        const activePayload = this.activeRuntimeId === null
            ? null
            : this.latestPayloads.get(this.activeRuntimeId) ?? null;
        const activeSnapshot = this.activeRuntimeId === null
            ? null
            : this.snapshots.get(this.activeRuntimeId) ?? null;
        return {
            runtimes,
            payloads,
            activeRuntimeId: activePayload?.runtimeId ?? null,
            activePayload,
            snapshots: [...this.snapshots.values()],
            activeSnapshot,
            activeDiffs: activePayload !== null && activeSnapshot !== null
                ? diffSnapshot(activeSnapshot, activePayload)
                : [],
        };
    }
    get status() {
        return {
            clientCount: this.clients.size,
            serverRunning: this.serverRunning,
            serverError: this.serverError,
            lastTelemetryAt: this.lastTelemetryAt,
        };
    }
    start() {
        if (this.server) {
            return;
        }
        try {
            const server = new ws_1.WebSocketServer({ port: this.port });
            this.server = server;
            server.on('listening', () => {
                this.serverRunning = true;
                this.serverError = null;
                this.output.appendLine(`RiveTelemetry WebSocket server listening on ws://localhost:${this.port}`);
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
            server.on('error', (error) => {
                this.serverRunning = false;
                this.serverError = error.message;
                this.output.appendLine(`RiveTelemetry server error: ${error.message}`);
                if (error.code === 'EADDRINUSE') {
                    vscode.window.showWarningMessage(`RiveTelemetry could not start because port ${this.port} is already in use.`);
                }
                server.close();
                this.server = undefined;
                this.notifyStatus();
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.serverRunning = false;
            this.serverError = message;
            this.output.appendLine(`RiveTelemetry server failed to start: ${message}`);
            vscode.window.showWarningMessage(`RiveTelemetry WebSocket server failed to start: ${message}`);
            this.notifyStatus();
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
    onStatus(listener) {
        this.statusListeners.add(listener);
        return {
            dispose: () => {
                this.statusListeners.delete(listener);
            },
        };
    }
    sendCommand(command) {
        const openClients = [...this.clients].filter((client) => client.readyState === ws_1.default.OPEN);
        if (openClients.length === 0) {
            this.output.appendLine('RiveTelemetry command ignored because no Flutter client is connected');
            vscode.window.showWarningMessage('RiveTelemetry has no connected Flutter client.');
            return false;
        }
        const message = JSON.stringify(command);
        for (const client of openClients) {
            try {
                client.send(message);
            }
            catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                this.output.appendLine(`RiveTelemetry command send failed: ${detail}`);
            }
        }
        return true;
    }
    dispose() {
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
    selectRuntime(runtimeId) {
        if (!this.latestPayloads.has(runtimeId)) {
            return false;
        }
        this.activeRuntimeId = runtimeId;
        this.notifyTelemetry();
        return true;
    }
    captureSnapshot(runtimeId) {
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
        });
        this.notifyTelemetry();
        return true;
    }
    clearSnapshot(runtimeId) {
        const removed = this.snapshots.delete(runtimeId);
        if (removed) {
            this.notifyTelemetry();
        }
        return removed;
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
        this.latestPayloads.set(parsed.runtimeId, parsed);
        if (this.activeRuntimeId === null ||
            !this.latestPayloads.has(this.activeRuntimeId)) {
            this.activeRuntimeId = parsed.runtimeId;
        }
        this.lastTelemetryAt = new Date().toISOString();
        this.notifyTelemetry();
        this.notifyStatus();
    }
    notifyTelemetry() {
        const state = this.panelState;
        for (const listener of this.listeners) {
            listener(state);
        }
    }
    notifyStatus() {
        const status = this.status;
        for (const listener of this.statusListeners) {
            listener(status);
        }
    }
}
exports.TelemetryServer = TelemetryServer;
function isTelemetryPayload(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (typeof value.source === 'string' &&
        typeof value.runtimeId === 'string' &&
        value.runtimeId.length > 0 &&
        typeof value.label === 'string' &&
        typeof value.timestamp === 'string' &&
        typeof value.stateMachine === 'string' &&
        Array.isArray(value.inputs) &&
        value.inputs.every(isTelemetryInput));
}
function toRuntimeSummary(payload) {
    return {
        runtimeId: payload.runtimeId,
        label: payload.label,
        source: payload.source,
        stateMachine: payload.stateMachine,
        timestamp: payload.timestamp,
    };
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
function toInputSnapshot(input) {
    if (input.type !== 'boolean' &&
        input.type !== 'number' &&
        input.type !== 'trigger') {
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
function diffSnapshot(snapshot, payload) {
    const currentInputs = new Map(payload.inputs.flatMap(toInputSnapshot).map((input) => [input.name, input]));
    const snapshotInputs = new Map(snapshot.inputs.map((input) => [input.name, input]));
    const diffs = [];
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
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
//# sourceMappingURL=telemetryServer.js.map