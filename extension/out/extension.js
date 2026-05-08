"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const panel_1 = require("./panel");
const rivLoader_1 = require("./rivLoader");
const telemetryServer_1 = require("./telemetryServer");
let telemetryServer;
let outputChannel;
function activate(context) {
    console.log('RiveTelemetry extension activated');
    outputChannel = vscode.window.createOutputChannel('RiveTelemetry');
    telemetryServer = new telemetryServer_1.TelemetryServer(outputChannel, configuredPort());
    telemetryServer.start();
    const rivLoader = new rivLoader_1.RivLoader(context, outputChannel);
    let lastInspectedPath;
    let lastMetadata;
    async function inspectAndShow(filePath) {
        try {
            const metadata = filePath
                ? await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Inspecting ${vscode.workspace.asRelativePath(filePath)}`,
                }, () => rivLoader.inspectFile(filePath))
                : await rivLoader.pickAndInspect();
            if (!metadata) {
                return;
            }
            lastInspectedPath = metadata.source;
            lastMetadata = metadata;
            if (telemetryServer) {
                panel_1.RiveTelemetryPanel.show(context, telemetryServer);
                panel_1.RiveTelemetryPanel.updateStaticMetadata(metadata);
            }
            vscode.window.showInformationMessage(`Loaded Rive schema: ${metadata.artboards.length} artboard(s), ${metadata.warnings.length} warning(s).`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            outputChannel?.appendLine(`Rive schema inspection failed: ${message}`);
            vscode.window.showErrorMessage(`Rive schema inspection failed: ${message}`);
        }
    }
    const openPanelCommand = vscode.commands.registerCommand('riveTelemetry.openPanel', () => {
        console.log('RiveTelemetry panel command triggered');
        if (!telemetryServer) {
            outputChannel?.appendLine('RiveTelemetry server is not available');
            return;
        }
        panel_1.RiveTelemetryPanel.show(context, telemetryServer);
    });
    const inspectFileCommand = vscode.commands.registerCommand('riveTelemetry.inspectFile', () => inspectAndShow());
    const reloadFileCommand = vscode.commands.registerCommand('riveTelemetry.reloadFile', async () => {
        if (!lastInspectedPath) {
            vscode.window.showInformationMessage('Load a .riv file before reloading.');
            return;
        }
        await inspectAndShow(lastInspectedPath);
    });
    const exportMetadataCommand = vscode.commands.registerCommand('riveTelemetry.exportMetadata', async () => {
        if (!lastMetadata) {
            vscode.window.showInformationMessage('Load a .riv file before exporting metadata.');
            return;
        }
        const defaultUri = defaultGeneratedUri(lastInspectedPath ?? lastMetadata.source, '.metadata.json');
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
        await vscode.workspace.fs.writeFile(target, Buffer.from(`${JSON.stringify(lastMetadata, null, 2)}\n`, 'utf8'));
        vscode.window.showInformationMessage(`Exported Rive metadata: ${vscode.workspace.asRelativePath(target)}`);
    });
    const generateFlutterCommand = vscode.commands.registerCommand('riveTelemetry.generateFlutterIntegration', async () => {
        if (!lastInspectedPath) {
            vscode.window.showInformationMessage('Load a .riv file before generating Flutter integration.');
            return;
        }
        const target = await vscode.window.showSaveDialog({
            defaultUri: defaultGeneratedUri(lastInspectedPath, '_rive.dart'),
            filters: {
                'Dart files': ['dart'],
            },
            saveLabel: 'Generate Flutter Integration',
            title: 'Generate Flutter Rive Integration',
        });
        if (!target) {
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating Flutter integration',
            }, () => rivLoader.generateFlutterIntegration(lastInspectedPath, target.fsPath));
            vscode.window.showInformationMessage(`Generated Flutter integration: ${vscode.workspace.asRelativePath(target)}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            outputChannel?.appendLine(`Flutter integration generation failed: ${message}`);
            vscode.window.showErrorMessage(`Flutter integration generation failed: ${message}`);
        }
    });
    context.subscriptions.push(openPanelCommand, inspectFileCommand, reloadFileCommand, exportMetadataCommand, generateFlutterCommand, telemetryServer, outputChannel);
}
function deactivate() {
    telemetryServer?.dispose();
    outputChannel?.dispose();
    telemetryServer = undefined;
    outputChannel = undefined;
}
function configuredPort() {
    const port = vscode.workspace
        .getConfiguration('riveTelemetry')
        .get('port', 8080);
    if (Number.isInteger(port) && port >= 1 && port <= 65535) {
        return port;
    }
    vscode.window.showWarningMessage(`RiveTelemetry port ${port} is invalid. Falling back to 8080.`);
    return 8080;
}
function defaultGeneratedUri(sourcePath, suffix) {
    const parsed = path.parse(sourcePath);
    const directory = parsed.dir || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const fileName = `${parsed.name}${suffix}`;
    return vscode.Uri.file(path.join(directory ?? process.cwd(), fileName));
}
//# sourceMappingURL=extension.js.map