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
}
