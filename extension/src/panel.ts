import * as vscode from 'vscode';
import { TelemetryServer } from './telemetryServer';
import { RiveTelemetryCommand, RiveTelemetryPayload } from './types';

export class RiveTelemetryPanel {
  private static currentPanel: RiveTelemetryPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly telemetrySubscription: vscode.Disposable;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly telemetryServer: TelemetryServer,
  ) {
    this.panel = panel;
    this.panel.webview.options = { enableScripts: true };
    this.panel.webview.html = getWebviewHtml(this.telemetryServer.latest);

    this.telemetrySubscription = this.telemetryServer.onTelemetry((payload) => {
      this.update(payload);
    });

    this.panel.webview.onDidReceiveMessage((message: unknown) => {
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
      RiveTelemetryPanel.currentPanel.update(telemetryServer.latest);
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
    if (RiveTelemetryPanel.currentPanel === this) {
      RiveTelemetryPanel.currentPanel = undefined;
    }
  }

  private update(payload: RiveTelemetryPayload | undefined): void {
    this.panel.webview.postMessage({
      type: 'telemetry',
      payload: payload ?? null,
    });
  }
}

interface WebviewCommandMessage {
  command: 'sendTelemetryCommand';
  payload: RiveTelemetryCommand;
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
    typeof value.stateMachine === 'string' &&
    typeof value.inputName === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getWebviewHtml(payload: RiveTelemetryPayload | undefined): string {
  const initialPayload = JSON.stringify(payload ?? null);

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
    input[type="number"] {
      width: 88px;
      padding: 4px 6px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }
    button {
      padding: 4px 10px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .empty, .command-status {
      color: var(--vscode-descriptionForeground);
    }
    .empty {
      margin-top: 24px;
    }
    .command-status {
      margin-top: 12px;
      min-height: 18px;
    }
    tr.command-sent {
      animation: flash 700ms ease-out;
    }
    @keyframes flash {
      from { background: var(--vscode-list-activeSelectionBackground); }
      to { background: transparent; }
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
    let lastCommandAt = null;
    let highlightedInput = null;

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'telemetry') {
        latestPayload = event.data.payload;
        render();
      } else if (event.data?.type === 'commandSent') {
        lastCommandAt = event.data.timestamp;
        render();
      } else if (event.data?.type === 'commandFailed') {
        lastCommandAt = 'No connected Flutter client';
        render();
      }
    });

    function render() {
      if (!latestPayload) {
        app.innerHTML = \`
          <div class="status">
            <span class="dot"></span>
            <span>Waiting for telemetry...</span>
          </div>
          <p class="empty">Run the Flutter demo to stream Rive state machine inputs.</p>
        \`;
        return;
      }

      const rows = latestPayload.inputs.map((input) => \`
        <tr data-input-name="\${escapeAttribute(input.name)}" class="\${highlightedInput === input.name ? 'command-sent' : ''}">
          <td><code>\${escapeHtml(input.name)}</code></td>
          <td>\${escapeHtml(input.type)}</td>
          <td><code>\${escapeHtml(formatValue(input.value))}</code></td>
          <td>\${renderControl(input)}</td>
        </tr>
      \`).join('');

      app.innerHTML = \`
        <div class="status receiving">
          <span class="dot"></span>
          <span>Receiving telemetry</span>
        </div>
        <dl>
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
        <div class="command-status">
          \${lastCommandAt ? 'Command sent: ' + escapeHtml(lastCommandAt) : ''}
        </div>
      \`;

      bindControls();
    }

    function renderControl(input) {
      if (input.type === 'boolean') {
        return \`
          <label>
            <input type="checkbox" data-control="boolean" data-input-name="\${escapeAttribute(input.name)}" \${input.value ? 'checked' : ''}>
            set
          </label>
        \`;
      }

      if (input.type === 'number') {
        return \`
          <input type="number" data-control="number" data-input-name="\${escapeAttribute(input.name)}" value="\${escapeAttribute(input.value ?? 0)}" step="1">
        \`;
      }

      if (input.type === 'trigger') {
        return \`
          <button type="button" data-control="trigger" data-input-name="\${escapeAttribute(input.name)}">Fire</button>
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

      app.querySelectorAll('[data-control="number"]').forEach((control) => {
        const sendNumber = () => {
          const value = Number(control.value);
          if (Number.isNaN(value)) {
            return;
          }
          sendCommand({
            type: 'setInput',
            stateMachine: latestPayload.stateMachine,
            inputName: control.dataset.inputName,
            inputType: 'number',
            value,
          });
        };
        control.addEventListener('change', sendNumber);
        control.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            sendNumber();
          }
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

    render();
  </script>
</body>
</html>`;
}
