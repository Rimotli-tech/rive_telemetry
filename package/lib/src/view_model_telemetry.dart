/// Serializable snapshot of a Rive ViewModel instance.
///
/// This model is used by [RiveDebugger] to encode ViewModel state for the
/// VS Code extension.
class ViewModelTelemetry {
  /// Creates a ViewModel telemetry snapshot.
  const ViewModelTelemetry({
    required this.supported,
    this.reason,
    this.viewModelName,
    this.instanceName,
    this.properties = const [],
  });

  /// Whether ViewModel telemetry was captured successfully.
  final bool supported;

  /// Human-readable reason when [supported] is `false`.
  final String? reason;

  /// Name of the ViewModel associated with this snapshot.
  final String? viewModelName;

  /// Name of the captured ViewModel instance.
  final String? instanceName;

  /// Properties captured from the ViewModel instance.
  final List<ViewModelPropertyTelemetry> properties;

  /// Converts this snapshot into the JSON shape consumed by the extension.
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
  /// Creates telemetry for one ViewModel property.
  const ViewModelPropertyTelemetry({
    required this.name,
    required this.type,
    this.value,
  });

  /// Property name in the Rive ViewModel instance.
  final String name;

  /// Normalized property type, such as `number`, `boolean`, `string`,
  /// `color`, `enum`, or `trigger`.
  final String type;

  /// Current serializable value, or `null` for trigger-like and unsupported
  /// property types.
  final Object? value;

  /// Converts this property into the JSON shape consumed by the extension.
  Map<String, dynamic> toJson() => {'name': name, 'type': type, 'value': value};
}
