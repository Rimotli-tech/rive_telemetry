class RiveInspectionException implements Exception {
  RiveInspectionException(this.message, {this.offset, this.cause});

  final String message;
  final int? offset;
  final Object? cause;

  @override
  String toString() {
    final buffer = StringBuffer('RiveInspectionException: $message');
    if (offset != null) {
      buffer.write(' at byte $offset');
    }
    if (cause != null) {
      buffer.write(' ($cause)');
    }
    return buffer.toString();
  }
}
