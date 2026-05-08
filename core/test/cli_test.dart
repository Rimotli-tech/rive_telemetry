import 'dart:convert';
import 'dart:io';

import 'package:rive_telemetry_core/src/cli.dart';
import 'package:test/test.dart';

void main() {
  const fixture = '../demo/assets/demo-new-1.riv';

  test('inspect prints a human-readable metadata summary', () async {
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['inspect', fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(err.toString(), isEmpty);
    expect(out.toString(), contains('Rive metadata'));
    expect(out.toString(), contains('artboards: 2'));
    expect(out.toString(), contains('viewModels: 1'));
    expect(out.toString(), contains('codegen: flutter=true'));
  });

  test('inspect --json prints compact stable metadata JSON', () async {
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['inspect', '--json', fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(err.toString(), isEmpty);
    expect(out.toString(), isNot(contains('\n')));
    final decoded = jsonDecode(out.toString()) as Map<String, Object?>;
    expect(decoded['schemaVersion'], 1);
    expect(decoded['status'], 'complete');
  });

  test('export prints pretty metadata JSON by default', () async {
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['export', fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(err.toString(), isEmpty);
    expect(out.toString(), contains('\n  "schemaVersion": 1'));
  });

  test('export --out writes metadata JSON to disk', () async {
    final temp = await Directory.systemTemp.createTemp('rive_cli_test_');
    addTearDown(() => temp.deleteSync(recursive: true));
    final output = '${temp.path}${Platform.pathSeparator}metadata.json';
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['export', '--compact', '--out', output, fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(out.toString(), isEmpty);
    expect(err.toString(), isEmpty);
    final decoded =
        jsonDecode(File(output).readAsStringSync()) as Map<String, Object?>;
    expect(decoded['schemaVersion'], 1);
  });

  test('generate flutter writes integration source to disk', () async {
    final temp = await Directory.systemTemp.createTemp('rive_cli_test_');
    addTearDown(() => temp.deleteSync(recursive: true));
    final output = '${temp.path}${Platform.pathSeparator}integration.dart';
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['generate', 'flutter', '--out', output, fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(out.toString(), isEmpty);
    final source = File(output).readAsStringSync();
    expect(source, contains('Generated from demo-new-1.riv'));
    expect(source, contains('RtNumber'));
  });

  test('debug prints parser diagnostics', () async {
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['debug', fixture],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 0);
    expect(err.toString(), isEmpty);
    expect(out.toString(), contains('Rive schema debug'));
    expect(out.toString(), contains('ViewModel diagnostics'));
  });

  test('unknown commands return usage error', () async {
    final out = StringBuffer();
    final err = StringBuffer();

    final code = await runRiveTelemetryCli(
      ['wat'],
      stdoutSink: out,
      stderrSink: err,
    );

    expect(code, 64);
    expect(out.toString(), isEmpty);
    expect(err.toString(), contains('Unknown command: wat'));
    expect(err.toString(), contains('Usage: rive-telemetry'));
  });
}
