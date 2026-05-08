import 'dart:io';

import 'package:rive_telemetry_core/rive_telemetry_core.dart';

Future<void> main(List<String> args) async {
  final schemaDebug = args.contains('--schema-debug');
  final pretty = args.contains('--pretty');
  final compact = args.contains('--compact');
  String? outputPath;
  final paths = <String>[];
  for (var index = 0; index < args.length; index++) {
    final arg = args[index];
    if (arg == '--schema-debug' || arg == '--pretty' || arg == '--compact') {
      continue;
    }
    if (arg == '--out') {
      if (index + 1 >= args.length) {
        stderr.writeln('Missing path after --out');
        exitCode = 64;
        return;
      }
      outputPath = args[++index];
      continue;
    }
    paths.add(arg);
  }

  if (paths.length != 1) {
    stderr.writeln(
      'Usage: dart run bin/rive_metadata_inspect.dart '
      '[--schema-debug] [--pretty|--compact] [--out metadata.json] <file.riv>',
    );
    exitCode = 64;
    return;
  }

  try {
    if (schemaDebug) {
      stdout.write(await debugRivSchemaFile(paths.single));
    } else {
      final metadata = await inspectRivFile(paths.single);
      final json = metadataToJson(metadata, pretty: pretty && !compact);
      if (outputPath == null) {
        stdout.write(json);
      } else {
        await File(outputPath).writeAsString(json);
      }
    }
  } on RiveInspectionException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  } on FormatException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
