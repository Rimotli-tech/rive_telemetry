import 'package:flutter/material.dart';
import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

const _assetPath = 'assets/demo_2.riv';
const _stateMachineName = 'State Machine 1';
const _viewModelName = 'CatViewModel';
const _viewModelInstanceName = 'catVMInstance';

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

class ExampleHomePage extends StatefulWidget {
  const ExampleHomePage({super.key});

  @override
  State<ExampleHomePage> createState() => _ExampleHomePageState();
}

class _ExampleHomePageState extends State<ExampleHomePage> {
  late final rive.FileLoader _fileLoader;
  rive.StateMachine? _stateMachine;
  rive.ViewModelInstance? _viewModelInstance;

  @override
  void initState() {
    super.initState();
    _fileLoader = rive.FileLoader.fromAsset(
      _assetPath,
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
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'RiveTelemetry Cat Example',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Open the RiveTelemetry VS Code panel, then run this app.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: const Color(0xFF111820),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: rive.RiveWidgetBuilder(
                          fileLoader: _fileLoader,
                          stateMachineSelector: rive
                              .StateMachineSelector.byName(_stateMachineName),
                          dataBind: rive.DataBind.byName(
                            _viewModelInstanceName,
                          ),
                          builder: (context, state) => switch (state) {
                            rive.RiveLoading() => const Center(
                              child: CircularProgressIndicator(),
                            ),
                            rive.RiveFailed(:final error) => Center(
                              child: Text(error.toString()),
                            ),
                            rive.RiveLoaded() => Builder(
                              builder: (context) {
                                _onLoaded(state);
                                return RiveDebugger(
                                  enabled: true,
                                  source: 'rive-telemetry-example',
                                  runtimeId: 'example-cat',
                                  label: 'Cat Example',
                                  stateMachineName: _stateMachineName,
                                  stateMachine: _stateMachine,
                                  viewModelName: _viewModelName,
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
