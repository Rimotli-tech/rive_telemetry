import 'dart:ui' as ui;

import 'package:rive/rive.dart' as rive;

import 'view_model_telemetry.dart';

/// Adapter boundary for reading Rive ViewModel telemetry.
abstract interface class ViewModelTelemetryAdapter {
  /// Captures the current serializable state of [instance].
  ///
  /// Returns unsupported telemetry when [instance] is omitted or cannot be
  /// inspected through the public Rive Flutter runtime APIs.
  ViewModelTelemetry capture({
    rive.ViewModelInstance? instance,
    String? viewModelName,
  });

  /// Applies a property mutation command to [instance].
  ///
  /// Returns `true` only when the command shape, instance name, property type,
  /// and value are all compatible with the underlying Rive property.
  bool setProperty({
    rive.ViewModelInstance? instance,
    String? instanceName,
    required String propertyName,
    required String propertyType,
    Object? value,
  });
}

/// Rive-backed ViewModel telemetry adapter.
///
/// This adapter only reads public ViewModel APIs. It never mutates, listens to,
/// or disposes ViewModel objects supplied by the host application.
class RiveViewModelTelemetryAdapter implements ViewModelTelemetryAdapter {
  /// Creates the default Rive-backed ViewModel telemetry adapter.
  const RiveViewModelTelemetryAdapter();

  /// Captures ViewModel telemetry from a Rive [instance].
  @override
  ViewModelTelemetry capture({
    rive.ViewModelInstance? instance,
    String? viewModelName,
  }) {
    if (instance == null) {
      return ViewModelTelemetry(
        supported: false,
        reason: 'No ViewModelInstance provided',
        viewModelName: viewModelName,
      );
    }

    try {
      if (instance.isDisposed) {
        return ViewModelTelemetry(
          supported: false,
          reason: 'ViewModelInstance is disposed',
          viewModelName: viewModelName,
        );
      }

      final properties = <ViewModelPropertyTelemetry>[];
      for (final property in instance.properties) {
        properties.add(_captureProperty(instance, property));
      }

      return ViewModelTelemetry(
        supported: true,
        viewModelName: viewModelName,
        instanceName: instance.name,
        properties: properties,
      );
    } catch (error) {
      return ViewModelTelemetry(
        supported: false,
        reason: 'ViewModel telemetry unavailable: $error',
        viewModelName: viewModelName,
      );
    }
  }

  /// Applies a supported ViewModel property mutation to a Rive [instance].
  @override
  bool setProperty({
    rive.ViewModelInstance? instance,
    String? instanceName,
    required String propertyName,
    required String propertyType,
    Object? value,
  }) {
    if (instance == null) {
      return false;
    }

    try {
      if (instance.isDisposed) {
        return false;
      }

      if (instanceName != null &&
          instanceName.isNotEmpty &&
          instance.name != instanceName) {
        return false;
      }

      final applied = switch (propertyType) {
        'number' => _setNumber(instance, propertyName, value),
        'boolean' => _setBoolean(instance, propertyName, value),
        'string' => _setString(instance, propertyName, value),
        'color' => _setColor(instance, propertyName, value),
        'enum' => _setEnum(instance, propertyName, value),
        'trigger' => _fireTrigger(instance, propertyName),
        _ => false,
      };

      if (applied) {
        instance.requestAdvance();
      }

      return applied;
    } catch (_) {
      return false;
    }
  }

  ViewModelPropertyTelemetry _captureProperty(
    rive.ViewModelInstance instance,
    rive.ViewModelProperty property,
  ) {
    try {
      return ViewModelPropertyTelemetry(
        name: property.name,
        type: _serializeType(property.type),
        value: _readValue(instance, property),
      );
    } catch (_) {
      return ViewModelPropertyTelemetry(
        name: property.name,
        type: _serializeType(property.type),
      );
    }
  }

  Object? _readValue(
    rive.ViewModelInstance instance,
    rive.ViewModelProperty property,
  ) {
    final name = property.name;

    switch (property.type) {
      case rive.DataType.number:
        return instance.number(name)?.value;
      case rive.DataType.boolean:
        return instance.boolean(name)?.value;
      case rive.DataType.string:
        return instance.string(name)?.value;
      case rive.DataType.color:
        final color = instance.color(name)?.value;
        if (color == null) {
          return null;
        }
        return '#${color.toARGB32().toRadixString(16).padLeft(8, '0')}';
      case rive.DataType.enumType:
        return instance.enumerator(name)?.value;
      case rive.DataType.list:
        return instance.list(name)?.length;
      case rive.DataType.trigger:
      case rive.DataType.viewModel:
      case rive.DataType.integer:
      case rive.DataType.symbolListIndex:
      case rive.DataType.image:
      case rive.DataType.artboard:
      case rive.DataType.none:
        return null;
    }
  }

  String _serializeType(rive.DataType type) {
    if (type == rive.DataType.enumType) {
      return 'enum';
    }

    return type.name;
  }

  bool _setNumber(
    rive.ViewModelInstance instance,
    String propertyName,
    Object? value,
  ) {
    if (value is! num) {
      return false;
    }

    final property = instance.number(propertyName);
    if (property == null) {
      return false;
    }

    property.value = value.toDouble();
    return true;
  }

  bool _setBoolean(
    rive.ViewModelInstance instance,
    String propertyName,
    Object? value,
  ) {
    if (value is! bool) {
      return false;
    }

    final property = instance.boolean(propertyName);
    if (property == null) {
      return false;
    }

    property.value = value;
    return true;
  }

  bool _setString(
    rive.ViewModelInstance instance,
    String propertyName,
    Object? value,
  ) {
    if (value is! String) {
      return false;
    }

    final property = instance.string(propertyName);
    if (property == null) {
      return false;
    }

    property.value = value;
    return true;
  }

  bool _setColor(
    rive.ViewModelInstance instance,
    String propertyName,
    Object? value,
  ) {
    if (value is! String) {
      return false;
    }

    final color = _parseColor(value);
    if (color == null) {
      return false;
    }

    final property = instance.color(propertyName);
    if (property == null) {
      return false;
    }

    property.value = color;
    return true;
  }

  bool _setEnum(
    rive.ViewModelInstance instance,
    String propertyName,
    Object? value,
  ) {
    if (value is! String) {
      return false;
    }

    final property = instance.enumerator(propertyName);
    if (property == null) {
      return false;
    }

    property.value = value;
    return true;
  }

  bool _fireTrigger(rive.ViewModelInstance instance, String propertyName) {
    final property = instance.trigger(propertyName);
    if (property == null) {
      return false;
    }

    property.trigger();
    return true;
  }

  ui.Color? _parseColor(String value) {
    final normalized = value.trim().replaceFirst('#', '');
    if (normalized.length != 6 && normalized.length != 8) {
      return null;
    }

    final colorValue = int.tryParse(normalized, radix: 16);
    if (colorValue == null) {
      return null;
    }

    final argb = normalized.length == 6 ? 0xFF000000 | colorValue : colorValue;
    return ui.Color(argb);
  }
}
