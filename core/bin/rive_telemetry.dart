import 'dart:io';

import 'package:rive_telemetry_core/src/cli.dart';

Future<void> main(List<String> args) async {
  exitCode = await runRiveTelemetryCli(args);
}
