export function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
export function readString(value) {
    return typeof value === 'string' ? value : undefined;
}
export function readArray(value) {
    return Array.isArray(value) ? value : [];
}
export function callMethod(target, methodName, args = []) {
    if (!isRecord(target)) {
        return undefined;
    }
    const method = target[methodName];
    if (typeof method !== 'function') {
        return undefined;
    }
    return method.apply(target, args);
}
//# sourceMappingURL=guards.js.map