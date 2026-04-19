/* src/microgames/games/Avoid.tsx */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MicrogameProps } from '../types';
import { MicrogameOverlay } from '../../components/ui/MicrogameOverlay';
import { avoidDefinition } from '../../microgames/definitions/avoid';

// --- NEW: Engine Hooks ---
import { useProgression } from '../../hooks/useProgression';
import { useGameInput } from '../../hooks/useGameInput';
import { useAudioController } from '../../hooks/useAudioController';
import { useGameLoop } from '../../hooks/useGameLoop';

// --- Default Constants (Fallbacks) ---
const DEFAULT_PLAYER_RATIO = 13 / 7; // Height / Width
const DEFAULT_OBSTACLE_RATIO = 17 / 9;
const HIT_COOLDOWN_MS = 1500; // 1.5s invulnerability

// --- Type Definitions ---
interface Position { x: number; y: number; }
interface Obstacle extends Position { 
    id: number; 
    slotIndex: number; // 0 to N (maps to obstacle_0, obstacle_1)
    dx: number; 
    dy: number; 
    baseSpeed: number; 
}

// --- Helper Functions ---
const getRandomDirection = () => { 
    const angle = Math.random() * 2 * Math.PI; 
    return { dx: Math.cos(angle), dy: Math.sin(angle) }; 
};

// Helper to check if two rects overlap
const checkOverlap = (
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
) => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

// --- Main Component ---
const AvoidGame: React.FC<MicrogameProps> = ({ 
    onEnd, 
    onReportEvent,
    onUpdateHUD, // <--- Report to Passive Chrome 
    skinConfig, 
    gameData, 
    mechanics,
    rules, // <--- Need rules locally for Lives logic 
    isOverlayVisible, 
    hideOverlayVisuals, 
    onInteraction, 
    debugState, 
    isPlaying = true
    // Note: unityTime prop is removed because we calculate it locally again
}) => {
  
  // --- 0. Resolve Game Mechanics ---
  const durationProp = mechanics?.duration ?? avoidDefinition.mechanics.duration.defaultValue;
  const GAME_DURATION = durationProp * 1000;

  const PLAYER_SPEED = mechanics?.['player_playerSpeed'] ?? mechanics?.playerSpeed ?? avoidDefinition.mechanics.playerSpeed.defaultValue;
  
  // Single Speed Source
  const OBSTACLE_SPEED = mechanics?.['obstacle_obstacleSpeed'] ?? mechanics?.obstacleSpeed ?? avoidDefinition.mechanics.obstacleSpeed.defaultValue;

  const OBSTACLE_COUNT = mechanics?.obstacleCount ?? avoidDefinition.mechanics.obstacleCount.defaultValue;
  const PLAYER_SIZE = mechanics?.['player_playerSize'] ?? mechanics?.playerSize ?? avoidDefinition.mechanics.playerSize.defaultValue;
  const OBSTACLE_SIZE = mechanics?.obstacleSize ?? avoidDefinition.mechanics.obstacleSize.defaultValue;
  
  const GENERATION_RATE = mechanics?.generationRate ?? avoidDefinition.mechanics.generationRate.defaultValue;
  
  const MAX_OBSTACLES = mechanics?.maxObstacles ?? avoidDefinition.mechanics.maxObstacles.defaultValue;
  const MIN_OBSTACLES = mechanics?.minObstacles ?? avoidDefinition.mechanics.minObstacles.defaultValue;

  // New Survival Interval
  const SURVIVAL_INTERVAL = (mechanics?.survivalPointInterval ?? 1) * 1000;
  
  // --- 1. Resolve Dynamic Sizes & Hitboxes ---
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
      const width = PLAYER_SIZE || skin.width || 7;

      let height;
      if (skin.url && skin.width && skin.height) {
          const ratio = skin.height / skin.width;
          height = width * ratio;
      } else {
           height = width * DEFAULT_PLAYER_RATIO;
      }
      
      return { 
          ...skin, 
          width, 
          height, 
          // Read default from definition if not in skin
          hitboxScale: (skin as any).hitboxScale ?? avoidDefinition.assets.player.physics?.defaultHitboxScale ?? 1 
      };
  }, [getSkinData, PLAYER_SIZE]);

  // Stable Ref for Player Config (so loop doesn't restart when size changes)
  const playerConfigRef = useRef(playerConfig);
  useEffect(() => { playerConfigRef.current = playerConfig; }, [playerConfig]);

  // Helper: Get configuration (Size + Physics) for a specific slot
  // FIX: Use mechanicsRef to keep this function stable!
  const getObstacleConfig = useCallback((slotIndex: number) => {
      const currentMechanics = mechanicsRef.current; // Read stable ref
      
      const specificKey = `obstacle_${slotIndex}`;
      const genericKey = 'obstacle';
      
      const skin = getSkinData(specificKey).url ? getSkinData(specificKey) : getSkinData(genericKey);
      
      const overrideSize = currentMechanics?.[`${specificKey}_obstacleSize`];
      // Note: We use the mechanic value or fall back to the global constant (which is just an initial value now)
      // Ideally, we read 'obstacleSize' from mechanicsRef too.
      const globalSize = currentMechanics?.obstacleSize ?? avoidDefinition.mechanics.obstacleSize.defaultValue;
      const baseSizeToUse = overrideSize !== undefined ? overrideSize : globalSize;
      
      let width = baseSizeToUse || skin.width || globalSize;
      const defScale = avoidDefinition.assets.obstacle.physics?.defaultHitboxScale ?? 1;
      let hitboxScale = skin.hitboxScale || defScale;

      // Calculate Height
      let height = width * DEFAULT_OBSTACLE_RATIO;
      if (skin.url && skin.width && skin.height) {
          const ratio = skin.height / skin.width;
          height = width * ratio; 
      } 

      const overrideSpeed = currentMechanics?.[`${specificKey}_obstacleSpeed`];
      const globalSpeed = currentMechanics?.obstacleSpeed ?? avoidDefinition.mechanics.obstacleSpeed.defaultValue;
      const speed = overrideSpeed !== undefined ? overrideSpeed : globalSpeed;

      return { width, height, hitboxScale, speed };
  }, [getSkinData]); // REMOVED 'mechanics', 'OBSTACLE_SIZE', 'OBSTACLE_SPEED' from deps

  // --- 2. Initial State Setup ---
  const createInitialObstacles = useCallback((): Obstacle[] => {
    const obs: Obstacle[] = [];
    const maxAttempts = 50;

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        const config = getObstacleConfig(i);
        let validPosition = false;
        let attempts = 0;
        let startX = 0;
        let startY = 0;

        const pX = 50; 
        const pY = 50;

        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            
            const halfW = config.width / 2;
            const halfH = config.height / 2;
            startX = halfW + Math.random() * (100 - config.width);
            startY = halfH + Math.random() * (100 - config.height);

            const safetyMargin = 10;
            const hitsPlayer = checkOverlap(
                startX - halfW, startY - halfH, config.width, config.height, 
                pX - (playerConfig.width/2) - safetyMargin, pY - (playerConfig.height/2) - safetyMargin, 
                playerConfig.width + (safetyMargin * 2), playerConfig.height + (safetyMargin * 2)
            );
            
            const hitsObstacle = obs.some(o => {
                const oConfig = getObstacleConfig(o.slotIndex);
                return checkOverlap(
                    startX - halfW, startY - halfH, config.width, config.height, 
                    o.x - (oConfig.width/2), o.y - (oConfig.height/2), oConfig.width, oConfig.height
                );
            });

            if (!hitsPlayer && !hitsObstacle) {
                validPosition = true;
            }
        }

        if (validPosition) {
            obs.push({
                id: i,
                slotIndex: i,
                x: startX,
                y: startY,
                ...getRandomDirection(),
                // Use the static speed from config
                baseSpeed: config.speed
            });
        }
    }
    return obs;
  }, [OBSTACLE_COUNT, getObstacleConfig, playerConfig]);

  const [player, setPlayer] = useState<Position>({ x: 50, y: 50 });
  
  // Refs for Physics Loop
  const playerRef = useRef<Position>(player);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]); 
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextObjectIdRef = useRef<number>(OBSTACLE_COUNT + 1);
  const isGameActive = useRef(true);
  const gameLoopRef = useRef<number>();

  const [isPausedForOverlay, setIsPausedForOverlay] = useState(isOverlayVisible);

  // Local Lives State
  const initialLives = rules?.lossCondition?.type === 'quota' ? (rules.lossCondition.quotaAmount || 1) : null;
  const livesRef = useRef<number | null>(initialLives);
  // Track Score/Progress internally
  const progressRef = useRef<number>(0);
  const survivalTicksRef = useRef<number>(0);

  // Sync HUD on mount/reset
  useEffect(() => {
      livesRef.current = initialLives;
      progressRef.current = 0; // Reset
      survivalTicksRef.current = 0;
      if (onUpdateHUD) {
          onUpdateHUD({ 
              lives: initialLives, 
              maxLives: initialLives,
              score: 0 
          });
      }
  }, [initialLives, onUpdateHUD]);

  // Physics Delta Refs
  const lastTimeRef = useRef<number>(0);
  const survivalAccumulatorRef = useRef<number>(0);
  // Track spawn timing deterministically
  const spawnAccumulatorRef = useRef<number>(0);
  const lastHitTimeRef = useRef<number>(0);

  // Sync local pause state
  useEffect(() => {
      setIsPausedForOverlay(isOverlayVisible);
  }, [isOverlayVisible]);

  // D. Audio Engine (Moved up for access in handleEndGame)
  const sfxAssets = useMemo(() => {
      const baseAssets = { ...avoidDefinition.assets };
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
    let type: 'win' | 'loss' | 'try_again' = 'loss';

    if (win) {
        type = 'win';
    } else {
        // For Avoid: Did we die?
        if (livesRef.current !== null && livesRef.current <= 0) {
            type = 'loss';
        } else {
            // Time ran out but we didn't win? (Rare for Avoid, but possible with Quotas)
            type = 'try_again';
        }
    }

    // Play specific Win/Loss audio based on the single source of truth config
    playSoundForEvent(win ? 'win' : 'lose', win ? 'sfxWin' : 'sfxLoss');

    // Pass the explicit type up to the engine
    onEnd({ win, type } as any);
    if (onReportEvent) onReportEvent(win ? 'win' : 'lose');
  }, [onEnd, onReportEvent, playSoundForEvent]);

  // --- 3. ENGINE INTEGRATION ---
  const isLivePreview = !!debugState?.activeMechanicId;

  // Keep a reference to mechanics so the loop can read fresh values without restarting
  const mechanicsRef = useRef(mechanics);
  useEffect(() => { mechanicsRef.current = mechanics; }, [mechanics]);

  // Only pass stable mechanics to the time engine to prevent timer resets/stuttering
  // The time engine only needs to know about duration updates, not speed/size.
  const timeEngineMechanics = useMemo(() => ({
      duration: mechanics?.duration
  }), [mechanics?.duration]);

  const handleTimeUp = useCallback(() => {
      // --- Catch up any fractional survival ticks ---
      const expectedTicks = Math.floor(GAME_DURATION / SURVIVAL_INTERVAL);
      const missingTicks = expectedTicks - survivalTicksRef.current;

      if (missingTicks > 0) {
          const baseScore = rules?.scores?.['survive_interval'] ?? 10;
          progressRef.current += (baseScore * missingTicks);
          survivalTicksRef.current += missingTicks;
          for (let i = 0; i < missingTicks; i++) {
              if (onReportEvent) onReportEvent('survive_interval');
          }
      }

      const winType = rules?.winCondition?.type || 'time';
      
      if (winType === 'score') {
          // Score Mode: Did we reach the target?
          const target = rules?.winCondition?.quotaAmount || 0;
          const currentScore = progressRef.current || 0;
          handleEndGame(currentScore >= target);
      } else {
          // Default/Time Mode: Survival = Win
          handleEndGame(true);
      }
  }, [rules, handleEndGame, GAME_DURATION, SURVIVAL_INTERVAL, onReportEvent]);

  const { timerProgress, getUnityTime } = useGameLoop(
      isPlaying,
      isPausedForOverlay,
      timeEngineMechanics, 
      GAME_DURATION / 1000,
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

  // --- 4. Physics Loop ---
  const runGameLoop = useCallback((timestamp: number) => {
    if (!isGameActive.current || isPausedForOverlay || !isPlaying) return;

    // Calculate Delta Time locally for physics smoothing
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // FIX: Read latest mechanics from Ref (Smooth updates without restarts)
    const currentMechanics = mechanicsRef.current;

    const currentUnityTime = getUnityTime();

    // --- A. Survival Logic ---
    survivalAccumulatorRef.current += deltaTime;
    if (survivalAccumulatorRef.current >= SURVIVAL_INTERVAL) {
        survivalTicksRef.current += 1;
        
        // Calculate Score for this interval
        // We use the base rule value (defaulting to 10 if not set)
        const baseScore = rules?.scores?.['survive_interval'] ?? 10;
        
        // Add to internal progress (for Win Condition check)
        progressRef.current += baseScore;

        if (onReportEvent) onReportEvent('survive_interval');
        survivalAccumulatorRef.current -= SURVIVAL_INTERVAL;

        // Check Immediate Win
        const winType = rules?.winCondition?.type;
        if (winType === 'score' && rules?.winCondition?.endImmediately) {
            const target = rules?.winCondition?.quotaAmount || 0;
            if (progressRef.current >= target) {
                handleEndGame(true);
                return;
            }
        }
    }

    let { x: nextPlayerX, y: nextPlayerY } = playerRef.current;
    let currentObstacles = obstaclesRef.current;

    // --- 1. Player Physics ---
    // FIX: Read Base Speed dynamically from Ref
    const basePlayerSpeed = currentMechanics?.['player_playerSpeed'] ?? currentMechanics?.playerSpeed ?? avoidDefinition.mechanics.playerSpeed.defaultValue;
    
    // NEW: Absolute Calculation
    let currentSpeed = calculateProgressedValue(
        currentUnityTime, 
        'speed', 
        'player', 
        basePlayerSpeed, 
        avoidDefinition.mechanics.playerSpeed
    );
    
    // Keep safety clamps
    currentSpeed = Math.max(0.5, Math.min(3.0, currentSpeed));
    
    if (inputs.current.up) nextPlayerY -= currentSpeed;
    if (inputs.current.down) nextPlayerY += currentSpeed;
    if (inputs.current.left) nextPlayerX -= currentSpeed;
    if (inputs.current.right) nextPlayerX += currentSpeed;
    
    // FIX: Read Base Size dynamically from Ref
    const basePlayerSize = currentMechanics?.['player_playerSize'] ?? currentMechanics?.playerSize ?? avoidDefinition.mechanics.playerSize.defaultValue;
    
    // NEW: Absolute Calculation
    let playerW = calculateProgressedValue(
        currentUnityTime, 
        'size', 
        'player', 
        basePlayerSize, 
        avoidDefinition.mechanics.playerSize
    );

    playerW = Math.max(3, Math.min(30, playerW));
    const playerH = playerW * (playerConfigRef.current.height / playerConfigRef.current.width);

    nextPlayerX = Math.max(playerW/2, Math.min(nextPlayerX, 100 - playerW/2));
    nextPlayerY = Math.max(playerH/2, Math.min(nextPlayerY, 100 - playerH/2));

    // --- 2. Obstacle Generation (Deterministic/Linear) ---
    // FIX: Read Generation Rate dynamically from Ref
    const baseGenRate = currentMechanics?.generationRate ?? avoidDefinition.mechanics.generationRate.defaultValue;
    
    // NEW: Absolute Calculation for Spawn Rate
    // Note: We use 'spawn' channel (global), so target is null
    let currentGenRate = calculateProgressedValue(
        currentUnityTime, 
        'spawn', 
        null, 
        baseGenRate, 
        avoidDefinition.mechanics.generationRate
    );
    
    // Clamp to -1 to 1 (Limits max spawn rate to 1 per second, or max removal rate)
    currentGenRate = Math.max(-1, Math.min(1, currentGenRate));

    // Threshold check: If rate is near zero, just reset accumulator and do nothing
    if (Math.abs(currentGenRate) < 0.05) {
        spawnAccumulatorRef.current = 0;
    } else {
        // Accumulate time
        spawnAccumulatorRef.current += deltaTime;

        // Calculate Interval: Rate 1.0 = 1000ms, Rate 0.5 = 2000ms
        const obstaclesPerSecond = Math.abs(currentGenRate);
        const intervalMs = 1000 / obstaclesPerSecond;

        // Consume accumulator
        if (spawnAccumulatorRef.current >= intervalMs) {
            spawnAccumulatorRef.current -= intervalMs;

            if (currentGenRate > 0) {
                // ADD OBSTACLE
                const limitMax = currentMechanics?.maxObstacles ?? 15;
                if (currentObstacles.length < limitMax) {
                     const randomSlot = Math.floor(Math.random() * OBSTACLE_COUNT);
                     const config = getObstacleConfig(randomSlot);
                     // Spawn from edges
                     const spawnX = Math.random() > 0.5 ? -15 : 115; 
                     const spawnY = Math.random() * 100;

                     const newObs: Obstacle = {
                        id: nextObjectIdRef.current++, 
                        slotIndex: randomSlot,
                        x: spawnX, 
                        y: spawnY, 
                        ...getRandomDirection(), 
                        baseSpeed: config.speed
                    };
                    currentObstacles = [...currentObstacles, newObs];
                }
            } else {
                // REMOVE OBSTACLE (Negative Rate)
                const limitMin = currentMechanics?.minObstacles ?? 1;
                if (currentObstacles.length > limitMin) {
                    // Remove the oldest obstacle (first in array)
                    currentObstacles = currentObstacles.slice(1);
                }
            }
        }
    }
    
    // --- 3. Obstacle Movement ---
    const updatedObstacles = currentObstacles.map(obs => {
        let { x, y, dx, dy, baseSpeed } = obs;
        const specificKey = `obstacle_${obs.slotIndex}`;
        const genericKey = 'obstacle';
        
        // FIX: Read Base Obstacle Speed from Ref
        const baseObsSpeed = currentMechanics?.['obstacle_obstacleSpeed'] ?? currentMechanics?.obstacleSpeed ?? avoidDefinition.mechanics.obstacleSpeed.defaultValue;
        
        // NEW: Absolute Calculation (Targeting specific slot first, falling back/combining is handled by the hook if we pass array)
        // Since useProgression sums up deltas for all matching targets, we pass an array of IDs.
        let currentObsSpeed = calculateProgressedValue(
            currentUnityTime,
            'speed',
            [specificKey, genericKey], 
            baseObsSpeed,
            avoidDefinition.mechanics.obstacleSpeed
        );

        currentObsSpeed = Math.max(0.1, Math.min(2.0, currentObsSpeed));

        x += dx * currentObsSpeed;
        y += dy * currentObsSpeed;

        const obsConfig = getObstacleConfig(obs.slotIndex);
        
        // FIX: Read Base Obstacle Size from Ref
        const baseObsSize = currentMechanics?.obstacleSize ?? avoidDefinition.mechanics.obstacleSize.defaultValue;
        
        // NEW: Absolute Size Calculation
        let currentWidth = calculateProgressedValue(
            currentUnityTime,
            'size',
            [specificKey, genericKey],
            baseObsSize,
            avoidDefinition.mechanics.obstacleSize
        );

        currentWidth = Math.max(3, Math.min(15, currentWidth));
        const renderHeight = currentWidth * (obsConfig.height / obsConfig.width);

        const halfW = currentWidth / 2;
        const halfH = renderHeight / 2;

        if (x <= halfW || x >= 100 - halfW) dx = -dx;
        if (y <= halfH || y >= 100 - halfH) dy = -dy;

        x = Math.max(halfW, Math.min(x, 100 - halfW));
        y = Math.max(halfH, Math.min(y, 100 - halfH));

        return { ...obs, x, y, dx, dy, baseSpeed };
    });

    // --- 4. Collision Check ---
    for (const obs of updatedObstacles) {
        const obsConfig = getObstacleConfig(obs.slotIndex);
        const specificKey = `obstacle_${obs.slotIndex}`;
        const genericKey = 'obstacle';

        // FIX: Read Base Size from Ref for collision too
        const baseObsSize = currentMechanics?.obstacleSize ?? avoidDefinition.mechanics.obstacleSize.defaultValue;
        
        let oWidth = calculateProgressedValue(
            currentUnityTime,
            'size',
            [specificKey, genericKey],
            baseObsSize,
            avoidDefinition.mechanics.obstacleSize
        );

        oWidth = Math.max(3, Math.min(15, oWidth));
        const oHeight = oWidth * (obsConfig.height / obsConfig.width);

        const pScale = playerConfigRef.current.hitboxScale;

        const oScale = obsConfig.hitboxScale;
        
        const pHitW = playerW * pScale;
        const pHitH = playerH * pScale;
        
        if (checkOverlap(
            nextPlayerX - pHitW/2, nextPlayerY - pHitH/2, pHitW, pHitH,
            obs.x - (oWidth * oScale)/2, obs.y - (oHeight * oScale)/2, oWidth * oScale, oHeight * oScale
        )) {
            const now = Date.now();
            if (now - lastHitTimeRef.current > HIT_COOLDOWN_MS) {
                lastHitTimeRef.current = now;
                
                // Calculate Dynamic Score (Negative Points usually)
                const baseScore = rules?.scores?.['collision'] ?? -10;
                
                const finalScore = calculateProgressedValue(
                    currentUnityTime,
                    'score',
                    [specificKey, genericKey],
                    baseScore,
                    { min: -999, max: 0 } 
                );

                // Update internal progress
                progressRef.current += finalScore;

                // Multiplier for reporting = Final / Base
                const scoreMult = baseScore !== 0 ? finalScore / baseScore : 1;
                
                // FIX: Fire specific event ID (e.g. collision:0) so specific audio rules can trigger.
                // If the user hasn't set a specific rule, we rely on the AudioController (or future update) 
                // to handle the fallback to the generic 'collision' or default sound.
                playSoundForEvent(`collision:${obs.slotIndex}`, 'sfxCollision');
                
                if (onReportEvent) {
                    // Report specific collision for analytics/scoring
                    onReportEvent(`collision:${obs.slotIndex}`, { multiplier: scoreMult });
                } 

                if (livesRef.current !== null) {
                    livesRef.current -= 1;
                    if (onUpdateHUD) onUpdateHUD({ lives: livesRef.current });
                    if (livesRef.current <= 0) {
                        handleEndGame(false);
                        return;
                    }
                }
            }
        }
    }

    // Update State
    playerRef.current = { x: nextPlayerX, y: nextPlayerY };
    obstaclesRef.current = updatedObstacles;

    setPlayer(playerRef.current);
    setObstacles(updatedObstacles);

    gameLoopRef.current = requestAnimationFrame(runGameLoop);
  }, [
      // FIX: Dependency array is now totally clean of unstable values
      handleEndGame, isPausedForOverlay, isPlaying, 
      // playerConfig is removed (we use playerConfigRef inside logic? We need to update that logic!)
      // getObstacleConfig is now stable (only depends on getSkinData)
      getObstacleConfig, 
      inputs, calculateProgressedValue, getUnityTime, playSoundForEvent, onReportEvent,
      OBSTACLE_COUNT 
  ]);

  // --- VISUAL RENDER CALCULATIONS (Moved Up) ---
  const secondsElapsed = getUnityTime();

  // 3. Calculate Player Dynamic Size (For visual React render)
  // We duplicate this calculation here so the visual DOM matches the internal physics state
  const basePlayerSize = mechanics?.['player_playerSize'] ?? mechanics?.playerSize ?? avoidDefinition.mechanics.playerSize.defaultValue;
  
  let renderPlayerWidth = calculateProgressedValue(
      secondsElapsed, 
      'size', 
      'player', 
      basePlayerSize, 
      avoidDefinition.mechanics.playerSize
  );
  
  renderPlayerWidth = Math.max(avoidDefinition.mechanics.playerSize.min ?? 3, Math.min(avoidDefinition.mechanics.playerSize.max ?? 15, renderPlayerWidth));
  const renderPlayerHeight = renderPlayerWidth * (playerConfig.height / playerConfig.width);

  const { url: bgUrl, color: bgColor } = getSkinData('background');

  // --- 6. Reset & Update Logic ---
  const startGame = () => {
      if (onInteraction) onInteraction();
      setIsPausedForOverlay(false);
  };

  // Track previous count to distinguish "Resizing" (Soft) from "Adding/Removing" (Hard)
  const prevCountRef = useRef(OBSTACLE_COUNT);

  // Effect 1: Logic Updates (Hard Reset or Soft Resize)
  useEffect(() => {
     const countChanged = prevCountRef.current !== OBSTACLE_COUNT;
     const isEmpty = obstaclesRef.current.length === 0 && OBSTACLE_COUNT > 0;
     const needsHardReset = countChanged || isEmpty;
     const isDragging = !!debugState?.activeMechanicId; 

     if (needsHardReset) {
         // FIX: If dragging a non-destructive slider (like Speed), WAIT until release.
         // BUT, if the Count actually changed, we allow the Hard Reset immediately 
         // to give the "Fresh Game" respawn effect the user wants.
         if (isDragging && !countChanged) return;

         // HARD RESET
         const initialObs = createInitialObstacles();
         const initialPlayer = { x: 50, y: 50 };
         setObstacles(initialObs);
         setPlayer(initialPlayer);
         obstaclesRef.current = initialObs;
         playerRef.current = initialPlayer;
         nextObjectIdRef.current = OBSTACLE_COUNT + 1;
         isGameActive.current = true;
         survivalAccumulatorRef.current = 0;
         spawnAccumulatorRef.current = 0;
         lastTimeRef.current = 0;
         prevCountRef.current = OBSTACLE_COUNT;
         survivalTicksRef.current = 0;
     } else {
         // SOFT UPDATE (Live Resize) - Allow this while dragging!
         const currentUnityTime = getUnityTime();
         const updatedObs = obstaclesRef.current.map(obs => {
            const config = getObstacleConfig(obs.slotIndex);
            
            // NEW: Absolute Size Calculation for Live Preview
            let renderWidth = calculateProgressedValue(
                currentUnityTime,
                'size',
                [`obstacle_${obs.slotIndex}`, 'obstacle'],
                config.width, 
                avoidDefinition.mechanics.obstacleSize
            );

            // Clamp (Safety limits for visual rendering)
            renderWidth = Math.max(3, Math.min(15, renderWidth));
            
            const renderHeight = renderWidth * (config.height / config.width);
            return { ...obs, width: renderWidth, height: renderHeight, hitboxScale: config.hitboxScale, baseSpeed: config.speed };
         });
         setObstacles(updatedObs);
         obstaclesRef.current = updatedObs;
     }
  }, [OBSTACLE_COUNT, mechanics, createInitialObstacles, getObstacleConfig, calculateProgressedValue, getUnityTime, debugState]);

  // Effect 2: Engine Starter (Loop Management)
  useEffect(() => {
      if (!isPausedForOverlay && isPlaying && isGameActive.current) {
          // Start the loop
          gameLoopRef.current = requestAnimationFrame(runGameLoop);
      }
      return () => {
          // Stop the loop
          if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      };
  }, [isPausedForOverlay, isPlaying, runGameLoop]);

  // 4. Invulnerability Visual
  const isInvulnerable = Date.now() - lastHitTimeRef.current < HIT_COOLDOWN_MS;
  const playerOpacity = isInvulnerable && (Math.floor(Date.now() / 100) % 2 === 0) ? 0.5 : 1;

  const gameAreaStyle = { 
      width: '100%', height: '100%', backgroundColor: '#1a1a2e', 
      position: 'relative', overflow: 'hidden', fontFamily: 'inherit', 
      backgroundSize: 'cover', backgroundPosition: 'center', transform: 'translateZ(0)',
      backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
      ...(bgColor ? { backgroundColor: bgColor } : {}) 
  };

  return (
    <div 
        style={gameAreaStyle}
        onClick={isPausedForOverlay && hideOverlayVisuals && onInteraction ? () => {
            onInteraction();
            setIsPausedForOverlay(false);
        } : undefined}
    >
      {isPausedForOverlay && !hideOverlayVisuals && (
          <MicrogameOverlay name={gameData.name} controls={gameData.controls} onStart={startGame} />
      )}
      
      {/* Player */}
      <div style={{ 
          position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', 
          transform: 'translate(-50%, -50%)', willChange: 'left, top',
          left: `${player.x}%`, top: `${player.y}%`, 
          width: `${renderPlayerWidth}%`,   
          height: `${renderPlayerHeight}%`, 
          opacity: playerOpacity 
      }}>
        {(() => {
            const { url, color } = getSkinData('player');
            const bg = color || '#e94560'; 
            return url ? (
                <img src={url} style={{ width: '100%', height: '100%', objectFit: 'fill', userSelect: 'none', display: 'block' }} alt="Player" />
            ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: bg }} />
            );
        })()}
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', border: '2px solid rgba(255, 0, 0, 0.8)', backgroundColor: 'rgba(255, 0, 0, 0.2)', zIndex: 100, pointerEvents: 'none', transition: 'opacity 1s ease-out',
            width: `${playerConfig.hitboxScale * 100}%`, height: `${playerConfig.hitboxScale * 100}%`,
            opacity: debugState?.showHitboxId === 'player' ? 1 : 0
        }} />
      </div>

      {/* Obstacles */}
      {obstacles.map(obs => {
          const obsConfig = getObstacleConfig(obs.slotIndex);
          const specificData = getSkinData(`obstacle_${obs.slotIndex}`);
          const genericData = getSkinData('obstacle');
          
          const url = specificData.url || genericData.url;
          const color = specificData.color || genericData.color || '#f0e3e3';

          const specificKey = `obstacle_${obs.slotIndex}`;
          const genericKey = 'obstacle';

          // NEW: Absolute Size Calculation for Render
          let renderWidth = calculateProgressedValue(
              secondsElapsed,
              'size',
              [specificKey, genericKey],
              obsConfig.width,
              avoidDefinition.mechanics.obstacleSize
          );
          // GUARDRAIL: Clamp to Min/Max from Definition (Fixes the visual growing too large)
          renderWidth = Math.max(
              avoidDefinition.mechanics.obstacleSize.min ?? 3, 
              Math.min(avoidDefinition.mechanics.obstacleSize.max ?? 15, renderWidth)
          );
          const renderHeight = renderWidth * (obsConfig.height / obsConfig.width);

          return (
            <div key={obs.id} style={{ 
                position: 'absolute', display: 'flex', justifyContent: 'center', alignItems: 'center', transform: 'translate(-50%, -50%)', willChange: 'left, top',
                left: `${obs.x}%`, top: `${obs.y}%`, 
                width: `${renderWidth}%`,   
                height: `${renderHeight}%` 
            }}>
                {url ? (
                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'fill', userSelect: 'none', display: 'block' }} alt="Obstacle" />
                ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: color }} />
                )}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', border: '2px solid rgba(255, 0, 0, 0.8)', backgroundColor: 'rgba(255, 0, 0, 0.2)', zIndex: 100, pointerEvents: 'none', transition: 'opacity 1s ease-out',
                    width: `${obsConfig.hitboxScale * 100}%`, height: `${obsConfig.hitboxScale * 100}%`,
                    opacity: (debugState?.showHitboxId === 'obstacle' || debugState?.showHitboxId === `obstacle_${obs.slotIndex}`) ? 1 : 0
                }} />
            </div>
          );
      })}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  gameArea: { 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#1a1a2e', 
      position: 'relative', 
      overflow: 'hidden', 
      fontFamily: 'inherit', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center',
      transform: 'translateZ(0)'
  },
  gameObject: { 
      position: 'absolute', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      transform: 'translate(-50%, -50%)',
      willChange: 'left, top'
  },
  playerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#e94560' },
  obstaclePlaceholder: { width: '100%', height: '100%', backgroundColor: '#f0e3e3' },
  skinnedObject: { width: '100%', height: '100%', objectFit: 'fill', userSelect: 'none', display: 'block' },
  timerContainer: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.3)' },
  timerBar: { 
      height: '100%', 
      backgroundColor: '#4CAF50', 
      transition: 'width 0.1s linear',
      willChange: 'width' 
  },
  hitbox: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      boxSizing: 'border-box',
      border: '2px solid rgba(255, 0, 0, 0.8)',
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      zIndex: 100,
      pointerEvents: 'none', 
      transition: 'opacity 1s ease-out', 
  }
};

export default AvoidGame;