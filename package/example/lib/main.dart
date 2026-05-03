import 'package:flutter/material.dart';
import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

const _stateMachineName = 'State Machine 1';

const _runtimes = [
  _RuntimeConfig(
    assetPath: 'assets/demo.riv',
    runtimeId: 'flutter-example-demo',
    label: 'Flutter Example - demo.riv',
  ),
  _RuntimeConfig(
    assetPath: 'assets/demo_2.riv',
    runtimeId: 'flutter-example-demo-2',
    label: 'Flutter Example - demo_2.riv',
    viewModelName: 'CatViewModel',
    viewModelInstanceName: 'catVMInstance',
  ),
];

void main() {
  runApp(const RiveTelemetryExampleApp());
}

class RiveTelemetryExampleApp extends StatelessWidget {
  const RiveTelemetryExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RiveTelemetry Example',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const ExampleHomePage(),
    );
  }
}

class ExampleHomePage extends StatelessWidget {
  const ExampleHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 960),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'RiveTelemetry Example',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Open the RiveTelemetry VS Code panel, then run this app to stream two Flutter runtimes.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final isWide = constraints.maxWidth >= 760;
                        final children = _runtimes
                            .map((config) => _RuntimeCard(config: config))
                            .toList();

                        if (isWide) {
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(child: children[0]),
                              const SizedBox(width: 16),
                              Expanded(child: children[1]),
                            ],
                          );
                        }

                        return Column(
                          children: [
                            Expanded(child: children[0]),
                            const SizedBox(height: 16),
                            Expanded(child: children[1]),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RuntimeCard extends StatefulWidget {
  const _RuntimeCard({required this.config});

  final _RuntimeConfig config;

  @override
  State<_RuntimeCard> createState() => _RuntimeCardState();
}

class _RuntimeCardState extends State<_RuntimeCard> {
  late final rive.FileLoader _fileLoader;
  rive.StateMachine? _stateMachine;
  rive.ViewModelInstance? _viewModelInstance;

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

  void _onLoaded(rive.RiveLoaded state) {
    final stateMachine = state.controller.stateMachine;
    if (_stateMachine == stateMachine &&
        _viewModelInstance == state.viewModelInstance) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _stateMachine = stateMachine;
        _viewModelInstance = state.viewModelInstance;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final dataBindName = widget.config.viewModelInstanceName;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFF111820),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Text(
                widget.config.label,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            Expanded(
              child: rive.RiveWidgetBuilder(
                fileLoader: _fileLoader,
                stateMachineSelector: rive.StateMachineSelector.byName(
                  _stateMachineName,
                ),
                dataBind: dataBindName == null
                    ? null
                    : rive.DataBind.byName(dataBindName),
                builder: (context, state) => switch (state) {
                  rive.RiveLoading() => const Center(
                    child: CircularProgressIndicator(),
                  ),
                  rive.RiveFailed(:final error) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(error.toString()),
                    ),
                  ),
                  rive.RiveLoaded() => Builder(
                    builder: (context) {
                      _onLoaded(state);
                      return RiveDebugger(
                        enabled: true,
                        source: 'rive-telemetry-example',
                        runtimeId: widget.config.runtimeId,
                        label: widget.config.label,
                        stateMachineName: _stateMachineName,
                        stateMachine: _stateMachine,
                        viewModelName: widget.config.viewModelName,
                        viewModelInstance: _viewModelInstance,
                        child: rive.RiveWidget(
                          controller: state.controller,
                          fit: rive.Fit.contain,
                        ),
                      );
                    },
                  ),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RuntimeConfig {
  const _RuntimeConfig({
    required this.assetPath,
    required this.runtimeId,
    required this.label,
    this.viewModelName,
    this.viewModelInstanceName,
  });

  final String assetPath;
  final String runtimeId;
  final String label;
  final String? viewModelName;
  final String? viewModelInstanceName;
}
