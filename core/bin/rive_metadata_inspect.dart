import 'dart:io';

import 'package:rive_telemetry_core/rive_telemetry_core.dart';

Future<void> main(List<String> args) async {
  if (args.length != 1) {
    stderr.writeln('Usage: dart run bin/rive_metadata_inspect.dart <file.riv>');
    exitCode = 64;
    return;
  }

  try {
    final metadata = await inspectRivFile(args.single);
    stdout.write(metadataToJson(metadata, pretty: false));
  } on RiveInspectionException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  } on FormatException catch (error) {
    stderr.writeln(error);
    exitCode = 1;
  }
}
