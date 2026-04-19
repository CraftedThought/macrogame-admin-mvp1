/* src/constants/strategyMappings.ts */

import { StrategyRule, StyleOutcome, AssetOutcome, MechanicOutcome } from '../types';

/**
 * STRATEGY MAPPING REGISTRY
 * * This file contains the "Cascading Logic" for the Guided Mode.
 * The engine filters these lists based on User Input (Selectors),
 * sorts them by Specificity (Low to High), and merges the Outcomes.
 */

// ============================================================================
// 1. STYLE RULES (Fonts, Colors, Skins)
// ============================================================================
export const STYLE_RULES: StrategyRule<StyleOutcome>[] = [
    // --- BASE AESTHETICS (Specificity: 10) ---
    {
        id: 'style_retro_base',
        selectors: { aestheticId: 'Retro' },
        specificity: 10,
        outcome: {
            fontFamily: '"Press Start 2P", monospace',
            colors: {
                primary: '#FF00FF',   // Neon Magenta
                secondary: '#00FF00', // Neon Green
                background: '#1a1a2e',
                text: '#FFFFFF'
            },
            skinId: 'barebones' // Placeholder for a pixel-art skin
        }
    },
    {
        id: 'style_minimalist_base',
        selectors: { aestheticId: 'Minimalist' },
        specificity: 10,
        outcome: {
            fontFamily: 'Inter, system-ui, sans-serif',
            colors: {
                primary: '#000000',
                secondary: '#333333',
                background: '#FFFFFF',
                text: '#000000'
            },
            skinId: 'configurable-popup'
        }
    },

    // --- SEASONAL OVERRIDES (Specificity: 50) ---
    // This will OVERRIDE the colors of the Base Aesthetic, 
    // but keep the Font and Skin of the Base.
    {
        id: 'style_season_christmas',
        selectors: { seasonId: 'christmas_holidays' },
        specificity: 50,
        outcome: {
            colors: {
                primary: '#D42426',   // Holiday Red
                secondary: '#165B33', // Holiday Green
                // background: inherited from Base (e.g. Dark for Retro, White for Minimalist)
            }
        }
    }
];

// ============================================================================
// 2. ASSET RULES (Player, Obstacles, Backgrounds)
// ============================================================================
export const ASSET_RULES: StrategyRule<AssetOutcome>[] = [
    // --- CATEGORY DEFAULTS (Specificity: 20) ---
    {
        id: 'asset_beauty_base',
        selectors: { productCategoryId: 'Beauty & Cosmetics' },
        specificity: 20,
        outcome: {
            player: { assetKey: 'icon_lipstick_generic', tintColor: '#E91E63' },
            obstacle: { assetKey: 'icon_mirror_generic', tintColor: '#E0E0E0' }
        }
    },
    {
        id: 'asset_gaming_base',
        selectors: { productCategoryId: 'Gaming & Electronics' },
        specificity: 20,
        outcome: {
            player: { assetKey: 'icon_controller_generic', tintColor: '#3F51B5' },
            obstacle: { assetKey: 'icon_glitch_generic', tintColor: '#F44336' }
        }
    },

    // --- EXACT INTERSECTIONS (Specificity: 100) ---
    // "Retro Beauty" -> 8-Bit Makeup items
    {
        id: 'asset_beauty_retro',
        selectors: { productCategoryId: 'Beauty & Cosmetics', aestheticId: 'Retro' },
        specificity: 100,
        outcome: {
            player: { assetKey: 'pixel_lipstick_8bit' }, // More specific asset
            obstacle: { assetKey: 'pixel_compact_8bit' }
        }
    },
    // "Christmas Beauty" -> Holiday Themed Makeup
    {
        id: 'asset_beauty_christmas',
        selectors: { productCategoryId: 'Beauty & Cosmetics', seasonId: 'christmas_holidays' },
        specificity: 100,
        outcome: {
            obstacle: { assetKey: 'icon_coal_lump' } // Override obstacle only
            // player: inherited from Base (Lipstick)
        }
    }
];

// ============================================================================
// 3. MECHANIC RULES (Physics, Speed, Difficulty)
// ============================================================================
export const MECHANIC_RULES: StrategyRule<MechanicOutcome>[] = [
    // --- AUDIENCE DEFAULTS (Specificity: 30) ---
    {
        id: 'mech_gamer_base',
        selectors: { audienceId: 'gamer' },
        specificity: 30,
        outcome: {
            playerSpeed: 1.5,      // Faster
            obstacleSpeedMin: 0.4, // Harder start
            difficultyRamp: 10     // Ramps up quickly
        }
    },
    {
        id: 'mech_gift_giver_base',
        selectors: { audienceId: 'gift_giver' },
        specificity: 30,
        outcome: {
            playerSpeed: 1.0,      // Slower / Accessible
            obstacleSpeedMin: 0.2,
            difficultyRamp: 0      // Flat difficulty
        }
    },

    // --- GOAL OVERRIDES (Specificity: 40) ---
    // High Value Unlocks need to be harder, regardless of audience
    {
        id: 'mech_goal_high_value',
        selectors: { goalId: 'drive_sales' }, // specifically high-value sub-goal
        specificity: 40,
        outcome: {
            duration: 15 // Longer survival required
        }
    }
];