import 'package:flutter/widgets.dart';

/// Placeholder wrapper that will later host runtime telemetry bridge logic.
class RiveDebugger extends StatelessWidget {
  const RiveDebugger({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return child;
  }
}
