import * as vscode from 'vscode';
import { TelemetryServer } from './telemetryServer';
import {
  RiveTelemetryCommand,
  RiveTelemetryPanelState,
  RiveTelemetryServerStatus,
} from './types';

export class RiveTelemetryPanel {
  private static currentPanel: RiveTelemetryPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly telemetrySubscription: vscode.Disposable;
  private readonly statusSubscription: vscode.Disposable;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly telemetryServer: TelemetryServer,
  ) {
    this.panel = panel;
    this.panel.webview.options = { enableScripts: true };
    this.panel.webview.html = getWebviewHtml(
      this.telemetryServer.panelState,
      this.telemetryServer.status,
    );

    this.telemetrySubscription = this.telemetryServer.onTelemetry((state) => {
      this.updateTelemetry(state);
    });
    this.statusSubscription = this.telemetryServer.onStatus((status) => {
      this.updateStatus(status);
    });

    this.panel.webview.onDidReceiveMessage((message: unknown) => {
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

  static show(
    context: vscode.ExtensionContext,
    telemetryServer: TelemetryServer,
  ): void {
    if (RiveTelemetryPanel.currentPanel) {
      RiveTelemetryPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      RiveTelemetryPanel.currentPanel.updateTelemetry(
        telemetryServer.panelState,
      );
      RiveTelemetryPanel.currentPanel.updateStatus(telemetryServer.status);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'riveTelemetry',
      'RiveTelemetry',
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    RiveTelemetryPanel.currentPanel = new RiveTelemetryPanel(
      panel,
      telemetryServer,
    );

    context.subscriptions.push(RiveTelemetryPanel.currentPanel);
  }

  dispose(): void {
    this.telemetrySubscription.dispose();
    this.statusSubscription.dispose();
    if (RiveTelemetryPanel.currentPanel === this) {
      RiveTelemetryPanel.currentPanel = undefined;
    }
  }

  private updateTelemetry(state: RiveTelemetryPanelState): void {
    this.panel.webview.postMessage({
      type: 'telemetry',
      state,
    });
  }

  private updateStatus(status: RiveTelemetryServerStatus): void {
    this.panel.webview.postMessage({
      type: 'serverStatus',
      status,
    });
  }
}

interface WebviewCommandMessage {
  command: 'sendTelemetryCommand';
  payload: RiveTelemetryCommand;
}

interface WebviewSelectRuntimeMessage {
  command: 'selectRuntime';
  runtimeId: string;
}

interface WebviewCaptureSnapshotMessage {
  command: 'captureSnapshot';
  runtimeId: string;
}

interface WebviewClearSnapshotMessage {
  command: 'clearSnapshot';
  runtimeId: string;
}

function isWebviewSelectRuntimeMessage(
  value: unknown,
): value is WebviewSelectRuntimeMessage {
  return (
    isRecord(value) &&
    value.command === 'selectRuntime' &&
    typeof value.runtimeId === 'string'
  );
}

function isWebviewCaptureSnapshotMessage(
  value: unknown,
): value is WebviewCaptureSnapshotMessage {
  return (
    isRecord(value) &&
    value.command === 'captureSnapshot' &&
    typeof value.runtimeId === 'string'
  );
}

function isWebviewClearSnapshotMessage(
  value: unknown,
): value is WebviewClearSnapshotMessage {
  return (
    isRecord(value) &&
    value.command === 'clearSnapshot' &&
    typeof value.runtimeId === 'string'
  );
}

function isWebviewCommandMessage(value: unknown): value is WebviewCommandMessage {
  if (!isRecord(value) || value.command !== 'sendTelemetryCommand') {
    return false;
  }

  return isTelemetryCommand(value.payload);
}

function isTelemetryCommand(value: unknown): value is RiveTelemetryCommand {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.type === 'setInput' &&
    typeof value.runtimeId === 'string' &&
    typeof value.stateMachine === 'string' &&
    typeof value.inputName === 'string'
  ) {
    return (
      (value.inputType === 'boolean' && typeof value.value === 'boolean') ||
      (value.inputType === 'number' && typeof value.value === 'number')
    );
  }

  return (
    value.type === 'fireTrigger' &&
    typeof value.runtimeId === 'string' &&
    typeof value.stateMachine === 'string' &&
    typeof value.inputName === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getWebviewHtml(
  state: RiveTelemetryPanelState,
  status: RiveTelemetryServerStatus,
): string {
  const initialState = JSON.stringify(state);
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
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
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
    select {
      min-width: 220px;
      padding: 4px 8px;
      color: var(--vscode-dropdown-foreground);
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      font: inherit;
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
    .runtime-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 4px;
      flex-wrap: wrap;
    }
    .snapshot-panel {
      margin-top: 20px;
      padding: 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
    }
    .snapshot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .snapshot-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .diff-changed {
      color: var(--vscode-charts-yellow);
    }
    .diff-added {
      color: var(--vscode-charts-green);
    }
    .diff-removed {
      color: var(--vscode-charts-red);
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
    let telemetryState = ${initialState};
    let serverStatus = ${initialStatus};
    let lastCommandStatus = '';
    let highlightedInput = null;
    let changedInputs = new Set();
    let previousValues = new Map();

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'telemetry') {
        markChangedInputs(event.data.state?.activePayload ?? null);
        telemetryState = event.data.state;
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
      const activePayload = telemetryState.activePayload;
      const serverFailed = Boolean(serverStatus.serverError);
      const hasClients = serverStatus.clientCount > 0;
      const receiving = Boolean(activePayload) && !serverFailed;
      const controlsDisabled = !hasClients || serverFailed;
      const statusClass = serverFailed ? 'failed' : receiving ? 'receiving' : '';
      const statusText = serverFailed
        ? 'Server failed to start'
        : receiving
          ? 'Receiving telemetry'
          : 'Waiting for telemetry...';
      const snapshot = telemetryState.activeSnapshot;
      const diffs = telemetryState.activeDiffs ?? [];

      if (!activePayload) {
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

      const rows = activePayload.inputs.map((input) => \`
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
          <dt>Runtime</dt><dd>\${escapeHtml(activePayload.label || activePayload.runtimeId)}</dd>
          <dt>Runtime ID</dt><dd><code>\${escapeHtml(activePayload.runtimeId)}</code></dd>
          <dt>Source</dt><dd>\${escapeHtml(activePayload.source)}</dd>
          <dt>Timestamp</dt><dd>\${escapeHtml(activePayload.timestamp)}</dd>
          <dt>State machine</dt><dd>\${escapeHtml(activePayload.stateMachine)}</dd>
        </dl>
        <label class="runtime-selector">
          <span class="meta">Active runtime</span>
          <select id="runtime-select">
            \${renderRuntimeOptions()}
          </select>
        </label>
        <h2>Inputs</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Value</th><th>Control</th></tr>
          </thead>
          <tbody>\${rows}</tbody>
        </table>
        \${renderSnapshotPanel(activePayload, snapshot, diffs)}
        <div class="command-status">\${escapeHtml(lastCommandStatus)}</div>
      \`;

      bindRuntimeSelector();
      bindSnapshotControls();
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

    function renderRuntimeOptions() {
      return telemetryState.runtimes.map((runtime) => {
        const label = runtime.label || runtime.runtimeId;
        const selected = runtime.runtimeId === telemetryState.activeRuntimeId ? 'selected' : '';
        return \`<option value="\${escapeAttribute(runtime.runtimeId)}" \${selected}>\${escapeHtml(label)}</option>\`;
      }).join('');
    }

    function renderSnapshotPanel(activePayload, snapshot, diffs) {
      const diffRows = diffs.map((diff) => \`
        <tr>
          <td><code>\${escapeHtml(diff.name)}</code></td>
          <td>\${escapeHtml(diff.type)}</td>
          <td><code>\${escapeHtml(formatValue(diff.snapshotValue))}</code></td>
          <td><code>\${escapeHtml(formatValue(diff.currentValue))}</code></td>
          <td class="diff-\${escapeAttribute(diff.status)}">\${escapeHtml(diff.status)}</td>
        </tr>
      \`).join('');

      return \`
        <section class="snapshot-panel">
          <div class="snapshot-header">
            <div>
              <h2>Snapshot Diff</h2>
              <div class="meta">\${snapshot
                ? 'Captured ' + escapeHtml(snapshot.capturedAt) + ' with ' + snapshot.inputs.length + ' input(s)'
                : 'No snapshot captured for this runtime'}</div>
            </div>
            <div class="snapshot-actions">
              <button type="button" data-snapshot-action="capture" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Capture Snapshot</button>
              <button type="button" class="secondary" data-snapshot-action="clear" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}" \${snapshot ? '' : 'disabled'}>Clear</button>
            </div>
          </div>
          \${snapshot
            ? \`
              <dl>
                <dt>Snapshot runtime</dt><dd><code>\${escapeHtml(snapshot.runtimeId)}</code></dd>
                <dt>Snapshot state machine</dt><dd>\${escapeHtml(snapshot.stateMachine)}</dd>
              </dl>
              \${diffs.length === 0
                ? '<p class="empty">No input value differences from the captured snapshot.</p>'
                : \`
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Type</th><th>Snapshot</th><th>Current</th><th>Status</th></tr>
                    </thead>
                    <tbody>\${diffRows}</tbody>
                  </table>
                \`}
            \`
            : ''}
        </section>
      \`;
    }

    function bindRuntimeSelector() {
      const selector = document.getElementById('runtime-select');
      if (!selector) {
        return;
      }

      selector.addEventListener('change', () => {
        const runtimeId = selector.value;
        const nextPayload = findRuntimePayload(runtimeId);
        const nextSnapshot = findRuntimeSnapshot(runtimeId);
        telemetryState = {
          ...telemetryState,
          activeRuntimeId: runtimeId,
          activePayload: nextPayload,
          activeSnapshot: nextSnapshot,
          activeDiffs: nextPayload && nextSnapshot ? diffSnapshot(nextSnapshot, nextPayload) : [],
        };
        previousValues = new Map();
        changedInputs.clear();
        vscode.postMessage({
          command: 'selectRuntime',
          runtimeId,
        });
        render();
      });
    }

    function bindSnapshotControls() {
      app.querySelectorAll('[data-snapshot-action]').forEach((control) => {
        control.addEventListener('click', () => {
          const runtimeId = control.dataset.runtimeId;
          if (!runtimeId) {
            return;
          }

          vscode.postMessage({
            command: control.dataset.snapshotAction === 'clear' ? 'clearSnapshot' : 'captureSnapshot',
            runtimeId,
          });
        });
      });
    }

    function findRuntimePayload(runtimeId) {
      if (telemetryState.activePayload?.runtimeId === runtimeId) {
        return telemetryState.activePayload;
      }

      return telemetryState.payloads.find((payload) => payload.runtimeId === runtimeId) ?? null;
    }

    function findRuntimeSnapshot(runtimeId) {
      return telemetryState.snapshots.find((snapshot) => snapshot.runtimeId === runtimeId) ?? null;
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

    function toInputSnapshot(input) {
      if (input.type !== 'boolean' && input.type !== 'number' && input.type !== 'trigger') {
        return [];
      }

      return [{
        name: input.name,
        type: input.type,
        value: input.value,
      }];
    }

    function bindControls() {
      app.querySelectorAll('[data-control="boolean"]').forEach((control) => {
        control.addEventListener('change', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          sendCommand({
            type: 'setInput',
            runtimeId: activePayload.runtimeId,
            stateMachine: activePayload.stateMachine,
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
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          const inputName = control.dataset.inputName;
          const current = activePayload.inputs.find((input) => input.name === inputName);
          const delta = Number(control.dataset.delta ?? 0);
          sendNumberCommand(inputName, Number(current?.value ?? 0) + delta);
        });
      });

      app.querySelectorAll('[data-control="trigger"]').forEach((control) => {
        control.addEventListener('click', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }
          sendCommand({
            type: 'fireTrigger',
            runtimeId: activePayload.runtimeId,
            stateMachine: activePayload.stateMachine,
            inputName: control.dataset.inputName,
          });
        });
      });
    }

    function sendNumberCommand(inputName, value) {
      const activePayload = telemetryState.activePayload;
      if (!activePayload) {
        return;
      }
      sendCommand({
        type: 'setInput',
        runtimeId: activePayload.runtimeId,
        stateMachine: activePayload.stateMachine,
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

    if (telemetryState.activePayload) {
      markChangedInputs(telemetryState.activePayload);
      changedInputs.clear();
    }
    render();
  </script>
</body>
</html>`;
}
