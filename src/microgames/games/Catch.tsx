/* src/microgames/games/Catch.tsx */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MicrogameProps } from '../types';
import { MicrogameOverlay } from '../../components/ui/MicrogameOverlay';
import { catchDefinition } from '../../microgames/definitions/catch';

// --- NEW: Engine Hooks ---
import { useProgression } from '../../hooks/useProgression';
import { useGameInput } from '../../hooks/useGameInput';
import { useAudioController } from '../../hooks/useAudioController';
import { useGameLoop } from '../../hooks/useGameLoop';

// --- Default Constants ---
const DEFAULT_PLAYER_RATIO = 20 / 4; 
const TIMER_HEIGHT_PCT = 1.5;

// --- Type Definitions ---
interface Item { 
    id: number; 
    x: number; 
    y: number; 
    width: number;
    height: number;
    hitboxScale: number;
    isGood: boolean; 
    dy: number;
    skinKey: string; 
    caughtAt?: number; 
}

const CatchGame: React.FC<MicrogameProps> = ({ 
    onEnd, 
    onReportEvent,
    onUpdateHUD,
    skinConfig, 
    gameData, 
    mechanics, 
    rules,
    isOverlayVisible, 
    hideOverlayVisuals, 
    onInteraction, 
    debugState, 
    isPlaying = true
}) => {

    // --- 1. Mechanics ---
    const DURATION = (mechanics?.duration ?? catchDefinition.mechanics.duration.defaultValue) * 1000;
    const BAD_CHANCE = mechanics?.badItemChance ?? catchDefinition.mechanics.badItemChance.defaultValue;
    const SPAWN_INTERVAL = mechanics?.spawnInterval ?? catchDefinition.mechanics.spawnInterval.defaultValue;
    const DROP_SPEED = mechanics?.dropSpeed ?? catchDefinition.mechanics.dropSpeed.defaultValue;
    const PLAYER_SPEED = mechanics?.['player_playerSpeed'] ?? mechanics?.['player_0_playerSpeed'] ?? mechanics?.playerSpeed ?? catchDefinition.mechanics.playerSpeed.defaultValue;
    const GOOD_VARIETY = mechanics?.goodItemVariety ?? catchDefinition.mechanics.goodItemVariety.defaultValue;
    const BAD_VARIETY = mechanics?.badItemVariety ?? catchDefinition.mechanics.badItemVariety.defaultValue;
    const PLAYER_SIZE = mechanics?.['player_playerSize'] ?? mechanics?.['player_0_playerSize'] ?? mechanics?.playerSize ?? catchDefinition.mechanics.playerSize.defaultValue;
    const ITEM_SIZE_BASE = mechanics?.itemSize ?? catchDefinition.mechanics.itemSize.defaultValue;
    const SURVIVAL_INTERVAL = (mechanics?.survivalPointInterval ?? 1) * 1000;

    // --- 2. Skin Config (Visuals) ---
    const getSkinData = useCallback((key: string) => {
        const item = skinConfig?.[key];
        if (typeof item === 'object') {
            return { 
                url: item?.url, 
                color: (item as any).color,
                width: item?.width,
                height: item?.height,
                // Read the scale from config instead of forcing 1
                hitboxScale: (item as any).hitboxScale ?? 1 
            };
        }
        return { url: typeof item === 'string' ? item : null, color: undefined, hitboxScale: 1 };
    }, [skinConfig]);

    const playerConfig = useMemo(() => {
        const skin = getSkinData('player');
        const width = PLAYER_SIZE || skin.width || 15;
        let height;

        // CASE 1: Custom Skin Exists
        if (skin.url) {
            if (skin.width && skin.height) {
                // A. We have dimensions: Use exact aspect ratio
                const ratio = skin.height / skin.width;
                height = width * ratio;
            } else {
                // B. Missing dimensions (Preview fallback): Use Square (1:1)
                // This prevents uploaded images from looking flattened
                height = width * 1.0;
            }
        } 
        // CASE 2: Default / Unskinned
        else {
             // Use the classic "Paddle" shape (Fixed 5% height)
             // This restores the "Platform" look for the default player
             height = 5; 
        }

        return { ...skin, width, height };
    }, [getSkinData, PLAYER_SIZE]);

    const getItemConfig = useCallback((baseKey: string, specificKey: string) => {
        const specificSkin = getSkinData(specificKey);
        const baseSkin = getSkinData(baseKey);
        const usedSkin = specificSkin.url ? specificSkin : baseSkin;
        
        const specificSize = mechanics?.[`${specificKey}_itemSize`];
        const typeSize = mechanics?.[`${baseKey}_itemSize`];
        const resolvedSize = specificSize ?? typeSize ?? ITEM_SIZE_BASE;
        const width = resolvedSize || usedSkin.width || 8;
        
        let height;
        if (usedSkin.url && usedSkin.width && usedSkin.height) {
            const ratio = usedSkin.height / usedSkin.width;
            height = width * ratio;
        } else {
             height = width * (16 / 9);
        }
        
        return { 
            ...usedSkin, 
            width, 
            height, 
            color: specificSkin.color || baseSkin.color,
            hitboxScale: 1
        };
    }, [getSkinData, ITEM_SIZE_BASE, mechanics]);

    // --- 3. Game State ---
    const [isPausedForOverlay, setIsPausedForOverlay] = useState(isOverlayVisible);
    // Local Lives State
    // FIX: Default to 3 (not 1) to match the HUD visual default
    const initialLives = rules?.lossCondition?.type === 'quota' 
        ? (Number(rules.lossCondition.quotaAmount) || 3) 
        : null;
    const livesRef = useRef<number | null>(initialLives);
    // --- Progress Tracking ---
    // Support both 'quota' and 'score' for target tracking
    const winType = rules?.winCondition?.type;
    const goalTarget = (winType === 'quota' || winType === 'score') 
        ? (rules?.winCondition?.quotaAmount || (winType === 'score' ? 100 : 10)) 
        : null;
    const progressRef = useRef<number>(0);
    const survivalTicksRef = useRef<number>(0);

    // Sync HUD on mount/reset
    useEffect(() => {
        livesRef.current = initialLives;
        progressRef.current = 0; // Reset progress
        survivalTicksRef.current = 0;
        if (onUpdateHUD) {
            onUpdateHUD({ 
                lives: initialLives, 
                maxLives: initialLives,
                score: 0,
                // --- NEW: Init Progress ---
                goalCurrent: 0,
                goalTarget: goalTarget
            });
        }
    }, [initialLives, goalTarget, onUpdateHUD]);
    const [playerX, setPlayerX] = useState<number>(50);
    const [items, setItems] = useState<Item[]>([]);
    
    // Refs for Physics Loop
    const playerXRef = useRef(playerX);
    const itemsRef = useRef<Item[]>([]);
    const isGameActive = useRef(true);
    const nextItemId = useRef(0);
    const processedIds = useRef<Set<number>>(new Set()); 
    const gameLoopRef = useRef<number>();
    
    // Refs for Physics Delta
    const lastTimeRef = useRef<number>(0);
    const survivalAccumulatorRef = useRef<number>(0);
    const spawnAccumulatorRef = useRef<number>(0);

    // Sync local pause state with prop
    useEffect(() => {
        setIsPausedForOverlay(isOverlayVisible);
    }, [isOverlayVisible]);

    // D. Audio Engine (Moved up for access in handleEndGame)
    const sfxAssets = useMemo(() => {
        const baseAssets = { ...catchDefinition.assets };
        if (skinConfig) {
            Object.keys(skinConfig).forEach(key => {
                if (key.includes('_layer_')) {
                    baseAssets[key] = { type: 'audio', label: 'Custom Layer', description: 'Dynamically added audio layer' };
                }
            });
        }
        const { bgMusic, ...rest } = baseAssets;
        return rest;
    }, [skinConfig]);

    const { playSoundForEvent } = useAudioController(
        skinConfig, 
        sfxAssets, 
        isPlaying, 
        isPausedForOverlay
    );

    const handleEndGame = useCallback((win: boolean) => {
        if (!isGameActive.current) return;
        isGameActive.current = false;
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

        // --- DETERMINE RESULT TYPE ---
        let type: 'win' | 'loss' | 'try_again' = 'loss'; // Default fail-safe

        if (win) {
            type = 'win';
        } else {
            // If we didn't win, why?
            if (livesRef.current !== null && livesRef.current <= 0) {
                // Hard Loss: Ran out of lives
                type = 'loss';
            } else {
                // Soft Loss: Time ran out, Quota not met (Try Again)
                type = 'try_again';
            }
        }

        // Play specific Win/Loss audio based on the single source of truth config
        playSoundForEvent(win ? 'win' : 'lose', win ? 'sfxWin' : 'sfxLoss');

        // Pass the explicit type up to the engine
        onEnd({ win, type } as any); 
        if (onReportEvent) onReportEvent(win ? 'win' : 'lose');
    }, [onEnd, onReportEvent, playSoundForEvent]);

    // --- 4. ENGINE INTEGRATION ---

    const isLivePreview = !!debugState?.activeMechanicId;

    // Keep a reference to mechanics so the loop can read fresh values without restarting
    const mechanicsRef = useRef(mechanics);
    useEffect(() => { mechanicsRef.current = mechanics; }, [mechanics]);

    // --- Handle Time Up Logic ---
    const handleTimeUp = useCallback(() => {
        // --- Catch up any fractional survival ticks ---
        const expectedTicks = Math.floor(DURATION / SURVIVAL_INTERVAL);
        const missingTicks = expectedTicks - survivalTicksRef.current;

        if (missingTicks > 0) {
            survivalTicksRef.current += missingTicks;
            const baseScore = rules?.scores?.['survive_interval'] ?? 0;
            if (baseScore !== 0 && rules?.winCondition?.type === 'score') {
                progressRef.current += (baseScore * missingTicks);
            }
            for (let i = 0; i < missingTicks; i++) {
                if (onReportEvent) onReportEvent('survive_interval');
            }
        }

        const winType = rules?.winCondition?.type || 'time';
        
        if (winType === 'quota') {
            // Quota Mode: Must have N items
            const target = rules?.winCondition?.quotaAmount || 0;
            const currentProgress = progressRef.current || 0;
            handleEndGame(currentProgress >= target);
        }
        else if (winType === 'score') {
            // Score Mode: Must have N points
            if (rules?.winCondition?.endImmediately) {
                // If the game didn't end early, they didn't reach the score.
                handleEndGame(false);
            } else {
                // Check if final score meets target
                const target = rules?.winCondition?.quotaAmount || 0;
                const currentVal = progressRef.current || 0;
                handleEndGame(currentVal >= target);
            }
        }
        else {
            // Time/Survival Mode: Time Up = Win (You survived)
            handleEndGame(true);
        }
    }, [rules, handleEndGame, DURATION, SURVIVAL_INTERVAL, onReportEvent]);

    // A. Time Engine (Restored Local Loop)
    const { timerProgress, getUnityTime } = useGameLoop(
        isPlaying, 
        isPausedForOverlay, 
        mechanics, 
        DURATION / 1000, 
        handleTimeUp, 
        isLivePreview 
    );

    // --- Report Timer to HUD ---
    useEffect(() => {
        if (onUpdateHUD) {
            onUpdateHUD({ timerProgress });
        }
    }, [timerProgress, onUpdateHUD]);

    // B. Progression Engine
    const { calculateProgressedValue } = useProgression(mechanics);

    // C. Input Engine
    const inputs = useGameInput(isPlaying, () => {
        if (isPausedForOverlay) startGame();
    });

    // Audio Engine moved above handleEndGame
    
    // --- 5. RENDER CALCULATIONS (Visuals) ---
    const secondsElapsed = getUnityTime();
    
    // REPLACEMENT: Calculate Absolute Dynamic Size directly
    // The hook now handles the math AND enforces the Min/Max limits automatically.
    const renderPlayerWidth = calculateProgressedValue(
        secondsElapsed,
        'size',
        'player',
        playerConfig.width,
        catchDefinition.mechanics.playerSize
    );

    // FIX: Skinned = Proportional Scale; Unskinned = Fixed Height (Grow Width Only)
    let renderPlayerHeight = playerConfig.height;
    if (playerConfig.url) {
        renderPlayerHeight = renderPlayerWidth * (playerConfig.height / playerConfig.width);
    }

    // --- 6. Game Logic ---

    const handleCatch = useCallback((isGood: boolean, itemId: number, skinKey: string) => {
        // Prevent double-processing
        if (processedIds.current.has(itemId)) return;
        processedIds.current.add(itemId);

        // Safety: Ensure skinKey is valid
        const safeSkinKey = skinKey || (isGood ? 'goodItem_0' : 'badItem_0');
        const parts = safeSkinKey.split('_');
        const index = parts.length > 1 ? parts[1] : '0';
        const baseKey = parts[0];
        
        const currentTime = getUnityTime();
        const eventId = isGood ? 'catch_good' : 'catch_bad';
        
        // --- ROBUST SCORE CALCULATION ---
        let baseScore = 0;
        try {
            // Safely access deep properties to prevent "Cannot read properties of undefined"
            const defScore = catchDefinition?.events?.[eventId] 
                ? (catchDefinition.events[eventId] as any).defaultPoints 
                : 0;
            baseScore = rules?.scores?.[eventId] ?? defScore ?? 0;
        } catch (e) {
            console.warn("Score lookup failed, defaulting to 0", e);
            baseScore = 0;
        }

        const finalScore = calculateProgressedValue(
            currentTime, 
            'score', 
            [safeSkinKey, baseKey], // Target specific and generic IDs
            baseScore, 
            { min: 0, step: 1, max: 9999 } 
        );
        
        const reportingMult = baseScore > 0 ? finalScore / baseScore : 1;

        if (isGood) {
            playSoundForEvent(`catch_good:${index}`, 'sfxCatch');
            
            if (onReportEvent) {
                onReportEvent(`catch_good:${index}`, { multiplier: reportingMult });
            }

            // --- Update Progress ---
            if (rules?.winCondition?.type === 'quota') {
                progressRef.current += 1;
            } else if (rules?.winCondition?.type === 'score') {
                progressRef.current += Math.round(baseScore * reportingMult); 
            }

            if (goalTarget !== null) {
                if (onUpdateHUD) {
                    onUpdateHUD({ goalCurrent: progressRef.current });
                }

                if (progressRef.current >= goalTarget && rules?.winCondition?.endImmediately) {
                    handleEndGame(true);
                }
            }
        } else {
            playSoundForEvent(`catch_bad:${index}`, 'sfxFailure');
            
            if (onReportEvent) {
                onReportEvent(`catch_bad:${index}`, { multiplier: reportingMult });
            }

            // Deduct from Progress if Win Condition is Score
            if (rules?.winCondition?.type === 'score') {
                progressRef.current += Math.round(baseScore * reportingMult); // baseScore is negative here
                if (onUpdateHUD) onUpdateHUD({ goalCurrent: progressRef.current });
            }
            
            if (livesRef.current !== null) {
                livesRef.current -= 1;
                if (onUpdateHUD) onUpdateHUD({ lives: livesRef.current });

                if (livesRef.current <= 0) {
                    handleEndGame(false);
                }
            }
        }
    }, [onReportEvent, playSoundForEvent, calculateProgressedValue, getUnityTime, onUpdateHUD, handleEndGame, rules, goalTarget]);

    const startGame = () => {
        if (onInteraction) onInteraction();
        setIsPausedForOverlay(false);
    };

    // --- 7. Physics Loop ---
    const runGameLoop = useCallback((timestamp: number) => {
        if (!isGameActive.current || isPausedForOverlay || !isPlaying) return;

        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Use Local Engine Time
        const currentUnityTime = getUnityTime();

        // Initialize working list from the Ref (Single Source of Truth)
        let workingItems = [...itemsRef.current];

        // --- A. Survival Logic (Preserved) ---
        survivalAccumulatorRef.current += deltaTime;
        if (survivalAccumulatorRef.current >= SURVIVAL_INTERVAL) {
            survivalTicksRef.current += 1;
            if (onReportEvent) onReportEvent('survive_interval');
            survivalAccumulatorRef.current -= SURVIVAL_INTERVAL;
        }

        // --- B. Spawning Logic ---
        // NEW: Calculate Spawn Interval using Linear Progression
        // We pass the definition so it enforces Min/Max limits automatically.
        const currentSpawnInterval = calculateProgressedValue(
            currentUnityTime,
            'generationRate',
            null,
            SPAWN_INTERVAL,
            catchDefinition.mechanics.spawnInterval
        );

        spawnAccumulatorRef.current += deltaTime;
        
        if (spawnAccumulatorRef.current >= currentSpawnInterval) {
            spawnAccumulatorRef.current = 0; 
            
            // --- Distribution Logic ---
            let currentBadChance = BAD_CHANCE;
            // NEW: Check for specific progression on Bad Item Ratio
            if (mechanics?.['progression_badItemChance_active']) {
                 currentBadChance = calculateProgressedValue(
                    currentUnityTime,
                    'badItemChance',
                    null,
                    BAD_CHANCE,
                    catchDefinition.mechanics.badItemChance
                );
            }
            // Manual safety clamp for probability (0% to 90%)
            currentBadChance = Math.min(0.9, Math.max(0, currentBadChance));

            const isGood = Math.random() > currentBadChance;
            const varietyCount = isGood ? GOOD_VARIETY : BAD_VARIETY;
            const baseKey = isGood ? 'goodItem' : 'badItem';
            let variantIndex = 0;

            if (varietyCount > 1) {
                const chances: number[] = [];
                let totalChance = 0;
                for (let i = 0; i < varietyCount; i++) {
                    const defaultChance = Math.floor(100 / varietyCount);
                    const c = mechanics?.[`${baseKey}_${i}_chance`] ?? defaultChance;
                    chances.push(c);
                    totalChance += c;
                }
                if (totalChance <= 0) {
                    variantIndex = Math.floor(Math.random() * varietyCount);
                } else {
                    let randomVal = Math.random() * totalChance;
                    for (let i = 0; i < chances.length; i++) {
                        randomVal -= chances[i];
                        if (randomVal <= 0) { variantIndex = i; break; }
                    }
                }
            }

            const specificKey = `${baseKey}_${variantIndex}`;
            const config = getItemConfig(baseKey, specificKey);
            
            // NEW: Item Speed Calculation
            const specificSpeed = mechanics?.[`${specificKey}_dropSpeed`];
            const baseItemSpeed = mechanics?.[`${baseKey}_dropSpeed`];
            const baseSpeedToUse = (specificSpeed ?? baseItemSpeed) ? (specificSpeed ?? baseItemSpeed) : DROP_SPEED;

            const finalSpeed = calculateProgressedValue(
                currentUnityTime,
                'speed',
                [specificKey, baseKey], // Check both "goodItem_0" AND "goodItem"
                baseSpeedToUse,
                catchDefinition.mechanics.dropSpeed
            );
            
            // NEW: Item Size Calculation
            // Note: We use the base configuration width as the starting point
            // FIX: Ensure we have a valid base width. 
            // If config.width is missing, fall back to the definition default (usually 8 or 10).
            const baseWidth = config.width || catchDefinition.mechanics.itemSize.defaultValue || 10;

            const finalWidth = calculateProgressedValue(
                currentUnityTime,
                'size',
                [specificKey, baseKey], 
                baseWidth, 
                catchDefinition.mechanics.itemSize
            );
            
            const finalHeight = finalWidth * (config.height / config.width);

            const newItem: Item = {
                id: nextItemId.current++,
                x: Math.random() * (100 - finalWidth),
                y: -finalHeight,
                width: finalWidth,
                height: finalHeight,
                hitboxScale: config.hitboxScale,
                isGood,
                dy: finalSpeed,
                skinKey: specificKey 
            };
            
            workingItems.push(newItem);
        }

        // --- C. Player Movement ---
        const currentSpeed = calculateProgressedValue(
            currentUnityTime,
            'speed',
            'player',
            PLAYER_SPEED,
            catchDefinition.mechanics.playerSpeed
        );
        
        let newX = playerXRef.current;
        if (inputs.current.left) newX -= currentSpeed;
        if (inputs.current.right) newX += currentSpeed;
        
        // FIX: Calculate Physics Width INSIDE loop for 60fps smoothness
        // Do not rely on 'renderPlayerWidth' from the react scope
        let playerW = calculateProgressedValue(
            currentUnityTime,
            'size',
            'player',
            playerConfig.width,
            catchDefinition.mechanics.playerSize
        );
        
        // Calculate Physics Height based on Aspect Ratio
        let playerH = playerConfig.height;
        if (playerConfig.url) {
            playerH = playerW * (playerConfig.height / playerConfig.width);
        }

        newX = Math.max(playerW/2, Math.min(newX, 100 - playerW/2));
        playerXRef.current = newX;
        setPlayerX(newX);

        // --- D. Physics & Collisions (Preserved) ---
        const nextFrameItems: Item[] = [];
        
        // FIX: Auto-Tune Hitbox for Skins
        // If Skinned: Use 50% height (0.5) to let items "settle in" and avoid the "floating catch" feeling.
        // If Unskinned: Use 100% height (1.0) for precise block-on-block collision.
        const pScale = playerConfig.url ? 0.5 : 1.0;
        
        const pHitW = playerW; 
        const pHitH = playerH * pScale;
        
        // Lift floor by Timer Height so player isn't covered
        const pY = 100 - playerH - TIMER_HEIGHT_PCT; 
        
        const pHitX = (newX - playerW / 2) + (playerW - pHitW) / 2;
        
        // --- Read Custom Y-Offset ---
        const offsetPct = mechanics?.['player_catchOffset'] ?? mechanics?.catchOffset ?? 0;
        const yOffset = playerH * (offsetPct / 100);

        // Anchor hitbox to the bottom, then apply custom vertical offset
        // With pScale 0.5, the top 50% of the image is "Pass Through", allowing the catch to happen deeper.
        const pHitY = ((pY + playerH) - pHitH) + yOffset;

        // Iterate over workingItems
        for (const item of workingItems) {
            if (processedIds.current.has(item.id)) {
                // Keep alive for 200ms to give the 150ms CSS transition a safe buffer to complete
                if (item.caughtAt && timestamp - item.caughtAt < 200) {
                    nextFrameItems.push(item);
                }
                continue; 
            }

            const newY = item.y + item.dy; 
            
            const iScale = item.hitboxScale;
            const iHitW = item.width * iScale;
            const iHitH = item.height * iScale;
            const iHitX = item.x + (item.width - iHitW) / 2;
            const iHitY = newY + (item.height - iHitH) / 2;

            const xOverlap = (pHitX < iHitX + iHitW) && (pHitX + pHitW > iHitX);
            const yTrigger = (iHitY >= pHitY) && (iHitY < pHitY + pHitH);

            if (xOverlap && yTrigger) {
                // --- CRITICAL FIX: SAFETY WRAP ---
                // If handleCatch errors, we log it but continue the loop 
                // so the game doesn't freeze.
                try {
                    handleCatch(item.isGood, item.id, item.skinKey);
                } catch (err) {
                    console.error("Error handling catch:", err);
                }
                nextFrameItems.push({ ...item, caughtAt: timestamp });
                continue; // Remove item from next frame collision checks
            }

            if (newY < 100) {
                nextFrameItems.push({ ...item, y: newY });
            }
        }

        // Finalize Frame
        itemsRef.current = nextFrameItems;
        setItems(nextFrameItems);

        gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }, [isPausedForOverlay, isPlaying, PLAYER_SPEED, playerConfig, handleCatch, onReportEvent, 
        mechanics, getItemConfig, SURVIVAL_INTERVAL, 
        DROP_SPEED, SPAWN_INTERVAL, BAD_CHANCE, GOOD_VARIETY, BAD_VARIETY,
        inputs, calculateProgressedValue // Removed renderPlayerWidth/Height
    ]);

    // --- 8. Reset State Logic (Only when settings change) ---
    useEffect(() => {
        // Prevent reset during slider interaction
        if (isLivePreview) return;

        // Prevent Zombie Restarts (Only reset if fresh or currently playing)
        const isFreshMount = itemsRef.current.length === 0 && !isGameActive.current;
        const isCurrentlyPlaying = isGameActive.current;

        if (!isFreshMount && !isCurrentlyPlaying) return;

        // Reset Entities & Physics State
        setPlayerX(50);
        setItems([]);
        itemsRef.current = [];
        
        isGameActive.current = true;
        playerXRef.current = 50;
        processedIds.current.clear();
        progressRef.current = 0; 
        survivalAccumulatorRef.current = 0; 
        spawnAccumulatorRef.current = 0;
        lastTimeRef.current = 0;
        survivalTicksRef.current = 0;
        
        // Note: We do NOT start/stop the loop here. We only reset the data.
    }, [mechanics, isLivePreview]);

    // --- 9. Loop Lifecycle (Manages the frame requests) ---
    useEffect(() => {
        // If the loop function changes (e.g. Score updated), we cancel the old frame
        // and request a new one immediately. This "hot-swaps" the logic 
        // WITHOUT triggering the State Reset above.
        if (!isPausedForOverlay && isPlaying) {
             gameLoopRef.current = requestAnimationFrame(runGameLoop);
        }
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [isPlaying, isPausedForOverlay, runGameLoop]);

    const { url: bgUrl, color: bgColor } = getSkinData('background');
    const bgStyle = {
        ...localStyles.gameArea,
        ...(bgUrl ? { backgroundImage: `url(${bgUrl})` } : {}),
        ...(bgColor ? { backgroundColor: bgColor } : { backgroundColor: catchDefinition.assets.background.defaultColor })
    };

    return (
        <div style={bgStyle} onClick={isPausedForOverlay ? startGame : undefined}>
            {/* 1. OVERLAY */}
            {isPausedForOverlay && !hideOverlayVisuals && (
                <MicrogameOverlay name={gameData.name} controls={gameData.controls} onStart={startGame} />
            )}

            {/* 2. PLAYER */}
            <div style={{ 
                ...localStyles.gameObject, 
                // Use DYNAMIC render size
                left: `${playerX}%`, 
                top: `${100 - renderPlayerHeight - TIMER_HEIGHT_PCT}%`, 
                width: `${renderPlayerWidth}%`, 
                height: `${renderPlayerHeight}%`, 
                zIndex: 20,
                transform: 'translateX(-50%)'
            }}>
                {playerConfig.url ? (
                    <img 
                        src={playerConfig.url} 
                        style={{ 
                            ...localStyles.skinnedObject, 
                            objectPosition: 'bottom' // <--- Anchors image pixels to the floor
                        }} 
                        alt="Player" 
                    />
                ) : (
                    <div style={{ ...localStyles.placeholder, backgroundColor: playerConfig.color || catchDefinition.assets.player.defaultColor }} />
                )}
                
                {/* --- DEBUG HITBOX FOR PLAYER --- */}
                {(debugState?.showHitboxId === 'player' || debugState?.activeMechanicId === 'player_catchOffset') && (() => {
                    const pScale = playerConfig.url ? 0.5 : 1.0;
                    const offsetPct = mechanics?.['player_catchOffset'] ?? mechanics?.catchOffset ?? 0;
                    return (
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            width: '100%',
                            height: `${pScale * 100}%`,
                            top: `${(1 - pScale) * 100 + offsetPct}%`,
                            boxSizing: 'border-box',
                            border: '2px solid rgba(255, 0, 0, 0.8)',
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            zIndex: 100,
                            pointerEvents: 'none',
                            transition: 'top 0.1s linear'
                        }} />
                    );
                })()}
            </div>

            {/* 3. ACTIVE ITEMS */}
            {items.map(item => {
                const baseKey = item.isGood ? 'goodItem' : 'badItem';
                const config = getItemConfig(baseKey, item.skinKey);
                const defaultColor = item.isGood ? catchDefinition.assets.goodItem.defaultColor : catchDefinition.assets.badItem.defaultColor;

                const isCaught = !!item.caughtAt;

                return (
                    <div key={item.id} style={{ 
                        ...localStyles.gameObject, 
                        left: `${item.x}%`, 
                        top: `${item.y}%`, 
                        width: `${item.width}%`, 
                        height: `${item.height}%`, 
                        zIndex: 10, // Keep it at 10 so it stays behind the player if using an offset!
                        // Use scale 0.01 instead of 0 to prevent 0-pixel browser rendering artifacts
                        transform: isCaught ? 'scale(0.01) translateY(-20px)' : 'scale(1) translateY(0)',
                        opacity: isCaught ? 0 : 1,
                        transition: isCaught ? 'all 0.15s ease-out' : 'none'
                    }}>
                        {config.url ? (
                            <img src={config.url} style={localStyles.skinnedObject} />
                        ) : (
                            <div style={{ ...localStyles.placeholder, backgroundColor: config.color || defaultColor }} />
                        )}
                    </div>
                );
            })}

            {/* 4. UI: Timer Bar (Lifted to Chrome) */}

            {/* 5. PREVIEW VISUALS (Debug/Builder Mode) */}
            {debugState?.activeMechanicId && (() => {
                const mechId = debugState.activeMechanicId;
                const cleanId = mechId.replace('test_drop_', '');
                const isBadPreview = cleanId.includes('badItem');
                const baseKey = isBadPreview ? 'badItem' : 'goodItem';
                const specificKey = cleanId.split('_').length >= 2 && !cleanId.startsWith(baseKey)
                    ? cleanId.split('_').slice(0, 2).join('_') 
                    : cleanId.includes(baseKey) ? cleanId.split('_').slice(0, 2).join('_') : baseKey;
                const previewConfig = getItemConfig(baseKey, specificKey); 
                const defaultColor = isBadPreview ? catchDefinition.assets.badItem.defaultColor : catchDefinition.assets.goodItem.defaultColor;
                
                // Use Engine or Mechanics for Simulation Speed
                let simSpeed = DROP_SPEED;
                if (cleanId.includes('dropSpeed')) {
                    simSpeed = mechanics?.[cleanId] ?? mechanics?.[`${specificKey}_dropSpeed`] ?? mechanics?.[`${baseKey}_dropSpeed`] ?? DROP_SPEED;
                } else {
                    simSpeed = mechanics?.[`${specificKey}_dropSpeed`] ?? mechanics?.[`${baseKey}_dropSpeed`] ?? DROP_SPEED;
                }

                if (mechId.includes('itemSize') || mechId.includes('hitboxScale') || (mechId.includes('dropSpeed') && !mechId.startsWith('test_drop')) || mechId === baseKey || mechId.startsWith(baseKey)) {
                    return (
                        <div style={{ ...localStyles.gameObject, left: '50%', top: '15%', width: `${previewConfig.width}%`, height: `${previewConfig.height}%`, opacity: 0.9, border: '2px dashed #fff', zIndex: 200, transform: 'translate(-50%, -50%)' }}>
                            {previewConfig.url ? <img src={previewConfig.url} style={localStyles.skinnedObject} /> : <div style={{ ...localStyles.placeholder, backgroundColor: previewConfig.color || defaultColor }} />}
                            <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: '10px', fontWeight: 'bold', textShadow: '0 1px 2px black', whiteSpace: 'nowrap', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                                {mechId.includes('dropSpeed') ? 'Speed Preview' : mechId.includes('hitboxScale') ? 'Hitbox Preview' : 'Preview'}
                            </div>
                        </div>
                    );
                }
                if (mechId.startsWith('test_drop')) {
                    const pHeight = playerConfig.height;
                    const pHitboxH = pHeight * playerConfig.hitboxScale;
                    const targetY = (100 - pHeight) + ((pHeight - pHitboxH) / 2);
                    const distance = targetY - 15;
                    
                    // ADJUSTMENT: Speed Tuning
                    // Increase 'TUNING_FACTOR' to make the simulation drop FASTER.
                    // Decrease it (e.g. 0.9) to make it slower.
                    const TUNING_FACTOR = 1.5; // Try 1.1 (10% faster) or 1.2 (20% faster)
    
                    const speedPerSecond = (simSpeed || 1) * 60 * TUNING_FACTOR;
                    const animDuration = distance / speedPerSecond; 

                    return (
                        <>
                             <style>{`@keyframes previewDrop { 0% { top: 15%; opacity: 1; } 99% { top: ${targetY}%; opacity: 1; } 100% { top: ${targetY}%; opacity: 0; } }`}</style>
                             <div style={{ ...localStyles.gameObject, left: '50%', width: `${previewConfig.width}%`, height: `${previewConfig.height}%`, zIndex: 10, transform: 'translate(-50%, 0)', animation: `previewDrop ${animDuration}s linear forwards` }}>
                                {previewConfig.url ? <img src={previewConfig.url} style={localStyles.skinnedObject} /> : <div style={{ ...localStyles.placeholder, backgroundColor: previewConfig.color || defaultColor }} />}
                             </div>
                        </>
                    );
                }
                return null;
            })()}
        </div>
    );
};

const localStyles: { [key: string]: React.CSSProperties } = {
    gameArea: { width: '100%', height: '100%', position: 'relative', overflow: 'hidden', fontFamily: 'inherit', backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', transform: 'translateZ(0)' },
    gameObject: { position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', willChange: 'left, top' },
    placeholder: { width: '100%', height: '100%', borderRadius: '4px' },
    skinnedObject: { width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' },
    timerContainer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.3)' },
    timerBar: { height: '100%', backgroundColor: '#3498db', transition: 'width 0.1s linear', willChange: 'width' },
    hitbox: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', border: '2px solid rgba(255, 0, 0, 0.8)', backgroundColor: 'rgba(255, 0, 0, 0.2)', zIndex: 100, pointerEvents: 'none', transition: 'opacity 0.2s' }
};

export default CatchGame;