import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  final fixturePaths = ['../demo/assets/demo.riv', '../demo/assets/demo_2.riv'];

  test('extracts schema metadata from repo fixtures', () async {
    final metadata = <RiveMetadata>[];
    for (final fixturePath in fixturePaths) {
      metadata.add(await inspectRivFile(fixturePath));
    }

    expect(metadata.expand((item) => item.artboards), isNotEmpty);
    expect(
      metadata
          .expand((item) => item.artboards)
          .expand((item) => item.animations),
      isNotEmpty,
    );
    expect(
      metadata
          .expand((item) => item.artboards)
          .expand((item) => item.stateMachines),
      isNotEmpty,
    );
    expect(
      metadata
          .expand((item) => item.artboards)
          .expand((item) => item.stateMachines)
          .expand((item) => item.inputs),
      isNotEmpty,
    );
  });

  test('exports deterministic stable JSON', () async {
    final first = await inspectRivFile(fixturePaths.first);
    final second = await inspectRivFile(fixturePaths.first);

    expect(first.schemaVersion, 1);
    expect(jsonEncode(first.toJson()), jsonEncode(second.toJson()));
    expect(metadataToJson(first), contains('"schemaVersion": 1'));
    expect(metadataToJson(first, pretty: false), isNot(contains('\n')));
  });

  test('metadata JSON round trips through the stable contract', () async {
    final metadata = await inspectRivFile(fixturePaths.first);
    final encoded = metadataToJson(metadata);
    final decoded = metadataFromJson(encoded);

    expect(jsonEncode(decoded.toJson()), jsonEncode(metadata.toJson()));
  });

  test('metadata decoder rejects unsupported schema versions', () {
    final json = metadataToJson(
      RiveMetadata(
        schemaVersion: 1,
        source: 'memory.riv',
        header: const RiveHeaderMetadata(
          majorVersion: 7,
          minorVersion: 0,
          fileId: 1,
          propertyKeyCount: 0,
        ),
        artboards: [],
        viewModels: [],
        recordCount: 0,
        unknownRecordCount: 0,
        warnings: [],
      ),
    ).replaceFirst('"schemaVersion": 1', '"schemaVersion": 999');

    expect(() => metadataFromJson(json), throwsA(isA<FormatException>()));
  });

  test(
    'captures warnings instead of crashing on unsupported record data',
    () async {
      final metadata = await inspectRivFile(fixturePaths.last);

      expect(metadata.warnings, isNotEmpty);
      expect(metadata.warnings.first.code, 'unsupportedProperty');
    },
  );

  test('missing files throw RiveInspectionException', () async {
    expect(
      inspectRivFile('missing-file.riv'),
      throwsA(isA<RiveInspectionException>()),
    );
  });

  test('invalid files throw RiveInspectionException', () {
    expect(
      () => inspectRivBytes(Uint8List.fromList([0, 1, 2, 3])),
      throwsA(isA<RiveInspectionException>()),
    );
  });

  test(
    'unknown records with known header field types are traversed safely',
    () {
      final bytes = Uint8List.fromList([
        ...'RIVE'.codeUnits,
        ..._varUint(7),
        ..._varUint(0),
        ..._varUint(1),
        ..._varUint(999),
        ..._varUint(0),
        1,
        0,
        0,
        0,
        ..._varUint(12345),
        ..._varUint(999),
        ..._string('hello'),
        ..._varUint(0),
      ]);

      final metadata = inspectRivBytes(bytes, source: 'synthetic.riv');

      expect(metadata.recordCount, 1);
      expect(metadata.unknownRecordCount, 1);
      expect(metadata.artboards, isEmpty);
      expect(metadata.warnings, isEmpty);
    },
  );

  test('repo fixtures exist for schema coverage', () {
    for (final fixturePath in fixturePaths) {
      expect(File(fixturePath).existsSync(), isTrue);
    }
  });
}

List<int> _string(String value) {
  final bytes = utf8.encode(value);
  return [..._varUint(bytes.length), ...bytes];
}

List<int> _varUint(int value) {
  final bytes = <int>[];
  var remaining = value;
  do {
    var byte = remaining & 0x7f;
    remaining >>= 7;
    if (remaining != 0) {
      byte |= 0x80;
    }
    bytes.add(byte);
  } while (remaining != 0);
  return bytes;
}
