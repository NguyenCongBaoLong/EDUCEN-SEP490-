import toast from 'react-hot-toast';

const DEDUP_WINDOW_MS = 1800;
let initialized = false;

const recentMessages = new Map();

const buildKey = (type, message) => `${type}:${String(message || '').trim()}`;

const shouldSkip = (type, message, options) => {
    if (!message || typeof message !== 'string') return false;
    if (options?.id) return false;

    const key = buildKey(type, message);
    const now = Date.now();
    const previous = recentMessages.get(key);

    recentMessages.set(key, now);
    if (!previous) return false;

    return now - previous < DEDUP_WINDOW_MS;
};

export function setupToastDedup() {
    if (initialized) return;
    initialized = true;

    const errorDescriptor = Object.getOwnPropertyDescriptor(toast, 'error');
    const successDescriptor = Object.getOwnPropertyDescriptor(toast, 'success');
    const canPatchError = !errorDescriptor || errorDescriptor.writable || !!errorDescriptor.set;
    const canPatchSuccess = !successDescriptor || successDescriptor.writable || !!successDescriptor.set;

    if (!canPatchError || !canPatchSuccess || typeof toast.error !== 'function' || typeof toast.success !== 'function') {
        return;
    }

    const originalError = toast.error.bind(toast);
    const originalSuccess = toast.success.bind(toast);

    try {
        toast.error = (message, options) => {
            if (shouldSkip('error', message, options)) return undefined;
            return originalError(message, options);
        };

        toast.success = (message, options) => {
            if (shouldSkip('success', message, options)) return undefined;
            return originalSuccess(message, options);
        };
    } catch {
        // Ignore patch failures to avoid crashing app bootstrap
    }
}
