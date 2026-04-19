/* src/hooks/useMacroGameEngine.ts */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Macrogame, Microgame as MicrogameData, MicrogameResult, ScoreLedgerItem } from '../types';
import { MACROGAME_MUSIC_LIBRARY, UI_SOUND_EFFECTS } from '../constants';
import { MICROGAME_DEFINITIONS } from '../microgames/definitions/index';

export const useMacroGameEngine = (macrogame?: Macrogame) => {
    const [view, setView] = useState<'loading' | 'intro' | 'title' | 'controls' | 'game' | 'result' | 'promo' | 'end' | 'combined'>('loading');
    const [mode, setMode] = useState<'inspection' | 'simulation'>('inspection');
    const [activeGameData, setActiveGameData] = useState<MicrogameData | null>(null);
    const [result, setResult] = useState<MicrogameResult | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [totalScore, setTotalScore] = useState(0);
    const [scoreLedger, setScoreLedger] = useState<ScoreLedgerItem[]>([]);
    const [gameKey, setGameKey] = useState(0); // Forces the React component to remount on jumps

    // Refs to track score for "Play Again" resets
    const scoreRef = useRef(totalScore);
    const scoreAtStartOfGameRef = useRef(0);
    
    // Keep scoreRef perfectly in sync with totalScore state
    useEffect(() => { scoreRef.current = totalScore; }, [totalScore]);
  
    const modeRef = useRef(mode);
    useEffect(() => { modeRef.current = mode; }, [mode]);

    const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const gameIndexRef = useRef(0);
    const activeLedgerIndexRef = useRef(0); // Strictly tracks the currently mounted game for accurate point logging
    const currentTrackRef = useRef<HTMLAudioElement | null>(null);
    
    // --- Game Interaction State ---
    const [hasInteracted, setHasInteracted] = useState(false);

    // Reset interaction state when the view changes
    useEffect(() => {
        setHasInteracted(false);
    }, [view, gameIndexRef.current]);

    // --- SAFELY TRACK AUDIO INSTANCES FOR CAPPING ---
    const activeAudioRefs = useRef({
        tick: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null },
        go: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null },
        trans: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null },
        click: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null },
        event: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null },
        tally: { audio: null as HTMLAudioElement | null, timeout: null as NodeJS.Timeout | null }
    });

    const isTransitioningRef = useRef(false);
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up ONLY repeating/ticking audio when the view changes.
    // We do NOT pause clicks/transitions because they need to bridge the gap between screens!
    useEffect(() => {
        return () => {
            const tickRef = activeAudioRefs.current.tick;
            if (tickRef.audio) { tickRef.audio.pause(); tickRef.audio.currentTime = 0; }
            if (tickRef.timeout) clearTimeout(tickRef.timeout);

            // CRITICAL: Stop long-playing event audio (like Coupon Reveals) when navigating away
            const eventRef = activeAudioRefs.current.event;
            if (eventRef.audio) { eventRef.audio.pause(); eventRef.audio.currentTime = 0; }
            if (eventRef.timeout) clearTimeout(eventRef.timeout);

            // Also clear transition locks
            isTransitioningRef.current = false;
            if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        };
    }, [view]);

    // Centralized track resolver (prioritizes Stage Overrides -> Global Master)
    const getAudioTrack = useCallback((trackType: 'buttonClick' | 'screenTransition' | 'timerTick' | 'timerGo', buttonType: 'primary' | 'secondary' = 'primary') => {
        if (!macrogame?.audioConfig) return null;
        let stageKey: string | null = null;
        if (view === 'intro') stageKey = 'intro';
        else if (view === 'promo') stageKey = 'promo';
        else if (['title', 'controls', 'combined', 'game'].includes(view)) stageKey = `flow_${gameIndexRef.current}_pre`;
        else if (view === 'result') stageKey = `flow_${Math.max(0, gameIndexRef.current - 1)}_result`;
        else if (view === 'end') stageKey = 'conversion';

        const stageConfig = stageKey ? macrogame.audioConfig.stages?.[stageKey] : null;
        
        if (trackType === 'buttonClick') {
            const btnTrack = buttonType === 'primary' ? stageConfig?.primaryClick : stageConfig?.secondaryClick;
            return btnTrack || macrogame.audioConfig.global?.buttonClick;
        }
        return stageConfig?.[trackType] || macrogame.audioConfig.global?.[trackType];
    }, [macrogame, view]);

    const playClickAudio = useCallback((buttonType: 'primary' | 'secondary' = 'primary') => {
        if (modeRef.current === 'inspection') return;
        const track = getAudioTrack('buttonClick', buttonType);
        const url = track?.url || (track?.libraryId && track.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === track.libraryId)?.path : null);
        if (url) {
            const refObj = activeAudioRefs.current.click;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(url);
            audio.volume = track?.volume ?? 1.0;
            // Suppress harmless AbortErrors if the user rapid-clicks
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn('Click audio failed:', e); });
            refObj.audio = audio;
            
            // Safeguard: Cap button clicks strictly at 1 second for perfect handoffs
            refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 1000);
        }
    }, [getAudioTrack]);

    const playScreenTransitionAudio = useCallback(() => {
        if (modeRef.current === 'inspection') return;
        const track = getAudioTrack('screenTransition');
        const url = track?.url || (track?.libraryId && track.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === track.libraryId)?.path : null);
        if (url) {
            const refObj = activeAudioRefs.current.trans;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(url);
            audio.volume = track?.volume ?? 1.0;
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn('Screen transition audio failed:', e); });
            refObj.audio = audio;
            
            // Safeguard: Cap at 1.5 seconds
            refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 1500);
        }
    }, [getAudioTrack]);

    const playTimerTickAudio = useCallback(() => {
        if (modeRef.current === 'inspection') return;
        const track = getAudioTrack('timerTick');
        const url = track?.url || (track?.libraryId && track.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === track.libraryId)?.path : null);
        if (url) {
            const refObj = activeAudioRefs.current.tick;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(url);
            audio.volume = track?.volume ?? 1.0;
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn('Timer tick audio failed:', e); });
            refObj.audio = audio;
            
            // Safeguard: Hard stop at 950ms to ensure a clean break before the next tick
            refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 950);
        }
    }, [getAudioTrack]);

    const playTimerGoAudio = useCallback(() => {
        if (modeRef.current === 'inspection') return;
        const track = getAudioTrack('timerGo');
        const url = track?.url || (track?.libraryId && track.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === track.libraryId)?.path : null);
        if (url) {
            const refObj = activeAudioRefs.current.go;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(url);
            audio.volume = track?.volume ?? 1.0;
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn('Timer go audio failed:', e); });
            refObj.audio = audio;
            
            // Safeguard: Cap at 1.5 seconds
            refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 1500);
        }
    }, [getAudioTrack]);

    const playScoreTallyAudio = useCallback(() => {
        if (modeRef.current === 'inspection' || !macrogame?.audioConfig) return;
        const stageKey = `flow_${Math.max(0, gameIndexRef.current - 1)}_result`;
        const track = macrogame.audioConfig.stages?.[stageKey]?.scoreTally;
        const url = track?.url || (track?.libraryId && track.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === track.libraryId)?.path : null);
        
        if (url) {
            const refObj = activeAudioRefs.current.tally;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(url);
            audio.volume = track?.volume ?? 1.0;
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn('Score tally audio failed:', e); });
            refObj.audio = audio;
            
            // Safeguard: Cap at 1.5 seconds (Animation takes exactly 1.2s)
            refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 1500);
        }
    }, [macrogame]);

    // --- EVENT AUDIO TRIGGER ---
    const playEventAudio = useCallback((eventName: keyof NonNullable<Macrogame['audioConfig']>['events']): boolean => {
        if (!macrogame?.audioConfig?.events || modeRef.current === 'inspection') return false;
        
        const config = macrogame.audioConfig.events[eventName];
        if (!config) return false;

        // INTELLIGENCE: If explicitly muted, return true to tell the caller it was "handled" so fallbacks don't trigger
        if (config.libraryId === 'mute') return true; 

        const audioUrl = config.url || (config.libraryId && config.libraryId !== 'none' ? MACROGAME_MUSIC_LIBRARY.find(t => t.id === config.libraryId)?.path : null);
        
        if (audioUrl) {
            const refObj = activeAudioRefs.current.event;
            if (refObj.audio) { refObj.audio.pause(); refObj.audio.currentTime = 0; }
            if (refObj.timeout) clearTimeout(refObj.timeout);

            const audio = new Audio(audioUrl);
            audio.volume = config.volume ?? 1.0;
            audio.play().catch(e => { if (e.name !== 'AbortError') console.warn(`Failed to play event audio: ${eventName}`, e); });
            refObj.audio = audio;
            
            // --- EXTENDED REWARD OPTIONS ---
            if (config.playFullDuration) {
                // If BGM is actively playing, apply the selected behavior
                if (currentTrackRef.current && !currentTrackRef.current.paused) {
                    if (config.bgmBehavior === 'stop') {
                        currentTrackRef.current.pause();
                    } else if (config.bgmBehavior === 'duck') {
                        // Capture the current volume before ducking
                        const originalBgmVolume = currentTrackRef.current.volume;
                        currentTrackRef.current.volume = config.bgmDuckVolume ?? 0.2;
                        
                        // Restore the BGM smoothly when the reward track naturally ends
                        audio.onended = () => {
                            if (currentTrackRef.current) {
                                currentTrackRef.current.volume = originalBgmVolume;
                            }
                        };
                    }
                }
            } else {
                // Standard Safeguard: Cap short event sounds at 1.5 seconds
                refObj.timeout = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 1500);
            }
            
            return true; // Successfully played
        }
        return false; // Nothing configured
    }, [macrogame]);

    // Only show overlay if the Macrogame explicitly configures it
    const isOverlayVisible = macrogame?.config.screenFlowType === 'Overlay' && view === 'game' && !hasInteracted;

    // --- TRANSITION LOCK & DELAY HELPER ---
    const executeTransition = useCallback((action: () => void, interactionType: 'button' | 'disclaimer' | 'auto', buttonType: 'primary' | 'secondary' = 'primary') => {
        if (isTransitioningRef.current) return;

        let delay = 0;
        
        if (interactionType === 'button') {
            playClickAudio(buttonType);
            const track = getAudioTrack('buttonClick', buttonType);
            if (track?.url || (track?.libraryId && track.libraryId !== 'none')) {
                delay = 350; 
            }
        } else if (interactionType === 'disclaimer') {
            playScreenTransitionAudio();
            
            // INTELLIGENCE: We MUST use your custom getAudioTrack helper here so it 
            // correctly respects your local per-game overrides instead of just looking at the global config!
            const track = getAudioTrack('screenTransition');
            if (track?.url || (track?.libraryId && track.libraryId !== 'none' && track.libraryId !== 'mute')) {
                delay = 350;
            }
        }

        if (delay > 0) {
            isTransitioningRef.current = true;
            transitionTimeoutRef.current = setTimeout(() => {
                isTransitioningRef.current = false;
                action();
            }, delay);
        } else {
            action();
        }
    }, [playClickAudio, playScreenTransitionAudio, getAudioTrack]);

    const onInteraction = useCallback(() => {
        // INTELLIGENCE: Always pull the transition config directly from the live macrogame prop to prevent stale closures
        const activeFlowItem = macrogame?.flow[gameIndexRef.current] as any;
        const t = activeFlowItem?.preGameConfig?.transition || macrogame?.config?.preGameConfig?.transition || {};
        const isAuto = t.type === 'auto';
        const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';

        executeTransition(() => {
            setHasInteracted(true);
        }, isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'primary');
    }, [macrogame, executeTransition]);

    // Keyboard input for overlay dismissal is handled securely inside MicrogameOverlay.tsx
    // Removed legacy global listener to enforce transition configuration rules.

    // --- Flat List State Machine for Stepping ---
    const flowList = useMemo(() => {
        if (!macrogame) return [];
        const list: { view: string, index: number }[] = [];
        if (macrogame.introScreen.enabled) list.push({ view: 'intro', index: 0 });
        
        const flowType = macrogame.config.screenFlowType || 'Separate';
        // Check if the result screen is enabled (defaults to true if undefined)
        const isResultEnabled = macrogame.config.resultConfig?.enabled ?? true;

        macrogame.flow.forEach((_, i) => {
            if (flowType === 'Separate' || flowType === 'Combined') {
                // For Separate/Combined, the static screen IS the pre-game inspection. Hide the naked game.
                list.push({ view: flowType === 'Combined' ? 'combined' : 'title', index: i }); 
            } else {
                // For Skip and Overlay, we must step into the game state
                list.push({ view: 'game', index: i });
            }
            
            // Only add 'result' to the manual stepping sequence if it is actually enabled
            if (isResultEnabled) {
                list.push({ view: 'result', index: i }); 
            }
        });
        
        if (macrogame.promoScreen?.enabled) list.push({ view: 'promo', index: 0 });
        list.push({ view: 'end', index: 0 });
        
        return list;
    }, [macrogame]);

    const jumpTo = useCallback((targetView: any, targetIndex: number = 0, force: boolean = false) => {
        if (!macrogame) return;
        
        const expectedIndex = targetView === 'result' ? targetIndex + 1 : targetIndex;
        
        // Ensure we NEVER process a jump if we are already in the exact right state
        if (!force && view === targetView && gameIndexRef.current === expectedIndex) {
            return;
        }

        // --- Reset points if navigating backwards in inspection mode ---
        if (modeRef.current === 'inspection' && expectedIndex < gameIndexRef.current) {
            setTotalScore(0);
            scoreRef.current = 0;
            scoreAtStartOfGameRef.current = 0;
        }

        setHasInteracted(false);
        setResult(null); // Clear previous game results when jumping to a new state
        
        if (targetView === 'game') {
            setGameKey(k => k + 1); // Force reset
        }
        
        if (targetView === 'result') {
            gameIndexRef.current = targetIndex + 1; // Engine expects index to be incremented after game
            // We must load the game data into memory even when jumping straight to the result screen!
            if (macrogame.flow[targetIndex]) {
                setActiveGameData(macrogame.flow[targetIndex] as unknown as MicrogameData);
            }
            setView('result');
        } else {
            gameIndexRef.current = targetIndex;
            if (['title', 'controls', 'combined', 'game'].includes(targetView) && macrogame.flow[targetIndex]) {
                setActiveGameData(macrogame.flow[targetIndex] as unknown as MicrogameData);
            }
            setView(targetView);
        }
    }, [macrogame, view]);

    // Calculate the current active index in the flat flowList
    const currentFlatIndex = flowList.findIndex(s => {
        // Global screens (intro, promo, end) don't rely on the microgame index
        if (s.view === 'intro' || s.view === 'promo' || s.view === 'end') return s.view === view;
        if (s.view === 'result') return view === 'result' && s.index === gameIndexRef.current - 1;
        return s.view === view && s.index === gameIndexRef.current;
    });

    const canStepForward = currentFlatIndex >= 0 && currentFlatIndex < flowList.length - 1;
    const canStepBackward = currentFlatIndex > 0;

    const stepForward = useCallback(() => {
        if (!macrogame || !canStepForward) return;
        const nextItem = flowList[currentFlatIndex + 1];
        if (nextItem) jumpTo(nextItem.view, nextItem.index);
    }, [macrogame, canStepForward, flowList, currentFlatIndex, jumpTo]);

    const stepBackward = useCallback(() => {
        if (!macrogame || !canStepBackward) return;
        const prevItem = flowList[currentFlatIndex - 1];
        if (prevItem) jumpTo(prevItem.view, prevItem.index);
    }, [macrogame, canStepBackward, flowList, currentFlatIndex, jumpTo]);

    // --- AUDIO MANAGEMENT ---
    const manageBackgroundMusic = useCallback((currentView: string, microgameIndex?: number) => {
        if (modeRef.current === 'inspection') {
            currentTrackRef.current?.pause();
            return;
        }

        if (!macrogame?.config) return;

        let key: string | null = null;
        if (['title', 'controls', 'game', 'result'].includes(currentView) && microgameIndex !== undefined && microgameIndex < macrogame.flow.length) {
            key = `flow_${microgameIndex}`;
        } else if (currentView === 'intro') {
            key = 'intro';
        } else if (currentView === 'promo') {
            key = 'promo';
        } else if (currentView === 'end') {
            if (macrogame.conversionScreenId) {
                key = 'conversion';
            }
        }

        // Read from the new strictly typed stages object
        const stageConfig = key ? macrogame.audioConfig?.stages?.[key] : null;
        const shouldPlay = key ? (stageConfig?.playMusic ?? true) : false;
        
        if (!shouldPlay) {
            currentTrackRef.current?.pause();
            return;
        }

        // 1. Check for Stage Overrides
        const stageBgmUrl = stageConfig?.bgMusic?.url;
        const stageBgmLibId = stageConfig?.bgMusic?.libraryId;

        // 2. Check for Global Master Track
        const globalBgmUrl = macrogame.audioConfig?.global?.bgMusic?.url;
        const globalBgmLibId = macrogame.audioConfig?.global?.bgMusic?.libraryId;
        
        let targetTrackPath: string | null = null;

        // Resolve priority: Stage Override -> Global Master -> None
        if (stageBgmLibId === 'mute') {
            targetTrackPath = null;
        } else if (stageBgmLibId === 'inherit_game') {
            // Intelligent Game BGM Lookup (Variant -> Factory Default)
            let gameBgmUrl = null;
            if (microgameIndex !== undefined && microgameIndex < macrogame.flow.length) {
                const flowItem = macrogame.flow[microgameIndex];
                const customSkinData = (flowItem as any).customSkinData || (flowItem as any).customVariant?.skinData || {};
                
                Object.entries(customSkinData).forEach(([k, data]) => {
                    if (k.toLowerCase().includes('bgmusic') && (data as any).url) {
                        gameBgmUrl = (data as any).url;
                    }
                });
                
                if (!gameBgmUrl) {
                    const defId = flowItem.microgameId;
                    let definition = MICROGAME_DEFINITIONS[defId];
                    if (!definition) {
                        const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === defId.toLowerCase());
                        if (key) definition = MICROGAME_DEFINITIONS[key];
                    }
                    const bgmDef = definition?.assets?.['bgMusic'];
                    if (bgmDef && bgmDef.type === 'audio') {
                        gameBgmUrl = bgmDef.defaultAudioUrl || null;
                    }
                }
            }
            targetTrackPath = gameBgmUrl;
        } else if (stageBgmUrl) {
            targetTrackPath = stageBgmUrl;
        } else if (stageBgmLibId && stageBgmLibId !== 'none') {
            targetTrackPath = MACROGAME_MUSIC_LIBRARY.find(t => t.id === stageBgmLibId)?.path || null;
        } else if (globalBgmUrl) {
            targetTrackPath = globalBgmUrl;
        } else if (globalBgmLibId && globalBgmLibId !== 'none') {
            targetTrackPath = MACROGAME_MUSIC_LIBRARY.find(t => t.id === globalBgmLibId)?.path || null;
        }

        if (!targetTrackPath) {
            currentTrackRef.current?.pause();
            return;
        }

        if (currentTrackRef.current?.src.endsWith(targetTrackPath) && !currentTrackRef.current.paused) {
            return;
        }

        currentTrackRef.current?.pause();
        const newTrack = new Audio(targetTrackPath);
        newTrack.loop = true;
        newTrack.muted = isMuted;
        newTrack.play().catch(err => console.error('Audio play failed:', err));
        currentTrackRef.current = newTrack;

    }, [macrogame, isMuted]);

    const transitionToEnd = useCallback(() => setView('end'), []);
    
    const runFlow = useCallback(async () => {
        if (!macrogame) return;
        if (gameIndexRef.current >= macrogame.flow.length) {
            setView(macrogame.promoScreen?.enabled ? 'promo' : 'end');
            return;
        }

        const gameFlow = macrogame.flow as unknown as MicrogameData[];
        const gameData = gameFlow[gameIndexRef.current];
        setActiveGameData(gameData);
        setResult(null); // Wipes previous game's result when staging a new game
        activeLedgerIndexRef.current = gameIndexRef.current; // Locks in the ledger index for this game session

        const flowType = macrogame.config.screenFlowType || 'Separate';

        switch (flowType) {
            case 'Skip':
            case 'Overlay':
                setGameKey(k => k + 1); // Force reset
                setView('game');
                break;
            case 'Combined':
                setView('combined');
                break;
            case 'Separate':
            default:
                setView('title');
                break;
        }
    }, [macrogame]);

    const advanceFromIntro = useCallback(() => { 
        if (view === 'intro') {
            const t = macrogame?.introScreen?.transition || {};
            const isAuto = t.type === 'auto';
            const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
            
            executeTransition(() => runFlow(), isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'primary');
        }
    }, [view, runFlow, macrogame, executeTransition]);
    
    const advanceFromPromo = useCallback(() => { 
        if (view === 'promo') {
            const t = macrogame?.promoScreen?.transition || {};
            const isAuto = t.type === 'auto';
            const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
            
            executeTransition(() => transitionToEnd(), isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'primary');
        }
    }, [view, transitionToEnd, macrogame, executeTransition]);
    
    const advancePreGame = useCallback(() => {
        if (view === 'title' || view === 'controls' || view === 'combined') {
            // INTELLIGENCE: Always pull the transition config directly from the live macrogame prop to prevent stale closures
            const activeFlowItem = macrogame?.flow[gameIndexRef.current] as any;
            const t = activeFlowItem?.preGameConfig?.transition || macrogame?.config?.preGameConfig?.transition || {};
            const isAuto = t.type === 'auto';
            const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
            
            executeTransition(() => {
                setResult(null); // Double-ensure result is completely wiped before unpausing the canvas
                setView('game');
            }, isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'primary');
        }
    }, [view, macrogame, executeTransition]);

    const onGameEnd = useCallback((gameResult: MicrogameResult) => {
        setResult(gameResult);

        // --- Freeze game in inspection mode ---
        if (modeRef.current === 'inspection') {
            return; // Do not advance to result screen, just freeze the game state.
        }

        gameIndexRef.current++;
        setView('result');
    }, []);

    const onReportEvent = useCallback((eventName: string, payload?: any) => {
        if (!macrogame) return;
        const flowItem = (activeGameData as any) || macrogame.flow[gameIndexRef.current];
        if (!flowItem) return;

        let pointsToAdd = flowItem?.pointRules?.[eventName];

        if (pointsToAdd === undefined) {
            let rules = (flowItem as any).rules;
            if (rules && (!rules.scores || Object.keys(rules.scores).length === 0)) {
                const defId = flowItem.id || flowItem.microgameId;
                let definition = MICROGAME_DEFINITIONS[defId];
                if (!definition) {
                    const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === defId.toLowerCase());
                    if (key) definition = MICROGAME_DEFINITIONS[key];
                }

                if (definition?.events) {
                    const defaultScores: { [key: string]: number } = {};
                    Object.entries(definition.events).forEach(([k, def]) => {
                        if ((def as any).canScore && (def as any).defaultPoints !== undefined) {
                            defaultScores[k] = (def as any).defaultPoints;
                        }
                    });
                    rules = { ...rules, scores: defaultScores };
                }
            }

            if (rules?.enablePoints) {
                let score = rules.scores?.[eventName];
                if (score === undefined && eventName.includes(':')) {
                    const baseEvent = eventName.split(':')[0];
                    score = rules.scores?.[baseEvent];
                }
                if (score === undefined && (flowItem as any).trackableEvents) {
                     const trackable = (flowItem as any).trackableEvents.find((t: any) => t.eventId === eventName || t.eventId === eventName.split(':')[0]);
                     if (trackable) score = trackable.defaultPoints;
                }
                if (typeof score === 'number') {
                    const multiplier = (payload && typeof payload.multiplier === 'number') ? payload.multiplier : 1.0;
                    pointsToAdd = Math.round(score * multiplier);
                }
            }
        }

        if (typeof pointsToAdd === 'number') {
            setTotalScore(prevScore => prevScore + pointsToAdd);
            
            // Log to the ledger for the receipt UI
            let eventLabel = eventName;
            const trackable = (flowItem as any).trackableEvents?.find((t: any) => t.eventId === eventName || t.eventId === eventName.split(':')[0]);
            if (trackable) eventLabel = trackable.label;
            else if (eventName === 'win') eventLabel = 'Game Win';
            else if (eventName === 'time') eventLabel = 'Time Bonus';

            // Use the activeLedgerIndexRef which is strictly locked to the currently mounted game canvas,
            // entirely eliminating the race condition between the game ending and the view transitioning.
            const correctLedgerIndex = activeLedgerIndexRef.current;

            setScoreLedger(prev => [...prev, {
                gameIndex: correctLedgerIndex,
                eventId: eventName,
                label: eventLabel,
                points: pointsToAdd
            }]);
        }
    }, [macrogame, activeGameData]);

    const redeemPoints = useCallback((amount: number) => {
        setTotalScore(prevScore => prevScore - amount);
    }, []);

    const continueFlow = useCallback(() => {
        // INTELLIGENCE: Always pull the transition config directly from the live macrogame prop to prevent stale closures
        const activeFlowItem = macrogame?.flow[Math.max(0, gameIndexRef.current - 1)] as any;
        const t = activeFlowItem?.resultConfig?.transition || macrogame?.config?.resultConfig?.transition || {};
        const isAuto = t.type === 'auto';
        const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
        
        executeTransition(() => {
            scoreAtStartOfGameRef.current = scoreRef.current; // Snapshot the new baseline score
            runFlow();
        }, isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'primary');
    }, [runFlow, macrogame, executeTransition]);

    const retryCurrentMicrogame = useCallback(() => {
        // INTELLIGENCE: Always pull the transition config directly from the live macrogame prop to prevent stale closures
        const activeFlowItem = macrogame?.flow[Math.max(0, gameIndexRef.current - 1)] as any;
        const t = activeFlowItem?.resultConfig?.transition || macrogame?.config?.resultConfig?.transition || {};
        const isAuto = t.type === 'auto';
        const isButton = !isAuto && (t.interactionMethod || 'click') === 'click' && (t.clickFormat || 'disclaimer') === 'button';
        
        executeTransition(() => {
            const targetIndex = Math.max(0, gameIndexRef.current - 1);
            gameIndexRef.current = targetIndex;
            setTotalScore(scoreAtStartOfGameRef.current); // Reset score to the snapshot
            // Wipe ledger entries from the game we are throwing away
            setScoreLedger(prev => prev.filter(item => item.gameIndex < targetIndex)); 
            runFlow();
        }, isAuto ? 'auto' : (isButton ? 'button' : 'disclaimer'), 'secondary');
    }, [runFlow, macrogame, executeTransition]);

    const resetScore = useCallback(() => {
        setTotalScore(0);
        setScoreLedger([]);
        scoreAtStartOfGameRef.current = 0;
        scoreRef.current = 0;
    }, []);

    useEffect(() => {
        const musicIndex = view === 'result' ? gameIndexRef.current - 1 : gameIndexRef.current;
        manageBackgroundMusic(view, musicIndex);
    }, [mode, view, manageBackgroundMusic]); // Re-run when mode changes!

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let timeout: ReturnType<typeof setTimeout>;

        const startCountdown = (durationSeconds: number, onComplete: () => void) => {
            if (durationSeconds <= 0) {
                onComplete();
                return;
            }

            playTimerTickAudio(); // First tick plays immediately
            let secondsLeft = durationSeconds;

            interval = setInterval(() => {
                secondsLeft -= 1;
                if (secondsLeft > 0) {
                    playTimerTickAudio();
                } else {
                    clearInterval(interval);
                    playTimerGoAudio(); // Play final "Go" sound
                    onComplete();
                }
            }, 1000);
        };

        // --- Result Auto-Transition must happen even in Inspection Mode if screen is disabled ---
        if (view === 'result') {
            const flowItem = macrogame?.flow[Math.max(0, gameIndexRef.current - 1)] as any;
            const resultConfig = flowItem?.resultConfig || macrogame?.config.resultConfig;

            if (!resultConfig?.enabled) {
                // 1. Completely Disabled: Transition instantly to the next step
                timeout = setTimeout(() => {
                    scoreAtStartOfGameRef.current = scoreRef.current;
                    runFlow();
                }, 0);
                return () => clearTimeout(timeout);
            }
            
            // 2. Screen is ENABLED. If we are in inspection mode, NEVER auto-transition.
            if (mode === 'inspection') return;

            // 3. Try Again Logic: Try Again screens NEVER auto-transition (they force user choice)
            const isTryAgain = (result as any)?.type === 'try_again';

            // 4. Standard Win/Loss Auto-Transition
            if (resultConfig?.transition?.type === 'auto' && !isTryAgain) {
                const delaySeconds = resultConfig.transition.autoDuration ?? 3;
                startCountdown(delaySeconds, () => {
                    scoreAtStartOfGameRef.current = scoreRef.current;
                    runFlow();
                });
                return () => clearInterval(interval);
            }
        }

        // --- TIMEOUT FREEZE IN INSPECTION MODE ---
        if (mode === 'inspection') return;

        // INTELLIGENCE: Safely resolve the active Pre-Game config, respecting per-game overrides
        const activeFlowItem = macrogame?.flow[gameIndexRef.current] as any;
        const activePreGameConfig = activeFlowItem?.preGameConfig || macrogame?.config.preGameConfig;

        if (isOverlayVisible) {
            const t = activePreGameConfig?.transition;
            if (t?.type === 'auto') {
                startCountdown(t.autoDuration || 3, onInteraction);
            }
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }

        if (view === 'title' || view === 'controls' || view === 'combined') {
            const t = activePreGameConfig?.transition;
            if (t?.type === 'auto') {
                startCountdown(t.autoDuration || 3, advancePreGame);
            }
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }

        if (view === 'intro' && macrogame?.introScreen.enabled && macrogame.introScreen.transition?.type === 'auto') {
            startCountdown(macrogame.introScreen.transition.autoDuration || 3, advanceFromIntro);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }
        
        if (view === 'promo' && macrogame?.promoScreen?.enabled && macrogame.promoScreen.transition?.type === 'auto') {
            startCountdown(macrogame.promoScreen.transition.autoDuration || 5, advanceFromPromo);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }

    }, [view, runFlow, macrogame, advanceFromIntro, advanceFromPromo, advancePreGame, manageBackgroundMusic, mode, isOverlayVisible, onInteraction, playTimerTickAudio, playTimerGoAudio]);
  
    useEffect(() => {
        if (currentTrackRef.current) currentTrackRef.current.muted = isMuted;
    }, [isMuted]);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const start = useCallback(async () => {
        if (!macrogame) return;
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        isTransitioningRef.current = false;
        
        gameIndexRef.current = 0;
        activeLedgerIndexRef.current = 0;
        setTotalScore(0);
        setScoreLedger([]);
        scoreAtStartOfGameRef.current = 0; // Ensure snapshot is reset
        setResult(null); // Clear previous game results on full restart
    
        currentTrackRef.current?.pause();
        currentTrackRef.current = null;

        const eventRef = activeAudioRefs.current.event;
        if (eventRef.audio) { eventRef.audio.pause(); eventRef.audio.currentTime = 0; }
        if (eventRef.timeout) clearTimeout(eventRef.timeout);
    
        const startingView = macrogame.introScreen.enabled ? 'intro' : (macrogame.flow.length > 0 ? 'title' : (macrogame.promoScreen.enabled ? 'promo' : 'end'));
        setView(startingView);

        if (startingView === 'intro') {
            manageBackgroundMusic('intro', 0);
        } else if (startingView === 'title') {
            runFlow();
        }
    }, [macrogame, runFlow, manageBackgroundMusic]);

    useEffect(() => {
        return () => {
            currentTrackRef.current?.pause();
        }
    }, []);

    // --- DERIVED PROGRESS TEXT ---
    let progressText = '';
    const totalGames = macrogame?.flow.length || 0;
    switch (view) {
        case 'intro': progressText = 'Introduction'; break;
        case 'title':
        case 'controls':
        case 'game':
        case 'result':
        case 'combined': progressText = `Game ${Math.min(gameIndexRef.current + 1, totalGames)} of ${totalGames}`; break;
        case 'promo': progressText = 'Promotion'; break;
        case 'end': progressText = 'Reward'; break;
    }

    return {
        view, result, activeGameData, macrogame, 
        playEventAudio, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio, playScoreTallyAudio,
        start, onGameEnd, isMuted, toggleMute,
        advanceFromIntro, advanceFromPromo, advancePreGame, isOverlayVisible, onInteraction,
        onReportEvent, totalScore, scoreLedger, currentGameIndex: gameIndexRef.current,
        currentFlowIndex: view === 'result' ? Math.max(0, gameIndexRef.current - 1) : gameIndexRef.current,
        totalGamesInFlow: macrogame?.flow.length || 0, progressText, redeemPoints,
        continueFlow, retryCurrentMicrogame, resetScore,
        mode, setMode, jumpTo, stepForward, stepBackward,
        canStepForward, canStepBackward, gameKey
    };
};