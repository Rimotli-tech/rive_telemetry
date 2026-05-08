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
exports.RivLoader = void 0;
exports.findCoreInspectorEntrypoint = findCoreInspectorEntrypoint;
exports.findCoreCliEntrypoint = findCoreCliEntrypoint;
exports.inspectRivFileWithCore = inspectRivFileWithCore;
exports.findDartExecutable = findDartExecutable;
const childProcess = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const metadataTypes_1 = require("./metadataTypes");
class RivLoader {
    constructor(context, output, execFile = childProcess.execFile) {
        this.context = context;
        this.output = output;
        this.execFile = execFile;
    }
    async pickAndInspect() {
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
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Inspecting ${path.basename(file.fsPath)}`,
        }, () => this.inspectFile(file.fsPath));
    }
    async inspectFile(filePath) {
        const entrypoint = findCoreInspectorEntrypoint(this.context.extensionPath);
        const dartExecutable = findDartExecutable(this.context.extensionPath);
        const metadata = await inspectRivFileWithCore(filePath, entrypoint, dartExecutable, this.output, this.execFile);
        const artboardCount = metadata.artboards.length;
        const stateMachineCount = metadata.artboards.reduce((count, artboard) => count + artboard.stateMachines.length, 0);
        const inputCount = metadata.artboards.reduce((count, artboard) => count +
            artboard.stateMachines.reduce((inner, stateMachine) => inner + stateMachine.inputs.length, 0), 0);
        this.output.appendLine(`Loaded ${path.basename(filePath)}: ${artboardCount} artboard(s), ${stateMachineCount} state machine(s), ${inputCount} input(s), ${metadata.warnings.length} warning(s)`);
        if (metadata.warnings.length > 0) {
            for (const warning of metadata.warnings) {
                this.output.appendLine(`Rive metadata warning [${warning.code}]: ${warning.message}`);
            }
        }
        return metadata;
    }
    async generateFlutterIntegration(filePath, outputPath) {
        const entrypoint = findCoreCliEntrypoint(this.context.extensionPath);
        const dartExecutable = findDartExecutable(this.context.extensionPath);
        await runCoreCommand(['run', entrypoint, 'generate', 'flutter', '--out', outputPath, filePath], entrypoint, dartExecutable, this.output, this.execFile);
        this.output.appendLine(`Generated Flutter integration: ${outputPath}`);
    }
    async createMetadataDeliverable(filePath, outputDirectory, revPath) {
        const entrypoint = findCoreCliEntrypoint(this.context.extensionPath);
        const dartExecutable = findDartExecutable(this.context.extensionPath);
        const args = ['run', entrypoint, 'deliverable', '--out', outputDirectory];
        if (revPath) {
            args.push('--rev', revPath);
        }
        args.push(filePath);
        await runCoreCommand(args, entrypoint, dartExecutable, this.output, this.execFile);
        this.output.appendLine(`Created metadata deliverable: ${outputDirectory}`);
    }
}
exports.RivLoader = RivLoader;
function findCoreInspectorEntrypoint(extensionPath) {
    const candidates = [
        path.resolve(extensionPath, '..', 'core', 'bin', 'rive_metadata_inspect.dart'),
        path.resolve(extensionPath, 'core', 'bin', 'rive_metadata_inspect.dart'),
    ];
    const entrypoint = candidates.find((candidate) => fs.existsSync(candidate));
    if (!entrypoint) {
        throw new Error('Rive metadata inspector was not found. Expected core/bin/rive_metadata_inspect.dart.');
    }
    return entrypoint;
}
function findCoreCliEntrypoint(extensionPath) {
    const candidates = [
        path.resolve(extensionPath, '..', 'core', 'bin', 'rive_telemetry.dart'),
        path.resolve(extensionPath, 'core', 'bin', 'rive_telemetry.dart'),
    ];
    const entrypoint = candidates.find((candidate) => fs.existsSync(candidate));
    if (!entrypoint) {
        throw new Error('RiveTelemetry CLI was not found. Expected core/bin/rive_telemetry.dart.');
    }
    return entrypoint;
}
function inspectRivFileWithCore(filePath, entrypoint, dartExecutable, output, execFile = childProcess.execFile) {
    return new Promise((resolve, reject) => {
        execFile(dartExecutable, ['run', entrypoint, filePath], {
            cwd: path.dirname(path.dirname(entrypoint)),
            maxBuffer: 1024 * 1024 * 16,
        }, (error, stdout, stderr) => {
            if (stderr.trim().length > 0) {
                output.appendLine(stderr.trim());
            }
            if (error) {
                if (isMissingExecutableError(error)) {
                    reject(new Error(`Dart executable was not found. Set the riveTelemetry.dartPath setting to your Dart SDK executable path. Tried: ${dartExecutable}`));
                    return;
                }
                reject(new Error(stderr.trim().length > 0
                    ? stderr.trim()
                    : `Dart metadata inspector failed: ${error.message}`));
                return;
            }
            try {
                const parsed = JSON.parse(stdout);
                if (!(0, metadataTypes_1.isRiveMetadata)(parsed)) {
                    reject(new Error('Dart metadata inspector returned invalid JSON.'));
                    return;
                }
                resolve(parsed);
            }
            catch (parseError) {
                const message = parseError instanceof Error ? parseError.message : String(parseError);
                reject(new Error(`Failed to parse Rive metadata JSON: ${message}`));
            }
        });
    });
}
function runCoreCommand(args, entrypoint, dartExecutable, output, execFile = childProcess.execFile) {
    return new Promise((resolve, reject) => {
        execFile(dartExecutable, args, {
            cwd: path.dirname(path.dirname(entrypoint)),
            maxBuffer: 1024 * 1024 * 16,
        }, (error, stdout, stderr) => {
            if (stdout.trim().length > 0) {
                output.appendLine(stdout.trim());
            }
            if (stderr.trim().length > 0) {
                output.appendLine(stderr.trim());
            }
            if (error) {
                if (isMissingExecutableError(error)) {
                    reject(new Error(`Dart executable was not found. Set the riveTelemetry.dartPath setting to your Dart SDK executable path. Tried: ${dartExecutable}`));
                    return;
                }
                reject(new Error(stderr.trim().length > 0
                    ? stderr.trim()
                    : `Dart generation failed: ${error.message}`));
                return;
            }
            resolve();
        });
    });
}
function findDartExecutable(extensionPath) {
    const configured = vscode.workspace
        .getConfiguration('riveTelemetry')
        .get('dartPath', 'dart')
        .trim();
    if (configured.length > 0 && configured !== 'dart') {
        return configured;
    }
    const executableName = process.platform === 'win32' ? 'dart.exe' : 'dart';
    const candidates = [
        process.env.DART_SDK
            ? path.join(process.env.DART_SDK, 'bin', executableName)
            : undefined,
        process.env.FLUTTER_ROOT
            ? path.join(process.env.FLUTTER_ROOT, 'bin', 'cache', 'dart-sdk', 'bin', executableName)
            : undefined,
        path.resolve(extensionPath, '..', '..', 'flutter', 'bin', 'cache', 'dart-sdk', 'bin', executableName),
    ];
    return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? 'dart';
}
function isMissingExecutableError(error) {
    return ('code' in error &&
        error.code === 'ENOENT');
}
//# sourceMappingURL=rivLoader.js.map