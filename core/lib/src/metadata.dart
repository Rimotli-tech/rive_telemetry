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

  Map<String, Object?> toJson() => {'name': name, 'typeKey': typeKey};
}
