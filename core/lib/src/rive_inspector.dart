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

  Future<String> debugSchemaFile(String path) async {
    final file = File(path);
    if (!await file.exists()) {
      throw RiveInspectionException('File does not exist: $path');
    }

    try {
      return debugSchemaBytes(await file.readAsBytes(), source: path);
    } on RiveInspectionException {
      rethrow;
    } catch (error) {
      throw RiveInspectionException(
        'Failed to inspect .riv file schema',
        cause: error,
      );
    }
  }

  String debugSchemaBytes(Uint8List bytes, {String source = '<memory>'}) {
    final parser = _RiveMetadataParser(bytes, source);
    return parser.debugSchema();
  }
}

Future<RiveMetadata> inspectRivFile(String path) =>
    const RiveInspector().inspectFile(path);

RiveMetadata inspectRivBytes(Uint8List bytes, {String source = '<memory>'}) =>
    const RiveInspector().inspectBytes(bytes, source: source);

Future<String> debugRivSchemaFile(String path) =>
    const RiveInspector().debugSchemaFile(path);

String debugRivSchemaBytes(Uint8List bytes, {String source = '<memory>'}) =>
    const RiveInspector().debugSchemaBytes(bytes, source: source);

class _RiveMetadataParser {
  _RiveMetadataParser(Uint8List bytes, this.source)
    : _bytes = bytes,
      _reader = RiveBinaryReader(bytes);

  final Uint8List _bytes;
  final RiveBinaryReader _reader;
  final String source;
  final _warnings = <RiveInspectionWarning>[];
  late final _ParsedHeader _header;

  RiveMetadata parse() {
    _header = _readHeader();

    final records = _parseRecords();
    return _buildMetadata(records);
  }

  List<_RiveRecord> _parseRecords() {
    final records = <_RiveRecord>[];
    while (!_reader.isEOF) {
      try {
        records.add(_readRecord(records.length));
      } on _UnsupportedProperty catch (error) {
        final recoveryOffset = _findNextMetadataRecordOffset(
          error.valueOffset ?? error.offset,
        );
        _warnings.add(
          RiveInspectionWarning(
            code: 'unsupportedProperty',
            severity: RiveWarningSeverity.warning,
            message: recoveryOffset == null
                ? 'Stopped at unsupported property key ${error.propertyKey}. '
                      'Parsed metadata before this point was kept.'
                : 'Skipped unsupported property key ${error.propertyKey} on '
                      'object ${error.typeKey} and resumed at offset '
                      '$recoveryOffset.',
            offset: error.offset,
            propertyKey: error.propertyKey,
            objectTypeKey: error.typeKey,
            objectTypeName: error.typeName,
            objectName: error.objectName,
          ),
        );
        if (recoveryOffset == null || recoveryOffset <= _reader.offset) {
          break;
        }
        _reader.seek(recoveryOffset);
      } on _PropertyReadFailure catch (error) {
        final recoveryOffset = _findNextMetadataRecordOffset(error.valueOffset);
        _warnings.add(
          RiveInspectionWarning(
            code: 'propertyReadFailure',
            severity: RiveWarningSeverity.warning,
            message: recoveryOffset == null
                ? 'Stopped after property ${error.propertyKey} failed to read: '
                      '${error.cause}.'
                : 'Skipped unreadable property ${error.propertyKey} on object '
                      '${error.typeKey} and resumed at offset $recoveryOffset.',
            offset: error.offset,
            propertyKey: error.propertyKey,
            objectTypeKey: error.typeKey,
            objectTypeName: error.typeName,
            objectName: error.objectName,
          ),
        );
        if (recoveryOffset == null || recoveryOffset <= _reader.offset) {
          break;
        }
        _reader.seek(recoveryOffset);
      }
    }
    return records;
  }

  String debugSchema() {
    _header = _readHeader();

    final records = <_RiveRecord>[];
    try {
      records.addAll(_parseRecords());
    } on _UnsupportedProperty catch (error) {
      return _formatSchemaDebugReport(error, records);
    } on _PropertyReadFailure catch (error) {
      return _formatPropertyReadFailureReport(error, records);
    }

    final metadata = _buildMetadata(records);
    final buffer = StringBuffer()
      ..writeln('Rive schema debug')
      ..writeln('source: $source')
      ..writeln(
        'header: ${metadata.header.majorVersion}.${metadata.header.minorVersion}, '
        'fileId=${metadata.header.fileId}, '
        'propertyKeyCount=${metadata.header.propertyKeyCount}',
      )
      ..writeln(
        metadata.warnings.isEmpty
            ? 'result: parsed without warnings'
            : 'result: parsed with ${metadata.warnings.length} warning(s)',
      )
      ..writeln('records: ${metadata.recordCount}')
      ..writeln('artboards: ${metadata.artboards.length}')
      ..writeln('viewModels: ${metadata.viewModels.length}')
      ..writeln('warnings:')
      ..writeln(_formatWarningDiagnostics(metadata.warnings))
      ..writeln()
      ..writeln(_formatViewModelDiagnostics(records, metadata));
    return buffer.toString();
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
      final valueOffset = _reader.offset;
      try {
        properties[propertyKey] = _readPropertyValue(propertyKey);
      } on _UnsupportedProperty catch (error) {
        throw error.withRecordContext(
          recordIndex: index,
          recordOffset: recordOffset,
          typeKey: typeKey,
          typeName: RiveSchema.coreTypes[typeKey]?.name,
          propertiesRead: Map.unmodifiable(properties),
          previousPropertyKeys: List.unmodifiable(properties.keys),
          valueOffset: valueOffset,
        );
      } catch (error) {
        throw _PropertyReadFailure(
          propertyKey: propertyKey,
          offset: valueOffset,
          recordIndex: index,
          recordOffset: recordOffset,
          typeKey: typeKey,
          typeName: RiveSchema.coreTypes[typeKey]?.name,
          propertiesRead: Map.unmodifiable(properties),
          previousPropertyKeys: List.unmodifiable(properties.keys),
          valueOffset: valueOffset,
          cause: error,
        );
      }
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
    final viewModelBuilders = <int, _ViewModelBuilder>{};
    RiveArtboardMetadata? currentArtboard;
    RiveStateMachineMetadata? currentStateMachine;
    _ViewModelBuilder? currentViewModel;
    _ViewModelInstanceBuilder? currentViewModelInstance;

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
        case RiveSchema.viewModelTypeKey:
          final viewModelId = viewModelBuilders.length;
          currentViewModel = _ViewModelBuilder(
            id: viewModelId,
            name: record.stringProperty(
              RiveSchema.viewModelComponentNamePropertyKey,
            ),
            typeKey: record.typeKey,
            defaultInstanceId: record.intProperty(
              RiveSchema.viewModelDefaultInstanceIdPropertyKey,
            ),
          );
          viewModelBuilders[viewModelId] = currentViewModel;
          currentViewModelInstance = null;
        case RiveSchema.viewModelPropertyNumberTypeKey:
        case RiveSchema.viewModelPropertyStringTypeKey:
        case RiveSchema.viewModelPropertyBooleanTypeKey:
        case RiveSchema.viewModelPropertyColorTypeKey:
        case RiveSchema.viewModelPropertyTriggerTypeKey:
        case RiveSchema.viewModelPropertyEnumTypeKey:
        case RiveSchema.viewModelPropertyListTypeKey:
        case RiveSchema.viewModelPropertyViewModelTypeKey:
          final viewModel = currentViewModel;
          if (viewModel != null) {
            viewModel.properties.add(
              _viewModelPropertyFromRecord(
                record,
                id: viewModel.properties.length,
              ),
            );
          }
        case RiveSchema.viewModelInstanceTypeKey:
          final viewModelId = record.intProperty(
            RiveSchema.viewModelInstanceViewModelIdPropertyKey,
          );
          final viewModel = viewModelBuilders[viewModelId] ?? currentViewModel;
          final instance = _ViewModelInstanceBuilder(
            id: viewModel?.instances.length ?? record.index,
            name: record.stringProperty(RiveSchema.componentNamePropertyKey),
            viewModelId: viewModelId,
          );
          viewModel?.instances.add(instance);
          currentViewModelInstance = instance;
        case RiveSchema.viewModelInstanceNumberTypeKey:
        case RiveSchema.viewModelInstanceStringTypeKey:
        case RiveSchema.viewModelInstanceBooleanTypeKey:
        case RiveSchema.viewModelInstanceColorTypeKey:
        case RiveSchema.viewModelInstanceTriggerTypeKey:
        case RiveSchema.viewModelInstanceEnumTypeKey:
        case RiveSchema.viewModelInstanceListTypeKey:
        case RiveSchema.viewModelInstanceViewModelTypeKey:
          final instanceViewModel =
              currentViewModelInstance?.viewModelId == null
              ? null
              : viewModelBuilders[currentViewModelInstance!.viewModelId];
          currentViewModelInstance?.values.add(
            _viewModelInstanceValueFromRecord(
              record,
              instanceViewModel,
              id: currentViewModelInstance.values.length,
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

    final viewModels = viewModelBuilders.values
        .map((builder) => builder.toMetadata())
        .toList();
    _addIntegrationWarnings(artboards, viewModels);
    final completeness = _completenessFor(artboards, viewModels);
    final status = _statusFor(artboards, viewModels);
    final codegen = _codegenFor(artboards, viewModels, status);

    return RiveMetadata(
      schemaVersion: riveMetadataSchemaVersion,
      source: source,
      status: status,
      completeness: completeness,
      codegen: codegen,
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

  void _addIntegrationWarnings(
    List<RiveArtboardMetadata> artboards,
    List<RiveViewModelMetadata> viewModels,
  ) {
    for (final viewModel in viewModels) {
      final propertiesById = {
        for (final property in viewModel.properties) property.id: property,
      };
      for (final instance in viewModel.instances) {
        for (final value in instance.values) {
          final property = value.propertyId == null
              ? null
              : propertiesById[value.propertyId];
          if (property == null) {
            _warnings.add(
              RiveInspectionWarning(
                code: 'unresolvedViewModelInstanceValue',
                severity: RiveWarningSeverity.integrationRisk,
                message:
                    'ViewModel "${viewModel.name ?? viewModel.id}" instance '
                    '"${instance.name ?? instance.id}" has a value for unresolved '
                    'property id ${value.propertyId}. Generated property '
                    'accessors can still be created, but instance defaults may '
                    'be incomplete.',
              ),
            );
          } else if (property.type != value.type) {
            _warnings.add(
              RiveInspectionWarning(
                code: 'viewModelInstanceTypeMismatch',
                severity: RiveWarningSeverity.integrationRisk,
                message:
                    'ViewModel "${viewModel.name ?? viewModel.id}" instance '
                    '"${instance.name ?? instance.id}" reports '
                    '${value.type.name} for "${property.name ?? property.id}", '
                    'but the property definition is ${property.type.name}.',
              ),
            );
          }
        }
      }
    }

    if (artboards.isEmpty && viewModels.isEmpty && _warnings.isNotEmpty) {
      _warnings.add(
        const RiveInspectionWarning(
          code: 'noIntegrationMetadataExtracted',
          severity: RiveWarningSeverity.fatal,
          message:
              'Inspection stopped before artboards or ViewModels could be extracted.',
        ),
      );
    }
  }

  RiveMetadataCompleteness _completenessFor(
    List<RiveArtboardMetadata> artboards,
    List<RiveViewModelMetadata> viewModels,
  ) {
    final failed =
        artboards.isEmpty &&
        viewModels.isEmpty &&
        _warnings.any(
          (warning) => warning.severity == RiveWarningSeverity.fatal,
        );
    final viewModelInstanceRisk = _warnings.any(
      (warning) =>
          warning.code == 'unresolvedViewModelInstanceValue' ||
          warning.code == 'viewModelInstanceTypeMismatch',
    );
    final basicComplete = !failed;
    return RiveMetadataCompleteness(
      artboardsComplete: basicComplete && artboards.isNotEmpty,
      stateMachinesComplete: basicComplete && artboards.isNotEmpty,
      inputsComplete: basicComplete && artboards.isNotEmpty,
      viewModelsComplete: basicComplete,
      viewModelInstancesComplete: basicComplete && !viewModelInstanceRisk,
      animationsComplete: basicComplete && artboards.isNotEmpty,
    );
  }

  RiveInspectionStatus _statusFor(
    List<RiveArtboardMetadata> artboards,
    List<RiveViewModelMetadata> viewModels,
  ) {
    if (_warnings.any(
      (warning) => warning.severity == RiveWarningSeverity.fatal,
    )) {
      return RiveInspectionStatus.failed;
    }
    if (_warnings.any(
      (warning) => warning.severity == RiveWarningSeverity.integrationRisk,
    )) {
      return RiveInspectionStatus.partialWithIntegrationRisk;
    }
    if (_warnings.isNotEmpty) {
      return RiveInspectionStatus.partialUsable;
    }
    return RiveInspectionStatus.complete;
  }

  RiveCodegenEligibility _codegenFor(
    List<RiveArtboardMetadata> artboards,
    List<RiveViewModelMetadata> viewModels,
    RiveInspectionStatus status,
  ) {
    final blockedReasons = <String>[];
    final codegenWarnings = <String>[];
    if (status == RiveInspectionStatus.failed) {
      blockedReasons.add(
        'Inspection failed before integration metadata was available.',
      );
    }
    if (artboards.isEmpty && viewModels.isEmpty) {
      blockedReasons.add('No artboards or ViewModels were extracted.');
    }
    for (final warning in _warnings) {
      if (warning.severity == RiveWarningSeverity.integrationRisk) {
        codegenWarnings.add(warning.message);
      }
    }
    final canGenerate = blockedReasons.isEmpty;
    return RiveCodegenEligibility(
      canGenerateFlutter: canGenerate,
      canGenerateTypeScript: canGenerate,
      blockedReasons: blockedReasons,
      warnings: codegenWarnings,
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

  String _formatSchemaDebugReport(
    _UnsupportedProperty error,
    List<_RiveRecord> records,
  ) {
    final propertiesRead = error.propertiesRead ?? const <int, Object?>{};
    final objectName =
        _stringFrom(propertiesRead, RiveSchema.componentNamePropertyKey) ??
        _stringFrom(propertiesRead, RiveSchema.animationNamePropertyKey) ??
        _stringFrom(
          propertiesRead,
          RiveSchema.stateMachineComponentNamePropertyKey,
        ) ??
        _stringFrom(
          propertiesRead,
          RiveSchema.viewModelComponentNamePropertyKey,
        );
    final parentId = _intFrom(
      propertiesRead,
      RiveSchema.componentParentIdPropertyKey,
    );
    final headerFieldType = _header.propertyFieldTypes[error.propertyKey];
    final schemaFieldType = RiveSchema.properties[error.propertyKey]?.type;
    final skipFieldType = RiveSchema.corePropertyFieldTypes[error.propertyKey];
    final encodedFieldType = schemaFieldType != null
        ? 'vendored semantic schema: ${schemaFieldType.name}'
        : skipFieldType != null
        ? 'vendored skip map: ${skipFieldType.name}'
        : headerFieldType != null
        ? 'file header: ${headerFieldType.name}'
        : 'unknown; key is absent from vendored schema, skip map, and file header';
    final previousKeys = error.previousPropertyKeys ?? const <int>[];
    final valueOffset = error.valueOffset ?? error.offset;
    final rawStart = (valueOffset - 16).clamp(0, _bytes.length).toInt();
    final rawEnd = (valueOffset + 48).clamp(0, _bytes.length).toInt();
    final followingCandidates = _readVarUintCandidates(valueOffset, 8);
    final parentRecord =
        parentId == null || parentId < 0 || parentId >= records.length
        ? null
        : records[parentId];

    final buffer = StringBuffer()
      ..writeln('Rive schema debug')
      ..writeln('source: $source')
      ..writeln(
        'header: ${_header.majorVersion}.${_header.minorVersion}, '
        'fileId=${_header.fileId}, '
        'propertyKeyCount=${_header.propertyKeys.length}',
      )
      ..writeln()
      ..writeln('Unsupported property')
      ..writeln('- object/core type id: ${error.typeKey ?? 'unknown'}')
      ..writeln('- object/core type name: ${error.typeName ?? 'unknown'}')
      ..writeln('- object record index: ${error.recordIndex ?? 'unknown'}')
      ..writeln('- object record offset: ${_formatOffset(error.recordOffset)}')
      ..writeln('- object name if known: ${objectName ?? 'unknown'}')
      ..writeln('- property key: ${error.propertyKey}')
      ..writeln('- property key offset: ${_formatOffset(error.offset)}')
      ..writeln('- property value offset: ${_formatOffset(error.valueOffset)}')
      ..writeln('- encoded field type: $encodedFieldType')
      ..writeln(
        '- surrounding property keys: previous=[${previousKeys.join(', ')}], '
        'next-varuint-candidates=[${followingCandidates.join(', ')}]',
      )
      ..writeln(
        '- raw bytes span: ${_formatOffset(rawStart)}..${_formatOffset(rawEnd)}',
      )
      ..writeln(_formatHexSpan(rawStart, rawEnd))
      ..writeln()
      ..writeln('Parent relationship')
      ..writeln(
        '- parent id property: ${parentId ?? 'not present before failure'}',
      )
      ..writeln(
        '- parent object: ${parentRecord == null ? 'unknown' : '${parentRecord.index} '
                  'type=${parentRecord.typeKey} '
                  'name=${parentRecord.typeName ?? 'unknown'} '
                  'objectName=${_recordName(parentRecord) ?? 'unknown'}'}',
      )
      ..writeln()
      ..writeln('Records parsed before failure: ${records.length}');
    return buffer.toString();
  }

  String _formatPropertyReadFailureReport(
    _PropertyReadFailure error,
    List<_RiveRecord> records,
  ) {
    final propertiesRead = error.propertiesRead;
    final objectName =
        _stringFrom(propertiesRead, RiveSchema.componentNamePropertyKey) ??
        _stringFrom(propertiesRead, RiveSchema.animationNamePropertyKey) ??
        _stringFrom(
          propertiesRead,
          RiveSchema.stateMachineComponentNamePropertyKey,
        ) ??
        _stringFrom(
          propertiesRead,
          RiveSchema.viewModelComponentNamePropertyKey,
        );
    final parentId = _intFrom(
      propertiesRead,
      RiveSchema.componentParentIdPropertyKey,
    );
    final previousKeys = error.previousPropertyKeys;
    final rawStart = (error.valueOffset - 16).clamp(0, _bytes.length).toInt();
    final rawEnd = (error.valueOffset + 64).clamp(0, _bytes.length).toInt();
    final parentRecord =
        parentId == null || parentId < 0 || parentId >= records.length
        ? null
        : records[parentId];

    final buffer = StringBuffer()
      ..writeln('Rive schema debug')
      ..writeln('source: $source')
      ..writeln(
        'header: ${_header.majorVersion}.${_header.minorVersion}, '
        'fileId=${_header.fileId}, '
        'propertyKeyCount=${_header.propertyKeys.length}',
      )
      ..writeln()
      ..writeln('Property read failure')
      ..writeln('- object/core type id: ${error.typeKey}')
      ..writeln('- object/core type name: ${error.typeName ?? 'unknown'}')
      ..writeln('- object record index: ${error.recordIndex}')
      ..writeln('- object record offset: ${_formatOffset(error.recordOffset)}')
      ..writeln('- object name if known: ${objectName ?? 'unknown'}')
      ..writeln('- property key: ${error.propertyKey}')
      ..writeln('- property value offset: ${_formatOffset(error.valueOffset)}')
      ..writeln(
        '- encoded field type: ${_fieldTypeDescription(error.propertyKey)}',
      )
      ..writeln('- cause: ${error.cause}')
      ..writeln(
        '- surrounding property keys: previous=[${previousKeys.join(', ')}], '
        'next-varuint-candidates=[${_readVarUintCandidates(error.valueOffset, 8).join(', ')}]',
      )
      ..writeln('- previous property details:')
      ..writeln(_formatPropertyDetails(previousKeys))
      ..writeln(
        '- raw bytes span: ${_formatOffset(rawStart)}..${_formatOffset(rawEnd)}',
      )
      ..writeln(_formatHexSpan(rawStart, rawEnd))
      ..writeln()
      ..writeln('Parent relationship')
      ..writeln(
        '- parent id property: ${parentId ?? 'not present before failure'}',
      )
      ..writeln(
        '- parent object: ${parentRecord == null ? 'unknown' : '${parentRecord.index} '
                  'type=${parentRecord.typeKey} '
                  'name=${parentRecord.typeName ?? 'unknown'} '
                  'objectName=${_recordName(parentRecord) ?? 'unknown'}'}',
      )
      ..writeln()
      ..writeln('Records parsed before failure: ${records.length}');
    return buffer.toString();
  }

  String _formatWarningDiagnostics(List<RiveInspectionWarning> warnings) {
    if (warnings.isEmpty) {
      return '  none';
    }
    return warnings
        .map(
          (warning) =>
              '  - ${warning.code} severity=${warning.severity.name} '
              'object=${warning.objectTypeKey ?? 'unknown'} '
              'property=${warning.propertyKey ?? 'unknown'} '
              'message=${warning.message}',
        )
        .join('\n');
  }

  String _formatViewModelDiagnostics(
    List<_RiveRecord> records,
    RiveMetadata metadata,
  ) {
    final buffer = StringBuffer()..writeln('ViewModel diagnostics');
    if (metadata.viewModels.isEmpty) {
      return (buffer..writeln('- none extracted')).toString().trimRight();
    }

    for (final viewModel in metadata.viewModels) {
      buffer.writeln(
        '- ViewModel id=${viewModel.id} name=${viewModel.name ?? 'unknown'} '
        'properties=${viewModel.properties.length} '
        'instances=${viewModel.instances.length}',
      );
      for (final property in viewModel.properties) {
        buffer.writeln(
          '  property id=${property.id} name=${property.name ?? 'unknown'} '
          'type=${property.type.name} typeKey=${property.typeKey}',
        );
      }
      for (final instance in viewModel.instances) {
        buffer.writeln(
          '  instance id=${instance.id} name=${instance.name ?? 'unknown'} '
          'viewModelId=${instance.viewModelId}',
        );
        for (final value in instance.values) {
          buffer.writeln(
            '    value id=${value.id} propertyId=${value.propertyId} '
            'propertyName=${value.propertyName ?? 'unresolved'} '
            'type=${value.type.name} value=${value.value ?? 'null'}',
          );
        }
      }
    }

    buffer.writeln();
    buffer.writeln('Raw ViewModel records');
    final viewModelRecords = records.where(_isViewModelRecord).toList();
    if (viewModelRecords.isEmpty) {
      buffer.writeln('- none');
    } else {
      for (final record in viewModelRecords) {
        buffer.writeln(
          '- record=${record.index} offset=${_formatOffset(record.offset)} '
          'type=${record.typeKey} '
          'typeName=${record.typeName ?? 'unknown'} '
          'properties=${_formatRecordProperties(record)}',
        );
      }
    }

    if (viewModelRecords.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('Raw records in ViewModel span');
      final firstIndex = viewModelRecords.first.index;
      final lastIndex = viewModelRecords.last.index;
      for (final record in records.where(
        (record) => record.index >= firstIndex && record.index <= lastIndex,
      )) {
        buffer.writeln(
          '- record=${record.index} offset=${_formatOffset(record.offset)} '
          'type=${record.typeKey} '
          'typeName=${record.typeName ?? 'unknown'} '
          'name=${_recordName(record) ?? 'unknown'} '
          'properties=${_formatRecordProperties(record)}',
        );
      }
    }
    return buffer.toString().trimRight();
  }

  bool _isViewModelRecord(_RiveRecord record) {
    switch (record.typeKey) {
      case RiveSchema.viewModelTypeKey:
      case RiveSchema.viewModelPropertyNumberTypeKey:
      case RiveSchema.viewModelPropertyStringTypeKey:
      case RiveSchema.viewModelPropertyBooleanTypeKey:
      case RiveSchema.viewModelPropertyColorTypeKey:
      case RiveSchema.viewModelPropertyTriggerTypeKey:
      case RiveSchema.viewModelPropertyEnumTypeKey:
      case RiveSchema.viewModelPropertyListTypeKey:
      case RiveSchema.viewModelPropertyViewModelTypeKey:
      case RiveSchema.viewModelInstanceTypeKey:
      case RiveSchema.viewModelInstanceNumberTypeKey:
      case RiveSchema.viewModelInstanceStringTypeKey:
      case RiveSchema.viewModelInstanceBooleanTypeKey:
      case RiveSchema.viewModelInstanceColorTypeKey:
      case RiveSchema.viewModelInstanceTriggerTypeKey:
      case RiveSchema.viewModelInstanceEnumTypeKey:
      case RiveSchema.viewModelInstanceListTypeKey:
      case RiveSchema.viewModelInstanceViewModelTypeKey:
        return true;
    }
    return false;
  }

  String _formatRecordProperties(_RiveRecord record) {
    if (record.properties.isEmpty) {
      return '{}';
    }
    final entries = record.properties.entries.map((entry) {
      final definition = RiveSchema.properties[entry.key]?.name;
      final label = definition == null
          ? '${entry.key}'
          : '${entry.key}($definition)';
      return '$label=${_formatDiagnosticValue(entry.value)}';
    });
    return '{${entries.join(', ')}}';
  }

  String _formatDiagnosticValue(Object? value) {
    if (value == null) {
      return 'null';
    }
    if (value is Uint8List) {
      return '<${value.length} bytes>';
    }
    return value.toString();
  }

  RiveViewModelPropertyMetadata _viewModelPropertyFromRecord(
    _RiveRecord record, {
    required int id,
  }) {
    return RiveViewModelPropertyMetadata(
      id: id,
      name: record.stringProperty(RiveSchema.viewModelComponentNamePropertyKey),
      type: _viewModelPropertyType(record.typeKey),
      typeKey: record.typeKey,
      enumId: record.intProperty(RiveSchema.viewModelPropertyEnumIdPropertyKey),
      viewModelReferenceId: record.intProperty(
        RiveSchema.viewModelPropertyViewModelReferenceIdPropertyKey,
      ),
    );
  }

  RiveViewModelInstanceValueMetadata _viewModelInstanceValueFromRecord(
    _RiveRecord record,
    _ViewModelBuilder? viewModel, {
    required int id,
  }) {
    final propertyId = record.intProperty(
      RiveSchema.viewModelInstanceValuePropertyIdPropertyKey,
    );
    final property = viewModel?.propertyById(propertyId);
    return RiveViewModelInstanceValueMetadata(
      id: id,
      propertyId: propertyId,
      propertyName: property?.name,
      type: _viewModelPropertyType(record.typeKey),
      value: _viewModelValue(record),
    );
  }

  Object? _viewModelValue(_RiveRecord record) {
    switch (record.typeKey) {
      case RiveSchema.viewModelInstanceNumberTypeKey:
        return record.doubleProperty(
          RiveSchema.viewModelInstanceNumberValuePropertyKey,
        );
      case RiveSchema.viewModelInstanceStringTypeKey:
        return record.stringProperty(
          RiveSchema.viewModelInstanceStringValuePropertyKey,
        );
      case RiveSchema.viewModelInstanceBooleanTypeKey:
        return record.boolProperty(
          RiveSchema.viewModelInstanceBooleanValuePropertyKey,
        );
      case RiveSchema.viewModelInstanceTriggerTypeKey:
        return null;
      case RiveSchema.viewModelInstanceColorTypeKey:
        return record.intProperty(
          RiveSchema.viewModelInstanceColorValuePropertyKey,
        );
      case RiveSchema.viewModelInstanceEnumTypeKey:
        return record.intProperty(
          RiveSchema.viewModelInstanceEnumValuePropertyKey,
        );
      case RiveSchema.viewModelInstanceViewModelTypeKey:
        return record.intProperty(
          RiveSchema.viewModelInstanceViewModelValuePropertyKey,
        );
    }
    return null;
  }

  RiveViewModelPropertyType _viewModelPropertyType(int typeKey) {
    switch (typeKey) {
      case RiveSchema.viewModelPropertyNumberTypeKey:
      case RiveSchema.viewModelInstanceNumberTypeKey:
        return RiveViewModelPropertyType.number;
      case RiveSchema.viewModelPropertyStringTypeKey:
      case RiveSchema.viewModelInstanceStringTypeKey:
        return RiveViewModelPropertyType.string;
      case RiveSchema.viewModelPropertyBooleanTypeKey:
      case RiveSchema.viewModelInstanceBooleanTypeKey:
        return RiveViewModelPropertyType.boolean;
      case RiveSchema.viewModelPropertyColorTypeKey:
      case RiveSchema.viewModelInstanceColorTypeKey:
        return RiveViewModelPropertyType.color;
      case RiveSchema.viewModelPropertyTriggerTypeKey:
      case RiveSchema.viewModelInstanceTriggerTypeKey:
        return RiveViewModelPropertyType.trigger;
      case RiveSchema.viewModelPropertyEnumTypeKey:
      case RiveSchema.viewModelInstanceEnumTypeKey:
        return RiveViewModelPropertyType.enumType;
      case RiveSchema.viewModelPropertyListTypeKey:
      case RiveSchema.viewModelInstanceListTypeKey:
        return RiveViewModelPropertyType.list;
      case RiveSchema.viewModelPropertyViewModelTypeKey:
      case RiveSchema.viewModelInstanceViewModelTypeKey:
        return RiveViewModelPropertyType.viewModel;
    }
    return RiveViewModelPropertyType.unknown;
  }

  int? _findNextMetadataRecordOffset(int startOffset) {
    for (var offset = startOffset + 1; offset < _bytes.length; offset++) {
      final type = _readVarUintAt(offset);
      if (type == null || !_metadataRecoveryTypeKeys.contains(type.value)) {
        continue;
      }
      final property = _readVarUintAt(type.nextOffset);
      if (property == null ||
          !_metadataRecoveryPropertyKeys.contains(property.value)) {
        continue;
      }
      return offset;
    }
    return null;
  }

  String _formatPropertyDetails(List<int> propertyKeys) {
    if (propertyKeys.isEmpty) {
      return '  none';
    }
    return propertyKeys
        .map((key) => '  $key: ${_fieldTypeDescription(key)}')
        .join('\n');
  }

  String _fieldTypeDescription(int propertyKey) {
    final schemaFieldType = RiveSchema.properties[propertyKey]?.type;
    final skipFieldType = RiveSchema.corePropertyFieldTypes[propertyKey];
    final headerFieldType = _header.propertyFieldTypes[propertyKey];
    final parts = <String>[];
    if (schemaFieldType != null) {
      parts.add('vendored semantic schema=${schemaFieldType.name}');
    }
    if (skipFieldType != null) {
      parts.add('vendored skip map=${skipFieldType.name}');
    }
    if (headerFieldType != null) {
      parts.add('file header=${headerFieldType.name}');
    }
    return parts.isEmpty ? 'unknown' : parts.join(', ');
  }

  String _formatHexSpan(int start, int end) {
    final buffer = StringBuffer();
    for (var row = start; row < end; row += 16) {
      final rowEnd = (row + 16).clamp(row, end);
      final hex = [
        for (var offset = row; offset < rowEnd; offset++)
          _bytes[offset].toRadixString(16).padLeft(2, '0').toUpperCase(),
      ].join(' ');
      buffer.writeln('  ${_formatOffset(row)}  $hex');
    }
    return buffer.toString().trimRight();
  }

  List<int> _readVarUintCandidates(int offset, int count) {
    final candidates = <int>[];
    var cursor = offset;
    for (var i = 0; i < count && cursor < _bytes.length; i++) {
      var value = 0;
      var shift = 0;
      var valid = false;
      for (
        var byteCount = 0;
        byteCount < 10 && cursor < _bytes.length;
        byteCount++
      ) {
        final byte = _bytes[cursor++];
        value |= (byte & 0x7f) << shift;
        if ((byte & 0x80) == 0) {
          valid = true;
          break;
        }
        shift += 7;
      }
      if (!valid) {
        break;
      }
      candidates.add(value);
    }
    return candidates;
  }

  _VarUintRead? _readVarUintAt(int offset) {
    var value = 0;
    var shift = 0;
    var cursor = offset;
    for (
      var byteCount = 0;
      byteCount < 10 && cursor < _bytes.length;
      byteCount++
    ) {
      final byte = _bytes[cursor++];
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) == 0) {
        return _VarUintRead(value, cursor);
      }
      shift += 7;
    }
    return null;
  }
}

const _metadataRecoveryTypeKeys = <int>{
  RiveSchema.artboardTypeKey,
  RiveSchema.linearAnimationTypeKey,
  RiveSchema.stateMachineTypeKey,
  RiveSchema.stateMachineNumberTypeKey,
  RiveSchema.stateMachineBoolTypeKey,
  RiveSchema.stateMachineTriggerTypeKey,
  RiveSchema.viewModelTypeKey,
  RiveSchema.viewModelPropertyNumberTypeKey,
  RiveSchema.viewModelPropertyStringTypeKey,
  RiveSchema.viewModelPropertyBooleanTypeKey,
  RiveSchema.viewModelPropertyColorTypeKey,
  RiveSchema.viewModelPropertyTriggerTypeKey,
  RiveSchema.viewModelPropertyEnumTypeKey,
  RiveSchema.viewModelPropertyListTypeKey,
  RiveSchema.viewModelPropertyViewModelTypeKey,
  RiveSchema.viewModelInstanceTypeKey,
  RiveSchema.viewModelInstanceNumberTypeKey,
  RiveSchema.viewModelInstanceStringTypeKey,
  RiveSchema.viewModelInstanceBooleanTypeKey,
  RiveSchema.viewModelInstanceColorTypeKey,
  RiveSchema.viewModelInstanceTriggerTypeKey,
  RiveSchema.viewModelInstanceEnumTypeKey,
  RiveSchema.viewModelInstanceListTypeKey,
  RiveSchema.viewModelInstanceViewModelTypeKey,
};

const _metadataRecoveryPropertyKeys = <int>{
  RiveSchema.componentNamePropertyKey,
  RiveSchema.animationNamePropertyKey,
  RiveSchema.stateMachineComponentNamePropertyKey,
  RiveSchema.viewModelComponentNamePropertyKey,
  RiveSchema.viewModelInstanceViewModelIdPropertyKey,
  RiveSchema.viewModelInstanceValuePropertyIdPropertyKey,
};

class _VarUintRead {
  const _VarUintRead(this.value, this.nextOffset);

  final int value;
  final int nextOffset;
}

String _formatOffset(int? offset) =>
    offset == null ? 'unknown' : '$offset (0x${offset.toRadixString(16)})';

String? _recordName(_RiveRecord record) =>
    record.stringProperty(RiveSchema.componentNamePropertyKey) ??
    record.stringProperty(RiveSchema.animationNamePropertyKey) ??
    record.stringProperty(RiveSchema.stateMachineComponentNamePropertyKey) ??
    record.stringProperty(RiveSchema.viewModelComponentNamePropertyKey);

String? _nameFromProperties(Map<int, Object?> properties) =>
    _stringFrom(properties, RiveSchema.componentNamePropertyKey) ??
    _stringFrom(properties, RiveSchema.animationNamePropertyKey) ??
    _stringFrom(properties, RiveSchema.stateMachineComponentNamePropertyKey) ??
    _stringFrom(properties, RiveSchema.viewModelComponentNamePropertyKey);

String? _stringFrom(Map<int, Object?> properties, int key) {
  final value = properties[key];
  return value is String && value.isNotEmpty ? value : null;
}

int? _intFrom(Map<int, Object?> properties, int key) {
  final value = properties[key];
  return value is int ? value : null;
}

class _ViewModelBuilder {
  _ViewModelBuilder({
    required this.id,
    required this.name,
    required this.typeKey,
    required this.defaultInstanceId,
  });

  final int id;
  final String? name;
  final int typeKey;
  final int? defaultInstanceId;
  final properties = <RiveViewModelPropertyMetadata>[];
  final instances = <_ViewModelInstanceBuilder>[];

  RiveViewModelPropertyMetadata? propertyById(int? id) {
    if (id == null) {
      return null;
    }
    for (final property in properties) {
      if (property.id == id) {
        return property;
      }
    }
    return null;
  }

  RiveViewModelMetadata toMetadata() => RiveViewModelMetadata(
    id: id,
    name: name,
    typeKey: typeKey,
    defaultInstanceId: defaultInstanceId,
    properties: properties,
    instances: instances.map((instance) => instance.toMetadata()).toList(),
  );
}

class _ViewModelInstanceBuilder {
  _ViewModelInstanceBuilder({
    required this.id,
    required this.name,
    required this.viewModelId,
  });

  final int id;
  final String? name;
  final int? viewModelId;
  final values = <RiveViewModelInstanceValueMetadata>[];

  RiveViewModelInstanceMetadata toMetadata() => RiveViewModelInstanceMetadata(
    id: id,
    name: name,
    viewModelId: viewModelId,
    values: values,
  );
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
  const _UnsupportedProperty(
    this.propertyKey,
    this.offset, {
    this.recordIndex,
    this.recordOffset,
    this.typeKey,
    this.typeName,
    this.propertiesRead,
    this.previousPropertyKeys,
    this.valueOffset,
  });

  final int propertyKey;
  final int offset;
  final int? recordIndex;
  final int? recordOffset;
  final int? typeKey;
  final String? typeName;
  final Map<int, Object?>? propertiesRead;
  final List<int>? previousPropertyKeys;
  final int? valueOffset;
  String? get objectName {
    final properties = propertiesRead;
    if (properties == null) {
      return null;
    }
    return _nameFromProperties(properties);
  }

  _UnsupportedProperty withRecordContext({
    required int recordIndex,
    required int recordOffset,
    required int typeKey,
    required String? typeName,
    required Map<int, Object?> propertiesRead,
    required List<int> previousPropertyKeys,
    required int valueOffset,
  }) {
    return _UnsupportedProperty(
      propertyKey,
      offset,
      recordIndex: recordIndex,
      recordOffset: recordOffset,
      typeKey: typeKey,
      typeName: typeName,
      propertiesRead: propertiesRead,
      previousPropertyKeys: previousPropertyKeys,
      valueOffset: valueOffset,
    );
  }
}

class _PropertyReadFailure implements Exception {
  const _PropertyReadFailure({
    required this.propertyKey,
    required this.offset,
    required this.recordIndex,
    required this.recordOffset,
    required this.typeKey,
    required this.typeName,
    required this.propertiesRead,
    required this.previousPropertyKeys,
    required this.valueOffset,
    required this.cause,
  });

  final int propertyKey;
  final int offset;
  final int recordIndex;
  final int recordOffset;
  final int typeKey;
  final String? typeName;
  final Map<int, Object?> propertiesRead;
  final List<int> previousPropertyKeys;
  final int valueOffset;
  final Object cause;
  String? get objectName => _nameFromProperties(propertiesRead);
}
