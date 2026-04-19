/* src/hooks/useProgression.ts */

import { useCallback } from 'react';
import { getProgressionValue } from '../utils/helpers';

interface ProgressionRule {
    id: string;
    rate: number;    // Percentage change
    interval: number; // Seconds
    delay?: number;  // Seconds before starting
    targets?: string[] | boolean | null; // IDs to apply to
}

export const useProgression = (mechanics: any) => {
    
    // The core math engine
    const calculateProgressedValue = useCallback((
        elapsedTime: number, 
        channelId: string, // e.g., 'speed', 'score', 'size'
        targetIds: string | string[] | null, // Accepts single ID or Array
        baseValue: number, 
        mechanicDef: any 
    ): number => {
        // --- SAFETY CHECK 1: Invalid Base ---
        // If the base value is missing or broken, we cannot calculate anything.
        // We return a safe default (or 0) to prevent the game loop from crashing.
        if (baseValue === undefined || baseValue === null || isNaN(baseValue)) {
            console.warn(`Progression Error: Invalid baseValue for channel ${channelId}`, baseValue);
            return mechanicDef?.defaultValue ?? 1; 
        }

        // 1. Check if channel is active in mechanics
        const activeKey = `progression_${channelId}_active`;
        if (!mechanics?.[activeKey]) return baseValue;

        // 2. Get Rules
        const rulesKey = `progression_${channelId}_rules`;
        const rules: ProgressionRule[] = mechanics[rulesKey] || [];
        if (!Array.isArray(rules) || rules.length === 0) return baseValue;

        // 3. Get Global Delay
        const globalDelay = mechanics?.['progression_global_delay'] ?? 0;

        let totalDelta = 0;

        // Normalize targetIds to a safe array
        const targetsToCheck = Array.isArray(targetIds) 
            ? targetIds 
            : (targetIds ? [targetIds] : []);

        // 4. Iterate Rules & Sum Deltas
        rules.forEach((rule) => {
            const ruleDelay = rule.delay || 0;
            const totalStartDelay = globalDelay + ruleDelay;

            if (elapsedTime < totalStartDelay) return;

            const ruleTargets = rule.targets;
            
            // Logic: Does this rule apply to ANY of the provided target IDs?
            const applies = 
                !ruleTargets || 
                ruleTargets === true || 
                (Array.isArray(ruleTargets) && targetsToCheck.some(id => ruleTargets.includes(id)));

            if (applies) {
                const activeTime = elapsedTime - totalStartDelay;
                const interval = Math.max(1, rule.interval ?? 5);
                const steps = Math.floor(activeTime / interval);

                if (steps > 0) {
                    const ruleResult = getProgressionValue(baseValue, rule.rate ?? 0, steps, mechanicDef);
                    const delta = ruleResult - baseValue;
                    
                    // SAFETY CHECK 2: Prevent NaN deltas
                    if (!isNaN(delta)) {
                        totalDelta += delta;
                    }
                }
            }
        });

        // 5. Apply Total Change
        let finalValue = baseValue + totalDelta;

        // 6. Safety Clamping
        if (mechanicDef) {
            if (mechanicDef.min !== undefined && finalValue < mechanicDef.min) finalValue = mechanicDef.min;
            if (mechanicDef.max !== undefined && finalValue > mechanicDef.max) finalValue = mechanicDef.max;
        }

        // --- SAFETY CHECK 3: Final NaN Prevention ---
        if (isNaN(finalValue)) {
            return baseValue;
        }

        return finalValue;

    }, [mechanics]);

    return { calculateProgressedValue };
};