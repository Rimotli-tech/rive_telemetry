import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rive_telemetry/rive_telemetry.dart';

void main() {
  testWidgets('RiveDebugger returns its child unchanged', (tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: RiveDebugger(enabled: false, child: Text('placeholder')),
      ),
    );

    expect(find.text('placeholder'), findsOneWidget);
  });

  testWidgets('RiveDebugger accepts runtime identity fields', (tester) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: RiveDebugger(
          enabled: false,
          runtimeId: 'test-runtime',
          label: 'Test Runtime',
          child: Text('identified'),
        ),
      ),
    );

    expect(find.text('identified'), findsOneWidget);
  });

  testWidgets('RiveDebugger accepts ViewModel telemetry fields', (
    tester,
  ) async {
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: RiveDebugger(
          enabled: false,
          viewModelName: 'Test ViewModel',
          child: Text('view model ready'),
        ),
      ),
    );

    expect(find.text('view model ready'), findsOneWidget);
  });

  test('ViewModelTelemetry serializes to JSON', () {
    const telemetry = ViewModelTelemetry(
      supported: true,
      viewModelName: 'Mascot',
      instanceName: 'Default',
      properties: [
        ViewModelPropertyTelemetry(
          name: 'mood',
          type: 'string',
          value: 'happy',
        ),
      ],
    );

    expect(telemetry.toJson(), {
      'supported': true,
      'viewModelName': 'Mascot',
      'instanceName': 'Default',
      'properties': [
        {'name': 'mood', 'type': 'string', 'value': 'happy'},
      ],
    });
  });

  test('ViewModel telemetry adapter reports unsupported without instance', () {
    const adapter = RiveViewModelTelemetryAdapter();

    final telemetry = adapter.capture(viewModelName: 'Mascot');

    expect(telemetry.supported, isFalse);
    expect(telemetry.reason, 'No ViewModelInstance provided');
    expect(telemetry.viewModelName, 'Mascot');
    expect(telemetry.properties, isEmpty);
  });
}
