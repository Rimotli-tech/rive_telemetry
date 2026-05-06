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
exports.RiveTelemetryPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const webviewHtml_1 = require("./webviewHtml");
class RiveTelemetryPanel {
    constructor(panel, context, telemetryServer) {
        this.telemetryServer = telemetryServer;
        this.panel = panel;
        this.panel.webview.options = { enableScripts: true };
        const iconUri = this.panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', 'icon.png')));
        this.panel.webview.html = (0, webviewHtml_1.getWebviewHtml)(this.telemetryServer.panelState, this.telemetryServer.status, iconUri, this.panel.webview.cspSource);
        this.telemetrySubscription = this.telemetryServer.onTelemetry((state) => {
            this.updateTelemetry(state);
        });
        this.statusSubscription = this.telemetryServer.onStatus((status) => {
            this.updateStatus(status);
        });
        this.panel.webview.onDidReceiveMessage((message) => {
            if (isWebviewSelectRuntimeMessage(message)) {
                this.telemetryServer.selectRuntime(message.runtimeId);
                return;
            }
            if (isWebviewCaptureSnapshotMessage(message)) {
                this.telemetryServer.captureSnapshot(message.runtimeId);
                return;
            }
            if (isWebviewClearSnapshotMessage(message)) {
                this.telemetryServer.clearSnapshot(message.runtimeId);
                return;
            }
            if (isWebviewClearTelemetryMessage(message)) {
                this.telemetryServer.clearTelemetry();
                return;
            }
            if (!isWebviewCommandMessage(message)) {
                return;
            }
            const sent = this.telemetryServer.sendCommand(message.payload);
            this.panel.webview.postMessage({
                type: sent ? 'commandSent' : 'commandFailed',
                timestamp: new Date().toISOString(),
            });
        });
        this.panel.onDidDispose(() => this.dispose());
    }
    static show(context, telemetryServer) {
        if (RiveTelemetryPanel.currentPanel) {
            RiveTelemetryPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            RiveTelemetryPanel.currentPanel.updateTelemetry(telemetryServer.panelState);
            RiveTelemetryPanel.currentPanel.updateStatus(telemetryServer.status);
            return;
        }
        const panel = vscode.window.createWebviewPanel('riveTelemetry', 'RiveTelemetry', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        RiveTelemetryPanel.currentPanel = new RiveTelemetryPanel(panel, context, telemetryServer);
        context.subscriptions.push(RiveTelemetryPanel.currentPanel);
    }
    dispose() {
        this.telemetrySubscription.dispose();
        this.statusSubscription.dispose();
        if (RiveTelemetryPanel.currentPanel === this) {
            RiveTelemetryPanel.currentPanel = undefined;
        }
    }
    updateTelemetry(state) {
        this.panel.webview.postMessage({
            type: 'telemetry',
            state,
        });
    }
    updateStatus(status) {
        this.panel.webview.postMessage({
            type: 'serverStatus',
            status,
        });
    }
}
exports.RiveTelemetryPanel = RiveTelemetryPanel;
function isWebviewSelectRuntimeMessage(value) {
    return (isRecord(value) &&
        value.command === 'selectRuntime' &&
        typeof value.runtimeId === 'string');
}
function isWebviewCaptureSnapshotMessage(value) {
    return (isRecord(value) &&
        value.command === 'captureSnapshot' &&
        typeof value.runtimeId === 'string');
}
function isWebviewClearSnapshotMessage(value) {
    return (isRecord(value) &&
        value.command === 'clearSnapshot' &&
        typeof value.runtimeId === 'string');
}
function isWebviewClearTelemetryMessage(value) {
    return isRecord(value) && value.command === 'clearTelemetry';
}
function isWebviewCommandMessage(value) {
    if (!isRecord(value) || value.command !== 'sendTelemetryCommand') {
        return false;
    }
    return isTelemetryCommand(value.payload);
}
function isTelemetryCommand(value) {
    if (!isRecord(value)) {
        return false;
    }
    if (value.type === 'setInput' &&
        typeof value.runtimeId === 'string' &&
        typeof value.stateMachine === 'string' &&
        typeof value.inputName === 'string') {
        return ((value.inputType === 'boolean' && typeof value.value === 'boolean') ||
            (value.inputType === 'number' && typeof value.value === 'number'));
    }
    return (value.type === 'fireTrigger' &&
        typeof value.runtimeId === 'string' &&
        typeof value.stateMachine === 'string' &&
        typeof value.inputName === 'string') || (value.type === 'setViewModelProperty' &&
        typeof value.runtimeId === 'string' &&
        typeof value.viewModelName === 'string' &&
        typeof value.instanceName === 'string' &&
        typeof value.propertyName === 'string' &&
        ((value.propertyType === 'number' && typeof value.value === 'number') ||
            (value.propertyType === 'boolean' && typeof value.value === 'boolean') ||
            ((value.propertyType === 'string' ||
                value.propertyType === 'color' ||
                value.propertyType === 'enum') &&
                typeof value.value === 'string') ||
            value.propertyType === 'trigger'));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
//# sourceMappingURL=panel.js.map