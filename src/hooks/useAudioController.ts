/* src/hooks/useAudioController.ts */

import { useRef, useEffect, useCallback } from 'react';
import { MicrogameDefinition } from '../types/MicrogameDefinition';

export const useAudioController = (
    skinConfig: any,
    assetsDefinition: MicrogameDefinition['assets'],
    isPlaying: boolean,
    isPausedForOverlay: boolean
) => {
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);

    // --- 1. Background Music Management ---
    useEffect(() => {
        // Resolve URL: Custom Skin -> Default Definition -> Null
        const customBg = skinConfig?.['bgMusic'];
        const customUrl = customBg?.url;
        const defaultUrl = assetsDefinition['bgMusic']?.defaultAudioUrl;
        
        const finalUrl = customUrl || defaultUrl;
        const volume = customBg?.volume ?? 1.0;

        if (finalUrl) {
            const audio = new Audio(finalUrl);
            audio.loop = true;
            audio.volume = volume;
            bgMusicRef.current = audio;
        }

        // STRICT UNMOUNT CLEANUP: Stop downloading and destroy object to prevent bleed
        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current.src = '';
                bgMusicRef.current = null;
            }
        };
    }, [skinConfig, assetsDefinition]);

    // --- 2. Play/Pause Logic ---
    useEffect(() => {
        const audio = bgMusicRef.current;
        if (!audio) return;

        if (isPlaying && !isPausedForOverlay) {
            // Promise handling to avoid "Play request interrupted" errors
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    // Auto-play policy errors are expected until user interaction
                    console.warn("Audio autoplay blocked:", e);
                });
            }
        } else {
            audio.pause();
        }
    }, [isPlaying, isPausedForOverlay]);

    // --- 3. SFX Trigger Logic ---
    const playSound = useCallback((key: string) => {
        // 1. Try Custom Skin Config
        const audioData = skinConfig?.[key];
        let url = audioData?.url || null;
        let volume = audioData?.volume ?? 1.0;

        // 2. Fallback to Definition
        if (!url) {
            const def = (assetsDefinition as any)[key];
            if (def && def.type === 'audio') url = def.defaultAudioUrl;
        }

        // 3. Play
        if (url) {
            const audio = new Audio(url);
            audio.volume = volume;
            audio.play().catch(e => console.warn("SFX play failed", e));
        }
    }, [skinConfig, assetsDefinition]);

    // --- 4. Event-Based Triggering ---
    const playSoundForEvent = useCallback((eventName: string, defaultAssetKey?: string) => {
        let playedCustom = false;
        
        // A. Search for ANY matching Custom Asset (Base or Layer)
        if (skinConfig) {
            Object.entries(skinConfig).forEach(([key, data]) => {
                const config = data as any;
                
                // Only process entries that have triggers defined
                if (config.triggerEvents && Array.isArray(config.triggerEvents)) {
                    // Check for Match
                    const isMatch = config.triggerEvents.some((trigger: string) => 
                        trigger === eventName || eventName.startsWith(`${trigger}:`)
                    );

                    if (isMatch) {
                        const url = config.url;
                        const volume = config.volume ?? 1.0;
                        if (url) {
                            const audio = new Audio(url);
                            audio.volume = volume;
                            audio.play().catch(e => console.warn("Event Audio failed", e));
                            playedCustom = true;
                        }
                    }
                }
            });
        }

        // B. Fallback Logic
        // If we found a match in Step A, we are done.
        if (playedCustom) return;

        // If no match was found, we check the Default Asset Key (e.g. 'sfxCollision').
        if (defaultAssetKey) {
            const customDefault = skinConfig?.[defaultAssetKey];

            // CRITICAL FIX: If a custom config exists for this key...
            if (customDefault) {
                // ...and it has EXPLICIT rules (even an empty array)...
                if (Array.isArray((customDefault as any).triggerEvents)) {
                    // ...then the fact that 'playedCustom' is false means it FAILED to match.
                    // We must respect this silence. RETURN.
                    return; 
                }
                // If it has NO rules (legacy/simple mode), we allow it to play below.
            }

            // If no custom config exists OR custom config has no rules, play default.
            playSound(defaultAssetKey);
        }
    }, [skinConfig, playSound]);

    return { playSound, playSoundForEvent };
};