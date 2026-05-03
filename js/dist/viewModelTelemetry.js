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
    if ('value' in property) {
        property.value = value;
        return true;
    }
    const setValue = property.setValue;
    if (typeof setValue === 'function') {
        setValue.call(property, value);
        return true;
    }
    return false;
}
function discoverProperties(instance) {
    const direct = readArray(instance.properties);
    if (direct.length > 0) {
        return direct;
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
        return property.value ?? null;
    }
    if ('value' in descriptor) {
        return descriptor.value ?? null;
    }
    if (type === 'list') {
        const list = property ?? callMethod(instance, 'list', [name]);
        if (isRecord(list) && typeof list.length === 'number') {
            return list.length;
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
        case 'color':
        case 'enum':
            return typeof value === 'string';
        default:
            return false;
    }
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