import * as vscode from 'vscode';
import { RiveTelemetryPanel } from './panel';
import { RivLoader } from './rivLoader';
import { TelemetryServer } from './telemetryServer';

let telemetryServer: TelemetryServer | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  console.log('RiveTelemetry extension activated');

  outputChannel = vscode.window.createOutputChannel('RiveTelemetry');
  telemetryServer = new TelemetryServer(outputChannel, configuredPort());
  telemetryServer.start();
  const rivLoader = new RivLoader(context, outputChannel);
  let lastInspectedPath: string | undefined;

  async function inspectAndShow(filePath?: string): Promise<void> {
    try {
      const metadata = filePath
        ? await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Inspecting ${vscode.workspace.asRelativePath(filePath)}`,
            },
            () => rivLoader.inspectFile(filePath),
          )
        : await rivLoader.pickAndInspect();
      if (!metadata) {
        return;
      }

      lastInspectedPath = metadata.source;

      if (telemetryServer) {
        RiveTelemetryPanel.show(context, telemetryServer);
        RiveTelemetryPanel.updateStaticMetadata(metadata);
      }

      vscode.window.showInformationMessage(
        `Loaded Rive schema: ${metadata.artboards.length} artboard(s), ${metadata.warnings.length} warning(s).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel?.appendLine(`Rive schema inspection failed: ${message}`);
      vscode.window.showErrorMessage(`Rive schema inspection failed: ${message}`);
    }
  }

  const openPanelCommand = vscode.commands.registerCommand(
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

  const inspectFileCommand = vscode.commands.registerCommand(
    'riveTelemetry.inspectFile',
    () => inspectAndShow(),
  );

  const reloadFileCommand = vscode.commands.registerCommand(
    'riveTelemetry.reloadFile',
    async () => {
      if (!lastInspectedPath) {
        vscode.window.showInformationMessage('Load a .riv file before reloading.');
        return;
      }
      await inspectAndShow(lastInspectedPath);
    },
  );

  context.subscriptions.push(
    openPanelCommand,
    inspectFileCommand,
    reloadFileCommand,
    telemetryServer,
    outputChannel,
  );
}

export function deactivate(): void {
  telemetryServer?.dispose();
  outputChannel?.dispose();
  telemetryServer = undefined;
  outputChannel = undefined;
}

function configuredPort(): number {
  const port = vscode.workspace
    .getConfiguration('riveTelemetry')
    .get<number>('port', 8080);

  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port;
  }

  vscode.window.showWarningMessage(
    `RiveTelemetry port ${port} is invalid. Falling back to 8080.`,
  );
  return 8080;
}
