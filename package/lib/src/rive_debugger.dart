// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:rive/rive.dart' as rive;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Wraps a Rive widget and broadcasts state-machine input telemetry.
///
/// The child is returned unchanged; this widget only manages telemetry side
/// effects for the provided [stateMachine].
class RiveDebugger extends StatefulWidget {
  const RiveDebugger({
    super.key,
    required this.child,
    this.stateMachine,
    this.source = 'flutter-app',
    this.stateMachineName = 'State Machine 1',
    this.socketUrl = 'ws://localhost:8080',
    this.pollingInterval = const Duration(milliseconds: 250),
    this.debugPrintJson = true,
    this.enabled,
  });

  final Widget child;
  final rive.StateMachine? stateMachine;
  final String source;
  final String stateMachineName;
  final String socketUrl;
  final Duration pollingInterval;
  final bool debugPrintJson;
  final bool? enabled;

  @override
  State<RiveDebugger> createState() => _RiveDebuggerState();
}

class _RiveDebuggerState extends State<RiveDebugger> {
  WebSocketChannel? _socket;
  StreamSubscription<dynamic>? _socketSubscription;
  Timer? _pollTimer;
  String? _previousInputSignature;
  bool _socketConnected = false;

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
        widget.stateMachineName != oldWidget.stateMachineName ||
        widget.debugPrintJson != oldWidget.debugPrintJson) {
      _configureStateMachine();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _socketSubscription?.cancel();
    _socket?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }

  void _connectSocket() {
    if (!_isTelemetryEnabled) {
      return;
    }

    if (widget.socketUrl.isEmpty) {
      return;
    }

    try {
      final socket = WebSocketChannel.connect(Uri.parse(widget.socketUrl));
      _socket = socket;
      _socketSubscription = socket.stream.listen(
        (_) {},
        onError: (Object error) {
          debugPrint('RiveTelemetry WebSocket error: $error');
          _markSocketDisconnected();
        },
        onDone: _markSocketDisconnected,
      );

      socket.ready
          .then((_) {
            if (!_isTelemetryEnabled || _socket != socket) {
              return;
            }
            _socketConnected = true;
          })
          .catchError((Object error) {
            if (_socket != socket) {
              return;
            }
            debugPrint('RiveTelemetry WebSocket unavailable: $error');
            _markSocketDisconnected();
          });
    } catch (error) {
      debugPrint('RiveTelemetry WebSocket connection failed: $error');
      _markSocketDisconnected();
    }
  }

  void _resetSocket() {
    _socketConnected = false;
    _socketSubscription?.cancel();
    _socketSubscription = null;
    _socket?.sink.close();
    _socket = null;
  }

  void _resetTelemetry() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _previousInputSignature = null;
    _resetSocket();
  }

  void _markSocketDisconnected() {
    _socketConnected = false;
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
        'timestamp': DateTime.now().toUtc().toIso8601String(),
        'stateMachine': widget.stateMachineName,
        'inputs': const [],
      };
    }

    return {
      'source': widget.source,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'stateMachine': widget.stateMachineName,
      'inputs': widget.stateMachine?.inputs.map(_serializeInput).toList() ?? [],
    };
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
}
