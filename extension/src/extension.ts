import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  console.log('RiveTelemetry extension activated');

  const disposable = vscode.commands.registerCommand(
    'riveTelemetry.openPanel',
    () => {
      console.log('RiveTelemetry panel command triggered');
    },
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
