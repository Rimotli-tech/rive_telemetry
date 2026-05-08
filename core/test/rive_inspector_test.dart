import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:rive_telemetry_core/rive_telemetry_core.dart';
import 'package:test/test.dart';

void main() {
  final fixturePaths = [
    '../demo/assets/demo.riv',
    '../demo/assets/demo_2.riv',
    '../demo/assets/demo_2_v2.riv',
    '../demo/assets/demo_2_v3.riv',
    '../demo/assets/demo_3.riv',
    '../demo/assets/demo-new-1.riv',
    '../demo/assets/demo-new-2.riv',
  ];

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

  test('metadata JSON schema matches public contract constants', () {
    final schema = _metadataSchema();

    expect(schema[r'$id'], riveMetadataSchemaId);
    expect(
      (schema['properties'] as Map)['schemaVersion'],
      containsPair('const', riveMetadataSchemaVersion),
    );
    expect(riveMetadataMediaType, contains('schemaVersion=1'));
  });

  test('metadata JSON root keys match schema required keys', () async {
    final metadata = await inspectRivFile(fixturePaths.first);
    final schema = _metadataSchema();
    final required = ((schema['required'] as List).cast<String>()).toSet();
    final properties = ((schema['properties'] as Map).keys.cast<String>())
        .toSet();
    final actual = metadata.toJson().keys.toSet();

    expect(actual, required);
    expect(actual, properties);
  });

  test('metadata JSON enum values match schema definitions', () {
    final defs = _metadataSchema()[r'$defs'] as Map;

    expect(
      (defs['inspectionStatus'] as Map)['enum'],
      RiveInspectionStatus.values.map((value) => value.name).toList(),
    );
    expect(
      (defs['warningSeverity'] as Map)['enum'],
      RiveWarningSeverity.values.map((value) => value.name).toList(),
    );
    expect(
      (defs['viewModelPropertyType'] as Map)['enum'],
      RiveViewModelPropertyType.values.map((value) => value.name).toList(),
    );
  });

  test('all fixture metadata round trips through JSON contract', () async {
    for (final fixturePath in fixturePaths) {
      final metadata = await inspectRivFile(fixturePath);
      final decoded = metadataFromJson(metadataToJson(metadata));

      expect(
        jsonEncode(decoded.toJson()),
        jsonEncode(metadata.toJson()),
        reason: fixturePath,
      );
    }
  });

  test('metadata decoder rejects unsupported schema versions', () {
    final json = metadataToJson(
      RiveMetadata(
        schemaVersion: 1,
        source: 'memory.riv',
        status: RiveInspectionStatus.complete,
        completeness: const RiveMetadataCompleteness(
          artboardsComplete: true,
          stateMachinesComplete: true,
          inputsComplete: true,
          viewModelsComplete: true,
          viewModelInstancesComplete: true,
          animationsComplete: true,
        ),
        codegen: const RiveCodegenEligibility(
          canGenerateFlutter: true,
          canGenerateTypeScript: true,
          blockedReasons: [],
          warnings: [],
        ),
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
    'captures warnings instead of crashing on unsupported property data',
    () async {
      final bytes = Uint8List.fromList([
        ...'RIVE'.codeUnits,
        ..._varUint(7),
        ..._varUint(0),
        ..._varUint(1),
        ..._varUint(0),
        ..._varUint(12345),
        ..._varUint(999),
        ..._varUint(1),
        ..._varUint(0),
      ]);

      final metadata = inspectRivBytes(bytes, source: 'unsupported.riv');

      expect(metadata.warnings, isNotEmpty);
      expect(metadata.warnings.first.code, 'unsupportedProperty');
    },
  );

  test('schema debug reports ViewModel diagnostics', () async {
    final report = await debugRivSchemaFile('../demo/assets/demo_2.riv');

    expect(report, contains('result: parsed with 1 warning(s)'));
    expect(report, contains('propertyReadFailure'));
    expect(report, contains('ViewModel diagnostics'));
    expect(report, contains('CatViewModel'));
    expect(report, contains('ViewModelPropertyTrigger'));
    expect(report, contains('ViewModelInstanceTrigger'));
    expect(report, contains('Raw records in ViewModel span'));
  });

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

  test('all repo fixtures produce usable integration metadata', () async {
    for (final fixturePath in fixturePaths) {
      final metadata = await inspectRivFile(fixturePath);

      expect(
        metadata.status,
        isNot(RiveInspectionStatus.failed),
        reason: fixturePath,
      );
      expect(metadata.artboards, isNotEmpty, reason: fixturePath);
      expect(
        metadata.artboards.expand((artboard) => artboard.animations),
        isNotEmpty,
        reason: fixturePath,
      );
      expect(
        metadata.artboards.expand((artboard) => artboard.stateMachines),
        isNotEmpty,
        reason: fixturePath,
      );
      expect(metadata.completeness.artboardsComplete, isTrue);
      expect(metadata.completeness.animationsComplete, isTrue);
      expect(metadata.completeness.stateMachinesComplete, isTrue);
      expect(metadata.completeness.viewModelsComplete, isTrue);
      expect(metadata.completeness.viewModelInstancesComplete, isTrue);
      expect(metadata.codegen.canGenerateFlutter, isTrue, reason: fixturePath);
      expect(
        metadata.codegen.canGenerateTypeScript,
        isTrue,
        reason: fixturePath,
      );
      expect(metadata.codegen.blockedReasons, isEmpty, reason: fixturePath);
      expect(
        metadata.warnings
            .where(
              (warning) =>
                  warning.severity == RiveWarningSeverity.integrationRisk ||
                  warning.severity == RiveWarningSeverity.fatal,
            )
            .map((warning) => warning.code),
        isEmpty,
        reason: fixturePath,
      );
    }
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

  test('extracts ViewModels, properties, instances, and values', () {
    final bytes = Uint8List.fromList([
      ...'RIVE'.codeUnits,
      ..._varUint(7),
      ..._varUint(0),
      ..._varUint(1),
      ..._varUint(0),
      ..._varUint(435),
      ..._varUint(557),
      ..._string('CatViewModel'),
      ..._varUint(564),
      ..._varUint(0),
      ..._varUint(0),
      ..._varUint(431),
      ..._varUint(557),
      ..._string('idleHeadRotation'),
      ..._varUint(0),
      ..._varUint(437),
      ..._varUint(4),
      ..._string('catVMInstance'),
      ..._varUint(566),
      ..._varUint(0),
      ..._varUint(0),
      ..._varUint(442),
      ..._varUint(554),
      ..._varUint(0),
      ..._varUint(575),
      ..._float32(0.42),
      ..._varUint(0),
    ]);

    final metadata = inspectRivBytes(bytes, source: 'viewmodel.riv');

    expect(metadata.viewModels, hasLength(1));
    final viewModel = metadata.viewModels.single;
    expect(viewModel.id, 0);
    expect(viewModel.name, 'CatViewModel');
    expect(viewModel.defaultInstanceId, 0);
    expect(viewModel.properties, hasLength(1));
    expect(viewModel.properties.single.id, 0);
    expect(viewModel.properties.single.name, 'idleHeadRotation');
    expect(viewModel.properties.single.type, RiveViewModelPropertyType.number);
    expect(viewModel.instances, hasLength(1));
    expect(viewModel.instances.single.id, 0);
    expect(viewModel.instances.single.name, 'catVMInstance');
    expect(viewModel.instances.single.viewModelId, 0);
    expect(viewModel.instances.single.values, hasLength(1));
    final value = viewModel.instances.single.values.single;
    expect(value.id, 0);
    expect(value.propertyId, 0);
    expect(value.propertyName, 'idleHeadRotation');
    expect(value.type, RiveViewModelPropertyType.number);
    expect(value.value, closeTo(0.42, 0.00001));
  });

  test(
    'extracts complete demo_3 ViewModel properties and instance values',
    () async {
      final metadata = await inspectRivFile('../demo/assets/demo_3.riv');

      expect(metadata.status, RiveInspectionStatus.partialUsable);
      expect(metadata.completeness.artboardsComplete, isTrue);
      expect(metadata.completeness.viewModelsComplete, isTrue);
      expect(metadata.completeness.viewModelInstancesComplete, isTrue);
      expect(metadata.codegen.canGenerateFlutter, isTrue);
      expect(metadata.codegen.canGenerateTypeScript, isTrue);
      expect(metadata.codegen.blockedReasons, isEmpty);
      expect(metadata.codegen.warnings, isEmpty);
      expect(
        metadata.artboards.map((artboard) => artboard.name),
        contains('MainArtboard'),
      );
      expect(
        metadata.artboards.expand((artboard) => artboard.animations).length,
        greaterThanOrEqualTo(30),
      );
      expect(
        metadata.artboards.expand((artboard) => artboard.stateMachines).length,
        greaterThanOrEqualTo(4),
      );
      expect(
        metadata.artboards
            .expand((artboard) => artboard.stateMachines)
            .map((stateMachine) => stateMachine.name),
        contains('MainStateMachine'),
      );

      final viewModel = metadata.viewModels.singleWhere(
        (viewModel) => viewModel.name == 'ViewModel1',
      );
      expect(viewModel.properties.length, 20);
      expect(
        viewModel.properties
            .where(
              (property) => property.type == RiveViewModelPropertyType.trigger,
            )
            .map((property) => property.name),
        containsAll([
          'confetti',
          'spin',
          'pointAtUser',
          'puffCheeks',
          'mock',
          'eyeRoll',
          'nod',
          'headShake',
          'waveHand',
        ]),
      );
      final instance = viewModel.instances.single;
      expect(instance.values, hasLength(20));
      expect(
        instance.values
            .where((value) => value.propertyName == null)
            .map((value) => value.propertyId),
        isEmpty,
      );
      expect(
        instance.values
            .singleWhere((value) => value.propertyName == 'mood')
            .type,
        RiveViewModelPropertyType.number,
      );

      final unsupportedThemeWarning = metadata.warnings.singleWhere(
        (warning) =>
            warning.code == 'unsupportedProperty' &&
            warning.objectTypeKey == 626 &&
            warning.objectName == 'themeColor',
      );
      expect(unsupportedThemeWarning.severity, RiveWarningSeverity.warning);
      expect(
        metadata.warnings.map((warning) => warning.code),
        isNot(contains('unresolvedViewModelInstanceValue')),
      );
      expect(
        metadata.warnings.map((warning) => warning.code),
        isNot(contains('viewModelInstanceTypeMismatch')),
      );
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

List<int> _float32(double value) {
  final data = ByteData(4)..setFloat32(0, value, Endian.little);
  return data.buffer.asUint8List().toList();
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

Map<String, Object?> _metadataSchema() {
  final decoded = jsonDecode(
    File('schema/rive_metadata.schema.json').readAsStringSync(),
  );
  return (decoded as Map).cast<String, Object?>();
}
