import 'package:rive/rive.dart' as rive;

import 'view_model_telemetry.dart';

/// Adapter boundary for reading Rive ViewModel telemetry.
abstract interface class ViewModelTelemetryAdapter {
  ViewModelTelemetry capture({
    rive.ViewModelInstance? instance,
    String? viewModelName,
  });
}

/// Rive-backed ViewModel telemetry adapter.
///
/// This adapter only reads public ViewModel APIs. It never mutates, listens to,
/// or disposes ViewModel objects supplied by the host application.
class RiveViewModelTelemetryAdapter implements ViewModelTelemetryAdapter {
  const RiveViewModelTelemetryAdapter();

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
}
