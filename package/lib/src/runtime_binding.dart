import 'package:rive/rive.dart' as rive;

/// Schema-aware runtime handles for a Rive instance.
///
/// Generated integration files can expose this object so [RiveDebugger] can
/// connect runtime telemetry to inspected schema names without requiring the
/// app to repeat fragile strings.
class RiveTelemetryBinding {
  /// Creates a runtime binding for telemetry and control.
  const RiveTelemetryBinding({
    this.artboardName,
    this.stateMachineName,
    this.stateMachine,
    this.viewModelName,
    this.viewModelInstance,
  });

  /// Expected artboard name from the inspected `.riv` schema.
  final String? artboardName;

  /// Expected state machine name from the inspected `.riv` schema.
  final String? stateMachineName;

  /// Live Rive state machine runtime handle.
  final rive.StateMachine? stateMachine;

  /// Expected ViewModel name from the inspected `.riv` schema.
  final String? viewModelName;

  /// Live Rive ViewModel instance runtime handle.
  final rive.ViewModelInstance? viewModelInstance;
}
