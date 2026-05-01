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
class RiveTelemetryPanel {
    constructor(panel, telemetryServer) {
        this.telemetryServer = telemetryServer;
        this.panel = panel;
        this.panel.webview.options = { enableScripts: true };
        this.panel.webview.html = getWebviewHtml(this.telemetryServer.latest, this.telemetryServer.status);
        this.telemetrySubscription = this.telemetryServer.onTelemetry((payload) => {
            this.updateTelemetry(payload);
        });
        this.statusSubscription = this.telemetryServer.onStatus((status) => {
            this.updateStatus(status);
        });
        this.panel.webview.onDidReceiveMessage((message) => {
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
            RiveTelemetryPanel.currentPanel.updateTelemetry(telemetryServer.latest);
            RiveTelemetryPanel.currentPanel.updateStatus(telemetryServer.status);
            return;
        }
        const panel = vscode.window.createWebviewPanel('riveTelemetry', 'RiveTelemetry', vscode.ViewColumn.One, { enableScripts: true });
        RiveTelemetryPanel.currentPanel = new RiveTelemetryPanel(panel, telemetryServer);
        context.subscriptions.push(RiveTelemetryPanel.currentPanel);
    }
    dispose() {
        this.telemetrySubscription.dispose();
        this.statusSubscription.dispose();
        if (RiveTelemetryPanel.currentPanel === this) {
            RiveTelemetryPanel.currentPanel = undefined;
        }
    }
    updateTelemetry(payload) {
        this.panel.webview.postMessage({
            type: 'telemetry',
            payload: payload ?? null,
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
        typeof value.stateMachine === 'string' &&
        typeof value.inputName === 'string') {
        return ((value.inputType === 'boolean' && typeof value.value === 'boolean') ||
            (value.inputType === 'number' && typeof value.value === 'number'));
    }
    return (value.type === 'fireTrigger' &&
        typeof value.stateMachine === 'string' &&
        typeof value.inputName === 'string');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function getWebviewHtml(payload, status) {
    const initialPayload = JSON.stringify(payload ?? null);
    const initialStatus = JSON.stringify(status);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RiveTelemetry</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      color: var(--vscode-descriptionForeground);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--vscode-charts-yellow);
    }
    .receiving .dot {
      background: var(--vscode-charts-green);
    }
    .failed .dot {
      background: var(--vscode-charts-red);
    }
    dl {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px 16px;
      margin: 20px 0;
    }
    dt {
      color: var(--vscode-descriptionForeground);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--vscode-descriptionForeground);
      font-weight: 600;
    }
    code {
      font-family: var(--vscode-editor-font-family);
    }
    button, input {
      font: inherit;
    }
    button {
      padding: 4px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled, input:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    input[type="number"] {
      width: 72px;
      padding: 4px 6px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }
    input[type="range"] {
      width: 140px;
    }
    .empty, .command-status, .meta {
      color: var(--vscode-descriptionForeground);
    }
    .empty {
      margin-top: 24px;
    }
    .command-status {
      margin-top: 12px;
      min-height: 18px;
    }
    .control {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .switch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .switch input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .track {
      width: 38px;
      height: 20px;
      border-radius: 999px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      position: relative;
    }
    .track::after {
      content: "";
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--vscode-descriptionForeground);
      position: absolute;
      left: 3px;
      top: 2px;
      transition: transform 120ms ease;
    }
    .switch input:checked + .track {
      background: var(--vscode-button-background);
    }
    .switch input:checked + .track::after {
      transform: translateX(18px);
      background: var(--vscode-button-foreground);
    }
    tr.command-sent {
      animation: flash 700ms ease-out;
    }
    tr.value-changed {
      animation: valueFlash 900ms ease-out;
    }
    @keyframes flash {
      from { background: var(--vscode-list-activeSelectionBackground); }
      to { background: transparent; }
    }
    @keyframes valueFlash {
      from { outline: 1px solid var(--vscode-charts-green); }
      to { outline: 1px solid transparent; }
    }
  </style>
</head>
<body>
  <h1>RiveTelemetry</h1>
  <div id="app"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const app = document.getElementById('app');
    let latestPayload = ${initialPayload};
    let serverStatus = ${initialStatus};
    let lastCommandStatus = '';
    let highlightedInput = null;
    let changedInputs = new Set();
    let previousValues = new Map();

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'telemetry') {
        markChangedInputs(event.data.payload);
        latestPayload = event.data.payload;
        render();
      } else if (event.data?.type === 'serverStatus') {
        serverStatus = event.data.status;
        render();
      } else if (event.data?.type === 'commandSent') {
        lastCommandStatus = 'Command sent: ' + event.data.timestamp;
        render();
      } else if (event.data?.type === 'commandFailed') {
        lastCommandStatus = 'No connected runtime client';
        render();
      }
    });

    function render() {
      const serverFailed = Boolean(serverStatus.serverError);
      const hasClients = serverStatus.clientCount > 0;
      const receiving = Boolean(latestPayload) && !serverFailed;
      const controlsDisabled = !hasClients || serverFailed;
      const statusClass = serverFailed ? 'failed' : receiving ? 'receiving' : '';
      const statusText = serverFailed
        ? 'Server failed to start'
        : receiving
          ? 'Receiving telemetry'
          : 'Waiting for telemetry...';

      if (!latestPayload) {
        app.innerHTML = \`
          <div class="status \${statusClass}">
            <span class="dot"></span>
            <span>\${escapeHtml(statusText)}</span>
          </div>
          <dl>
            <dt>Connected clients</dt><dd>\${serverStatus.clientCount}</dd>
            <dt>Last telemetry received</dt><dd>\${escapeHtml(serverStatus.lastTelemetryAt ?? 'never')}</dd>
            \${serverFailed ? '<dt>Server error</dt><dd>' + escapeHtml(serverStatus.serverError) + '</dd>' : ''}
          </dl>
          <p class="empty">Run the Flutter demo to stream Rive state machine inputs.</p>
        \`;
        return;
      }

      const rows = latestPayload.inputs.map((input) => \`
        <tr data-input-name="\${escapeAttribute(input.name)}" class="\${rowClass(input)}">
          <td><code>\${escapeHtml(input.name)}</code></td>
          <td>\${escapeHtml(input.type)}</td>
          <td><code>\${escapeHtml(formatValue(input.value))}</code></td>
          <td>\${renderControl(input, controlsDisabled)}</td>
        </tr>
      \`).join('');

      app.innerHTML = \`
        <div class="status \${statusClass}">
          <span class="dot"></span>
          <span>\${escapeHtml(statusText)}</span>
        </div>
        <dl>
          <dt>Connected clients</dt><dd>\${serverStatus.clientCount}</dd>
          <dt>Last telemetry received</dt><dd>\${escapeHtml(serverStatus.lastTelemetryAt ?? 'never')}</dd>
          \${serverFailed ? '<dt>Server error</dt><dd>' + escapeHtml(serverStatus.serverError) + '</dd>' : ''}
          <dt>Source</dt><dd>\${escapeHtml(latestPayload.source)}</dd>
          <dt>Timestamp</dt><dd>\${escapeHtml(latestPayload.timestamp)}</dd>
          <dt>State machine</dt><dd>\${escapeHtml(latestPayload.stateMachine)}</dd>
        </dl>
        <h2>Inputs</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Value</th><th>Control</th></tr>
          </thead>
          <tbody>\${rows}</tbody>
        </table>
        <div class="command-status">\${escapeHtml(lastCommandStatus)}</div>
      \`;

      bindControls();
      if (changedInputs.size > 0) {
        window.setTimeout(() => {
          changedInputs.clear();
          render();
        }, 900);
      }
    }

    function rowClass(input) {
      const classes = [];
      if (highlightedInput === input.name) {
        classes.push('command-sent');
      }
      if (changedInputs.has(input.name)) {
        classes.push('value-changed');
      }
      return classes.join(' ');
    }

    function renderControl(input, disabled) {
      const disabledAttr = disabled ? 'disabled' : '';
      if (input.type === 'boolean') {
        return \`
          <label class="switch">
            <input type="checkbox" data-control="boolean" data-input-name="\${escapeAttribute(input.name)}" \${input.value ? 'checked' : ''} \${disabledAttr}>
            <span class="track"></span>
            <span>\${input.value ? 'true' : 'false'}</span>
          </label>
        \`;
      }

      if (input.type === 'number') {
        const value = Number(input.value ?? 0);
        return \`
          <span class="control">
            <button type="button" data-control="number-step" data-delta="-1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>-</button>
            <input type="range" data-control="number-range" data-input-name="\${escapeAttribute(input.name)}" min="0" max="100" step="1" value="\${escapeAttribute(value)}" \${disabledAttr}>
            <button type="button" data-control="number-step" data-delta="1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>+</button>
            <input type="number" data-control="number" data-input-name="\${escapeAttribute(input.name)}" value="\${escapeAttribute(value)}" step="1" \${disabledAttr}>
          </span>
        \`;
      }

      if (input.type === 'trigger') {
        return \`
          <span class="control">
            <span class="meta">\${escapeHtml(input.name)}</span>
            <button type="button" data-control="trigger" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>Fire</button>
          </span>
        \`;
      }

      return '';
    }

    function bindControls() {
      app.querySelectorAll('[data-control="boolean"]').forEach((control) => {
        control.addEventListener('change', () => {
          sendCommand({
            type: 'setInput',
            stateMachine: latestPayload.stateMachine,
            inputName: control.dataset.inputName,
            inputType: 'boolean',
            value: control.checked,
          });
        });
      });

      app.querySelectorAll('[data-control="number"], [data-control="number-range"]').forEach((control) => {
        const sendNumber = () => {
          const value = Number(control.value);
          if (Number.isNaN(value)) {
            return;
          }
          sendNumberCommand(control.dataset.inputName, value);
        };
        control.addEventListener('change', sendNumber);
        control.addEventListener('input', () => {
          if (control.dataset.control === 'number-range') {
            sendNumber();
          }
        });
        control.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            sendNumber();
          }
        });
      });

      app.querySelectorAll('[data-control="number-step"]').forEach((control) => {
        control.addEventListener('click', () => {
          const inputName = control.dataset.inputName;
          const current = latestPayload.inputs.find((input) => input.name === inputName);
          const delta = Number(control.dataset.delta ?? 0);
          sendNumberCommand(inputName, Number(current?.value ?? 0) + delta);
        });
      });

      app.querySelectorAll('[data-control="trigger"]').forEach((control) => {
        control.addEventListener('click', () => {
          sendCommand({
            type: 'fireTrigger',
            stateMachine: latestPayload.stateMachine,
            inputName: control.dataset.inputName,
          });
        });
      });
    }

    function sendNumberCommand(inputName, value) {
      sendCommand({
        type: 'setInput',
        stateMachine: latestPayload.stateMachine,
        inputName,
        inputType: 'number',
        value,
      });
    }

    function sendCommand(payload) {
      highlightedInput = payload.inputName;
      vscode.postMessage({
        command: 'sendTelemetryCommand',
        payload,
      });
      render();
      window.setTimeout(() => {
        highlightedInput = null;
        render();
      }, 700);
    }

    function markChangedInputs(nextPayload) {
      if (!nextPayload) {
        return;
      }

      const nextValues = new Map();
      for (const input of nextPayload.inputs) {
        const signature = JSON.stringify([input.type, input.value]);
        nextValues.set(input.name, signature);
        if (previousValues.has(input.name) && previousValues.get(input.name) !== signature) {
          changedInputs.add(input.name);
        }
      }
      previousValues = nextValues;
    }

    function formatValue(value) {
      return value === null ? 'null' : String(value);
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function escapeAttribute(value) {
      return escapeHtml(value);
    }

    if (latestPayload) {
      markChangedInputs(latestPayload);
      changedInputs.clear();
    }
    render();
  </script>
</body>
</html>`;
}
//# sourceMappingURL=panel.js.map