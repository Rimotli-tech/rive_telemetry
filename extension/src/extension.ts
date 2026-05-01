import * as vscode from 'vscode';
import { RiveTelemetryPanel } from './panel';
import { TelemetryServer } from './telemetryServer';

let telemetryServer: TelemetryServer | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  console.log('RiveTelemetry extension activated');

  outputChannel = vscode.window.createOutputChannel('RiveTelemetry');
  telemetryServer = new TelemetryServer(outputChannel);
  telemetryServer.start();

  const disposable = vscode.commands.registerCommand(
    'riveTelemetry.openPanel',
    () => {
      console.log('RiveTelemetry panel command triggered');
      if (!telemetryServer) {
        outputChannel?.appendLine('RiveTelemetry server is not available');
        return;
      }
      RiveTelemetryPanel.show(context, telemetryServer);
    },
  );

  context.subscriptions.push(disposable, telemetryServer, outputChannel);
}

export function deactivate(): void {
  telemetryServer?.dispose();
  outputChannel?.dispose();
  telemetryServer = undefined;
  outputChannel = undefined;
}
