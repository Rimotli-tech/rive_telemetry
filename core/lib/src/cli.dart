import 'dart:io';

import 'codegen.dart';
import 'exceptions.dart';
import 'flutter_generator.dart';
import 'json_export.dart';
import 'metadata.dart';
import 'rive_inspector.dart';
import 'typescript_generator.dart';

Future<int> runRiveTelemetryCli(
  List<String> args, {
  StringSink? stdoutSink,
  StringSink? stderrSink,
}) async {
  final out = stdoutSink ?? stdout;
  final err = stderrSink ?? stderr;

  if (args.isEmpty || args.contains('--help') || args.contains('-h')) {
    _writeUsage(out);
    return args.isEmpty ? 64 : 0;
  }

  final command = args.first;
  final rest = args.sublist(1);
  try {
    switch (command) {
      case 'inspect':
        return await _runInspect(rest, out, err);
      case 'export':
        return await _runExport(rest, out, err);
      case 'generate':
        return await _runGenerate(rest, out, err);
      case 'debug':
        return await _runDebug(rest, out, err);
      default:
        err.writeln('Unknown command: $command');
        _writeUsage(err);
        return 64;
    }
  } on RiveInspectionException catch (error) {
    err.writeln(error);
    return 1;
  } on FormatException catch (error) {
    err.writeln(error);
    return 1;
  }
}

Future<int> _runGenerate(
  List<String> args,
  StringSink out,
  StringSink err,
) async {
  if (args.isEmpty) {
    _writeGenerateUsage(err);
    return 64;
  }

  final target = _GenerateTarget.parse(args.first);
  if (target == null) {
    err.writeln('Unknown generate target: ${args.first}');
    _writeGenerateUsage(err);
    return 64;
  }

  final options = _CliOptions.parse(args.sublist(1), defaultPretty: false);
  if (options.error != null) {
    err.writeln(options.error);
    _writeGenerateUsage(err);
    return 64;
  }
  if (options.paths.length != 1) {
    _writeGenerateUsage(err);
    return 64;
  }

  final metadata = await inspectRivFile(options.paths.single);
  final generated = switch (target) {
    _GenerateTarget.flutter => _GeneratedSource.fromFlutter(
      const RiveFlutterIntegrationGenerator().generate(metadata),
    ),
    _GenerateTarget.typescript => _GeneratedSource.fromTypeScript(
      const RiveTypeScriptIntegrationGenerator().generate(metadata),
    ),
  };

  for (final diagnostic in generated.diagnostics) {
    final line =
        '${diagnostic.severity.name} ${diagnostic.code}: ${diagnostic.message}';
    if (diagnostic.severity == RiveCodegenDiagnosticSeverity.error) {
      err.writeln(line);
    } else {
      err.writeln(line);
    }
  }

  if (options.dryRun) {
    out.write(
      _formatGenerateDryRunSummary(
        target: target,
        inputPath: options.paths.single,
        outputPath: options.outputPath,
        generated: generated,
      ),
    );
    return generated.hasErrors ? 1 : 0;
  }

  if (options.outputPath == null) {
    out.write(generated.source);
  } else {
    await File(options.outputPath!).writeAsString(generated.source);
  }

  return generated.hasErrors ? 1 : 0;
}

String _formatGenerateDryRunSummary({
  required _GenerateTarget target,
  required String inputPath,
  required String? outputPath,
  required _GeneratedSource generated,
}) {
  final buffer = StringBuffer()
    ..writeln('Rive generation dry run')
    ..writeln('target: ${target.name}')
    ..writeln('source: $inputPath')
    ..writeln('output: ${outputPath ?? 'stdout'}')
    ..writeln('bytes: ${generated.source.length}')
    ..writeln('diagnostics: ${generated.diagnostics.length}')
    ..writeln('status: ${generated.hasErrors ? 'blocked' : 'ready'}');

  return buffer.toString();
}

Future<int> _runInspect(
  List<String> args,
  StringSink out,
  StringSink err,
) async {
  final options = _CliOptions.parse(args, defaultPretty: false);
  if (options.error != null) {
    err.writeln(options.error);
    _writeInspectUsage(err);
    return 64;
  }
  if (options.paths.length != 1) {
    _writeInspectUsage(err);
    return 64;
  }

  final metadata = await inspectRivFile(options.paths.single);
  if (options.json) {
    return _writeJson(metadata, options, out);
  }

  out.write(_formatInspectionSummary(metadata));
  return 0;
}

Future<int> _runExport(
  List<String> args,
  StringSink out,
  StringSink err,
) async {
  final options = _CliOptions.parse(args, defaultPretty: true);
  if (options.error != null) {
    err.writeln(options.error);
    _writeExportUsage(err);
    return 64;
  }
  if (options.paths.length != 1) {
    _writeExportUsage(err);
    return 64;
  }

  final metadata = await inspectRivFile(options.paths.single);
  return _writeJson(metadata, options, out);
}

Future<int> _runDebug(List<String> args, StringSink out, StringSink err) async {
  final paths = args.where((arg) => !arg.startsWith('-')).toList();
  if (paths.length != 1) {
    _writeDebugUsage(err);
    return 64;
  }

  out.write(await debugRivSchemaFile(paths.single));
  return 0;
}

Future<int> _writeJson(
  RiveMetadata metadata,
  _CliOptions options,
  StringSink out,
) async {
  final json = metadataToJson(metadata, pretty: options.pretty);
  if (options.outputPath == null) {
    out.write(json);
  } else {
    await File(options.outputPath!).writeAsString(json);
  }
  return 0;
}

String _formatInspectionSummary(RiveMetadata metadata) {
  final stateMachines = metadata.artboards.fold<int>(
    0,
    (count, artboard) => count + artboard.stateMachines.length,
  );
  final inputs = metadata.artboards.fold<int>(
    0,
    (count, artboard) =>
        count +
        artboard.stateMachines.fold<int>(
          0,
          (inner, stateMachine) => inner + stateMachine.inputs.length,
        ),
  );
  final animations = metadata.artboards.fold<int>(
    0,
    (count, artboard) => count + artboard.animations.length,
  );
  final viewModelProperties = metadata.viewModels.fold<int>(
    0,
    (count, viewModel) => count + viewModel.properties.length,
  );

  final buffer = StringBuffer()
    ..writeln('Rive metadata')
    ..writeln('source: ${metadata.source}')
    ..writeln('schemaVersion: ${metadata.schemaVersion}')
    ..writeln('status: ${metadata.status.name}')
    ..writeln(
      'runtimeVersion: ${metadata.header.majorVersion}.${metadata.header.minorVersion}',
    )
    ..writeln('artboards: ${metadata.artboards.length}')
    ..writeln('animations: $animations')
    ..writeln('stateMachines: $stateMachines')
    ..writeln('inputs: $inputs')
    ..writeln('viewModels: ${metadata.viewModels.length}')
    ..writeln('viewModelProperties: $viewModelProperties')
    ..writeln('warnings: ${metadata.warnings.length}')
    ..writeln(
      'codegen: flutter=${metadata.codegen.canGenerateFlutter}, '
      'typescript=${metadata.codegen.canGenerateTypeScript}',
    );

  if (metadata.warnings.isNotEmpty) {
    buffer.writeln('warningDetails:');
    for (final warning in metadata.warnings) {
      buffer.writeln(
        '- ${warning.severity.name} ${warning.code}: ${warning.message}',
      );
    }
  }

  return buffer.toString();
}

void _writeUsage(StringSink sink) {
  sink.writeln('Usage: rive-telemetry <command> [options] <file.riv>');
  sink.writeln('');
  sink.writeln('Commands:');
  sink.writeln('  inspect   Print a metadata summary, or JSON with --json');
  sink.writeln('  export    Export stable metadata JSON');
  sink.writeln('  generate  Generate integration helpers');
  sink.writeln('  debug     Print parser diagnostics');
}

void _writeInspectUsage(StringSink sink) {
  sink.writeln(
    'Usage: rive-telemetry inspect [--json] [--pretty|--compact] '
    '[--out metadata.json] <file.riv>',
  );
}

void _writeExportUsage(StringSink sink) {
  sink.writeln(
    'Usage: rive-telemetry export [--pretty|--compact] '
    '[--out metadata.json] <file.riv>',
  );
}

void _writeDebugUsage(StringSink sink) {
  sink.writeln('Usage: rive-telemetry debug <file.riv>');
}

void _writeGenerateUsage(StringSink sink) {
  sink.writeln(
    'Usage: rive-telemetry generate <flutter|typescript> '
    '[--out integration.dart|integration.ts] [--dry-run] <file.riv>',
  );
}

enum _GenerateTarget {
  flutter,
  typescript;

  static _GenerateTarget? parse(String value) {
    return switch (value) {
      'flutter' => _GenerateTarget.flutter,
      'typescript' || 'ts' || 'js' => _GenerateTarget.typescript,
      _ => null,
    };
  }
}

class _GeneratedSource {
  const _GeneratedSource({required this.source, required this.diagnostics});

  factory _GeneratedSource.fromFlutter(RiveFlutterGeneratedFile file) =>
      _GeneratedSource(source: file.source, diagnostics: file.diagnostics);

  factory _GeneratedSource.fromTypeScript(RiveTypeScriptGeneratedFile file) =>
      _GeneratedSource(source: file.source, diagnostics: file.diagnostics);

  final String source;
  final List<RiveCodegenDiagnostic> diagnostics;

  bool get hasErrors => diagnostics.any(
    (diagnostic) => diagnostic.severity == RiveCodegenDiagnosticSeverity.error,
  );
}

class _CliOptions {
  const _CliOptions({
    required this.paths,
    required this.json,
    required this.pretty,
    this.outputPath,
    this.dryRun = false,
    this.error,
  });

  final List<String> paths;
  final bool json;
  final bool pretty;
  final String? outputPath;
  final bool dryRun;
  final String? error;

  static _CliOptions parse(List<String> args, {required bool defaultPretty}) {
    var json = false;
    var pretty = defaultPretty;
    var dryRun = false;
    String? outputPath;
    String? error;
    final paths = <String>[];

    for (var index = 0; index < args.length; index++) {
      final arg = args[index];
      switch (arg) {
        case '--json':
          json = true;
        case '--pretty':
          pretty = true;
        case '--compact':
          pretty = false;
        case '--dry-run':
          dryRun = true;
        case '--out':
          if (index + 1 >= args.length) {
            error = 'Missing path after --out';
            break;
          }
          outputPath = args[++index];
        default:
          if (arg.startsWith('-')) {
            error = 'Unknown option: $arg';
          } else {
            paths.add(arg);
          }
      }
    }

    return _CliOptions(
      paths: paths,
      json: json,
      pretty: pretty,
      outputPath: outputPath,
      dryRun: dryRun,
      error: error,
    );
  }
}
