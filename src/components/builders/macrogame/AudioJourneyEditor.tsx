/* src/components/builders/macrogame/AudioJourneyEditor.tsx */

import React, { useState, useRef, useEffect } from 'react';
import { styles } from '../../../App.styles';
import { MacrogameAudioConfig, AudioTrackConfig, Microgame, CustomMicrogame } from '../../../types';
import { MACROGAME_MUSIC_LIBRARY } from '../../../constants';
import { storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateUUID } from '../../../utils/helpers';
import { notifications } from '../../../utils/notifications';
import { MICROGAME_DEFINITIONS } from '../../../microgames/definitions/index';

// --- Type Definitions ---
interface FlowItem {
    baseGame: Microgame;
    customVariant?: CustomMicrogame;
}

interface AudioJourneyEditorProps {
    audioConfig: MacrogameAudioConfig;
    onChange: (config: MacrogameAudioConfig) => void;
    flow: FlowItem[];
    introScreen: any;
    promoScreen: any;
    globalPreGameConfig: any;
    globalResultConfig: any;
    conversionScreen: any;
    allConversionMethods: any[];
    showPoints: boolean;
    pointDisplayMode: string;
    enableTallyAnimation: boolean;
}

// --- Global Audio Manager (Ensures only one track plays at a time across all editors) ---
let globalAudioRef: HTMLAudioElement | null = null;

const stopPreviewTrack = () => {
    if (globalAudioRef) {
        globalAudioRef.pause();
        globalAudioRef.src = ''; // Force stop downloading to prevent memory leaks
        globalAudioRef = null;
    }
};

const playPreviewTrack = (url: string, onEnd: () => void) => {
    stopPreviewTrack(); // Ensure clean slate
    
    const audio = new Audio(url);
    globalAudioRef = audio;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            // Safely swallow the AbortError caused by rapid clicking
            if (e.name !== 'AbortError') {
                console.warn("Audio preview failed:", e);
            }
        });
    }
    
    audio.onended = () => {
        if (globalAudioRef === audio) {
            onEnd();
        }
    };
};

// --- Modular Sub-Component: Individual Track Editor ---
const AudioTrackEditor: React.FC<{
    label: string;
    description?: string;
    config?: AudioTrackConfig;
    parentConfig?: AudioTrackConfig;
    gameBgmName?: string; // Support for Game-Level Inheritance
    onChange: (config: AudioTrackConfig | undefined) => void;
    allowLibrary?: boolean; 
    isGlobal?: boolean;
    allowExtendedOptions?: boolean;
}> = ({ label, description, config, parentConfig, gameBgmName, onChange, isGlobal = false, allowExtendedOptions = false }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);

    const isMuted = config?.libraryId === 'mute';
    const isInheritGame = config?.libraryId === 'inherit_game';
    const isInheritingGlobal = !config && !isGlobal;
    const effectiveConfig = isInheritingGlobal ? parentConfig : config;

    const activeUrl = isMuted || isInheritGame ? null : (effectiveConfig?.url || (effectiveConfig?.libraryId && effectiveConfig.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === effectiveConfig.libraryId)?.path : null));
    const currentVolume = effectiveConfig?.volume ?? 1.0;

    // Resolve Parent Name for the Dropdown Label
    const getParentName = () => {
        if (!parentConfig) return 'None';
        if (parentConfig.fileName) return parentConfig.fileName;
        if (parentConfig.url) return 'Uploaded File';
        if (parentConfig.libraryId && parentConfig.libraryId !== 'none') {
            return MACROGAME_MUSIC_LIBRARY.find(t => t.id === parentConfig.libraryId)?.name || 'Unknown';
        }
        return 'None';
    };
    const parentNameStr = getParentName();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `macrogame-audio-drafts/${generateUUID()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            onChange({ ...config, url: downloadUrl, fileName: file.name, libraryId: null });
        } catch (error) {
            console.error("Audio upload failed:", error);
            notifications.error("Failed to upload audio track.");
        } finally {
            setIsUploading(false);
            setFileInputKey(k => k + 1);
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            stopPreviewTrack();
            setIsPlaying(false);
        } else if (activeUrl) {
            setIsPlaying(true);
            playPreviewTrack(activeUrl, () => setIsPlaying(false));
            if (globalAudioRef) globalAudioRef.volume = currentVolume;
        }
    };

    const handleReplay = () => {
        if (activeUrl) {
            stopPreviewTrack();
            setIsPlaying(true);
            playPreviewTrack(activeUrl, () => setIsPlaying(false));
            if (globalAudioRef) globalAudioRef.volume = currentVolume;
        }
    };

    const handleVolumeChange = (vol: number) => {
        const base = config || { libraryId: parentConfig?.libraryId, url: parentConfig?.url, fileName: parentConfig?.fileName };
        onChange({ ...base, volume: vol });
        if (globalAudioRef && isPlaying) {
            globalAudioRef.volume = vol;
        }
    };

    useEffect(() => {
        return () => { if (isPlaying) stopPreviewTrack(); };
    }, [isPlaying]);

    const displayLabel = isMuted ? 'Muted' : 
                         config?.fileName ? config.fileName : 
                         (config?.url ? 'Uploaded File' : 
                         (isInheritGame ? `Inheriting: ${gameBgmName || 'Game BGM'}` :
                         (isInheritingGlobal && parentConfig && activeUrl ? `Inheriting: ${parentConfig.fileName || MACROGAME_MUSIC_LIBRARY.find(t => t.id === parentConfig.libraryId)?.name || 'Master'}` : 
                         'No file')));

    return (
        <div style={{ marginBottom: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
            {description && <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem' }}>{description}</div>}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <select 
                        value={config?.url ? 'custom' : (config?.libraryId || (isGlobal ? 'none' : 'inherit_global'))} 
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'inherit_global' || val === 'none') {
                                onChange(undefined);
                            } else if (val === 'inherit_game') {
                                onChange({ libraryId: 'inherit_game', url: null, fileName: null });
                            } else if (val === 'mute') {
                                onChange({ libraryId: 'mute', url: null, fileName: null });
                            } else if (val === 'custom') {
                                // Ignore
                            } else {
                                onChange({ ...config, libraryId: val, url: null, fileName: null });
                            }
                        }}
                        style={{ ...styles.input, width: '100%', fontSize: '0.85rem' }}
                    >
                        {isGlobal ? (
                            <option value="none">None</option>
                        ) : (
                            <>
                                <option value="inherit_global">Inherit [Global Master]</option>
                                {gameBgmName && <option value="inherit_game">Inherit [Microgame BGM: {gameBgmName}]</option>}
                                <option value="mute">Mute (Silence)</option>
                            </>
                        )}
                        {config?.url && <option value="custom">Uploaded File</option>}
                        {MACROGAME_MUSIC_LIBRARY.filter(t => t.id !== 'none').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 500 }}>OR</span>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ 
                        backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px',
                        padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: isUploading ? 'not-allowed' : 'pointer',
                        fontWeight: 600, color: '#333', whiteSpace: 'nowrap', flexShrink: 0, opacity: isUploading ? 0.5 : 1
                    }}>
                        {isUploading ? 'Uploading...' : 'Upload File'}
                        <input key={fileInputKey} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
                    </label>
                    
                    <span style={{ fontSize: '0.75rem', color: (config?.url || (isInheritingGlobal && activeUrl) || isInheritGame) ? '#333' : '#999', fontStyle: (config?.url || (isInheritingGlobal && activeUrl) || isInheritGame) ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {displayLabel}
                    </span>

                    {config && config.url && (
                        <button 
                            type="button" 
                            onClick={() => {
                                stopPreviewTrack();
                                setIsPlaying(false);
                                setFileInputKey(k => k + 1);
                                onChange({ ...config, url: undefined, fileName: undefined });
                            }} 
                            style={{ padding: '0.2rem 0.5rem', backgroundColor: '#fff', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {activeUrl && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                    <button type="button" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: isPlaying ? '#e74c3c' : '#0866ff', color: 'white', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button type="button" onClick={handleReplay} title="Replay from start" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        ↺
                    </button>
                    <div style={{ flex: 1, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#666', display: 'block' }}>
                            Volume ({Math.round(currentVolume * 100)}%) {isInheritingGlobal ? '(Inherited)' : ''}
                        </label>
                        <input type="range" min="0" max="1" step="0.05" value={currentVolume} onChange={(e) => handleVolumeChange(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer', height: '6px' }} />
                    </div>
                </div>
            )}

            {allowExtendedOptions && activeUrl && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #cce4ff' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', color: '#0056b3' }}>
                        <input type="checkbox" checked={config?.playFullDuration ?? false} onChange={(e) => onChange({ ...effectiveConfig, playFullDuration: e.target.checked, bgmBehavior: e.target.checked ? 'overlap' : undefined })} />
                        Play full audio track (Acts as Reward Music)
                    </label>
                    {config?.playFullDuration && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#333' }}>Background Music (BGM) Behavior</label>
                            <select value={config?.bgmBehavior || 'overlap'} onChange={(e) => onChange({ ...effectiveConfig, bgmBehavior: e.target.value as any, bgmDuckVolume: e.target.value === 'duck' ? 0.2 : undefined })} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', width: '100%', backgroundColor: '#fff' }}>
                                <option value="overlap">Overlap (Play together)</option>
                                <option value="duck">Reduce BGM Volume (Duck)</option>
                                <option value="stop">Stop BGM completely</option>
                            </select>
                            {config?.bgmBehavior === 'duck' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', width: '90px', fontWeight: 'bold', color: '#555' }}>BGM Vol: {Math.round((config?.bgmDuckVolume ?? 0.2) * 100)}%</label>
                                    <input type="range" min="0" max="1" step="0.05" value={config?.bgmDuckVolume ?? 0.2} onChange={(e) => onChange({ ...effectiveConfig, bgmDuckVolume: Number(e.target.value) })} style={{ flex: 1, cursor: 'pointer' }} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Modular Sub-Component: Read-Only Microgame Audio ---
const ReadOnlyMicrogameAudio: React.FC<{ item: FlowItem, index: number }> = ({ item, index }) => {
    const variant = item.customVariant;
    const gameName = variant?.name || item.baseGame.name;
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    
    // Extract audio triggers from variant skin data
    const audioItems: { label: string, url: string, volume: number }[] = [];
    if (variant?.skinData) {
        
        // 1. Get the authoritative definition for this microgame
        let definition = MICROGAME_DEFINITIONS[item.baseGame.id];
        if (!definition) {
            const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === item.baseGame.id.toLowerCase());
            if (key) definition = MICROGAME_DEFINITIONS[key];
        }
        const assetsDef = definition?.assets || {};

        Object.entries(variant.skinData).forEach(([key, data]) => {
            // Strictly check that a valid, non-empty URL exists
            const hasValidUrl = typeof data.url === 'string' && data.url.trim() !== '';
            if (!hasValidUrl) return;

            // 2. Identify if this key is audio based on the OFFICIAL DEFINITION
            // We handle custom layer suffixes (e.g., bgMusic_layer_123) by checking the base string
            const baseKey = key.split('_layer_')[0];
            const assetDef = assetsDef[baseKey];
            
            const isDefinedAudio = assetDef && assetDef.type === 'audio';
            const isHardcodedAudio = baseKey.toLowerCase().includes('bgmusic') || baseKey.toLowerCase().includes('sfx');

            if (isDefinedAudio || isHardcodedAudio) {
                const rawTriggers = (data as any).triggerEvents;
                const triggers = Array.isArray(rawTriggers) ? rawTriggers : [];
                
                // 3. Generate a friendly label
                let label = key;
                if (baseKey.toLowerCase().includes('bgmusic')) label = 'Background Music';
                else if (baseKey === 'sfxWin' || triggers.includes('win')) label = 'Game Win';
                else if (baseKey === 'sfxLoss' || triggers.includes('loss')) label = 'Game Loss';
                else if (baseKey === 'sfxTryAgain' || triggers.includes('try_again')) label = 'Try Again';
                else if (baseKey === 'catch_good' || triggers.includes('catch_good')) label = 'Action: Good Catch';
                else if (baseKey === 'catch_bad' || triggers.includes('catch_bad')) label = 'Action: Bad Catch / Obstacle';
                else if (triggers.length > 0) label = `Action: ${triggers.join(', ')}`;
                else if (assetDef && assetDef.name) label = assetDef.name; // Ultimate fallback to Builder's friendly name
                
                if (key.includes('_layer_')) {
                    label = `${label} (Additional Rule)`;
                }

                // 4. Safely handle volume (Database nulls mean 100% default)
                const rawVol = (data as any).volume;
                const volume = (rawVol !== undefined && rawVol !== null) ? Number(rawVol) : 1.0;
                
                audioItems.push({ label, url: data.url, volume });
            }
        });
    }

    const togglePlay = (url: string, volume: number) => {
        if (playingUrl === url) {
            stopPreviewTrack();
            setPlayingUrl(null);
        } else {
            setPlayingUrl(url);
            playPreviewTrack(url, () => setPlayingUrl(null));
            if (globalAudioRef) globalAudioRef.volume = volume;
        }
    };

    const handleReplay = (url: string, volume: number) => {
        setPlayingUrl(url);
        playPreviewTrack(url, () => setPlayingUrl(null));
        if (globalAudioRef) globalAudioRef.volume = volume;
    };

    useEffect(() => {
        return () => { if (playingUrl) stopPreviewTrack(); };
    }, [playingUrl]);

    return (
        <div style={{ padding: '1rem', backgroundColor: '#eaf5fc', border: '1px solid #b6d4fe', borderRadius: '8px', marginLeft: '2rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-2.5rem', top: '1rem', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#0866ff', border: '2px solid #fff', boxShadow: '0 0 0 2px #0866ff' }} />
            
            <h6 style={{ margin: '0 0 0.5rem 0', color: '#084298', fontSize: '0.9rem' }}>🎮 Game {index + 1}: {gameName} (Read-Only)</h6>
            <p style={{ fontSize: '0.8rem', color: '#052c65', margin: '0 0 1rem 0' }}>Gameplay audio is strictly locked to the Microgame Variant. Edit the variant in the library to change these.</p>
            
            {audioItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {audioItems.map((aud, i) => {
                        const isPlaying = playingUrl === aud.url;
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#084298', backgroundColor: '#fff', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #b6d4fe' }}>
                                <button
                                    type="button"
                                    onClick={() => togglePlay(aud.url, aud.volume)}
                                    title={isPlaying ? "Pause" : "Play"}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        border: 'none', backgroundColor: isPlaying ? '#e74c3c' : '#0866ff',
                                        color: 'white', fontSize: '0.9rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    {isPlaying ? '⏸' : '▶'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReplay(aud.url, aud.volume)}
                                    title="Replay from start"
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        border: '1px solid #b6d4fe', backgroundColor: '#eaf5fc',
                                        color: '#084298', fontSize: '0.85rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    ↺
                                </button>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600 }}>{aud.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', backgroundColor: '#f0f2f5', padding: '2px 6px', borderRadius: '4px' }}>
                                        Vol: {Math.round(aud.volume * 100)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ fontSize: '0.8rem', color: '#052c65', fontStyle: 'italic' }}>No custom audio configured in this variant.</div>
            )}
        </div>
    );
};

// --- Modular Sub-Component: Timeline Stage Card ---
const TimelineStageCard: React.FC<{ title: string; children: React.ReactNode; expandTrigger?: any }> = ({ title, children, expandTrigger }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Automatically expand the card if the parent trigger (like Global BGM) becomes active
        if (expandTrigger && expandTrigger !== 'none') {
            setIsExpanded(true);
        }
    }, [expandTrigger]);

    return (
        <div style={{ marginLeft: '2rem', position: 'relative', marginBottom: '1rem' }}>
            {/* Timeline Node Dot */}
            <div style={{ position: 'absolute', left: '-2.5rem', top: '1.25rem', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', border: '3px solid #ccc', zIndex: 2 }} />
            
            <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ padding: '1rem', backgroundColor: '#fdfdfd', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <h5 style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{title}</h5>
                    <span style={{ fontSize: '0.8rem', color: '#888', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>
                
                {isExpanded && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #eee', backgroundColor: '#fafafa' }}>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const AudioJourneyEditor: React.FC<AudioJourneyEditorProps> = ({
    audioConfig,
    onChange,
    flow,
    introScreen,
    promoScreen,
    globalPreGameConfig,
    globalResultConfig,
    conversionScreen,
    allConversionMethods,
    showPoints,
    pointDisplayMode,
    enableTallyAnimation
}) => {
    // Ensure safe access
    const safeConfig: MacrogameAudioConfig = {
        global: audioConfig?.global || {},
        stages: audioConfig?.stages || {},
        events: audioConfig?.events || {}
    };

    // State Updaters
    const updateGlobal = (key: keyof MacrogameAudioConfig['global'], track?: AudioTrackConfig) => {
        onChange({ ...safeConfig, global: { ...safeConfig.global, [key]: track } });
    };

    const updateStage = (stageKey: string, key: 'bgMusic' | 'primaryClick' | 'secondaryClick' | 'scoreTally' | 'screenTransition' | 'timerTick' | 'timerGo', track?: AudioTrackConfig) => {
        const stage = safeConfig.stages[stageKey] || { playMusic: true };
        onChange({ ...safeConfig, stages: { ...safeConfig.stages, [stageKey]: { ...stage, [key]: track } } });
    };

    // Helper to determine what audio triggers a screen needs
    const getAudioNeeds = (transition?: any) => {
        const t = transition || {};
        const isAuto = t.type === 'auto';
        const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
        return { btn: isButton, trans: !isAuto && !isButton, auto: isAuto };
    };

    const getGameBgmName = (item: FlowItem) => {
        let name = 'Default Track';
        let hasBgm = false;
        
        let definition = MICROGAME_DEFINITIONS[item.baseGame.id];
        if (!definition) {
            const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === item.baseGame.id.toLowerCase());
            if (key) definition = MICROGAME_DEFINITIONS[key];
        }
        if (definition?.assets?.['bgMusic']?.type === 'audio') hasBgm = true;

        if (item.customVariant?.skinData) {
            Object.entries(item.customVariant.skinData).forEach(([k, data]) => {
                if (k.toLowerCase().includes('bgmusic') && typeof data.url === 'string' && data.url.trim() !== '') {
                    hasBgm = true;
                    name = data.fileName && data.fileName !== 'preset' ? data.fileName : 'Custom Upload';
                }
            });
        }
        return hasBgm ? name : null;
    };

    // --- INTELLIGENCE LAYER: Scan Entire Flow for Global Needs ---
    let globalBtn = false;
    let globalTrans = false;
    let globalAuto = false;

    const checkGlobalT = (t?: any) => {
        const isAuto = (t?.type || 'interact') === 'auto';
        const isBtn = !isAuto && (t?.interactionMethod || 'click') === 'click' && (t?.clickFormat || 'disclaimer') === 'button';
        if (isAuto) globalAuto = true;
        else if (isBtn) globalBtn = true;
        else globalTrans = true;
    };

    if (introScreen.enabled) checkGlobalT(introScreen.transition);
    if (promoScreen.enabled) checkGlobalT(promoScreen.transition);

    flow.forEach(item => {
        checkGlobalT((item as any).preGameConfig?.transition || globalPreGameConfig?.transition);
        const rConf = (item as any).resultConfig || globalResultConfig || {};
        if (rConf.enabled !== false) {
            checkGlobalT(rConf.transition);
            const wType = item.winCondition?.type || 'time';
            const lType = item.lossCondition?.type || 'none';
            const cLose = lType !== 'none';
            const cTry = wType !== 'time' && lType !== 'failure';
            const isAuto = (rConf.transition?.type || 'interact') === 'auto';
            
            if (!isAuto) {
                if (rConf.showPlayAgainOnWin) globalBtn = true;
                if (cLose && rConf.showPlayAgainOnLoss) globalBtn = true;
            }
            if (cTry) globalBtn = true; // Try again always generates a play again button
        }
    });

    const methodsArray = conversionScreen?.methods || [];
    if (Array.isArray(methodsArray)) {
        methodsArray.forEach((m: any) => {
            const actualMethod = allConversionMethods?.find(glob => glob.id === m.methodId);
            if (!actualMethod) return;
            const type = String(actualMethod.type).toLowerCase().trim();
            const methodData = actualMethod as any;
            
            // Forms, Emails, Socials, and Point Purchases inherently use buttons
            if (type.includes('form') || type.includes('email') || type.includes('social') || m.gate?.type === 'point_purchase') {
                globalBtn = true;
            }
            
            // Link Redirects use the Transition Engine, so we must evaluate their config
            if (type.includes('link') || type.includes('redirect')) {
                checkGlobalT(methodData.transition);
            }
        });
    }

    const updateEvent = (key: keyof MacrogameAudioConfig['events'], track?: AudioTrackConfig) => {
        onChange({ ...safeConfig, events: { ...safeConfig.events, [key]: track } });
    };

    // Calculate a trigger based on the Master BGM so child cards auto-expand when it changes
    const globalBgmTrigger = safeConfig.global.bgMusic?.libraryId || safeConfig.global.bgMusic?.url;

    return (
        <div style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{...styles.h3, margin: '0 0 0.5rem 0'}}>Audio Journey</h3>
                <p style={{...styles.descriptionText, margin: 0}}>Map the complete audio experience of your Macrogame. Set global master tracks and view or override audio at every step of the timeline.</p>
            </div>

            {/* BLOCK 1: THE UMBRELLA */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f0f2f5', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Global Master Tracks
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <AudioTrackEditor 
                        label="Master Background Music" 
                        description="Loops continuously unless overridden by a specific stage."
                        config={safeConfig.global.bgMusic} 
                        onChange={(t) => updateGlobal('bgMusic', t)} 
                        isGlobal
                    />
                    
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#555', fontSize: '0.95rem', textTransform: 'uppercase' }}>Interaction & Transition Audio</h5>
                        
                        {globalBtn && (
                            <AudioTrackEditor 
                                label="Button Click" 
                                description="Plays when clicking a standard 'Start', 'Continue', 'Play Again' button, or Social Icon."
                                config={safeConfig.global.buttonClick} 
                                onChange={(t) => updateGlobal('buttonClick', t)} 
                                isGlobal
                            />
                        )}
                        {globalTrans && (
                            <AudioTrackEditor 
                                label="Click Anywhere or Keypress Transition" 
                                description="Plays when using 'Click Anywhere' or 'Keypress' to advance."
                                config={safeConfig.global.screenTransition} 
                                onChange={(t) => updateGlobal('screenTransition', t)} 
                                isGlobal
                            />
                        )}
                        {globalAuto && (
                            <>
                                <AudioTrackEditor 
                                    label="Countdown Timer (Tick)" 
                                    description="Plays every second during an auto-transition countdown."
                                    config={safeConfig.global.timerTick} 
                                    onChange={(t) => updateGlobal('timerTick', t)} 
                                    isGlobal
                                />
                                <AudioTrackEditor 
                                    label="Countdown Timer (Go)" 
                                    description="Plays when the timer reaches zero and transitions the screen."
                                    config={safeConfig.global.timerGo} 
                                    onChange={(t) => updateGlobal('timerGo', t)} 
                                    isGlobal
                                />
                            </>
                        )}
                        {(!globalBtn && !globalTrans && !globalAuto) && (
                            <p style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>No interactive transitions or buttons are currently used in this macrogame.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* BLOCK 2: THE TIMELINE */}
            <div style={{ position: 'relative', paddingLeft: '1rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
                {/* Vertical Timeline Track */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '34px', width: '2px', backgroundColor: '#e0e0e0', zIndex: 1 }} />

                {introScreen.enabled && (() => {
                    const needs = getAudioNeeds(introScreen.transition);
                    return (
                        <TimelineStageCard title="🎵 Intro Screen" expandTrigger={globalBgmTrigger}>
                            <AudioTrackEditor label="Background Music Override" config={safeConfig.stages['intro']?.bgMusic} parentConfig={safeConfig.global.bgMusic} onChange={(t) => updateStage('intro', 'bgMusic', t)} />
                            {needs.btn && <AudioTrackEditor label="Primary Button Override" config={safeConfig.stages['intro']?.primaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage('intro', 'primaryClick', t)} />}
                            {needs.trans && <AudioTrackEditor label="Click Anywhere or Keypress Transition Override" config={safeConfig.stages['intro']?.screenTransition} parentConfig={safeConfig.global.screenTransition} onChange={(t) => updateStage('intro', 'screenTransition', t)} />}
                            {needs.auto && (
                                <>
                                    <AudioTrackEditor label="Countdown Timer (Tick) Override" config={safeConfig.stages['intro']?.timerTick} parentConfig={safeConfig.global.timerTick} onChange={(t) => updateStage('intro', 'timerTick', t)} />
                                    <AudioTrackEditor label="Countdown Timer (Go) Override" config={safeConfig.stages['intro']?.timerGo} parentConfig={safeConfig.global.timerGo} onChange={(t) => updateStage('intro', 'timerGo', t)} />
                                </>
                            )}
                        </TimelineStageCard>
                    );
                })()}

                {flow.map((item, index) => {
                    const preNeeds = getAudioNeeds((item as any).preGameConfig?.transition || globalPreGameConfig?.transition);
                    
                    // --- Advanced Result Screen Intelligence ---
                    const resConfig = (item as any).resultConfig || globalResultConfig || {};
                    const resT = resConfig.transition || {};
                    const resIsAuto = resT.type === 'auto';
                    const resIsButton = !resIsAuto && (resT.interactionMethod || 'click') === 'click' && (resT.clickFormat || 'disclaimer') === 'button';
                    
                    // 1. Determine what states are physically possible based on current overrides
                    const winType = item.winCondition?.type || 'time';
                    const lossType = item.lossCondition?.type || 'none';
                    
                    const canWin = true; // Win is always structurally possible
                    const canLose = lossType !== 'none'; // If 'none', you cannot get a Loss screen
                    const canTryAgain = winType !== 'time' && lossType !== 'failure';

                    // 2. Track which states are actively showing which buttons/transitions
                    const activePrimaryLabels = [];
                    const activeSecLabels = [];
                    const activeTransLabels = [];
                    const activeAutoLabels = [];

                    // Build standard states dynamically
                    const standardStates = [];
                    if (canWin) standardStates.push('Win');
                    if (canLose) standardStates.push('Loss');

                    if (resIsAuto) {
                        activeAutoLabels.push(...standardStates);
                    } else {
                        if (resIsButton) activePrimaryLabels.push(...standardStates);
                        else activeTransLabels.push(...standardStates);

                        if (canWin && resConfig.showPlayAgainOnWin) activeSecLabels.push('Win');
                        if (canLose && resConfig.showPlayAgainOnLoss) activeSecLabels.push('Loss');
                    }

                    if (canTryAgain) {
                        // Try Again ALWAYS has a Play Again (Secondary Click)
                        activeSecLabels.push('Try Again (Play Again)');
                        
                        // Try Again has a Continue (Primary Click) if the box is checked
                        if (resConfig.showPlayAgainOnTryAgain) {
                            activePrimaryLabels.push('Try Again (Continue)');
                        }
                    }

                    // 3. Resolve visibility bools based on active arrays
                    const showResPrimaryBtn = activePrimaryLabels.length > 0;
                    const showResSecondaryBtn = activeSecLabels.length > 0;
                    const showResTrans = activeTransLabels.length > 0;
                    const showResAuto = activeAutoLabels.length > 0;

                    // Dynamic Labels for Edge Cases
                    const isOnlyTryAgainPrimary = activePrimaryLabels.length === 1 && activePrimaryLabels[0].includes('Try Again');
                    const primaryLabel = isOnlyTryAgainPrimary 
                        ? "Try Again Screen 'Continue' Button Override" 
                        : "Primary Button ('Continue') Override";

                    const isOnlyTryAgainSecondary = activeSecLabels.length === 1 && activeSecLabels[0].includes('Try Again');
                    const secondaryLabel = isOnlyTryAgainSecondary 
                        ? "Try Again Screen 'Play Again' Button Override" 
                        : "Secondary Button ('Play Again') Override";

                    return (
                    <React.Fragment key={`flow-${index}`}>
                        <TimelineStageCard title={`⏳ Pre-Game: ${item.customVariant?.name || item.baseGame.name}`} expandTrigger={globalBgmTrigger}>
                            <AudioTrackEditor label="Background Music Override" config={safeConfig.stages[`flow_${index}_pre`]?.bgMusic} parentConfig={safeConfig.global.bgMusic} gameBgmName={getGameBgmName(item) || undefined} onChange={(t) => updateStage(`flow_${index}_pre`, 'bgMusic', t)} />
                            {preNeeds.btn && <AudioTrackEditor label="Primary Button Override" config={safeConfig.stages[`flow_${index}_pre`]?.primaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage(`flow_${index}_pre`, 'primaryClick', t)} />}
                            {preNeeds.trans && <AudioTrackEditor label="Click Anywhere or Keypress Transition Override" config={safeConfig.stages[`flow_${index}_pre`]?.screenTransition} parentConfig={safeConfig.global.screenTransition} onChange={(t) => updateStage(`flow_${index}_pre`, 'screenTransition', t)} />}
                            {preNeeds.auto && (
                                <>
                                    <AudioTrackEditor label="Countdown Timer (Tick) Override" config={safeConfig.stages[`flow_${index}_pre`]?.timerTick} parentConfig={safeConfig.global.timerTick} onChange={(t) => updateStage(`flow_${index}_pre`, 'timerTick', t)} />
                                    <AudioTrackEditor label="Countdown Timer (Go) Override" config={safeConfig.stages[`flow_${index}_pre`]?.timerGo} parentConfig={safeConfig.global.timerGo} onChange={(t) => updateStage(`flow_${index}_pre`, 'timerGo', t)} />
                                </>
                            )}
                        </TimelineStageCard>

                        <div style={{ marginBottom: '1rem' }}>
                            <ReadOnlyMicrogameAudio item={item} index={index} />
                        </div>

                        <TimelineStageCard title={`📊 Result Screen: ${item.customVariant?.name || item.baseGame.name}`} expandTrigger={globalBgmTrigger}>
                            <AudioTrackEditor label="Background Music Override" config={safeConfig.stages[`flow_${index}_result`]?.bgMusic} parentConfig={safeConfig.global.bgMusic} gameBgmName={getGameBgmName(item) || undefined} onChange={(t) => updateStage(`flow_${index}_result`, 'bgMusic', t)} />
                            
                            {showResPrimaryBtn && <AudioTrackEditor label={primaryLabel} description={`Applies to: ${activePrimaryLabels.join(', ')}`} config={safeConfig.stages[`flow_${index}_result`]?.primaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage(`flow_${index}_result`, 'primaryClick', t)} />}
                            
                            {showResSecondaryBtn && <AudioTrackEditor label={secondaryLabel} description={`Applies to: ${activeSecLabels.join(', ')}`} config={safeConfig.stages[`flow_${index}_result`]?.secondaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage(`flow_${index}_result`, 'secondaryClick', t)} />}
                            
                            {showResTrans && <AudioTrackEditor label="Click Anywhere or Keypress Transition Override" description={`Applies to: ${activeTransLabels.join(', ')}`} config={safeConfig.stages[`flow_${index}_result`]?.screenTransition} parentConfig={safeConfig.global.screenTransition} onChange={(t) => updateStage(`flow_${index}_result`, 'screenTransition', t)} />}
                            
                            {showResAuto && (
                                <>
                                    <AudioTrackEditor label="Countdown Timer (Tick) Override" description={`Tick sound. Applies to: ${activeAutoLabels.join(', ')}`} config={safeConfig.stages[`flow_${index}_result`]?.timerTick} parentConfig={safeConfig.global.timerTick} onChange={(t) => updateStage(`flow_${index}_result`, 'timerTick', t)} />
                                    <AudioTrackEditor label="Countdown Timer (Go) Override" description={`Final Go sound. Applies to: ${activeAutoLabels.join(', ')}`} config={safeConfig.stages[`flow_${index}_result`]?.timerGo} parentConfig={safeConfig.global.timerGo} onChange={(t) => updateStage(`flow_${index}_result`, 'timerGo', t)} />
                                </>
                            )}
                            
                            {showPoints && pointDisplayMode !== 'none' && enableTallyAnimation && (
                                <AudioTrackEditor label="Score Tally Animation Sound" description="Rapid tick or cha-ching during point buildup." config={safeConfig.stages[`flow_${index}_result`]?.scoreTally} onChange={(t) => updateStage(`flow_${index}_result`, 'scoreTally', t)} />
                            )}
                        </TimelineStageCard>
                    </React.Fragment>
                )})}

                {promoScreen.enabled && (() => {
                    const needs = getAudioNeeds(promoScreen.transition);
                    return (
                        <TimelineStageCard title="📢 Promo Screen" expandTrigger={globalBgmTrigger}>
                            <AudioTrackEditor label="Background Music Override" config={safeConfig.stages['promo']?.bgMusic} parentConfig={safeConfig.global.bgMusic} onChange={(t) => updateStage('promo', 'bgMusic', t)} />
                            {needs.btn && <AudioTrackEditor label="Primary Button Override" config={safeConfig.stages['promo']?.primaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage('promo', 'primaryClick', t)} />}
                            {needs.trans && <AudioTrackEditor label="Click Anywhere or Keypress Transition Override" config={safeConfig.stages['promo']?.screenTransition} parentConfig={safeConfig.global.screenTransition} onChange={(t) => updateStage('promo', 'screenTransition', t)} />}
                            {needs.auto && (
                                <>
                                    <AudioTrackEditor label="Countdown Timer (Tick) Override" config={safeConfig.stages['promo']?.timerTick} parentConfig={safeConfig.global.timerTick} onChange={(t) => updateStage('promo', 'timerTick', t)} />
                                    <AudioTrackEditor label="Countdown Timer (Go) Override" config={safeConfig.stages['promo']?.timerGo} parentConfig={safeConfig.global.timerGo} onChange={(t) => updateStage('promo', 'timerGo', t)} />
                                </>
                            )}
                        </TimelineStageCard>
                    );
                })()}

                {conversionScreen && (() => {
                    // Deep inspection of the conversion screen to explicitly map required audio triggers
                    let convNeeds = { btn: false, trans: false, auto: false, form: false, couponReveal: false, pointPurchase: false, social: false };
                    
                    const methodsArray = conversionScreen.methods || [];
                    
                    if (Array.isArray(methodsArray)) {
                        methodsArray.forEach((m: any) => {
                            // 1. REAL DATA LOOKUP: Find the actual method configuration using the ID
                            const actualMethod = allConversionMethods?.find(glob => glob.id === m.methodId);
                            if (!actualMethod) return; // Skip if we can't find the source data

                            const type = String(actualMethod.type).toLowerCase().trim();
                            const methodData = actualMethod as any; // Properties are at the root, not inside .data
                            
                            // 2. FORMS & EMAIL CAPTURES
                            if (type.includes('form') || type.includes('email')) {
                                convNeeds.btn = true;
                                convNeeds.form = true;
                            }
                            
                            // 3. SOCIAL FOLLOW
                            if (type.includes('social')) {
                                convNeeds.btn = true;
                                convNeeds.social = true;
                            }

                            // 4. COUPON DISPLAY
                            if (type.includes('coupon')) {
                                // Coupons do NOT inherently have buttons. 
                                // We check the root property for the native click-to-reveal feature.
                                if (methodData.clickToReveal) {
                                    convNeeds.couponReveal = true;
                                }
                            }
                            
                            // 5. POINT GATES 
                            const isPointGate = m.gate?.type === 'point_purchase';
                            if (isPointGate) {
                                convNeeds.btn = true;
                                convNeeds.pointPurchase = true;
                            }
                            
                            // 6. LINK REDIRECT (Uses Transition Engine)
                            if (type.includes('link') || type.includes('redirect')) {
                                const tData = methodData.transition || {};
                                const tNeeds = getAudioNeeds(tData);
                                if (tNeeds.btn) convNeeds.btn = true;
                                if (tNeeds.trans) convNeeds.trans = true;
                                if (tNeeds.auto) convNeeds.auto = true;
                            }
                        });
                    }

                    return (
                        <TimelineStageCard title="🎯 Conversion Screen & Economy" expandTrigger={globalBgmTrigger}>
                            <AudioTrackEditor label="Background Music Override" config={safeConfig.stages['conversion']?.bgMusic} parentConfig={safeConfig.global.bgMusic} onChange={(t) => updateStage('conversion', 'bgMusic', t)} />
                            
                            {convNeeds.btn && <AudioTrackEditor label={convNeeds.social ? "Primary Button & Social Icon Override" : "Primary Button Override"} description={convNeeds.social ? "Fallback for Submit/Redirect/Purchase buttons, and Social Icon clicks." : "Fallback for Submit/Redirect/Purchase buttons if no specific event audio is set."} config={safeConfig.stages['conversion']?.primaryClick} parentConfig={safeConfig.global.buttonClick} onChange={(t) => updateStage('conversion', 'primaryClick', t)} />}
                            {convNeeds.trans && <AudioTrackEditor label="Click Anywhere or Keypress Transition Override" config={safeConfig.stages['conversion']?.screenTransition} parentConfig={safeConfig.global.screenTransition} onChange={(t) => updateStage('conversion', 'screenTransition', t)} />}
                            {convNeeds.auto && (
                                <>
                                    <AudioTrackEditor label="Countdown Timer (Tick) Override" config={safeConfig.stages['conversion']?.timerTick} parentConfig={safeConfig.global.timerTick} onChange={(t) => updateStage('conversion', 'timerTick', t)} />
                                    <AudioTrackEditor label="Countdown Timer (Go) Override" config={safeConfig.stages['conversion']?.timerGo} parentConfig={safeConfig.global.timerGo} onChange={(t) => updateStage('conversion', 'timerGo', t)} />
                                </>
                            )}

                            {(convNeeds.couponReveal || convNeeds.form) && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #ccc' }}>
                                    <h6 style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>Conversion Events</h6>
                                    {convNeeds.couponReveal && <AudioTrackEditor label="Coupon Revealed" config={safeConfig.events?.couponReveal} onChange={(t) => updateEvent('couponReveal', t)} allowExtendedOptions />}
                                    
                                    {convNeeds.form && (
                                        <>
                                            <AudioTrackEditor label="Form Submission - Success" config={safeConfig.events?.formSuccess} parentConfig={safeConfig.stages['conversion']?.primaryClick || safeConfig.global.buttonClick} onChange={(t) => updateEvent('formSuccess', t)} allowExtendedOptions />
                                            <AudioTrackEditor label="Form Submission - Error" config={safeConfig.events?.formError} parentConfig={safeConfig.stages['conversion']?.primaryClick || safeConfig.global.buttonClick} onChange={(t) => updateEvent('formError', t)} />
                                        </>
                                    )}
                                </div>
                            )}

                            {showPoints && convNeeds.pointPurchase && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #ccc' }}>
                                    <h6 style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>Economy Events</h6>
                                    <AudioTrackEditor label="Point Purchase - Success" config={safeConfig.events?.pointPurchaseSuccess} onChange={(t) => updateEvent('pointPurchaseSuccess', t)} allowExtendedOptions />
                                    <AudioTrackEditor label="Point Purchase - Failure" config={safeConfig.events?.pointPurchaseFailure} onChange={(t) => updateEvent('pointPurchaseFailure', t)} />
                                </div>
                            )}
                        </TimelineStageCard>
                    );
                })()}

            </div>
        </div>
    );
};