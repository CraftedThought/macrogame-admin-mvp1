/* src/hooks/useGameLoop.ts */

import { useRef, useEffect, useCallback, useState } from 'react';

interface GameLoopReturn {
    elapsed: number;       // Total active seconds since start
    timerProgress: number; // 0 to 100 percentage
    triggerReset: () => void; 
    getUnityTime: () => number; 
}

export const useGameLoop = (
    isPlaying: boolean,
    isPausedForOverlay: boolean,
    mechanics: any, 
    duration: number, 
    onTimeUp: () => void,
    preventReset: boolean = false 
): GameLoopReturn => {
    
    // --- Time State ---
    const startTimeRef = useRef<number>(0);
    const totalPausedTimeRef = useRef<number>(0);
    const pauseStartRef = useRef<number>(0);
    const mechanicsRef = useRef(mechanics);
    
    // --- Visual State ---
    const [timerProgress, setTimerProgress] = useState(100);
    const lastTimerUpdateRef = useRef<number>(0);

    // --- 1. Reset Logic ---
    const reset = useCallback(() => {
        startTimeRef.current = 0;
        totalPausedTimeRef.current = 0;
        pauseStartRef.current = 0;
        lastTimerUpdateRef.current = 0;
        setTimerProgress(100);
        mechanicsRef.current = mechanics;
    }, [mechanics]);

    // --- 2. JIT Reset Check (Mechanics Changed) ---
    useEffect(() => {
        if (mechanics !== mechanicsRef.current) {
            mechanicsRef.current = mechanics;
            if (!preventReset) {
                reset();
            }
        }
    }, [mechanics, reset, preventReset]);

    // --- 3. Pause/Resume Logic (The Fix) ---
    const isGameActive = isPlaying && !isPausedForOverlay;

    useEffect(() => {
        if (isGameActive) {
            // CASE: Resuming / Starting
            if (startTimeRef.current === 0) {
                // First Start
                startTimeRef.current = Date.now();
            } else if (pauseStartRef.current > 0) {
                // Resuming from Pause: Add the duration of the pause to our total accumulator
                const pauseDuration = Date.now() - pauseStartRef.current;
                totalPausedTimeRef.current += pauseDuration;
                pauseStartRef.current = 0;
            }
        } else {
            // CASE: Pausing
            // Only mark pause start if we were actually running
            if (startTimeRef.current > 0 && pauseStartRef.current === 0) {
                pauseStartRef.current = Date.now();
            }
        }
    }, [isGameActive]);

    // --- 4. Loop & Progress Logic ---
    useEffect(() => {
        // Stop loop if paused
        if (!isGameActive) return;

        let frameId: number;

        const tick = () => {
            // GUARD: If start time is 0, we are in a reset state. Do not tick.
            if (startTimeRef.current === 0) {
                frameId = requestAnimationFrame(tick);
                return;
            }

            const now = Date.now();
            
            // Calculate strictly active time
            // Formula: (Current Time - Start Time) - (Total Time Spent Paused)
            const activeDurationMS = (now - startTimeRef.current) - totalPausedTimeRef.current;
            const elapsed = Math.max(0, activeDurationMS / 1000);

            if (elapsed >= duration) {
                setTimerProgress(0); // Snap to 0 visually
                onTimeUp();
                return; 
            }

            // Update UI (throttled to ~60fps visually, but state updates throttled to avoid re-renders)
            // We update state every ~100ms for the progress bar to stay smooth enough but performant
            if (now - lastTimerUpdateRef.current > 100) {
                lastTimerUpdateRef.current = now;
                const pct = Math.max(0, 100 - (elapsed / duration) * 100);
                setTimerProgress(pct);
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [isGameActive, duration, onTimeUp]);
    
    // --- 5. Physics Helper ---
    const getUnityTime = useCallback(() => {
        if (startTimeRef.current === 0) return 0;
        
        let currentPauseDuration = 0;
        if (pauseStartRef.current > 0) {
            currentPauseDuration = Date.now() - pauseStartRef.current;
        }

        const now = Date.now();
        const activeDurationMS = (now - startTimeRef.current) - totalPausedTimeRef.current - currentPauseDuration;
        return Math.max(0, activeDurationMS / 1000);
    }, []);

    return {
        elapsed: getUnityTime(),
        timerProgress,
        triggerReset: reset,
        getUnityTime
    };
};