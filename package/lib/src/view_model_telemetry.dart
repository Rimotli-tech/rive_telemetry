/// Serializable ViewModel telemetry for future Rive data-binding support.
class ViewModelTelemetry {
  const ViewModelTelemetry({
    required this.supported,
    this.reason,
    this.viewModelName,
    this.instanceName,
    this.properties = const [],
  });

  final bool supported;
  final String? reason;
  final String? viewModelName;
  final String? instanceName;
  final List<ViewModelPropertyTelemetry> properties;

  Map<String, dynamic> toJson() => {
    'supported': supported,
    if (reason != null) 'reason': reason,
    if (viewModelName != null) 'viewModelName': viewModelName,
    if (instanceName != null) 'instanceName': instanceName,
    'properties': properties.map((property) => property.toJson()).toList(),
  };
}

/// Serializable ViewModel property telemetry.
class ViewModelPropertyTelemetry {
  const ViewModelPropertyTelemetry({
    required this.name,
    required this.type,
    this.value,
  });

  final String name;
  final String type;
  final Object? value;

  Map<String, dynamic> toJson() => {'name': name, 'type': type, 'value': value};
}
