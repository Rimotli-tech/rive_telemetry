const riveMetadataSchemaVersion = 1;

class RiveMetadata {
  const RiveMetadata({
    required this.schemaVersion,
    required this.source,
    required this.header,
    required this.artboards,
    required this.viewModels,
    required this.recordCount,
    required this.unknownRecordCount,
    required this.warnings,
  });

  final int schemaVersion;
  final String source;
  final RiveHeaderMetadata header;
  final List<RiveArtboardMetadata> artboards;
  final List<RiveViewModelMetadata> viewModels;
  final int recordCount;
  final int unknownRecordCount;
  final List<RiveInspectionWarning> warnings;

  factory RiveMetadata.fromJson(Map<String, Object?> json) {
    final schemaVersion = _readInt(json, 'schemaVersion');
    if (schemaVersion != riveMetadataSchemaVersion) {
      throw FormatException(
        'Unsupported Rive metadata schemaVersion $schemaVersion',
      );
    }

    return RiveMetadata(
      schemaVersion: schemaVersion,
      source: _readString(json, 'source'),
      header: RiveHeaderMetadata.fromJson(_readMap(json, 'header')),
      artboards: _readList(
        json,
        'artboards',
      ).map((item) => RiveArtboardMetadata.fromJson(_castMap(item))).toList(),
      viewModels: _readList(
        json,
        'viewModels',
      ).map((item) => RiveViewModelMetadata.fromJson(_castMap(item))).toList(),
      recordCount: _readInt(json, 'recordCount'),
      unknownRecordCount: _readInt(json, 'unknownRecordCount'),
      warnings: _readList(
        json,
        'warnings',
      ).map((item) => RiveInspectionWarning.fromJson(_castMap(item))).toList(),
    );
  }

  Map<String, Object?> toJson() => {
    'schemaVersion': schemaVersion,
    'source': source,
    'header': header.toJson(),
    'artboards': artboards.map((artboard) => artboard.toJson()).toList(),
    'viewModels': viewModels.map((viewModel) => viewModel.toJson()).toList(),
    'recordCount': recordCount,
    'unknownRecordCount': unknownRecordCount,
    'warnings': warnings.map((warning) => warning.toJson()).toList(),
  };
}

class RiveHeaderMetadata {
  const RiveHeaderMetadata({
    required this.majorVersion,
    required this.minorVersion,
    required this.fileId,
    required this.propertyKeyCount,
  });

  final int majorVersion;
  final int minorVersion;
  final int fileId;
  final int propertyKeyCount;

  factory RiveHeaderMetadata.fromJson(Map<String, Object?> json) =>
      RiveHeaderMetadata(
        majorVersion: _readInt(json, 'majorVersion'),
        minorVersion: _readInt(json, 'minorVersion'),
        fileId: _readInt(json, 'fileId'),
        propertyKeyCount: _readInt(json, 'propertyKeyCount'),
      );

  Map<String, Object?> toJson() => {
    'majorVersion': majorVersion,
    'minorVersion': minorVersion,
    'fileId': fileId,
    'propertyKeyCount': propertyKeyCount,
  };
}

class RiveInspectionWarning {
  const RiveInspectionWarning({
    required this.code,
    required this.message,
    this.offset,
    this.propertyKey,
  });

  final String code;
  final String message;
  final int? offset;
  final int? propertyKey;

  factory RiveInspectionWarning.fromJson(Map<String, Object?> json) =>
      RiveInspectionWarning(
        code: _readString(json, 'code'),
        message: _readString(json, 'message'),
        offset: _readNullableInt(json, 'offset'),
        propertyKey: _readNullableInt(json, 'propertyKey'),
      );

  Map<String, Object?> toJson() => {
    'code': code,
    'message': message,
    if (offset != null) 'offset': offset,
    if (propertyKey != null) 'propertyKey': propertyKey,
  };
}

class RiveArtboardMetadata {
  RiveArtboardMetadata({
    required this.name,
    required this.defaultStateMachineId,
    required this.viewModelId,
    required this.animations,
    required this.stateMachines,
    required this.hierarchy,
  });

  final String? name;
  final int? defaultStateMachineId;
  final int? viewModelId;
  final List<RiveAnimationMetadata> animations;
  final List<RiveStateMachineMetadata> stateMachines;
  final List<RiveComponentMetadata> hierarchy;

  factory RiveArtboardMetadata.fromJson(Map<String, Object?> json) =>
      RiveArtboardMetadata(
        name: _readNullableString(json, 'name'),
        defaultStateMachineId: _readNullableInt(json, 'defaultStateMachineId'),
        viewModelId: _readNullableInt(json, 'viewModelId'),
        animations: _readList(json, 'animations')
            .map((item) => RiveAnimationMetadata.fromJson(_castMap(item)))
            .toList(),
        stateMachines: _readList(json, 'stateMachines')
            .map((item) => RiveStateMachineMetadata.fromJson(_castMap(item)))
            .toList(),
        hierarchy: _readList(json, 'hierarchy')
            .map((item) => RiveComponentMetadata.fromJson(_castMap(item)))
            .toList(),
      );

  Map<String, Object?> toJson() => {
    'name': name,
    'defaultStateMachineId': defaultStateMachineId,
    'viewModelId': viewModelId,
    'animations': animations.map((animation) => animation.toJson()).toList(),
    'stateMachines': stateMachines
        .map((stateMachine) => stateMachine.toJson())
        .toList(),
    'hierarchy': hierarchy.map((component) => component.toJson()).toList(),
  };
}

class RiveAnimationMetadata {
  const RiveAnimationMetadata({
    required this.name,
    required this.fps,
    required this.durationFrames,
    required this.durationSeconds,
    required this.speed,
    required this.loop,
  });

  final String? name;
  final int? fps;
  final int? durationFrames;
  final double? durationSeconds;
  final double? speed;
  final int? loop;

  factory RiveAnimationMetadata.fromJson(Map<String, Object?> json) =>
      RiveAnimationMetadata(
        name: _readNullableString(json, 'name'),
        fps: _readNullableInt(json, 'fps'),
        durationFrames: _readNullableInt(json, 'durationFrames'),
        durationSeconds: _readNullableDouble(json, 'durationSeconds'),
        speed: _readNullableDouble(json, 'speed'),
        loop: _readNullableInt(json, 'loop'),
      );

  Map<String, Object?> toJson() => {
    'name': name,
    'fps': fps,
    'durationFrames': durationFrames,
    'durationSeconds': durationSeconds,
    'speed': speed,
    'loop': loop,
  };
}

class RiveStateMachineMetadata {
  RiveStateMachineMetadata({required this.name, required this.inputs});

  final String? name;
  final List<RiveInputMetadata> inputs;

  factory RiveStateMachineMetadata.fromJson(Map<String, Object?> json) =>
      RiveStateMachineMetadata(
        name: _readNullableString(json, 'name'),
        inputs: _readList(
          json,
          'inputs',
        ).map((item) => RiveInputMetadata.fromJson(_castMap(item))).toList(),
      );

  Map<String, Object?> toJson() => {
    'name': name,
    'inputs': inputs.map((input) => input.toJson()).toList(),
  };
}

class RiveInputMetadata {
  const RiveInputMetadata({
    required this.name,
    required this.type,
    this.defaultValue,
  });

  final String? name;
  final RiveInputType type;
  final Object? defaultValue;

  factory RiveInputMetadata.fromJson(Map<String, Object?> json) {
    final typeName = _readString(json, 'type');
    return RiveInputMetadata(
      name: _readNullableString(json, 'name'),
      type: RiveInputType.values.firstWhere(
        (type) => type.name == typeName,
        orElse: () => throw FormatException('Unknown input type $typeName'),
      ),
      defaultValue: json['defaultValue'],
    );
  }

  Map<String, Object?> toJson() => {
    'name': name,
    'type': type.name,
    if (defaultValue != null) 'defaultValue': defaultValue,
  };
}

enum RiveInputType { boolean, number, trigger }

class RiveComponentMetadata {
  const RiveComponentMetadata({
    required this.name,
    required this.parentId,
    required this.typeKey,
    required this.typeName,
  });

  final String? name;
  final int? parentId;
  final int typeKey;
  final String? typeName;

  factory RiveComponentMetadata.fromJson(Map<String, Object?> json) =>
      RiveComponentMetadata(
        name: _readNullableString(json, 'name'),
        parentId: _readNullableInt(json, 'parentId'),
        typeKey: _readInt(json, 'typeKey'),
        typeName: _readNullableString(json, 'typeName'),
      );

  Map<String, Object?> toJson() => {
    'name': name,
    'parentId': parentId,
    'typeKey': typeKey,
    'typeName': typeName,
  };
}

class RiveViewModelMetadata {
  const RiveViewModelMetadata({required this.name, required this.typeKey});

  final String? name;
  final int typeKey;

  factory RiveViewModelMetadata.fromJson(Map<String, Object?> json) =>
      RiveViewModelMetadata(
        name: _readNullableString(json, 'name'),
        typeKey: _readInt(json, 'typeKey'),
      );

  Map<String, Object?> toJson() => {'name': name, 'typeKey': typeKey};
}

Map<String, Object?> _readMap(Map<String, Object?> json, String key) =>
    _castMap(json[key]);

List<Object?> _readList(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is List) {
    return value.cast<Object?>();
  }
  throw FormatException('Expected "$key" to be a list');
}

Map<String, Object?> _castMap(Object? value) {
  if (value is Map) {
    return value.cast<String, Object?>();
  }
  throw const FormatException('Expected JSON object');
}

String _readString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is String) {
    return value;
  }
  throw FormatException('Expected "$key" to be a string');
}

String? _readNullableString(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is String) {
    return value;
  }
  throw FormatException('Expected "$key" to be a string or null');
}

int _readInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value is int) {
    return value;
  }
  throw FormatException('Expected "$key" to be an integer');
}

int? _readNullableInt(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value;
  }
  throw FormatException('Expected "$key" to be an integer or null');
}

double? _readNullableDouble(Map<String, Object?> json, String key) {
  final value = json[key];
  if (value == null) {
    return null;
  }
  if (value is int) {
    return value.toDouble();
  }
  if (value is double) {
    return value;
  }
  throw FormatException('Expected "$key" to be a number or null');
}
