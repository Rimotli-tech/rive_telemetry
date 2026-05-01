// ignore_for_file: deprecated_member_use

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

const kRiveAssetPath = 'assets/demo.riv';
const kStateMachineName = 'State Machine 1';
const kTelemetrySource = 'demo-flutter-web';
const kTelemetrySocketUri = 'ws://localhost:8080';

void main() {
  runApp(const RiveTelemetryDemoApp());
}

class RiveTelemetryDemoApp extends StatelessWidget {
  const RiveTelemetryDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RiveTelemetry Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(scaffoldBackgroundColor: const Color(0xFF131920)),
      home: const DemoHomePage(),
    );
  }
}

class DemoHomePage extends StatefulWidget {
  const DemoHomePage({super.key});

  @override
  State<DemoHomePage> createState() => _DemoHomePageState();
}

class _DemoHomePageState extends State<DemoHomePage> {
  WebSocketChannel? _socket;
  StreamSubscription<dynamic>? _socketSubscription;
  Timer? _pollTimer;
  rive.RiveWidgetController? _riveController;
  rive.StateMachine? _stateMachine;
  String? _previousInputSignature;
  DateTime? _lastBroadcastAt;
  bool _socketConnected = false;
  bool _stateMachineFound = false;
  bool _stateMachineWarningLogged = false;

  late final rive.FileLoader _fileLoader = rive.FileLoader.fromAsset(
    kRiveAssetPath,
    riveFactory: rive.Factory.rive,
  );

  @override
  void initState() {
    super.initState();
    _connectSocket();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _socketSubscription?.cancel();
    _socket?.sink.close();
    _fileLoader.dispose();
    super.dispose();
  }

  void _connectSocket() {
    try {
      final socket = WebSocketChannel.connect(Uri.parse(kTelemetrySocketUri));
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
            if (!mounted) {
              return;
            }
            setState(() {
              _socketConnected = true;
            });
          })
          .catchError((Object error) {
            debugPrint('RiveTelemetry WebSocket unavailable: $error');
            _markSocketDisconnected();
          });
    } catch (error) {
      debugPrint('RiveTelemetry WebSocket connection failed: $error');
      _markSocketDisconnected();
    }
  }

  void _markSocketDisconnected() {
    if (!mounted) {
      _socketConnected = false;
      return;
    }

    setState(() {
      _socketConnected = false;
    });
  }

  void _onRiveLoaded(rive.RiveLoaded state) {
    if (_riveController == state.controller) {
      return;
    }

    final stateMachine = state.controller.stateMachine;
    if (stateMachine.name != kStateMachineName) {
      _logStateMachineWarning();
      setState(() {
        _riveController = state.controller;
        _stateMachine = null;
        _stateMachineFound = false;
        _previousInputSignature = null;
      });
      _pollTimer?.cancel();
      return;
    }

    debugPrint(
      'RiveTelemetry state machine "$kStateMachineName" found with '
      '${stateMachine.inputs.length} input(s).',
    );

    setState(() {
      _riveController = state.controller;
      _stateMachine = stateMachine;
      _stateMachineFound = true;
      _stateMachineWarningLogged = false;
      _previousInputSignature = null;
    });

    _broadcastRiveState();
    _startPolling();
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      final signature = _buildInputSignature();
      if (signature == _previousInputSignature) {
        return;
      }

      _broadcastRiveState();
    });
  }

  Map<String, dynamic> _buildTelemetryPayload() {
    return {
      'source': kTelemetrySource,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'stateMachine': kStateMachineName,
      'inputs': _stateMachine?.inputs.map(_serializeInput).toList() ?? [],
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
    final payload = _buildTelemetryPayload();
    return jsonEncode({
      'source': payload['source'],
      'stateMachine': payload['stateMachine'],
      'inputs': payload['inputs'],
    });
  }

  void _broadcastRiveState() {
    final payload = _buildTelemetryPayload();
    final formattedJson = const JsonEncoder.withIndent('  ').convert(payload);
    final compactJson = jsonEncode(payload);

    debugPrint(formattedJson);
    _previousInputSignature = _buildInputSignature();

    try {
      if (_socketConnected && _socket != null) {
        _socket!.sink.add(compactJson);
      }
    } catch (error) {
      debugPrint('RiveTelemetry WebSocket send failed: $error');
      _markSocketDisconnected();
    }

    if (mounted) {
      setState(() {
        _lastBroadcastAt = DateTime.now();
      });
    }
  }

  void _toggleBooleanInput(rive.BooleanInput input) {
    input.value = !input.value;
    _riveController?.scheduleRepaint();
    _broadcastRiveState();
  }

  void _stepNumberInput(rive.NumberInput input, double delta) {
    input.value = input.value + delta;
    _riveController?.scheduleRepaint();
    _broadcastRiveState();
  }

  void _fireTriggerInput(rive.TriggerInput input) {
    input.fire();
    _riveController?.scheduleRepaint();
    _broadcastRiveState();
  }

  void _onRiveFailed(Object error) {
    _logStateMachineWarning(error);
    if (!mounted || (!_stateMachineFound && _stateMachine == null)) {
      return;
    }

    setState(() {
      _stateMachineFound = false;
      _stateMachine = null;
    });
  }

  void _logStateMachineWarning([Object? error]) {
    if (_stateMachineWarningLogged) {
      return;
    }

    _stateMachineWarningLogged = true;
    debugPrint(
      'RiveTelemetry warning: state machine "$kStateMachineName" not found.'
      '${error == null ? '' : ' Error: $error'}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131920),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Flexible(
                flex: 5,
                child: Center(
                  child: RiveDebugger(
                    child: rive.RiveWidgetBuilder(
                      fileLoader: _fileLoader,
                      stateMachineSelector: rive.StateMachineSelector.byName(
                        kStateMachineName,
                      ),
                      builder: (context, state) => switch (state) {
                        rive.RiveLoading() => const CircularProgressIndicator(
                          color: Color(0xFF2566B9),
                        ),
                        rive.RiveFailed() => _RiveErrorMessage(
                          error: state.error,
                          onBuild: () => _onRiveFailed(state.error),
                        ),
                        rive.RiveLoaded() => Builder(
                          builder: (context) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              _onRiveLoaded(state);
                            });

                            return SizedBox.expand(
                              child: rive.RiveWidget(
                                controller: state.controller,
                                fit: rive.Fit.cover,
                                alignment: Alignment.center,
                              ),
                            );
                          },
                        ),
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              _InputControlPanel(
                inputs: _stateMachine?.inputs ?? const [],
                onToggleBoolean: _toggleBooleanInput,
                onStepNumber: _stepNumberInput,
                onFireTrigger: _fireTriggerInput,
              ),
              const SizedBox(height: 12),
              _DebugStatusPanel(
                socketConnected: _socketConnected,
                stateMachineFound: _stateMachineFound,
                inputCount: _stateMachine?.inputs.length ?? 0,
                lastBroadcastAt: _lastBroadcastAt,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RiveErrorMessage extends StatelessWidget {
  const _RiveErrorMessage({required this.error, this.onBuild});

  final Object error;
  final VoidCallback? onBuild;

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      onBuild?.call();
    });

    return Center(
      child: Text(
        error.toString(),
        style: const TextStyle(color: Colors.red),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _InputControlPanel extends StatelessWidget {
  const _InputControlPanel({
    required this.inputs,
    required this.onToggleBoolean,
    required this.onStepNumber,
    required this.onFireTrigger,
  });

  final List<rive.Input> inputs;
  final ValueChanged<rive.BooleanInput> onToggleBoolean;
  final void Function(rive.NumberInput input, double delta) onStepNumber;
  final ValueChanged<rive.TriggerInput> onFireTrigger;

  @override
  Widget build(BuildContext context) {
    if (inputs.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          'Debug controls',
          style: TextStyle(
            color: Colors.white70,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: inputs.map((input) {
            if (input is rive.BooleanInput) {
              return _BooleanInputControl(
                input: input,
                onPressed: () => onToggleBoolean(input),
              );
            }

            if (input is rive.NumberInput) {
              return _NumberInputControl(
                input: input,
                onStep: (delta) => onStepNumber(input, delta),
              );
            }

            if (input is rive.TriggerInput) {
              return _TriggerInputControl(
                input: input,
                onPressed: () => onFireTrigger(input),
              );
            }

            return _ControlChip(label: '${input.name}: unsupported');
          }).toList(),
        ),
      ],
    );
  }
}

class _BooleanInputControl extends StatelessWidget {
  const _BooleanInputControl({required this.input, required this.onPressed});

  final rive.BooleanInput input;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return _ControlChip(
      label: '${input.name}: ${input.value}',
      child: Switch(
        value: input.value,
        onChanged: (_) => onPressed(),
        activeColor: const Color(0xFF2566B9),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

class _NumberInputControl extends StatelessWidget {
  const _NumberInputControl({required this.input, required this.onStep});

  final rive.NumberInput input;
  final ValueChanged<double> onStep;

  @override
  Widget build(BuildContext context) {
    return _ControlChip(
      label: '${input.name}: ${input.value.toStringAsFixed(1)}',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _TinyButton(label: '-', onPressed: () => onStep(-1)),
          const SizedBox(width: 4),
          _TinyButton(label: '+', onPressed: () => onStep(1)),
        ],
      ),
    );
  }
}

class _TriggerInputControl extends StatelessWidget {
  const _TriggerInputControl({required this.input, required this.onPressed});

  final rive.TriggerInput input;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return _ControlChip(
      label: input.name,
      child: _TinyButton(label: 'fire', onPressed: onPressed),
    );
  }
}

class _ControlChip extends StatelessWidget {
  const _ControlChip({required this.label, this.child});

  final String label;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1D2730),
        border: Border.all(color: const Color(0xFF33414D)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
          if (child != null) ...[const SizedBox(width: 8), child!],
        ],
      ),
    );
  }
}

class _TinyButton extends StatelessWidget {
  const _TinyButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 28,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          backgroundColor: const Color(0xFF2566B9),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 11)),
      ),
    );
  }
}

class _DebugStatusPanel extends StatelessWidget {
  const _DebugStatusPanel({
    required this.socketConnected,
    required this.stateMachineFound,
    required this.inputCount,
    required this.lastBroadcastAt,
  });

  final bool socketConnected;
  final bool stateMachineFound;
  final int inputCount;
  final DateTime? lastBroadcastAt;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(
      context,
    ).textTheme.bodySmall?.copyWith(color: Colors.white70, height: 1.4);

    return Align(
      alignment: Alignment.centerLeft,
      child: DefaultTextStyle(
        style: style ?? const TextStyle(color: Colors.white70),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'WebSocket: ${socketConnected ? 'connected' : 'disconnected'}',
            ),
            Text('State machine: ${stateMachineFound ? 'found' : 'not found'}'),
            Text('Inputs: $inputCount'),
            Text(
              'Last broadcast: '
              '${lastBroadcastAt?.toIso8601String() ?? 'never'}',
            ),
          ],
        ),
      ),
    );
  }
}
