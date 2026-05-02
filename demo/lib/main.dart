// ignore_for_file: deprecated_member_use

import 'package:flutter/material.dart';
import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

const kDemoRiveAssetPath = 'assets/demo.riv';
const kDemo2RiveAssetPath = 'assets/demo_2.riv';
const kPrimaryStateMachineName = 'State Machine 1';
const kSecondaryStateMachineName = 'State Machine 2';

const _runtimeConfigs = [
  _RuntimeConfig(
    assetPath: kDemoRiveAssetPath,
    stateMachineName: kPrimaryStateMachineName,
    runtimeId: 'demo-primary',
    label: 'Primary Demo',
  ),
  _RuntimeConfig(
    assetPath: kDemoRiveAssetPath,
    stateMachineName: kPrimaryStateMachineName,
    runtimeId: 'demo-secondary',
    label: 'Secondary Demo',
  ),
  _RuntimeConfig(
    assetPath: kDemo2RiveAssetPath,
    stateMachineName: kPrimaryStateMachineName,
    runtimeId: 'demo-2-state-machine-1',
    label: 'Demo 2 - State Machine 1',
  ),
  _RuntimeConfig(
    assetPath: kDemo2RiveAssetPath,
    stateMachineName: kSecondaryStateMachineName,
    runtimeId: 'demo-2-state-machine-2',
    label: 'Demo 2 - State Machine 2',
  ),
];

class _RuntimeConfig {
  const _RuntimeConfig({
    required this.assetPath,
    required this.stateMachineName,
    required this.runtimeId,
    required this.label,
  });

  final String assetPath;
  final String stateMachineName;
  final String runtimeId;
  final String label;
}

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

class DemoHomePage extends StatelessWidget {
  const DemoHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131920),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              return GridView.count(
                crossAxisCount: wide ? 2 : 1,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: wide ? 1.05 : 0.95,
                children: _runtimeConfigs
                    .map((config) => _RiveRuntimeCard(config: config))
                    .toList(),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _RiveRuntimeCard extends StatefulWidget {
  const _RiveRuntimeCard({required this.config});

  final _RuntimeConfig config;

  @override
  State<_RiveRuntimeCard> createState() => _RiveRuntimeCardState();
}

class _RiveRuntimeCardState extends State<_RiveRuntimeCard> {
  rive.RiveWidgetController? _riveController;
  rive.StateMachine? _stateMachine;
  bool _stateMachineFound = false;
  bool _stateMachineWarningLogged = false;

  late final rive.FileLoader _fileLoader;

  @override
  void initState() {
    super.initState();
    _fileLoader = rive.FileLoader.fromAsset(
      widget.config.assetPath,
      riveFactory: rive.Factory.rive,
    );
  }

  @override
  void dispose() {
    _fileLoader.dispose();
    super.dispose();
  }

  void _onRiveLoaded(rive.RiveLoaded state) {
    if (_riveController == state.controller) {
      return;
    }

    final stateMachine = state.controller.stateMachine;
    if (stateMachine.name != widget.config.stateMachineName) {
      _logStateMachineWarning();
      setState(() {
        _riveController = state.controller;
        _stateMachine = null;
        _stateMachineFound = false;
      });
      return;
    }

    debugPrint(
      'RiveTelemetry ${widget.config.runtimeId} state machine '
      '"${widget.config.stateMachineName}" found with '
      '${stateMachine.inputs.length} input(s).',
    );

    setState(() {
      _riveController = state.controller;
      _stateMachine = stateMachine;
      _stateMachineFound = true;
      _stateMachineWarningLogged = false;
    });
  }

  void _toggleBooleanInput(rive.BooleanInput input) {
    input.value = !input.value;
    _riveController?.scheduleRepaint();
    setState(() {});
  }

  void _stepNumberInput(rive.NumberInput input, double delta) {
    input.value = input.value + delta;
    _riveController?.scheduleRepaint();
    setState(() {});
  }

  void _fireTriggerInput(rive.TriggerInput input) {
    input.fire();
    _riveController?.scheduleRepaint();
    setState(() {});
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
      'RiveTelemetry warning: state machine '
      '"${widget.config.stateMachineName}" not found in '
      '${widget.config.assetPath}.'
      '${error == null ? '' : ' Error: $error'}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF18212A),
        border: Border.all(color: const Color(0xFF33414D)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              widget.config.label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Center(
              child: rive.RiveWidgetBuilder(
                fileLoader: _fileLoader,
                stateMachineSelector: rive.StateMachineSelector.byName(
                  widget.config.stateMachineName,
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
                        child: RiveDebugger(
                          // Release builds disable telemetry by default;
                          // the demo opts in for local validation.
                          enabled: true,
                          source: 'demo-flutter-web',
                          runtimeId: widget.config.runtimeId,
                          label: widget.config.label,
                          stateMachineName: widget.config.stateMachineName,
                          stateMachine: _stateMachine,
                          child: rive.RiveWidget(
                            controller: state.controller,
                            fit: rive.Fit.cover,
                            alignment: Alignment.center,
                          ),
                        ),
                      );
                    },
                  ),
                },
              ),
            ),
          ),
          const SizedBox(height: 12),
          _InputControlPanel(
            label: '${widget.config.label} controls',
            inputs: _stateMachine?.inputs ?? const [],
            onToggleBoolean: _toggleBooleanInput,
            onStepNumber: _stepNumberInput,
            onFireTrigger: _fireTriggerInput,
          ),
          const SizedBox(height: 12),
          _DebugStatusPanel(
            runtimeId: widget.config.runtimeId,
            assetPath: widget.config.assetPath,
            stateMachineFound: _stateMachineFound,
            inputCount: _stateMachine?.inputs.length ?? 0,
          ),
        ],
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
    required this.label,
    required this.inputs,
    required this.onToggleBoolean,
    required this.onStepNumber,
    required this.onFireTrigger,
  });

  final String label;
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
        Text(
          label,
          style: const TextStyle(
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
    required this.runtimeId,
    required this.assetPath,
    required this.stateMachineFound,
    required this.inputCount,
  });

  final String runtimeId;
  final String assetPath;
  final bool stateMachineFound;
  final int inputCount;

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
            Text('Runtime: $runtimeId'),
            Text('Asset: $assetPath'),
            Text('State machine: ${stateMachineFound ? 'found' : 'not found'}'),
            Text('Inputs: $inputCount'),
          ],
        ),
      ),
    );
  }
}
