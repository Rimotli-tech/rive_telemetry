# 0.3.0

- Preserved last-known telemetry when Flutter clients disconnect.
- Added stale telemetry status and manual clear control in the VS Code panel.
- Improved panel hierarchy, runtime selection focus, dropdown styling, and property grouping.
- Hid snapshot diff controls from the extension UI.
- Polished VS Code panel dropdowns and section styling.
- Added explicit JavaScript ViewModel instance naming and demo binding support.

# 0.2.0

- Added multi-runtime telemetry identity with `runtimeId` and `label`.
- Added state machine input telemetry for boolean, number, and trigger inputs.
- Added VS Code command routing support for state machine input mutation.
- Added ViewModel telemetry models and adapter boundary.
- Added ViewModel property telemetry and runtime mutation support for supported property types.
- Added in-memory snapshot and diff support for state machine inputs and ViewModel properties.
- Added a minimal single-runtime Flutter example using `demo_2.riv`.
- Kept telemetry disabled by default in release builds.

# 0.0.1

- Initial development scaffold.
