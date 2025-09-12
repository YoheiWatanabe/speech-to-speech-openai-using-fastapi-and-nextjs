import { AppConfig } from "../types/app";

// default
const defaultConfig: AppConfig = {
    prompt: 'You are a helpful assistant.',
    s2s: {
        model: 'gpt-realtime',
        voice: 'alloy',
    },
};

export function loadConfig(): AppConfig {
    if (typeof window === 'undefined') return defaultConfig;

    const savedConfig = localStorage.getItem('appConfig');
    const config = savedConfig ? JSON.parse(savedConfig) : defaultConfig;

    return {
        ...defaultConfig,
        ...config,
        s2s: { ...defaultConfig.s2s, ...(config.s2s || {}) }
    };
}

export function saveConfig(config: AppConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('appConfig', JSON.stringify(config));
}