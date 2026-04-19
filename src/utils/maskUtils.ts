// src/utils/maskUtils.ts

import { MaskConfig } from '../types';

export const getMaskConfig = (
    userConfig: MaskConfig | undefined, 
    defaultHeadline: string, 
    defaultBody: string,
    defaultIcon: boolean = true
): MaskConfig => {
    // Base Defaults
    const defaults: MaskConfig = {
        headline: defaultHeadline,
        body: defaultBody,
        showIcon: defaultIcon,
        animation: 'fade',
        strokeWidth: 0, // Default 0 for masks usually
        strokeStyle: 'none',
        paddingTop: 30,
        paddingBottom: 30,
        paddingX: 20,
        spacing: 15,
        style: { backgroundColor: 'rgba(0,0,0,0.85)', textColor: '#ffffff', strokeColor: 'transparent' },
        lightStyle: { backgroundColor: 'rgba(255,255,255,0.9)', textColor: '#000000', strokeColor: 'transparent' }
    };

    // Merge user config if it exists
    if (userConfig) {
        return {
            ...defaults,
            ...userConfig,
            style: { ...defaults.style, ...userConfig.style },
            lightStyle: { ...defaults.lightStyle, ...userConfig.lightStyle }
        };
    }

    return defaults;
};