// src/wizards/recommendationLogic.ts

import { Microgame } from "../types";

// --- Define Wizard Inputs ---
export const WIZARD_TEMPOS = ['All', 'Fast', 'Normal', 'Slow'] as const;
export type WizardTempo = typeof WIZARD_TEMPOS[number];

interface GenerateOptions {
    goal: string;
    tempo: WizardTempo;
    maxLength: number | '';
    allMicrogames: Microgame[];
    gameplayExperience: string;
    numGames: number;
    mechanicType: 'All' | 'Chance-Based' | 'Skill'; // <-- ADDED THIS
}

export function generateMacrogameFlow({ goal, tempo, maxLength, allMicrogames, gameplayExperience, numGames, mechanicType }: GenerateOptions): Microgame[] {
    // --- 1. INITIAL FILTERING ---
    let candidateGames = allMicrogames.filter(game => game.isActive);

    if (gameplayExperience) {
        candidateGames = candidateGames.filter(game => game.gameplayExperience === gameplayExperience);
    }
    if (goal) {
        candidateGames = candidateGames.filter(game => game.compatibleConversionGoals.includes(goal));
    }
    if (tempo !== 'All') {
        candidateGames = candidateGames.filter(game => game.tempo === tempo);
    }

    // --- NEW LOGIC TO FILTER BY MECHANIC TYPE ---
    if (mechanicType && mechanicType !== 'All') {
        const type = mechanicType === 'Chance-Based' ? 'chance' : 'skill';
        candidateGames = candidateGames.filter(game => game.mechanicType === type);
    }
    // --- END NEW LOGIC ---

    if (candidateGames.length === 0) return [];
    
    if (!numGames || numGames <= 0) {
        const validMaxLength = Number(maxLength) || 30;
        candidateGames.sort(() => Math.random() - 0.5);
        const generatedFlow: Microgame[] = [];
        let currentLength = 0;
        for (const game of candidateGames) {
            if (currentLength + game.length <= validMaxLength) {
                generatedFlow.push(game);
                currentLength += game.length;
            }
        }
        return generatedFlow;
    }

    const validMaxLength = Number(maxLength) || 999;

    if (candidateGames.length < numGames) {
        return [];
    }

    const shortestCombination = [...candidateGames].sort((a, b) => a.length - b.length).slice(0, numGames);
    const minPossibleDuration = shortestCombination.reduce((sum, game) => sum + game.length, 0);

    if (minPossibleDuration > validMaxLength) {
        return [];
    }

    const MAX_ATTEMPTS = 50;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const shuffledCandidates = [...candidateGames].sort(() => Math.random() - 0.5);
        const potentialFlow = shuffledCandidates.slice(0, numGames);
        const totalDuration = potentialFlow.reduce((sum, game) => sum + game.length, 0);

        if (totalDuration <= validMaxLength) {
            return potentialFlow;
        }
    }

    return shortestCombination;
}