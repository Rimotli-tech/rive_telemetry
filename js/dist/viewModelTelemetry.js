import { callMethod, isRecord, readArray, readString } from './guards.js';
export function captureViewModelTelemetry(options) {
    const { instance, viewModelName } = options;
    if (!instance) {
        return {
            supported: false,
            reason: 'No ViewModelInstance provided',
            viewModelName,
            properties: [],
        };
    }
    if (!isRecord(instance)) {
        return {
            supported: false,
            reason: 'Invalid ViewModelInstance provided',
            viewModelName,
            properties: [],
        };
    }
    try {
        const properties = discoverProperties(instance).map((property) => captureProperty(instance, property));
        return {
            supported: true,
            viewModelName,
            instanceName: readString(instance.name),
            properties,
        };
    }
    catch (error) {
        return {
            supported: false,
            reason: `ViewModel telemetry unavailable: ${formatError(error)}`,
            viewModelName,
            properties: [],
        };
    }
}
export function setViewModelProperty(options) {
    const { instance, instanceName, propertyName, propertyType, value } = options;
    if (!isRecord(instance)) {
        return false;
    }
    if (instanceName &&
        typeof instance.name === 'string' &&
        instance.name !== instanceName) {
        return false;
    }
    const property = propertyByType(instance, propertyType, propertyName);
    if (!isRecord(property)) {
        return false;
    }
    if (propertyType === 'trigger') {
        return fireTriggerProperty(property);
    }
    if (!isAssignableValue(propertyType, value)) {
        return false;
    }
    return assignPropertyValue(property, propertyType, value);
}
function discoverProperties(instance) {
    const direct = readArray(instance.properties);
    if (direct.length > 0) {
        return direct;
    }
    const fromGetter = readArray(callMethod(instance, 'getProperties'));
    if (fromGetter.length > 0) {
        return fromGetter;
    }
    const viewModel = instance.viewModel;
    if (isRecord(viewModel)) {
        return readArray(viewModel.properties);
    }
    return [];
}
function captureProperty(instance, property) {
    if (!isRecord(property)) {
        return { name: '', type: 'unknown', value: null };
    }
    const name = readString(property.name) ?? '';
    const type = normalizeType(readString(property.type) ?? readString(property.kind));
    return {
        name,
        type,
        value: readPropertyValue(instance, property, name, type),
    };
}
function readPropertyValue(instance, descriptor, name, type) {
    if (!name) {
        return null;
    }
    const property = propertyByType(instance, type, name);
    if (isRecord(property) && 'value' in property) {
        return serializePropertyValue(type, property.value);
    }
    if ('value' in descriptor) {
        return descriptor.value ?? null;
    }
    if (type === 'list') {
        const list = property ?? callMethod(instance, 'list', [name]);
        if (isRecord(list) && typeof list.length === 'number') {
            return list.length;
        }
        if (isRecord(list) && typeof list.size === 'number') {
            return list.size;
        }
        if (isRecord(list) && typeof list.count === 'number') {
            return list.count;
        }
    }
    return null;
}
function propertyByType(instance, type, name) {
    const methodNames = methodNamesForType(type);
    for (const methodName of methodNames) {
        const property = callMethod(instance, methodName, [name]);
        if (property) {
            return property;
        }
    }
    return undefined;
}
function serializePropertyValue(type, value) {
    if (value === undefined || value === null) {
        return null;
    }
    if (type === 'color' && typeof value === 'number') {
        return `#${(value >>> 0).toString(16).padStart(8, '0')}`;
    }
    return value;
}
function methodNamesForType(type) {
    switch (type) {
        case 'number':
            return ['number', 'numberProperty'];
        case 'boolean':
            return ['boolean', 'booleanProperty'];
        case 'string':
            return ['string', 'stringProperty'];
        case 'color':
            return ['color', 'colorProperty'];
        case 'enum':
            return ['enum', 'enumerator', 'enumProperty'];
        case 'trigger':
            return ['trigger', 'triggerProperty'];
        case 'list':
            return ['list', 'listProperty'];
        case 'image':
            return ['image', 'imageProperty'];
        case 'artboard':
            return ['artboard', 'artboardProperty'];
        default:
            return [type, `${type}Property`];
    }
}
function fireTriggerProperty(property) {
    for (const methodName of ['trigger', 'fire']) {
        const method = property[methodName];
        if (typeof method === 'function') {
            method.call(property);
            return true;
        }
    }
    return false;
}
function isAssignableValue(type, value) {
    switch (type) {
        case 'number':
            return typeof value === 'number';
        case 'boolean':
            return typeof value === 'boolean';
        case 'string':
        case 'enum':
            return typeof value === 'string';
        case 'color':
            return typeof value === 'string';
        default:
            return false;
    }
}
function assignPropertyValue(property, type, value) {
    const nextValue = type === 'color' ? parseColor(value) : value;
    if (nextValue === undefined) {
        return false;
    }
    if ('value' in property) {
        property.value = nextValue;
        return true;
    }
    const setValue = property.setValue;
    if (typeof setValue === 'function') {
        setValue.call(property, nextValue);
        return true;
    }
    return false;
}
function parseColor(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim().replace(/^#/, '');
    if (normalized.length !== 6 && normalized.length !== 8) {
        return undefined;
    }
    if (!/^[0-9a-fA-F]+$/.test(normalized)) {
        return undefined;
    }
    const parsed = Number.parseInt(normalized, 16);
    if (Number.isNaN(parsed)) {
        return undefined;
    }
    return normalized.length === 6 ? (0xff000000 | parsed) >>> 0 : parsed >>> 0;
}
function normalizeType(type) {
    if (!type) {
        return 'unknown';
    }
    if (type === 'enumType') {
        return 'enum';
    }
    return type;
}
function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=viewModelTelemetry.js.map