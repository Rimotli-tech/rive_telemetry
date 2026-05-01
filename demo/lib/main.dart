import 'package:flutter/material.dart';
import 'package:rive/rive.dart' as rive;
import 'package:rive_telemetry/rive_telemetry.dart';

const kRiveAssetPath = 'assets/demo.riv';
const kStateMachineName = 'State Machine 1';

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
  late final rive.FileLoader _fileLoader = rive.FileLoader.fromAsset(
    kRiveAssetPath,
    riveFactory: rive.Factory.rive,
  );

  @override
  void dispose() {
    _fileLoader.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131920),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
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
                  rive.RiveFailed() => _RiveErrorMessage(error: state.error),
                  rive.RiveLoaded() => SizedBox.expand(
                    child: rive.RiveWidget(
                      controller: state.controller,
                      fit: rive.Fit.cover,
                      alignment: Alignment.center,
                    ),
                  ),
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RiveErrorMessage extends StatelessWidget {
  const _RiveErrorMessage({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        error.toString(),
        style: const TextStyle(color: Colors.red),
        textAlign: TextAlign.center,
      ),
    );
  }
}
