import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { RiveMetadata, isRiveMetadata } from './metadataTypes';

type ExecFile = typeof childProcess.execFile;

export class RivLoader {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel,
    private readonly execFile: ExecFile = childProcess.execFile,
  ) {}

  async pickAndInspect(): Promise<RiveMetadata | undefined> {
    const selection = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Rive files': ['riv'],
      },
      openLabel: 'Inspect .riv',
      title: 'Inspect Rive File',
    });

    const file = selection?.[0];
    if (!file) {
      return undefined;
    }

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Inspecting ${path.basename(file.fsPath)}`,
      },
      () => this.inspectFile(file.fsPath),
    );
  }

  async inspectFile(filePath: string): Promise<RiveMetadata> {
    const entrypoint = findCoreInspectorEntrypoint(this.context.extensionPath);
    const metadata = await inspectRivFileWithCore(
      filePath,
      entrypoint,
      this.output,
      this.execFile,
    );

    const artboardCount = metadata.artboards.length;
    const stateMachineCount = metadata.artboards.reduce(
      (count, artboard) => count + artboard.stateMachines.length,
      0,
    );
    const inputCount = metadata.artboards.reduce(
      (count, artboard) =>
        count +
        artboard.stateMachines.reduce(
          (inner, stateMachine) => inner + stateMachine.inputs.length,
          0,
        ),
      0,
    );

    this.output.appendLine(
      `Loaded ${path.basename(filePath)}: ${artboardCount} artboard(s), ${stateMachineCount} state machine(s), ${inputCount} input(s), ${metadata.warnings.length} warning(s)`,
    );

    if (metadata.warnings.length > 0) {
      for (const warning of metadata.warnings) {
        this.output.appendLine(
          `Rive metadata warning [${warning.code}]: ${warning.message}`,
        );
      }
    }

    return metadata;
  }
}

export function findCoreInspectorEntrypoint(extensionPath: string): string {
  const candidates = [
    path.resolve(extensionPath, '..', 'core', 'bin', 'rive_metadata_inspect.dart'),
    path.resolve(extensionPath, 'core', 'bin', 'rive_metadata_inspect.dart'),
  ];

  const entrypoint = candidates.find((candidate) => fs.existsSync(candidate));
  if (!entrypoint) {
    throw new Error(
      'Rive metadata inspector was not found. Expected core/bin/rive_metadata_inspect.dart.',
    );
  }

  return entrypoint;
}

export function inspectRivFileWithCore(
  filePath: string,
  entrypoint: string,
  output: vscode.OutputChannel,
  execFile: ExecFile = childProcess.execFile,
): Promise<RiveMetadata> {
  return new Promise((resolve, reject) => {
    execFile(
      'dart',
      ['run', entrypoint, filePath],
      {
        cwd: path.dirname(path.dirname(entrypoint)),
        maxBuffer: 1024 * 1024 * 16,
      },
      (error, stdout, stderr) => {
        if (stderr.trim().length > 0) {
          output.appendLine(stderr.trim());
        }

        if (error) {
          reject(
            new Error(
              stderr.trim().length > 0
                ? stderr.trim()
                : `Dart metadata inspector failed: ${error.message}`,
            ),
          );
          return;
        }

        try {
          const parsed: unknown = JSON.parse(stdout);
          if (!isRiveMetadata(parsed)) {
            reject(new Error('Dart metadata inspector returned invalid JSON.'));
            return;
          }
          resolve(parsed);
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : String(parseError);
          reject(new Error(`Failed to parse Rive metadata JSON: ${message}`));
        }
      },
    );
  });
}
