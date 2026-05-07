import 'dart:convert';

import 'metadata.dart';

String metadataToJson(RiveMetadata metadata, {bool pretty = true}) {
  if (pretty) {
    return const JsonEncoder.withIndent('  ').convert(metadata.toJson());
  }
  return jsonEncode(metadata.toJson());
}
