// src/constants.ts

export const CONVERSION_GOALS = {
  'Drive Sales & Revenue': [
    'Increase Overall Conversion Rate',
    'Promote Specific Products or Collections',
    'Increase Average Order Value (AOV)',
    'Promote a Site-Wide Sale or Offer',
  ],
  'Generate Leads & Grow Audience': [
    'Generate Leads',
    'Collect Email or SMS Subscribers',
    'Increase Account or Loyalty Program Sign-ups',
    'Drive Social Media Engagement',
  ],
};

export const PRODUCT_CATEGORIES: { [key: string]: string[] } = {
  'Beauty & Cosmetics': ['Face', 'Lips', 'Skin', 'Body', 'Hair', 'Accessories'],
  'Gaming & Electronics': ['Accessories', 'PC Components', 'PC Gaming', 'Consoles & Portable Gaming', 'Smart Home Devices', 'Merch & Collectibles'],
  'Pet Products': ['Food & Treats', 'Health & Wellness', 'Smart Tech', 'Accessories & Furniture', 'Toys & Enrichment'],
  'Sporting Goods': ['Outdoor', 'Fitness', 'Team Sports', 'Individual Sports'],
};

import { UISkin } from './types';

export interface SkinnableElement {
  id: string;
  name: string;
  aspectRatio?: string; // e.g., '12:21'
  recommendation?: string;
  constraints?: {
      minWidth: number; // Percentage (0-100)
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
  };
}

export const TEMPO_OPTIONS = ['All', 'Slow', 'Normal', 'Fast'];

export const LENGTH_OPTIONS = ['All', 'Short', 'Medium', 'Long'];

export const LENGTH_DEFINITIONS: { [key: string]: (len: number) => boolean } = {
    'Short': (len: number) => len <= 5,
    'Medium': (len: number) => len > 5 && len < 8,
    'Long': (len: number) => len >= 8,
};

// --- NEW FILTERS FOR MACROGAME MANAGER ---
export const MACROGAME_LENGTH_OPTIONS = ['All', 'Short (< 20s)', 'Medium (20s-30s)', 'Long (> 30s)'];
export const NUMBER_OF_GAMES_OPTIONS = ['All', '1', '2', '3', '4+'];
export const NUMBER_OF_REWARDS_OPTIONS = ['All', '1', '2', '3', '4', '5+'];
export const YES_NO_ALL_OPTIONS = ['All', 'Yes', 'No'];
export const REWARD_TYPES_OPTIONS = ['All', 'percentage_discount', 'fixed_discount', 'free_shipping'];
// --- END NEW FILTERS ---

// --- NEW: Conversion Method Types for Filtering ---
export const CONVERSION_METHOD_TYPES = [
  'coupon_display',
  'email_capture',
  'link_redirect',
  'form_submit',
  'social_follow'
];
// --- END NEW ---

export const SKINNABLE_ELEMENTS: { [key: string]: SkinnableElement[] } = {
    'avoid': [
        { 
            id: 'player', 
            name: 'Player Object',
            constraints: { minWidth: 5, maxWidth: 10, minHeight: 5, maxHeight: 15 },
            recommendation: 'Your image will be scaled to fit between 5-10% width.' 
        },
        { 
            id: 'obstacle', 
            name: 'Obstacle',
            constraints: { minWidth: 5, maxWidth: 12, minHeight: 5, maxHeight: 20 },
            recommendation: 'Your image will be scaled to fit between 5-12% width.'
        },
        { 
            id: 'background', 
            name: 'Background Image',
            recommendation: 'Use a wide image (16:9 ratio). Taller images will be clipped.'
        },
    ],
    'catch': [
        { 
            id: 'player', 
            name: 'Catcher Object',
            recommendation: 'Use a wide, short image (e.g., a basket or bowl).'
        },
        { 
            id: 'goodItem', 
            name: 'Good Item',
            recommendation: 'Use a square or "item-shaped" image.'
        },
        { 
            id: 'badItem', 
            name: 'Bad Item',
            recommendation: 'Use a square or "item-shaped" image.'
        },
        { 
            id: 'background', 
            name: 'Background Image',
            recommendation: 'Use a wide image (16:9 ratio). Taller images will be clipped.'
        },
    ]
};

// A library of available background music tracks for macrogames.
export const MACROGAME_MUSIC_LIBRARY = [
    { id: 'none', name: 'None', path: null },
    { id: 'default', name: 'Default 8-Bit', path: '/sounds/background.wav' },
    // Add more tracks here as needed
];

// A library of standard sound effects for microgames.
export const MICROGAME_SFX_LIBRARY = [
    { id: 'none', name: 'None', path: null },
    { id: 'success', name: 'Success (Chime)', path: '/sounds/success.wav' },
    { id: 'lose', name: 'Failure (Buzz)', path: '/sounds/lose.wav' },
    { id: 'catch', name: 'Catch (Pop)', path: '/sounds/caughtball.wav' },
    // Future: Add more generic sounds like 'click', 'whoosh', 'thud'
];

// We will keep the old object for now for UI sounds, but rename it for clarity.
export const UI_SOUND_EFFECTS: {[key: string]: string | null} = {
    'Success': '/sounds/success.wav',
    'Caught Ball': '/sounds/caughtball.wav',
    'Lose': '/sounds/lose.wav',
};

export const UI_SKINS: UISkin[] = [
    /* --- LEGACY SKINS (To be updated) ---
    { id: 'classic-handheld', name: 'Classic Handheld', fontFamily: "'Press Start 2P'", fontUrl: '/fonts/PressStart2P-Regular.ttf' },
    { id: 'modern-handheld', name: 'Modern Handheld', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { id: 'tablet', name: 'Tablet', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { id: 'barebones', name: 'Barebones (for preview)', fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }
    */

    // --- NEW STANDARD SKINS ---
    // This is the new, primary skin for all popups
    { 
      id: 'configurable-popup', 
      name: 'Configurable Popup', 
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" 
    },
    // This is the "locked" skin for admin previews only
    { 
      id: 'barebones', 
      name: 'Barebones (for preview)', 
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" 
    }
];

export const SKIN_COLOR_SCHEMES: { [key: string]: { [key: string]: string } } = {
    /* --- LEGACY SKINS (To be updated) ---
    'classic-handheld': { 'light-gray': 'Light Gray', 'purple': 'Purple' },
    'modern-handheld': { 'black': 'Black', 'red': 'Red' },
    'tablet': { 'white': 'White', 'black': 'Black' },
    */
    
    // --- NEW STANDARD SKINS ---
    // These keys (e.g., 'colorSchemePurple') must match the
    // CSS class names we created in ConfigurablePopup.module.css
    'configurable-popup': { 
      '': 'Default (Dark)', 
      // 'colorSchemePurple': 'Purple', // Example, disabled for now
      // 'colorSchemeBlue': 'Blue',   // Example, disabled for now
    },
};

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DISCOUNT_VALUE_OPTIONS = ['All', '<5', '5-10', '11-15', '16-20', '20+'];