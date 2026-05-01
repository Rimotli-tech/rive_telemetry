import * as vscode from 'vscode';
import { TelemetryServer } from './telemetryServer';
import { RiveTelemetryPayload } from './types';

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

    this.panel.onDidDispose(() => this.dispose());
  }

  static show(context: vscode.ExtensionContext, telemetryServer: TelemetryServer): void {
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
    .empty {
      margin-top: 24px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h1>RiveTelemetry</h1>
  <div id="app"></div>
  <script>
    const app = document.getElementById('app');
    let latestPayload = ${initialPayload};

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'telemetry') {
        latestPayload = event.data.payload;
        render();
      }
    });

    function render() {
      if (!latestPayload) {
        app.innerHTML = \`
          <div class="status">
            <span class="dot"></span>
            <span>Waiting for telemetry…</span>
          </div>
          <p class="empty">Run the Flutter demo to stream Rive state machine inputs.</p>
        \`;
        return;
      }

      const rows = latestPayload.inputs.map((input) => \`
        <tr>
          <td><code>\${escapeHtml(input.name)}</code></td>
          <td>\${escapeHtml(input.type)}</td>
          <td><code>\${escapeHtml(formatValue(input.value))}</code></td>
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
            <tr><th>Name</th><th>Type</th><th>Value</th></tr>
          </thead>
          <tbody>\${rows}</tbody>
        </table>
      \`;
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

    render();
  </script>
</body>
</html>`;
}
