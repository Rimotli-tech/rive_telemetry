import 'dart:io';

import 'package:rive_telemetry_core/rive_telemetry_core.dart';

Future<void> main(List<String> args) async {
  final schemaDebug = args.contains('--schema-debug');
  final paths = args.where((arg) => arg != '--schema-debug').toList();

  if (paths.length != 1) {
    stderr.writeln(
      'Usage: dart run bin/rive_metadata_inspect.dart [--schema-debug] <file.riv>',
    );
    exitCode = 64;
    return;
  }

  try {
    if (schemaDebug) {
      stdout.write(await debugRivSchemaFile(paths.single));
    } else {
      final metadata = await inspectRivFile(paths.single);
      stdout.write(metadataToJson(metadata, pretty: false));
    }
  } on RiveInspectionException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  } on FormatException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
