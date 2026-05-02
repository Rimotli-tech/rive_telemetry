# ViewModel Phase 1 API Notes

RiveTelemetry currently resolves `rive` 0.14.6 with `rive_native` 0.1.6 in
the demo workspace. This runtime exposes public ViewModel and Data Binding APIs
through `package:rive/rive.dart`.

## Runtime API Surface

- `File` exposes ViewModel discovery with `viewModelCount`,
  `viewModelByIndex`, `viewModelByName`, and
  `defaultArtboardViewModel(artboard)`.
- `ViewModel` exposes `name`, `properties`, `propertyCount`,
  `instanceCount`, and instance creation helpers such as
  `createDefaultInstance`, `createInstanceByName`, and `createInstanceByIndex`.
- `ViewModelInstance` exposes `name`, `properties`, `isDisposed`, typed
  property accessors, and lifecycle methods.
- `RiveWidgetBuilder` can create and bind a ViewModel instance through its
  `dataBind` parameter, and `RiveLoaded` exposes the resulting
  `viewModelInstance`.
- `RiveWidgetController.dataBind(...)` also returns a `ViewModelInstance`.

## Phase 1 Telemetry Boundary

The package now has a ViewModel telemetry adapter that reads a supplied
`ViewModelInstance` defensively. It only uses public read APIs and does not
mutate, listen to, or dispose ViewModel objects owned by the host application.

Supported scalar reads are number, boolean, string, color, enum, and list
length. Trigger, nested ViewModel, image, artboard, integer, symbol-list index,
and unknown values are reported with `value: null` for now.

The VS Code extension does not render ViewModel telemetry yet. The payload field
is optional extension data carried alongside existing State Machine input
telemetry.
