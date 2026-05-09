import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { RiveMetadata } from './metadataTypes';
import { TelemetryServer } from './telemetryServer';
import { getWebviewHtml } from './webviewHtml';
import {
  RiveTelemetryCommand,
  RiveTelemetryPanelState,
  RiveTelemetryServerStatus,
} from './types';

export class RiveTelemetryPanel {
  private static currentPanel: RiveTelemetryPanel | undefined;
  private static staticMetadata: RiveMetadata | null = null;

  private readonly panel: vscode.WebviewPanel;
  private readonly telemetrySubscription: vscode.Disposable;
  private readonly statusSubscription: vscode.Disposable;

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    private readonly telemetryServer: TelemetryServer,
  ) {
    this.panel = panel;
    this.panel.webview.options = { enableScripts: true };
    const iconUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, 'media', 'icon.png')),
    );
    this.panel.webview.html = getWebviewHtml(
      this.telemetryServer.panelState,
      this.telemetryServer.status,
      RiveTelemetryPanel.staticMetadata,
      thumbnailUriForMetadata(this.panel.webview, RiveTelemetryPanel.staticMetadata),
      iconUri,
      this.panel.webview.cspSource,
    );

    this.telemetrySubscription = this.telemetryServer.onTelemetry((state) => {
      this.updateTelemetry(state);
    });
    this.statusSubscription = this.telemetryServer.onStatus((status) => {
      this.updateStatus(status);
    });

    this.panel.webview.onDidReceiveMessage((message: unknown) => {
      if (isWebviewInspectFileMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.inspectFile');
        return;
      }

      if (isWebviewReloadFileMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.reloadFile');
        return;
      }

      if (isWebviewClearSchemaMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.clearSchema');
        return;
      }

      if (isWebviewExportMetadataMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.exportMetadata');
        return;
      }

      if (isWebviewGenerateIntegrationMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.generateIntegrationCode');
        return;
      }

      if (isWebviewGenerateFlutterMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.generateFlutterIntegration');
        return;
      }

      if (isWebviewCreateMetadataDeliverableMessage(message)) {
        vscode.commands.executeCommand('riveTelemetry.createMetadataDeliverable');
        return;
      }

      if (isWebviewCopyTextMessage(message)) {
        vscode.env.clipboard.writeText(message.text);
        return;
      }

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
      RiveTelemetryPanel.currentPanel.updateMetadata(
        RiveTelemetryPanel.staticMetadata,
      );
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'riveTelemetry',
      'RiveTelemetry',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    RiveTelemetryPanel.currentPanel = new RiveTelemetryPanel(
      panel,
      context,
      telemetryServer,
    );

    context.subscriptions.push(RiveTelemetryPanel.currentPanel);
  }

  static updateStaticMetadata(metadata: RiveMetadata | null): void {
    RiveTelemetryPanel.staticMetadata = metadata;
    RiveTelemetryPanel.currentPanel?.updateMetadata(metadata);
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

  private updateMetadata(metadata: RiveMetadata | null): void {
    this.panel.webview.postMessage({
      type: 'metadata',
      metadata,
      thumbnailUri: thumbnailUriForMetadata(this.panel.webview, metadata),
    });
  }
}

function thumbnailUriForMetadata(
  webview: vscode.Webview,
  metadata: RiveMetadata | null,
): string | null {
  if (!metadata) {
    return null;
  }

  const parsed = path.parse(metadata.source);
  const candidates = [
    path.join(parsed.dir, `${parsed.name}.png`),
    path.join(parsed.dir, `${parsed.name}.jpg`),
    path.join(parsed.dir, `${parsed.name}.jpeg`),
    path.join(parsed.dir, `${parsed.name}.webp`),
    path.join(parsed.dir, '.thumbnails', `${parsed.name}.png`),
    path.join(parsed.dir, '.thumbnails', `${parsed.name}.jpg`),
    path.join(parsed.dir, '.thumbnails', `${parsed.name}.jpeg`),
    path.join(parsed.dir, '.thumbnails', `${parsed.name}.webp`),
  ];

  const thumbnailPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!thumbnailPath) {
    return null;
  }

  return webview.asWebviewUri(vscode.Uri.file(thumbnailPath)).toString();
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

interface WebviewClearTelemetryMessage {
  command: 'clearTelemetry';
}

interface WebviewInspectFileMessage {
  command: 'inspectFile';
}

interface WebviewReloadFileMessage {
  command: 'reloadFile';
}

interface WebviewClearSchemaMessage {
  command: 'clearSchema';
}

interface WebviewExportMetadataMessage {
  command: 'exportMetadata';
}

interface WebviewGenerateIntegrationMessage {
  command: 'generateIntegrationCode';
}

interface WebviewGenerateFlutterMessage {
  command: 'generateFlutterIntegration';
}

interface WebviewCreateMetadataDeliverableMessage {
  command: 'createMetadataDeliverable';
}

interface WebviewCopyTextMessage {
  command: 'copyText';
  text: string;
}

function isWebviewInspectFileMessage(
  value: unknown,
): value is WebviewInspectFileMessage {
  return isRecord(value) && value.command === 'inspectFile';
}

function isWebviewReloadFileMessage(
  value: unknown,
): value is WebviewReloadFileMessage {
  return isRecord(value) && value.command === 'reloadFile';
}

function isWebviewClearSchemaMessage(
  value: unknown,
): value is WebviewClearSchemaMessage {
  return isRecord(value) && value.command === 'clearSchema';
}

function isWebviewExportMetadataMessage(
  value: unknown,
): value is WebviewExportMetadataMessage {
  return isRecord(value) && value.command === 'exportMetadata';
}

function isWebviewGenerateIntegrationMessage(
  value: unknown,
): value is WebviewGenerateIntegrationMessage {
  return isRecord(value) && value.command === 'generateIntegrationCode';
}

function isWebviewGenerateFlutterMessage(
  value: unknown,
): value is WebviewGenerateFlutterMessage {
  return isRecord(value) && value.command === 'generateFlutterIntegration';
}

function isWebviewCreateMetadataDeliverableMessage(
  value: unknown,
): value is WebviewCreateMetadataDeliverableMessage {
  return isRecord(value) && value.command === 'createMetadataDeliverable';
}

function isWebviewCopyTextMessage(
  value: unknown,
): value is WebviewCopyTextMessage {
  return (
    isRecord(value) &&
    value.command === 'copyText' &&
    typeof value.text === 'string'
  );
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

function isWebviewClearTelemetryMessage(
  value: unknown,
): value is WebviewClearTelemetryMessage {
  return isRecord(value) && value.command === 'clearTelemetry';
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
