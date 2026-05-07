import 'dart:convert';

import 'metadata.dart';

Map<String, Object?> metadataToJsonMap(RiveMetadata metadata) =>
    metadata.toJson();

String metadataToJson(RiveMetadata metadata, {bool pretty = true}) {
  if (pretty) {
    return const JsonEncoder.withIndent('  ').convert(metadata.toJson());
  }
  return jsonEncode(metadata.toJson());
}

RiveMetadata metadataFromJson(String source) {
  final decoded = jsonDecode(source);
  if (decoded is! Map) {
    throw const FormatException('Expected Rive metadata JSON object');
  }
  return RiveMetadata.fromJson(decoded.cast<String, Object?>());
}
