/// Development telemetry bridge for inspecting Rive Flutter runtimes from
/// VS Code.
///
/// Import this library in a Flutter app, wrap an existing Rive widget with
/// [RiveDebugger], and open the Rive Telemetry VS Code extension to inspect
/// and mutate state machine inputs and ViewModel properties while the app runs.
library;

export 'src/rive_debugger.dart';
export 'src/view_model_telemetry.dart';
export 'src/view_model_telemetry_adapter.dart';
