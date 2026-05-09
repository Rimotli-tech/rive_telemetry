import * as vscode from 'vscode';
import * as path from 'path';
import { RiveTelemetryPanel } from './panel';
import { RivLoader } from './rivLoader';
import { TelemetryServer } from './telemetryServer';
import { RiveMetadata } from './metadataTypes';

let telemetryServer: TelemetryServer | undefined;
let outputChannel: vscode.OutputChannel | undefined;

interface IntegrationTarget extends vscode.QuickPickItem {
  readonly id: 'flutter' | 'typescript';
  readonly suffix: string;
  readonly filters: Record<string, string[]>;
}

export function activate(context: vscode.ExtensionContext): void {
  console.log('RiveTelemetry extension activated');

  outputChannel = vscode.window.createOutputChannel('RiveTelemetry');
  telemetryServer = new TelemetryServer(outputChannel, configuredPort());
  telemetryServer.start();
  const rivLoader = new RivLoader(context, outputChannel);
  let lastInspectedPath: string | undefined;
  let lastMetadata: RiveMetadata | undefined;

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
      lastMetadata = metadata;

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

  const clearSchemaCommand = vscode.commands.registerCommand(
    'riveTelemetry.clearSchema',
    () => {
      lastInspectedPath = undefined;
      lastMetadata = undefined;
      RiveTelemetryPanel.updateStaticMetadata(null);
      vscode.window.showInformationMessage('Cleared loaded Rive schema.');
    },
  );

  const exportMetadataCommand = vscode.commands.registerCommand(
    'riveTelemetry.exportMetadata',
    async () => {
      if (!lastMetadata) {
        vscode.window.showInformationMessage(
          'Load a .riv file before exporting metadata.',
        );
        return;
      }

      const defaultUri = defaultGeneratedUri(
        lastInspectedPath ?? lastMetadata.source,
        '.metadata.json',
      );
      const target = await vscode.window.showSaveDialog({
        defaultUri,
        filters: {
          'JSON files': ['json'],
        },
        saveLabel: 'Export Metadata JSON',
        title: 'Export Rive Metadata JSON',
      });
      if (!target) {
        return;
      }

      await vscode.workspace.fs.writeFile(
        target,
        Buffer.from(`${JSON.stringify(lastMetadata, null, 2)}\n`, 'utf8'),
      );
      vscode.window.showInformationMessage(
        `Exported Rive metadata: ${vscode.workspace.asRelativePath(target)}`,
      );
    },
  );

  async function generateIntegrationCode(
    preselectedTarget?: IntegrationTarget['id'],
  ): Promise<void> {
    if (!lastInspectedPath) {
      vscode.window.showInformationMessage(
        'Load a .riv file before generating integration code.',
      );
      return;
    }

    const targets: IntegrationTarget[] = [
      {
        id: 'flutter',
        label: 'Flutter / Dart',
        description: 'Runtime helpers for package:rive and rive_telemetry',
        suffix: '_rive.dart',
        filters: {
          'Dart files': ['dart'],
        },
      },
      {
        id: 'typescript',
        label: 'TypeScript / JavaScript',
        description: 'Typed constants and access helpers for JS runtimes',
        suffix: '_rive.ts',
        filters: {
          'TypeScript files': ['ts'],
        },
      },
    ];

    const selectedTarget = preselectedTarget
      ? targets.find((target) => target.id === preselectedTarget)
      : await vscode.window.showQuickPick(targets, {
          placeHolder: 'Select a runtime target',
          title: 'Generate Rive Integration Code',
        });

    if (!selectedTarget) {
      return;
    }

    const target = await vscode.window.showSaveDialog({
      defaultUri: defaultGeneratedUri(lastInspectedPath, selectedTarget.suffix),
      filters: selectedTarget.filters,
      saveLabel: 'Generate Integration Code',
      title: `Generate ${selectedTarget.label} Integration`,
    });
    if (!target) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Generating ${selectedTarget.label} integration`,
        },
        () =>
          selectedTarget.id === 'flutter'
            ? rivLoader.generateFlutterIntegration(lastInspectedPath!, target.fsPath)
            : rivLoader.generateTypeScriptIntegration(
                lastInspectedPath!,
                target.fsPath,
              ),
      );
      vscode.window.showInformationMessage(
        `Generated ${selectedTarget.label} integration: ${vscode.workspace.asRelativePath(target)}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel?.appendLine(`Integration generation failed: ${message}`);
      vscode.window.showErrorMessage(`Integration generation failed: ${message}`);
    }
  }

  const generateIntegrationCommand = vscode.commands.registerCommand(
    'riveTelemetry.generateIntegrationCode',
    () => generateIntegrationCode(),
  );

  const generateFlutterCommand = vscode.commands.registerCommand(
    'riveTelemetry.generateFlutterIntegration',
    async () => {
      await generateIntegrationCode('flutter');
    },
  );

  const createMetadataDeliverableCommand = vscode.commands.registerCommand(
    'riveTelemetry.createMetadataDeliverable',
    async () => {
      if (!lastInspectedPath) {
        vscode.window.showInformationMessage(
          'Load a .riv file before creating a metadata package.',
        );
        return;
      }

      const includeRev = await vscode.window.showInformationMessage(
        'Include the .rev project file in this deliverable?',
        { modal: true },
        'Include .rev',
        'Skip .rev',
      );
      if (!includeRev) {
        return;
      }

      let revPath: string | undefined;
      if (includeRev === 'Include .rev') {
        const revSelection = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'Rive project files': ['rev'],
          },
          openLabel: 'Include .rev',
          title: 'Select Rive Project File',
        });
        if (!revSelection?.[0]) {
          return;
        }
        revPath = revSelection[0].fsPath;
      }

      const source = path.parse(lastInspectedPath);
      const defaultFolder = vscode.Uri.file(
        path.join(source.dir || process.cwd(), `${source.name}-metadata-deliverable`),
      );
      const deliverableFolder = await vscode.window.showSaveDialog({
        defaultUri: defaultFolder,
        saveLabel: 'Create Metadata Package',
        title: 'Create Metadata Package Folder',
      });
      if (!deliverableFolder) {
        return;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Creating Rive metadata package',
          },
          () =>
            rivLoader.createMetadataDeliverable(
              lastInspectedPath!,
              deliverableFolder.fsPath,
              revPath,
            ),
        );
        vscode.window.showInformationMessage(
          `Created metadata package: ${vscode.workspace.asRelativePath(deliverableFolder)}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputChannel?.appendLine(`Metadata package creation failed: ${message}`);
        vscode.window.showErrorMessage(
          `Metadata package creation failed: ${message}`,
        );
      }
    },
  );

  context.subscriptions.push(
    openPanelCommand,
    inspectFileCommand,
    reloadFileCommand,
    clearSchemaCommand,
    exportMetadataCommand,
    generateIntegrationCommand,
    generateFlutterCommand,
    createMetadataDeliverableCommand,
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

function defaultGeneratedUri(sourcePath: string, suffix: string): vscode.Uri {
  const parsed = path.parse(sourcePath);
  const directory = parsed.dir || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const fileName = `${parsed.name}${suffix}`;
  return vscode.Uri.file(path.join(directory ?? process.cwd(), fileName));
}
