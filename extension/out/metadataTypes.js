"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRiveMetadata = isRiveMetadata;
function isRiveMetadata(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (value.schemaVersion === 1 &&
        typeof value.source === 'string' &&
        isRecord(value.header) &&
        typeof value.header.majorVersion === 'number' &&
        typeof value.header.minorVersion === 'number' &&
        typeof value.header.fileId === 'number' &&
        typeof value.header.propertyKeyCount === 'number' &&
        Array.isArray(value.artboards) &&
        Array.isArray(value.viewModels) &&
        typeof value.recordCount === 'number' &&
        typeof value.unknownRecordCount === 'number' &&
        Array.isArray(value.warnings));
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
//# sourceMappingURL=metadataTypes.js.map