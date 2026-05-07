import 'dart:io';
import 'dart:typed_data';

import 'binary_reader.dart';
import 'exceptions.dart';
import 'metadata.dart';
import 'rive_schema.dart';

class RiveInspector {
  const RiveInspector();

  Future<RiveMetadata> inspectFile(String path) async {
    final file = File(path);
    if (!await file.exists()) {
      throw RiveInspectionException('File does not exist: $path');
    }

    try {
      return inspectBytes(await file.readAsBytes(), source: path);
    } on RiveInspectionException {
      rethrow;
    } catch (error) {
      throw RiveInspectionException(
        'Failed to inspect .riv file',
        cause: error,
      );
    }
  }

  RiveMetadata inspectBytes(Uint8List bytes, {String source = '<memory>'}) {
    final parser = _RiveMetadataParser(bytes, source);
    return parser.parse();
  }
}

Future<RiveMetadata> inspectRivFile(String path) =>
    const RiveInspector().inspectFile(path);

RiveMetadata inspectRivBytes(Uint8List bytes, {String source = '<memory>'}) =>
    const RiveInspector().inspectBytes(bytes, source: source);

class _RiveMetadataParser {
  _RiveMetadataParser(Uint8List bytes, this.source)
    : _reader = RiveBinaryReader(bytes);

  final RiveBinaryReader _reader;
  final String source;
  final _warnings = <RiveInspectionWarning>[];
  late final _ParsedHeader _header;

  RiveMetadata parse() {
    _header = _readHeader();

    final records = <_RiveRecord>[];
    try {
      while (!_reader.isEOF) {
        records.add(_readRecord(records.length));
      }
    } on _UnsupportedProperty catch (error) {
      _warnings.add(
        RiveInspectionWarning(
          code: 'unsupportedProperty',
          message:
              'Stopped at unsupported property key ${error.propertyKey}. '
              'Parsed metadata before this point was kept.',
          offset: error.offset,
          propertyKey: error.propertyKey,
        ),
      );
    }

    return _buildMetadata(records);
  }

  _ParsedHeader _readHeader() {
    final fingerprint = String.fromCharCodes([
      _reader.readUint8(),
      _reader.readUint8(),
      _reader.readUint8(),
      _reader.readUint8(),
    ]);
    if (fingerprint != 'RIVE') {
      throw RiveInspectionException('Invalid .riv header fingerprint');
    }

    final majorVersion = _reader.readVarUint();
    final minorVersion = _reader.readVarUint();
    if (majorVersion != RiveSchema.supportedMajorVersion) {
      throw RiveInspectionException(
        'Unsupported .riv runtime major version $majorVersion',
        offset: _reader.offset,
      );
    }

    final fileId = _reader.readVarUint();
    final propertyKeys = <int>[];
    while (true) {
      final propertyKey = _reader.readVarUint();
      if (propertyKey == 0) {
        break;
      }
      propertyKeys.add(propertyKey);
    }

    final propertyFieldTypes = <int, RiveFieldType>{};
    var currentFieldSet = 0;
    for (var index = 0; index < propertyKeys.length; index++) {
      if (index & 15 == 0) {
        currentFieldSet = _reader.readUint32();
      }
      final fieldIndex = currentFieldSet & 0x3;
      currentFieldSet >>= 2;
      final fieldType = RiveSchema.fieldTypesByHeaderIndex[fieldIndex];
      if (fieldType != null) {
        propertyFieldTypes[propertyKeys[index]] = fieldType;
      }
    }

    return _ParsedHeader(
      majorVersion: majorVersion,
      minorVersion: minorVersion,
      fileId: fileId,
      propertyKeys: propertyKeys,
      propertyFieldTypes: propertyFieldTypes,
    );
  }

  _RiveRecord _readRecord(int index) {
    final recordOffset = _reader.offset;
    final typeKey = _reader.readVarUint();
    if (typeKey == 0) {
      return _RiveRecord(
        index: index,
        offset: recordOffset,
        typeKey: typeKey,
        typeName: null,
        properties: const {},
      );
    }

    final properties = <int, Object?>{};
    while (true) {
      final propertyKey = _reader.readVarUint();
      if (propertyKey == 0) {
        break;
      }
      properties[propertyKey] = _readPropertyValue(propertyKey);
    }

    return _RiveRecord(
      index: index,
      offset: recordOffset,
      typeKey: typeKey,
      typeName: RiveSchema.coreTypes[typeKey]?.name,
      properties: properties,
    );
  }

  Object? _readPropertyValue(int propertyKey) {
    final fieldType =
        RiveSchema.properties[propertyKey]?.type ??
        RiveSchema.corePropertyFieldTypes[propertyKey] ??
        _header.propertyFieldTypes[propertyKey];
    if (fieldType == null) {
      throw _UnsupportedProperty(propertyKey, _reader.offset);
    }

    switch (fieldType) {
      case RiveFieldType.uint:
        return _reader.readVarUint();
      case RiveFieldType.string:
        return _reader.readString();
      case RiveFieldType.float32:
        return _reader.readFloat32();
      case RiveFieldType.color:
        return _reader.readUint32();
      case RiveFieldType.bool:
        return _reader.readInt8() == 1;
      case RiveFieldType.bytes:
        return _reader.readBytes();
      case RiveFieldType.callback:
        return null;
    }
  }

  RiveMetadata _buildMetadata(List<_RiveRecord> records) {
    final artboards = <RiveArtboardMetadata>[];
    final viewModels = <RiveViewModelMetadata>[];
    RiveArtboardMetadata? currentArtboard;
    RiveStateMachineMetadata? currentStateMachine;

    for (final record in records) {
      switch (record.typeKey) {
        case RiveSchema.artboardTypeKey:
          currentArtboard = RiveArtboardMetadata(
            name: record.stringProperty(RiveSchema.componentNamePropertyKey),
            defaultStateMachineId: record.intProperty(
              RiveSchema.artboardDefaultStateMachineIdPropertyKey,
            ),
            viewModelId: record.intProperty(
              RiveSchema.artboardViewModelIdPropertyKey,
            ),
            animations: [],
            stateMachines: [],
            hierarchy: [],
          );
          artboards.add(currentArtboard);
          currentStateMachine = null;
        case RiveSchema.linearAnimationTypeKey:
          currentArtboard?.animations.add(_animationFromRecord(record));
          currentStateMachine = null;
        case RiveSchema.stateMachineTypeKey:
          final stateMachine = RiveStateMachineMetadata(
            name: record.stringProperty(RiveSchema.animationNamePropertyKey),
            inputs: [],
          );
          currentArtboard?.stateMachines.add(stateMachine);
          currentStateMachine = stateMachine;
        case RiveSchema.stateMachineNumberTypeKey:
          currentStateMachine?.inputs.add(
            RiveInputMetadata(
              name: record.stringProperty(
                RiveSchema.stateMachineComponentNamePropertyKey,
              ),
              type: RiveInputType.number,
              defaultValue: record.doubleProperty(
                RiveSchema.stateMachineNumberValuePropertyKey,
              ),
            ),
          );
        case RiveSchema.stateMachineBoolTypeKey:
          currentStateMachine?.inputs.add(
            RiveInputMetadata(
              name: record.stringProperty(
                RiveSchema.stateMachineComponentNamePropertyKey,
              ),
              type: RiveInputType.boolean,
              defaultValue: record.boolProperty(
                RiveSchema.stateMachineBoolValuePropertyKey,
              ),
            ),
          );
        case RiveSchema.stateMachineTriggerTypeKey:
          currentStateMachine?.inputs.add(
            RiveInputMetadata(
              name: record.stringProperty(
                RiveSchema.stateMachineComponentNamePropertyKey,
              ),
              type: RiveInputType.trigger,
            ),
          );
      }

      final componentName = record.stringProperty(
        RiveSchema.componentNamePropertyKey,
      );
      final parentId = record.intProperty(
        RiveSchema.componentParentIdPropertyKey,
      );
      if (currentArtboard != null &&
          (componentName != null || parentId != null) &&
          record.typeKey != RiveSchema.artboardTypeKey) {
        currentArtboard.hierarchy.add(
          RiveComponentMetadata(
            name: componentName,
            parentId: parentId,
            typeKey: record.typeKey,
            typeName: record.typeName,
          ),
        );
      }
    }

    return RiveMetadata(
      schemaVersion: riveMetadataSchemaVersion,
      source: source,
      header: RiveHeaderMetadata(
        majorVersion: _header.majorVersion,
        minorVersion: _header.minorVersion,
        fileId: _header.fileId,
        propertyKeyCount: _header.propertyKeys.length,
      ),
      artboards: artboards,
      viewModels: viewModels,
      recordCount: records.length,
      unknownRecordCount: records
          .where((record) => record.typeName == null)
          .length,
      warnings: List.unmodifiable(_warnings),
    );
  }

  RiveAnimationMetadata _animationFromRecord(_RiveRecord record) {
    final fps = record.intProperty(RiveSchema.animationFpsPropertyKey);
    final durationFrames = record.intProperty(
      RiveSchema.animationDurationPropertyKey,
    );
    return RiveAnimationMetadata(
      name: record.stringProperty(RiveSchema.animationNamePropertyKey),
      fps: fps,
      durationFrames: durationFrames,
      durationSeconds: fps != null && fps > 0 && durationFrames != null
          ? durationFrames / fps
          : null,
      speed: record.doubleProperty(RiveSchema.animationSpeedPropertyKey),
      loop: record.intProperty(RiveSchema.animationLoopPropertyKey),
    );
  }
}

class _ParsedHeader {
  const _ParsedHeader({
    required this.majorVersion,
    required this.minorVersion,
    required this.fileId,
    required this.propertyKeys,
    required this.propertyFieldTypes,
  });

  final int majorVersion;
  final int minorVersion;
  final int fileId;
  final List<int> propertyKeys;
  final Map<int, RiveFieldType> propertyFieldTypes;
}

class _RiveRecord {
  const _RiveRecord({
    required this.index,
    required this.offset,
    required this.typeKey,
    required this.typeName,
    required this.properties,
  });

  final int index;
  final int offset;
  final int typeKey;
  final String? typeName;
  final Map<int, Object?> properties;

  String? stringProperty(int key) {
    final value = properties[key];
    return value is String && value.isNotEmpty ? value : null;
  }

  int? intProperty(int key) {
    final value = properties[key];
    return value is int ? value : null;
  }

  double? doubleProperty(int key) {
    final value = properties[key];
    return value is double ? value : null;
  }

  bool? boolProperty(int key) {
    final value = properties[key];
    return value is bool ? value : null;
  }
}

class _UnsupportedProperty implements Exception {
  const _UnsupportedProperty(this.propertyKey, this.offset);

  final int propertyKey;
  final int offset;
}
