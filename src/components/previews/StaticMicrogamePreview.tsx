/* src/components/previews/StaticMicrogamePreview.tsx */

import React, { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Microgame, CustomMicrogame, MicrogameResult } from '../../types';
import { MICROGAME_COMPONENTS } from '../../microgames/registry';
import { MICROGAME_DEFINITIONS } from '../../microgames/definitions/index';
import { styles } from '../../App.styles';
import { UnifiedGameChrome } from '../ui/UnifiedGameChrome';
import { MicrogameResultOverlay } from '../ui/MicrogameResultOverlay';
import { useGameInput } from '../../hooks/useGameInput';

const ORIENTATIONS = {
    landscape: { label: 'Landscape (16:9)', width: 960, height: 540 }, 
    portrait: { label: 'Portrait (9:16)', width: 360, height: 640 }    
};

interface StaticMicrogamePreviewProps {
    baseGame: Microgame;
    variant: CustomMicrogame; 
    orientation?: 'landscape' | 'portrait';
    onOrientationChange?: (mode: 'landscape' | 'portrait') => void;
    forceHideOverlay?: boolean;
    debugShowHitboxId?: string | null;
    refreshTrigger?: number;
    activeMechanicId?: string | null;
    isPlaying?: boolean;
    onGameStart?: () => void;
}

export const StaticMicrogamePreview: React.FC<StaticMicrogamePreviewProps> = ({ 
    baseGame, 
    variant, 
    orientation = 'landscape',
    onOrientationChange,
    forceHideOverlay = false,
    debugShowHitboxId = null,
    refreshTrigger = 0,
    activeMechanicId = null,
    isPlaying = true,
    onGameStart
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    
    // --- Control Overlay Visibility Manually ---
    const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);

    // --- Game State Machine ---
    const [gameState, setGameState] = useState<'overlay' | 'playing' | 'result'>('overlay');
    const [gameResult, setGameResult] = useState<MicrogameResult | null>(null);
    const [resultType, setResultType] = useState<'win' | 'loss' | 'try_again'>('win');
    const [gameId, setGameId] = useState(0); 

    // --- HUD STATE (Passive) ---
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState<number | null>(null);
    const [maxLives, setMaxLives] = useState<number | null>(null);
    const [goalCurrent, setGoalCurrent] = useState<number | null>(null);
    const [goalTarget, setGoalTarget] = useState<number | null>(null);
    const [timerProgress, setTimerProgress] = useState(100);

    // --- RESOLVE DEFAULTS ---
    const definition = MICROGAME_DEFINITIONS[baseGame.id] || baseGame;

    // Deep merge variant rules with factory defaults to prevent missing UI flags (like showProgress, showLives)
    const stableRules = useMemo(() => {
        const factoryRules = definition?.defaultRules || {};
        const variantRules = variant?.rules || {};
        return {
            ...factoryRules,
            ...variantRules,
            enablePoints: variantRules.enablePoints ?? factoryRules.enablePoints ?? false,
            showScore: variantRules.showScore ?? factoryRules.showScore ?? false,
            scores: {
                ...(factoryRules.scores || {}),
                ...(variantRules.scores || {})
            },
            winCondition: {
                ...(factoryRules.winCondition || {}),
                ...(variantRules.winCondition || {})
            },
            lossCondition: {
                ...(factoryRules.lossCondition || {}),
                ...(variantRules.lossCondition || {})
            }
        };
    }, [JSON.stringify(variant?.rules), definition]);

    // Dynamically identify all visual assets for this specific game
    const visualAssetKeys = useMemo(() => {
        if (!definition.assets) return [];
        return Object.entries(definition.assets)
            .filter(([_, def]) => def.type === 'image')
            .map(([key]) => key);
    }, [definition]);
    
    // --- INPUT ENGINE ---
    useGameInput(gameState === 'overlay' && isOverlayEnabled, () => {
        setGameState('playing');
        if (onGameStart) onGameStart();
    });

    // --- NEW: HUD Handler ---
    const handleUpdateHUD = useCallback((payload: { 
        lives?: number | null, 
        maxLives?: number | null, 
        score?: number, 
        goalCurrent?: number,
        goalTarget?: number | null,
        timerProgress?: number
    }) => {
        if (payload.score !== undefined) setScore(payload.score);
        if (payload.lives !== undefined) setLives(payload.lives);
        if (payload.maxLives !== undefined) setMaxLives(payload.maxLives);
        if (payload.goalCurrent !== undefined) setGoalCurrent(payload.goalCurrent);
        if (payload.goalTarget !== undefined) setGoalTarget(payload.goalTarget);
        if (payload.timerProgress !== undefined) setTimerProgress(payload.timerProgress);
    }, []);

    // Centralized Game End Handler
    // Purely reactive: We trust the Game Component to tell us the result.
    const concludeGame = useCallback((result: MicrogameResult | boolean) => {
        const isWin = typeof result === 'boolean' ? result : result.win;
        const type = (typeof result === 'object' && result.type) ? result.type : (isWin ? 'win' : 'loss');

        setResultType(type);
        setGameResult(typeof result === 'boolean' ? { win: result } : result);
        setGameState('result');
        
        // Note: Audio is now handled by the Game Component itself
    }, []);

    // --- RESET LOGIC ---
    const initializeGame = useCallback(() => {
        setGameState(forceHideOverlay ? 'playing' : 'overlay');
        setGameResult(null);
        setGameId(prev => prev + 1);
        
        // Reset HUD state (Game component will hydrate this on mount)
        setScore(0);
        setLives(null);
        setMaxLives(null);
        setGoalCurrent(null);
        setGoalTarget(null);
    }, [forceHideOverlay]);

    // Reset Effect
    const prevVariantRef = useRef(variant);
    useEffect(() => {
        if (!variant || !prevVariantRef.current) {
            prevVariantRef.current = variant;
            return;
        }
        if (activeMechanicId) {
            prevVariantRef.current = variant;
            return;
        }
        const hasVisualChange = Object.keys(variant.skinData).some(key => {
            const curr = variant.skinData[key];
            const prev = prevVariantRef.current?.skinData[key];
            return curr.width !== prev?.width || curr.height !== prev?.height;
        });
        const hasRulesChange = JSON.stringify(variant.rules) !== JSON.stringify(prevVariantRef.current.rules);

        if (hasVisualChange || hasRulesChange || baseGame.id !== prevVariantRef.current.baseMicrogameId || refreshTrigger !== 0) {
            initializeGame();
        }
        prevVariantRef.current = variant;
    }, [variant, activeMechanicId, forceHideOverlay, baseGame.id, refreshTrigger, initializeGame]);

    useEffect(() => { initializeGame(); }, []);

    // --- EVENT HANDLER ---
    const handleReportEvent = useCallback((eventId: string, payload?: any) => {
        const rules = stableRules;
        
        // 1. NORMALIZE EVENT ID (Strip suffixes like :0 for matching)
        const baseEventId = eventId.split(':')[0];

        // 2. UPDATE SCORE (Visual Only)
        // We trust the Game Component for Win/Loss, but we calculate points here
        // to show them in the HUD, acting as the "Mini-Engine".
        const eventScore = rules.scores?.[eventId] ?? rules.scores?.[baseEventId];
        
        if (rules.enablePoints && eventScore !== undefined) {
            const multiplier = (payload && typeof payload.multiplier === 'number') ? payload.multiplier : 1.0;
            const pointsToAdd = Math.round(eventScore * multiplier);
            setScore(prev => prev + pointsToAdd);
        }
    }, [stableRules]);

    const handleRestart = useCallback(() => { initializeGame(); }, [initializeGame]);

    // Create a stable hash of visual/audio props (Excluding 'name' to prevent resets while typing)
    const skinDataHash = useMemo(() => {
        if (!variant?.skinData) return '';
        const relevantData = Object.entries(variant.skinData).reduce((acc: any, [key, val]: [string, any]) => {
            acc[key] = {
                url: val.url,
                w: val.width,
                h: val.height,
                s: val.hitboxScale,
                c: val.color,
                v: val.volume,
                t: val.triggerEvents
            };
            return acc;
        }, {});
        return JSON.stringify(relevantData);
    }, [variant?.skinData]);

    const skinConfig = useMemo(() => {
        const config: { [key: string]: any } = {};
        if (variant && variant.skinData) {
            Object.entries(variant.skinData).forEach(([key, value]) => {
                if (value && (value.url || (value as any).color || (value as any).url === "")) {
                    config[key] = { 
                        url: value.url, width: value.width, height: value.height, 
                        hitboxScale: (value as any).hitboxScale, color: (value as any).color,
                        volume: (value as any).volume, triggerEvents: (value as any).triggerEvents
                    };
                }
            });
        }
        return config;
    }, [skinDataHash]); // Only update if visual/audio props change

    // --- Responsive Scaling ---
    const currentSize = ORIENTATIONS[orientation];
    const calculateLayout = useCallback(() => {
        if (wrapperRef.current) {
            const padding = 20; 
            const availableWidth = wrapperRef.current.offsetWidth - padding;
            const availableHeight = wrapperRef.current.offsetHeight - padding;
            setScale(Math.min(availableWidth / currentSize.width, availableHeight / currentSize.height));
        }
    }, [currentSize]);

    useEffect(() => {
        const observer = new ResizeObserver(calculateLayout);
        if (wrapperRef.current) observer.observe(wrapperRef.current);
        calculateLayout();
        return () => observer.disconnect();
    }, [calculateLayout]);

    // --- Resolve HUD Props ---
    const showPoints = stableRules.enablePoints && stableRules.showScore;
    const showLives = stableRules.lossCondition?.type === 'quota' && (stableRules.lossCondition?.showLives ?? true);

    // Read from the full definition, not just the passed prop
    const lifeIcon = definition.hud?.lifeIcon || baseGame.hud?.lifeIcon || 'circle';
    const GameComponent = MICROGAME_COMPONENTS[baseGame.id];

    if (!GameComponent) return <div style={{...styles.centerContent, color:'white', background:'black'}}>Game engine not found</div>;

    // Stabilize Mechanics to prevent resets when unrelated props (like name) change
    const stableMechanics = useMemo(() => variant?.mechanics || {}, [JSON.stringify(variant?.mechanics)]);

    // Determine Label based on Win Condition Type
    const winType = stableRules.winCondition?.type;
    const goalLabel = winType === 'quota' ? "Items Caught" : winType === 'score' ? "Points Earned" : undefined;

    // --- MEMOIZED GAME COMPONENT (FIX FOR STUTTER) ---
    // We memoize the rendered game to prevent it from re-rendering when only HUD state (like score/progress) changes.
    // We only re-render if Physics/Mechanics change.
    const RenderedGame = useMemo(() => (
        <GameComponent
            key={gameId} 
            // Removed unityTime (Game handles it internaly)
            mechanics={stableMechanics} // <--- USE STABLE
            gameData={baseGame}
            skinConfig={skinConfig}
            rules={stableRules}         // <--- USE STABLE
            onEnd={concludeGame}  // Pass simplified handler
            onReportEvent={handleReportEvent}
            onUpdateHUD={handleUpdateHUD} // <--- Pass HUD handler
            onInteraction={() => {
                setGameState('playing');
                if (onGameStart) onGameStart();
            }} 
            debugState={{ showHitboxId: debugShowHitboxId, activeMechanicId: activeMechanicId }}
            isPlaying={gameState === 'playing' && isPlaying}
        />
    ), [gameId, stableMechanics, stableRules, baseGame, skinConfig, handleReportEvent, handleUpdateHUD, debugShowHitboxId, activeMechanicId, gameState, isPlaying, onGameStart, concludeGame]);

    // Debug Log
    console.log('Game:', baseGame.id, 'HUD Config:', baseGame.hud);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Toolbar */}
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center' }}>
                <h5 style={{ margin: 0, color: '#333', fontSize: '1rem' }}>Game Preview</h5>
                {onOrientationChange && (
                    <select value={orientation} onChange={(e) => onOrientationChange(e.target.value as 'landscape' | 'portrait')} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', borderColor: '#ccc', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: '#fff', marginLeft: 'auto' }}>
                        <option value="landscape">Landscape (16:9)</option>
                        <option value="portrait">Portrait (9:16)</option>
                    </select>
                )}
            </div>

            {/* Preview Area */}
            <div ref={wrapperRef} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e9ecef', borderRadius: '0 0 8px 8px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', width: currentSize.width, height: currentSize.height,
                    transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', backgroundColor: '#000', overflow: 'hidden',
                    fontSize: '16px', // Enforce strict ratio scaling
                    cursor: (gameState === 'overlay' && !isOverlayEnabled) ? 'pointer' : 'default' 
                }}>
                    <Suspense fallback={<div style={{ ...styles.centerContent, color: '#fff', height: '100%' }}>Loading Engine...</div>}>
                        
                        <UnifiedGameChrome
                            view="game"
                            theme="dark"
                            totalScore={score}
                            progressText=""
                            microConfig={{ showPoints: !!showPoints, lifeIconType: lifeIcon }}
                            lives={showLives ? lives : null}
                            maxLives={maxLives}
                            timerProgress={timerProgress}
                            goalCurrent={goalCurrent}
                            goalTarget={goalTarget}
                            goalLabel={goalLabel}
                            isOverlayVisible={
                                gameState === 'overlay' && 
                                isOverlayEnabled && 
                                !(
                                    activeMechanicId && 
                                    (
                                        // 1. Check for Standard Visual Mechanics (Keywords)
                                        ['size', 'width', 'height', 'scale', 'dropspeed', 'fallspeed', 'obstaclecount', 'catchoffset'].some(k => activeMechanicId.toLowerCase().includes(k))
                                        ||
                                        // 2. Check for Dynamic Asset Uploads (e.g. 'spaceship', 'asteroid_0')
                                        visualAssetKeys.some(assetKey => 
                                            // Match exact asset name (e.g. "player")
                                            activeMechanicId === assetKey || 
                                            // Match indexed asset name (e.g. "obstacle_0"), 
                                            // BUT avoid matching mechanics like "player_playerSpeed"
                                            new RegExp(`^${assetKey}_\\d+$`).test(activeMechanicId)
                                        )
                                    )
                                )
                            }
                            onStart={() => {
                                setGameState('playing');
                                if (onGameStart) onGameStart();
                            }}
                            overlayTitle={baseGame.name}
                            overlayControls={(baseGame as any).controls || "Interact to Start"} 
                            preGameConfig={{
                                headline: '<h1 style="text-align: center; text-transform: uppercase;">{{game_title}}</h1>',
                                bodyText: '<p style="text-align: center; font-size: 1.25rem;">{{game_controls}}</p>',
                                transition: { type: 'interact', interactionMethod: 'any_interaction', disclaimerText: 'Click or press any key to continue', pulseAnimation: true }
                            }}
                        >
                            {RenderedGame}
                        </UnifiedGameChrome>

                        {/* RESULT OVERLAY */}
                        {gameState === 'result' && !forceHideOverlay && (
                            <MicrogameResultOverlay 
                                type={resultType}
                                score={score}
                                showScore={!!showPoints}
                                onContinue={handleRestart}
                                config={variant.resultConfig || {
                                    enabled: true,
                                    format: 'overlay',
                                    winText: '<h1 style="text-align: center; color: #2ecc71;">YOU WIN!</h1>',
                                    lossText: '<h1 style="text-align: center; color: #e74c3c;">GAME OVER</h1>',
                                    tryAgainText: '<h1 style="text-align: center; color: #f1c40f;">TIME\'S UP</h1>',
                                    showPlayAgainOnWin: false,
                                    showPlayAgainOnLoss: false,
                                    showPlayAgainOnTryAgain: false,
                                    transition: { 
                                        type: 'interact', 
                                        interactionMethod: 'click', 
                                        clickFormat: 'button', 
                                        buttonConfig: { text: 'Play Again', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'wrap' } 
                                    }
                                } as any}
                                macroConfig={{ pointDisplayMode: 'simple', enableTallyAnimation: false }}
                                theme="dark"
                                isStandAlone={variant.resultConfig?.format === 'stand_alone'}
                                isActive={true}
                                scoreLedger={[]}
                                currentGameIndex={0}
                            />
                        )}
                    </Suspense>
                </div>
            </div>
        </div>
    );
};