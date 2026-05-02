// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:rive/rive.dart' as rive;
import 'package:web_socket_channel/web_socket_channel.dart';

import 'view_model_telemetry_adapter.dart';

/// Wraps a Rive widget and broadcasts state-machine input telemetry.
///
/// The child is returned unchanged; this widget only manages telemetry side
/// effects for the provided [stateMachine].
class RiveDebugger extends StatefulWidget {
  const RiveDebugger({
    super.key,
    required this.child,
    this.stateMachine,
    this.runtimeId,
    this.label,
    this.viewModelInstance,
    this.viewModelName,
    this.source = 'flutter-app',
    this.stateMachineName = 'State Machine 1',
    this.socketUrl = 'ws://localhost:8080',
    this.pollingInterval = const Duration(milliseconds: 250),
    this.debugPrintJson = true,
    this.enabled,
  });

  final Widget child;
  final rive.StateMachine? stateMachine;
  final String? runtimeId;
  final String? label;
  final rive.ViewModelInstance? viewModelInstance;
  final String? viewModelName;
  final String source;
  final String stateMachineName;
  final String socketUrl;
  final Duration pollingInterval;
  final bool debugPrintJson;
  final bool? enabled;

  @override
  State<RiveDebugger> createState() => _RiveDebuggerState();
}

int _nextGeneratedRuntimeId = 0;

class _RiveDebuggerState extends State<RiveDebugger> {
  WebSocketChannel? _socket;
  StreamSubscription<dynamic>? _socketSubscription;
  Timer? _pollTimer;
  Timer? _reconnectTimer;
  String? _previousInputSignature;
  Duration _reconnectDelay = const Duration(seconds: 1);
  bool _socketConnected = false;
  bool _socketConnecting = false;
  bool _disposed = false;
  late final String _generatedRuntimeId;
  final ViewModelTelemetryAdapter _viewModelTelemetryAdapter =
      const RiveViewModelTelemetryAdapter();

  String get _runtimeId => widget.runtimeId ?? _generatedRuntimeId;
  String get _label => widget.label ?? _runtimeId;

  bool get _isTelemetryEnabled {
    if (widget.enabled == false) {
      return false;
    }
    if (widget.enabled == true) {
      return true;
    }
    return !kReleaseMode;
  }

  @override
  void initState() {
    super.initState();
    _generatedRuntimeId = 'rive-runtime-${++_nextGeneratedRuntimeId}';
    if (!_isTelemetryEnabled) {
      return;
    }

    _connectSocket();
    _configureStateMachine();
  }

  @override
  void didUpdateWidget(covariant RiveDebugger oldWidget) {
    super.didUpdateWidget(oldWidget);

    final wasTelemetryEnabled =
        oldWidget.enabled == true ||
        (oldWidget.enabled == null && !kReleaseMode);
    final isTelemetryEnabled = _isTelemetryEnabled;

    if (!isTelemetryEnabled) {
      _resetTelemetry();
      return;
    }

    if (!wasTelemetryEnabled) {
      _connectSocket();
      _configureStateMachine();
      return;
    }

    if (widget.socketUrl != oldWidget.socketUrl) {
      _resetSocket();
      _connectSocket();
    }

    if (widget.stateMachine != oldWidget.stateMachine ||
        widget.pollingInterval != oldWidget.pollingInterval ||
        widget.source != oldWidget.source ||
        widget.runtimeId != oldWidget.runtimeId ||
        widget.label != oldWidget.label ||
        widget.viewModelInstance != oldWidget.viewModelInstance ||
        widget.viewModelName != oldWidget.viewModelName ||
        widget.stateMachineName != oldWidget.stateMachineName ||
        widget.debugPrintJson != oldWidget.debugPrintJson) {
      _configureStateMachine();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _pollTimer?.cancel();
    _reconnectTimer?.cancel();
    _closeSocket();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }

  void _connectSocket() {
    if (!_shouldRunTelemetry) {
      return;
    }

    if (widget.socketUrl.isEmpty) {
      return;
    }

    if (_socket != null || _socketConnecting) {
      return;
    }

    try {
      final socket = WebSocketChannel.connect(Uri.parse(widget.socketUrl));
      _socket = socket;
      _socketConnecting = true;
      _socketSubscription = socket.stream.listen(
        _handleSocketMessage,
        onError: (Object error) {
          debugPrint('RiveTelemetry WebSocket error: $error');
          _handleSocketClosed(socket);
        },
        onDone: () => _handleSocketClosed(socket),
      );

      socket.ready
          .then((_) {
            if (!_shouldRunTelemetry || _socket != socket) {
              return;
            }
            _socketConnecting = false;
            _socketConnected = true;
            _reconnectDelay = const Duration(seconds: 1);
            _broadcastRiveState();
          })
          .catchError((Object error) {
            if (_socket != socket) {
              return;
            }
            debugPrint('RiveTelemetry WebSocket unavailable: $error');
            _handleSocketClosed(socket);
          });
    } catch (error) {
      debugPrint('RiveTelemetry WebSocket connection failed: $error');
      _markSocketDisconnected();
      _scheduleReconnect();
    }
  }

  void _resetSocket() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _closeSocket();
  }

  void _closeSocket() {
    _socketConnected = false;
    _socketConnecting = false;
    _socketSubscription?.cancel();
    _socketSubscription = null;
    _socket?.sink.close();
    _socket = null;
  }

  void _resetTelemetry() {
    _pollTimer?.cancel();
    _reconnectTimer?.cancel();
    _pollTimer = null;
    _reconnectTimer = null;
    _previousInputSignature = null;
    _closeSocket();
  }

  void _markSocketDisconnected() {
    _socketConnected = false;
    _socketConnecting = false;
  }

  bool get _shouldRunTelemetry => !_disposed && _isTelemetryEnabled;

  void _handleSocketClosed(WebSocketChannel socket) {
    if (_socket != socket) {
      return;
    }

    _markSocketDisconnected();
    _socketSubscription?.cancel();
    _socketSubscription = null;
    _socket = null;
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (!_shouldRunTelemetry || widget.socketUrl.isEmpty) {
      return;
    }

    if (_reconnectTimer != null || _socket != null || _socketConnecting) {
      return;
    }

    final delay = _reconnectDelay;
    _reconnectTimer = Timer(delay, () {
      _reconnectTimer = null;
      if (!_shouldRunTelemetry) {
        return;
      }
      _connectSocket();
    });

    final nextDelayMs = (_reconnectDelay.inMilliseconds * 2).clamp(1000, 5000);
    _reconnectDelay = Duration(milliseconds: nextDelayMs);
  }

  void _configureStateMachine() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _previousInputSignature = null;

    if (!_isTelemetryEnabled) {
      return;
    }

    if (widget.stateMachine == null) {
      return;
    }

    _broadcastRiveState();
    _pollTimer = Timer.periodic(widget.pollingInterval, (_) {
      final signature = _buildInputSignature();
      if (signature == _previousInputSignature) {
        return;
      }

      _broadcastRiveState();
    });
  }

  Map<String, dynamic> _buildTelemetryPayload() {
    if (!_isTelemetryEnabled) {
      return {
        'source': widget.source,
        'runtimeId': _runtimeId,
        'label': _label,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
        'stateMachine': widget.stateMachineName,
        'inputs': const [],
        'viewModel': _serializeViewModelTelemetry(),
      };
    }

    return {
      'source': widget.source,
      'runtimeId': _runtimeId,
      'label': _label,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'stateMachine': widget.stateMachineName,
      'inputs': widget.stateMachine?.inputs.map(_serializeInput).toList() ?? [],
      'viewModel': _serializeViewModelTelemetry(),
    };
  }

  Map<String, dynamic> _serializeViewModelTelemetry() {
    return _viewModelTelemetryAdapter
        .capture(
          instance: widget.viewModelInstance,
          viewModelName: widget.viewModelName,
        )
        .toJson();
  }

  Map<String, dynamic> _serializeInput(rive.Input input) {
    if (input is rive.BooleanInput) {
      return {'name': input.name, 'type': 'boolean', 'value': input.value};
    }

    if (input is rive.NumberInput) {
      return {'name': input.name, 'type': 'number', 'value': input.value};
    }

    if (input is rive.TriggerInput) {
      return {'name': input.name, 'type': 'trigger', 'value': null};
    }

    return {'name': input.name, 'type': 'unknown', 'value': null};
  }

  String _buildInputSignature() {
    if (!_isTelemetryEnabled) {
      return jsonEncode(const []);
    }

    final inputs = widget.stateMachine?.inputs.map(_serializeInput).toList();
    return jsonEncode(inputs ?? const []);
  }

  void _broadcastRiveState() {
    if (!_isTelemetryEnabled) {
      return;
    }

    final payload = _buildTelemetryPayload();
    final compactJson = jsonEncode(payload);

    if (widget.debugPrintJson) {
      debugPrint(const JsonEncoder.withIndent('  ').convert(payload));
    }

    _previousInputSignature = _buildInputSignature();

    try {
      if (_socketConnected && _socket != null) {
        _socket!.sink.add(compactJson);
      }
    } catch (error) {
      debugPrint('RiveTelemetry WebSocket send failed: $error');
      _markSocketDisconnected();
    }
  }

  void _handleSocketMessage(dynamic message) {
    if (!_shouldRunTelemetry) {
      return;
    }

    final rawMessage = message is String ? message : message.toString();
    final Object? decoded;
    try {
      decoded = jsonDecode(rawMessage);
    } catch (error) {
      debugPrint('RiveTelemetry ignored malformed command: $error');
      return;
    }

    if (decoded is! Map<String, dynamic>) {
      return;
    }

    final applied = switch (decoded['type']) {
      'setInput' => _applySetInputCommand(decoded),
      'fireTrigger' => _applyFireTriggerCommand(decoded),
      'setViewModelProperty' => _applySetViewModelPropertyCommand(decoded),
      _ => _ignoreCommand('unknown command type "${decoded['type']}"'),
    };

    if (!applied) {
      return;
    }

    widget.stateMachine?.requestAdvance();
    widget.viewModelInstance?.requestAdvance();
    _broadcastRiveState();
  }

  bool _applySetInputCommand(Map<String, dynamic> command) {
    if (command['runtimeId'] != _runtimeId) {
      return _ignoreCommand('runtime mismatch');
    }

    if (command['stateMachine'] != widget.stateMachineName) {
      return _ignoreCommand('state machine mismatch');
    }

    final inputName = command['inputName'];
    final inputType = command['inputType'];
    if (inputName is! String || inputType is! String) {
      return _ignoreCommand('invalid setInput command shape');
    }

    final input = _inputByName(inputName);
    if (input == null) {
      return _ignoreCommand('input "$inputName" was not found');
    }

    final value = command['value'];
    if (input is rive.BooleanInput && inputType == 'boolean' && value is bool) {
      input.value = value;
      return true;
    }

    if (input is rive.NumberInput && inputType == 'number' && value is num) {
      input.value = value.toDouble();
      return true;
    }

    return _ignoreCommand(
      'type/value mismatch for input "$inputName" as "$inputType"',
    );
  }

  bool _applyFireTriggerCommand(Map<String, dynamic> command) {
    if (command['runtimeId'] != _runtimeId) {
      return _ignoreCommand('runtime mismatch');
    }

    if (command['stateMachine'] != widget.stateMachineName) {
      return _ignoreCommand('state machine mismatch');
    }

    final inputName = command['inputName'];
    if (inputName is! String) {
      return _ignoreCommand('invalid fireTrigger command shape');
    }

    final input = _inputByName(inputName);
    if (input is! rive.TriggerInput) {
      return _ignoreCommand('trigger input "$inputName" was not found');
    }

    input.fire();
    return true;
  }

  bool _applySetViewModelPropertyCommand(Map<String, dynamic> command) {
    if (command['runtimeId'] != _runtimeId) {
      return _ignoreCommand('runtime mismatch');
    }

    if (command['viewModelName'] != widget.viewModelName) {
      return _ignoreCommand('view model mismatch');
    }

    final instanceName = command['instanceName'];
    final propertyName = command['propertyName'];
    final propertyType = command['propertyType'];
    if (instanceName is! String ||
        propertyName is! String ||
        propertyType is! String) {
      return _ignoreCommand('invalid setViewModelProperty command shape');
    }

    final applied = _viewModelTelemetryAdapter.setProperty(
      instance: widget.viewModelInstance,
      instanceName: instanceName,
      propertyName: propertyName,
      propertyType: propertyType,
      value: command['value'],
    );

    if (!applied) {
      return _ignoreCommand(
        'view model property "$propertyName" was not mutated',
      );
    }

    return true;
  }

  bool _ignoreCommand(String reason) {
    debugPrint('RiveTelemetry ignored command: $reason');
    return false;
  }

  rive.Input? _inputByName(String name) {
    final stateMachine = widget.stateMachine;
    if (stateMachine == null) {
      return null;
    }

    for (final input in stateMachine.inputs) {
      if (input.name == name) {
        return input;
      }
    }

    return null;
  }
}
