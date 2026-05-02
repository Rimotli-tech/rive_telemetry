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
  ) || (
    value.type === 'setViewModelProperty' &&
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
      value.propertyType === 'trigger')
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
    :root {
      --rt-background: #0b1218;
      --rt-surface: #121920;
      --rt-surface-low: #0e151b;
      --rt-surface-control: #1a232b;
      --rt-surface-control-hover: #25303a;
      --rt-border: #404751;
      --rt-border-soft: rgba(64, 71, 81, 0.48);
      --rt-text: #dae3ee;
      --rt-muted: #c0c7d3;
      --rt-muted-soft: rgba(192, 199, 211, 0.7);
      --rt-primary: #9fcaff;
      --rt-green: #22c55e;
      --rt-yellow: #facc15;
      --rt-red: #ffb4ab;
      --rt-radius: 6px;
      --rt-font: var(--vscode-font-family, "Public Sans", "Inter", system-ui, sans-serif);
      --rt-mono: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
    }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--rt-background);
      color: var(--rt-text);
      font-family: var(--rt-font);
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, p {
      margin: 0;
    }
    code {
      font-family: var(--rt-mono);
    }
    .layout {
      width: min(960px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 24px 0;
    }
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--rt-border-soft);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--rt-text);
      font-size: 18px;
      font-weight: 700;
    }
    .brand-mark {
      width: 20px;
      height: 20px;
      color: var(--rt-primary);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border: 1px solid rgba(250, 204, 21, 0.2);
      border-radius: var(--rt-radius);
      color: var(--rt-yellow);
      background: rgba(250, 204, 21, 0.06);
      font-family: var(--rt-mono);
      font-size: 11px;
      font-weight: 600;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--rt-yellow);
    }
    .receiving .dot {
      background: var(--rt-green);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.65);
    }
    .failed .dot {
      background: var(--rt-red);
    }
    .receiving {
      color: #4ade80;
      border-color: rgba(34, 197, 94, 0.16);
      background: rgba(34, 197, 94, 0.06);
    }
    .failed {
      color: var(--rt-red);
      border-color: rgba(255, 180, 171, 0.22);
      background: rgba(255, 180, 171, 0.06);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .card {
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
    }
    .runtime-card {
      padding: 16px;
    }
    .runtime-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(64, 71, 81, 0.36);
      flex-wrap: wrap;
    }
    .runtime-title {
      font-size: 14px;
      font-weight: 700;
    }
    .runtime-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      color: var(--rt-muted-soft);
      font-size: 13px;
      flex-wrap: wrap;
    }
    .separator {
      color: rgba(192, 199, 211, 0.35);
    }
    .runtime-select {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .runtime-select label {
      color: var(--rt-muted-soft);
      font-size: 12px;
      font-weight: 600;
    }
    .runtime-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .runtime-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .field-label {
      color: rgba(192, 199, 211, 0.62);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .field-value {
      color: var(--rt-text);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .mono {
      font-family: var(--rt-mono);
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 700;
    }
    .section-icon {
      color: var(--rt-muted-soft);
      font-size: 16px;
      line-height: 1;
    }
    .input-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .input-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface);
      transition: background 120ms ease, border-color 120ms ease;
    }
    .input-card:hover {
      border-color: rgba(138, 145, 157, 0.78);
      background: #151d25;
    }
    .input-main {
      min-width: 0;
    }
    .input-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .input-name {
      color: var(--rt-text);
      font-family: var(--rt-mono);
      font-size: 13px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .pill {
      padding: 0 5px;
      border: 1px solid rgba(64, 71, 81, 0.58);
      border-radius: 3px;
      color: rgba(192, 199, 211, 0.7);
      font-size: 9px;
      line-height: 15px;
    }
    .input-detail {
      margin-top: 3px;
      color: var(--rt-muted-soft);
      font-size: 11px;
    }
    dl {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px 16px;
      margin: 20px 0;
    }
    dt {
      color: var(--rt-muted-soft);
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
      border-bottom: 1px solid var(--rt-border-soft);
      text-align: left;
      vertical-align: middle;
    }
    th {
      color: var(--rt-muted-soft);
      font-weight: 600;
    }
    button, input {
      font: inherit;
    }
    button {
      padding: 6px 10px;
      color: var(--rt-text);
      background: var(--rt-surface-control);
      border: 1px solid rgba(64, 71, 81, 0.72);
      border-radius: 4px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }
    button:hover:not(:disabled) {
      background: var(--rt-surface-control-hover);
      border-color: rgba(138, 145, 157, 0.75);
    }
    button.secondary {
      color: var(--rt-muted-soft);
      background: transparent;
      border-color: transparent;
    }
    button.secondary:hover:not(:disabled) {
      color: var(--rt-text);
      background: rgba(45, 54, 62, 0.5);
    }
    button:disabled, input:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .primary-button {
      color: var(--rt-primary);
      background: rgba(159, 202, 255, 0.1);
      border-color: rgba(159, 202, 255, 0.24);
    }
    .primary-button:hover:not(:disabled) {
      background: rgba(159, 202, 255, 0.18);
      border-color: rgba(159, 202, 255, 0.38);
    }
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      color: var(--rt-muted-soft);
    }
    .fire-button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    input[type="number"] {
      width: 44px;
      height: 28px;
      padding: 0 4px;
      color: var(--rt-text);
      background: transparent;
      border: 0;
      text-align: center;
      font-family: var(--rt-mono);
    }
    select {
      width: 180px;
      padding: 6px 8px;
      color: var(--rt-text);
      background: var(--rt-surface-control);
      border: 1px solid var(--rt-border-soft);
      border-radius: 4px;
      font: inherit;
      outline: none;
    }
    select:focus {
      border-color: rgba(159, 202, 255, 0.72);
      box-shadow: 0 0 0 1px rgba(159, 202, 255, 0.24);
    }
    input[type="range"] {
      width: 108px;
      accent-color: var(--rt-primary);
    }
    .empty, .command-status, .meta {
      color: var(--rt-muted-soft);
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
    .snapshot-panel {
      padding: 24px;
      border: 1px dashed rgba(64, 71, 81, 0.72);
      border-radius: var(--rt-radius);
      background: var(--rt-surface-low);
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
    .snapshot-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
    }
    .snapshot-icon {
      color: rgba(138, 145, 157, 0.58);
      font-size: 26px;
      line-height: 1;
    }
    .snapshot-title {
      font-size: 13px;
      font-weight: 700;
    }
    .snapshot-copy {
      max-width: 320px;
      color: var(--rt-muted-soft);
      font-size: 11px;
      line-height: 1.5;
    }
    .diff-changed {
      color: var(--rt-yellow);
    }
    .diff-added {
      color: #4ade80;
    }
    .diff-removed {
      color: var(--rt-red);
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
      width: 34px;
      height: 18px;
      border-radius: 999px;
      background: var(--rt-surface-control);
      border: 1px solid var(--rt-border-soft);
      position: relative;
    }
    .track::after {
      content: "";
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: var(--rt-muted);
      position: absolute;
      left: 3px;
      top: 2px;
      transition: transform 120ms ease;
    }
    .switch input:checked + .track {
      background: var(--rt-primary);
      border-color: var(--rt-primary);
    }
    .switch input:checked + .track::after {
      transform: translateX(16px);
      background: var(--rt-background);
    }
    .number-control {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: var(--rt-surface-control);
    }
    .number-control input[type="range"] {
      display: none;
    }
    .view-model-card {
      padding: 16px;
    }
    .view-model-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .view-model-summary {
      display: flex;
      gap: 16px;
      color: var(--rt-muted-soft);
      font-size: 12px;
      flex-wrap: wrap;
    }
    .view-model-empty {
      color: var(--rt-muted-soft);
      font-size: 12px;
      line-height: 1.5;
    }
    .property-list {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .property-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) max-content minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border: 1px solid var(--rt-border-soft);
      border-radius: var(--rt-radius);
      background: rgba(26, 35, 43, 0.52);
    }
    .property-value {
      justify-self: end;
      max-width: 100%;
      overflow-wrap: anywhere;
      color: var(--rt-text);
    }
    .property-row.mutable {
      cursor: pointer;
    }
    .property-row.mutable:hover {
      border-color: rgba(138, 145, 157, 0.78);
      background: rgba(37, 48, 58, 0.72);
    }
    tr.command-sent {
      animation: flash 700ms ease-out;
    }
    tr.value-changed {
      animation: valueFlash 900ms ease-out;
    }
    @keyframes flash {
      from { background: rgba(159, 202, 255, 0.16); }
      to { background: transparent; }
    }
    @keyframes valueFlash {
      from { outline: 1px solid var(--rt-green); }
      to { outline: 1px solid transparent; }
    }
    .input-card.command-sent {
      animation: flash 700ms ease-out;
    }
    .input-card.value-changed {
      animation: valueFlash 900ms ease-out;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(64, 71, 81, 0.36);
      color: rgba(192, 199, 211, 0.62);
      font-family: var(--rt-mono);
      font-size: 11px;
    }
    @media (max-width: 760px) {
      .layout {
        width: calc(100vw - 32px);
        padding: 16px 0;
      }
      .app-header {
        align-items: flex-start;
        flex-direction: column;
      }
      .runtime-grid,
      .input-grid {
        grid-template-columns: 1fr;
      }
      .property-row {
        grid-template-columns: 1fr;
        align-items: start;
      }
      .property-value {
        justify-self: start;
      }
      .runtime-top {
        align-items: stretch;
        flex-direction: column;
      }
      .runtime-select {
        align-items: stretch;
        flex-direction: column;
      }
      select {
        width: 100%;
      }
    }
  </style>
</head>
<body>
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
          <div class="layout">
            \${renderHeader(statusClass, statusText)}
            <section class="snapshot-panel snapshot-empty">
              <span class="snapshot-icon">&#9676;</span>
              <div>
                <h3 class="snapshot-title">Waiting for telemetry</h3>
                <p class="snapshot-copy">Run the Flutter demo to stream Rive state machine inputs.</p>
              </div>
              <div class="meta">
                Connected clients: \${serverStatus.clientCount} &middot; Last telemetry: \${escapeHtml(formatTimestamp(serverStatus.lastTelemetryAt))}
              </div>
              \${serverFailed ? '<p class="snapshot-copy">' + escapeHtml(serverStatus.serverError) + '</p>' : ''}
            </section>
          </div>
        \`;
        return;
      }

      const inputCards = activePayload.inputs.map((input) => renderInputCard(input, controlsDisabled)).join('');
      const viewModel = normalizeViewModelTelemetry(activePayload.viewModel);

      app.innerHTML = \`
        <div class="layout">
          \${renderHeader(statusClass, statusText)}
          <div class="stack">
            \${renderRuntimeCard(activePayload, serverFailed)}
            <section>
              <h3 class="section-title"><span class="section-icon">&#8801;</span>Inputs Control</h3>
              <div class="input-grid">\${inputCards}</div>
            </section>
            \${renderViewModelSection(viewModel)}
            \${renderSnapshotPanel(activePayload, snapshot, diffs)}
          </div>
          \${renderFooter()}
        </div>
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

    function renderHeader(statusClass, statusText) {
      return \`
        <header class="app-header">
          <div class="brand">
            <svg class="brand-mark" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"></path>
              <path clip-rule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z" fill="currentColor" fill-rule="evenodd"></path>
            </svg>
            <span>RiveTelemetry</span>
          </div>
          <div class="status \${statusClass}">
            <span class="dot"></span>
            <span>\${escapeHtml(statusText)}</span>
          </div>
        </header>
      \`;
    }

    function renderRuntimeCard(activePayload, serverFailed) {
      return \`
        <section class="card runtime-card">
          <div class="runtime-top">
            <div>
              <h3 class="runtime-title">Runtime Information</h3>
              <div class="runtime-meta">
                <span>Clients: <strong>\${serverStatus.clientCount}</strong></span>
                <span class="separator">&bull;</span>
                <span>Last received: <strong><code>\${escapeHtml(formatTimestamp(serverStatus.lastTelemetryAt))}</code></strong></span>
                \${serverFailed ? '<span class="separator">&bull;</span><span>' + escapeHtml(serverStatus.serverError) + '</span>' : ''}
              </div>
            </div>
            <div class="runtime-select">
              <label for="runtime-select">Active runtime</label>
              <select id="runtime-select">
                \${renderRuntimeOptions()}
              </select>
            </div>
          </div>
          <div class="runtime-grid">
            \${renderRuntimeField('Runtime ID', activePayload.runtimeId, true)}
            \${renderRuntimeField('Source', activePayload.source, true)}
            \${renderRuntimeField('State Machine', activePayload.stateMachine, false)}
            \${renderRuntimeField('Timestamp', formatTimestamp(activePayload.timestamp), true)}
          </div>
        </section>
      \`;
    }

    function renderRuntimeField(label, value, mono) {
      return \`
        <div class="runtime-field">
          <span class="field-label">\${escapeHtml(label)}</span>
          <span class="field-value \${mono ? 'mono' : ''}">\${escapeHtml(value)}</span>
        </div>
      \`;
    }

    function renderInputCard(input, disabled) {
      return \`
        <div data-input-name="\${escapeAttribute(input.name)}" class="input-card \${rowClass(input)}">
          <div class="input-main">
            <div class="input-name-row">
              <span class="input-name">\${escapeHtml(input.name)}</span>
              <span class="pill">\${escapeHtml(input.type)}</span>
            </div>
            <div class="input-detail">\${renderInputDetail(input)}</div>
          </div>
          \${renderControl(input, disabled)}
        </div>
      \`;
    }

    function renderInputDetail(input) {
      if (input.type === 'boolean') {
        return 'State: <strong>' + escapeHtml(formatValue(input.value)) + '</strong>';
      }
      if (input.type === 'number') {
        return 'Value: <strong><code>' + escapeHtml(formatValue(input.value)) + '</code></strong>';
      }
      if (input.type === 'trigger') {
        return 'Trigger input';
      }
      return 'Unsupported input';
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
          <span class="number-control">
            <button class="icon-button" type="button" data-control="number-step" data-delta="-1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>-</button>
            <input type="range" data-control="number-range" data-input-name="\${escapeAttribute(input.name)}" min="0" max="100" step="1" value="\${escapeAttribute(value)}" \${disabledAttr}>
            <input type="number" data-control="number" data-input-name="\${escapeAttribute(input.name)}" value="\${escapeAttribute(value)}" step="1" \${disabledAttr}>
            <button class="icon-button" type="button" data-control="number-step" data-delta="1" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>+</button>
          </span>
        \`;
      }

      if (input.type === 'trigger') {
        return \`
          <button class="fire-button" type="button" data-control="trigger" data-input-name="\${escapeAttribute(input.name)}" \${disabledAttr}>&#9889; Fire</button>
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

    function renderViewModelSection(viewModel) {
      if (viewModel.state === 'not-enabled') {
        return \`
          <section class="card view-model-card">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <p class="view-model-empty">ViewModel telemetry not enabled</p>
          </section>
        \`;
      }

      if (viewModel.state === 'unsupported') {
        return \`
          <section class="card view-model-card">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <p class="view-model-empty">ViewModel not available\${viewModel.reason ? ': ' + escapeHtml(viewModel.reason) : ''}</p>
          </section>
        \`;
      }

      return \`
        <section class="card view-model-card">
          <div class="view-model-header">
            <h3 class="section-title"><span class="section-icon">&#9638;</span>ViewModel</h3>
            <div class="view-model-summary">
              <span>Name: <strong>\${escapeHtml(viewModel.viewModelName || '—')}</strong></span>
              <span>Instance: <strong>\${escapeHtml(viewModel.instanceName || '—')}</strong></span>
            </div>
          </div>
          \${viewModel.properties.length === 0
            ? '<p class="view-model-empty">No ViewModel properties reported.</p>'
            : '<div class="property-list">' + viewModel.properties.map((property) => renderViewModelPropertyRow(viewModel, property)).join('') + '</div>'}
        </section>
      \`;
    }

    function renderViewModelPropertyRow(viewModel, property) {
      const mutable = isMutableViewModelProperty(property);
      return \`
        <div class="property-row \${mutable ? 'mutable' : ''}"
          \${mutable ? 'data-control="view-model-property"' : ''}
          data-view-model-name="\${escapeAttribute(viewModel.viewModelName)}"
          data-instance-name="\${escapeAttribute(viewModel.instanceName)}"
          data-property-name="\${escapeAttribute(property.name)}"
          data-property-type="\${escapeAttribute(property.type)}"
          data-property-value="\${escapeAttribute(property.value ?? '')}"
          title="\${mutable ? 'Click to mutate ViewModel property' : ''}">
          <code class="input-name">\${escapeHtml(property.name)}</code>
          <span class="pill">\${escapeHtml(property.type)}</span>
          <code class="property-value">\${escapeHtml(formatViewModelValue(property.value))}</code>
        </div>
      \`;
    }

    function normalizeViewModelTelemetry(value) {
      if (!value || typeof value !== 'object') {
        return {
          state: 'not-enabled',
          properties: [],
        };
      }

      const supported = value.supported === true;
      const properties = Array.isArray(value.properties)
        ? value.properties
            .filter((property) => property && typeof property === 'object')
            .map((property) => ({
              name: typeof property.name === 'string' ? property.name : '',
              type: typeof property.type === 'string' ? property.type : 'unknown',
              value: property.value ?? null,
            }))
            .filter((property) => property.name.length > 0)
        : [];

      if (!supported) {
        return {
          state: 'unsupported',
          reason: typeof value.reason === 'string' ? value.reason : '',
          viewModelName: typeof value.viewModelName === 'string' ? value.viewModelName : '',
          instanceName: typeof value.instanceName === 'string' ? value.instanceName : '',
          properties: [],
        };
      }

      return {
        state: 'supported',
        viewModelName: typeof value.viewModelName === 'string' ? value.viewModelName : '',
        instanceName: typeof value.instanceName === 'string' ? value.instanceName : '',
        properties,
      };
    }

    function isMutableViewModelProperty(property) {
      return property.type === 'number' ||
        property.type === 'boolean' ||
        property.type === 'string' ||
        property.type === 'color' ||
        property.type === 'enum' ||
        property.type === 'trigger';
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

      if (!snapshot) {
        return \`
          <section class="snapshot-panel snapshot-empty">
            <span class="snapshot-icon">&#9676;</span>
            <div>
              <h3 class="snapshot-title">No snapshot captured</h3>
              <p class="snapshot-copy">Capture a state snapshot to diff against future telemetry events.</p>
            </div>
            <div class="snapshot-actions">
              <button type="button" class="primary-button" data-snapshot-action="capture" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Capture</button>
              <button type="button" class="secondary" data-snapshot-action="clear" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}" disabled>Clear</button>
            </div>
          </section>
        \`;
      }

      return \`
        <section class="snapshot-panel">
          <div class="snapshot-header">
            <div>
              <h2>Snapshot Diff</h2>
              <div class="meta">Captured \${escapeHtml(formatTimestamp(snapshot.capturedAt))} with \${snapshot.inputs.length} input(s)</div>
            </div>
            <div class="snapshot-actions">
              <button type="button" class="primary-button" data-snapshot-action="capture" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Capture</button>
              <button type="button" class="secondary" data-snapshot-action="clear" data-runtime-id="\${escapeAttribute(activePayload.runtimeId)}">Clear</button>
            </div>
          </div>
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
        </section>
      \`;
    }

    function renderFooter() {
      return \`
        <footer>
          <span>Last command sent: \${escapeHtml(lastCommandStatus || 'none')}</span>
        </footer>
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

      app.querySelectorAll('[data-control="view-model-property"]').forEach((control) => {
        control.addEventListener('click', () => {
          const activePayload = telemetryState.activePayload;
          if (!activePayload) {
            return;
          }

          const propertyName = control.dataset.propertyName;
          const propertyType = control.dataset.propertyType;
          const viewModelName = control.dataset.viewModelName ?? '';
          const instanceName = control.dataset.instanceName ?? '';
          if (!propertyName || !propertyType || !viewModelName || !instanceName) {
            return;
          }

          const value = nextViewModelPropertyValue(propertyType, control.dataset.propertyValue ?? '');
          if (value === undefined) {
            return;
          }

          sendCommand({
            type: 'setViewModelProperty',
            runtimeId: activePayload.runtimeId,
            viewModelName,
            instanceName,
            propertyName,
            propertyType,
            ...(propertyType === 'trigger' ? {} : { value }),
          });
        });
      });
    }

    function nextViewModelPropertyValue(propertyType, currentValue) {
      if (propertyType === 'trigger') {
        return null;
      }

      if (propertyType === 'boolean') {
        return currentValue !== 'true';
      }

      const label = 'Set ' + propertyType + ' value';
      const entered = window.prompt(label, currentValue);
      if (entered === null) {
        return undefined;
      }

      if (propertyType === 'number') {
        const value = Number(entered);
        return Number.isNaN(value) ? undefined : value;
      }

      return entered;
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
      highlightedInput = payload.inputName ?? payload.propertyName;
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

    function formatViewModelValue(value) {
      if (value === null || value === undefined) {
        return '—';
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      return String(value);
    }

    function formatTimestamp(value) {
      if (!value) {
        return 'never';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleTimeString();
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
