import 'dart:convert';
import 'dart:typed_data';

import 'exceptions.dart';

class RiveBinaryReader {
  RiveBinaryReader(Uint8List bytes)
    : _bytes = bytes,
      _data = ByteData.sublistView(bytes);

  final Uint8List _bytes;
  final ByteData _data;
  int _offset = 0;

  int get offset => _offset;
  bool get isEOF => _offset >= _bytes.length;

  int readUint8() {
    _requireBytes(1);
    return _bytes[_offset++];
  }

  int readInt8() {
    _requireBytes(1);
    return _data.getInt8(_offset++);
  }

  int readUint32() {
    _requireBytes(4);
    final value = _data.getUint32(_offset, Endian.little);
    _offset += 4;
    return value;
  }

  double readFloat32() {
    _requireBytes(4);
    final value = _data.getFloat32(_offset, Endian.little);
    _offset += 4;
    return value;
  }

  int readVarUint() {
    var value = 0;
    var shift = 0;
    for (var i = 0; i < 10; i++) {
      final byte = readUint8();
      value |= (byte & 0x7f) << shift;
      if ((byte & 0x80) == 0) {
        return value;
      }
      shift += 7;
    }
    throw RiveInspectionException('Invalid varuint encoding', offset: _offset);
  }

  String readString() {
    final length = readVarUint();
    _requireBytes(length);
    final value = utf8.decode(_bytes.sublist(_offset, _offset + length));
    _offset += length;
    return value;
  }

  Uint8List readBytes() {
    final length = readVarUint();
    _requireBytes(length);
    final value = Uint8List.sublistView(_bytes, _offset, _offset + length);
    _offset += length;
    return value;
  }

  void _requireBytes(int count) {
    if (_offset + count > _bytes.length) {
      throw RiveInspectionException(
        'Unexpected end of .riv data',
        offset: _offset,
      );
    }
  }
}
