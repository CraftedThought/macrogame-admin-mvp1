/* src/microgames/definitions/catch.ts */

import { MicrogameDefinition } from '../../types/MicrogameDefinition';

export const catchDefinition: MicrogameDefinition = {
  // 1. IDENTITY
  id: 'Catch',
  name: 'Catch',
  category: 'Action',
  description: 'Catch the falling prizes to fill your meter. Avoid the hazards!',
  tags: ['reflex', 'collection'],
  baseType: 'Collection',
  mechanicType: 'skill',
  tempo: 'Fast',
  
  // --- NEW: Factory Defaults ---
  defaultRules: {
      winCondition: { 
          type: 'quota', 
          quotaEvent: 'catch_good',
          quotaAmount: 10,
          endImmediately: true 
      },
      lossCondition: { 
          type: 'quota',       
          quotaEvent: 'catch_bad', 
          quotaAmount: 3,      // Default to 3 Lives
          endImmediately: true,
          showLives: true
      },
      enablePoints: true,
      showScore: true,
  },

  // --- NEW: HUD Configuration ---
  hud: {
      lifeIcon: 'heart'
  },

  compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
  sectors: ['All'], // Explicitly declare universal sector compatibility
  compatibleProductCategories: ['All'],
  compatibleCustomerTypes: ['All'], // Normalized from empty array
  seasonality: ['All'],
  promotionCompatibility: ['All'], // Normalized from empty array
  media: {
      thumbnail: 'https://placehold.co/600x400/2c3e50/3498db?text=Catch'
  },

  // 2. MECHANICS
  mechanics: {
    duration: { label: 'Game Duration (Seconds)', type: 'slider', defaultValue: 12, min: 5, max: 25, step: 1 },
    
    // --- NEW: GLOBAL RAMP SETTINGS ---
    progression_global_delay: { 
        label: 'Global Progression Delay (sec)', 
        type: 'slider', 
        defaultValue: 0, 
        min: 0, max: 15, step: 1,
        description: 'Wait this long before ANY progression rules start.'
    },

    // --- 1. SPEED PROGRESSION ---
    progression_speed_active: { label: 'Ramp: Speed', type: 'toggle', defaultValue: false, description: 'Change speed of specific items over time.' },
    progression_speed_rules: { 
        label: 'Speed Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 10, interval: 1, delay: 0, targets: true }] 
    },

    // --- 2. SCORE PROGRESSION ---
    progression_score_active: { label: 'Ramp: Point Value', type: 'toggle', defaultValue: false, description: 'Increase points awarded over time.' },
    progression_score_rules: { 
        label: 'Score Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 10, interval: 1, delay: 0, targets: true }] 
    },

    // --- 3. SPAWN PROGRESSION (Global) ---
    progression_spawn_active: { label: 'Ramp: Spawn Rate', type: 'toggle', defaultValue: false, description: 'Change how frequently items appear.' },
    progression_spawn_rules: { 
        label: 'Spawn Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 5, interval: 1, delay: 0, targets: null }] 
    },

    // --- 4. DISTRIBUTION PROGRESSION (Global) ---
    progression_distribution_active: { label: 'Ramp: Bad Items', type: 'toggle', defaultValue: false, description: 'Change the ratio of Bad items appearing.' },
    progression_distribution_rules: { 
        label: 'Distribution Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 5, interval: 1, delay: 0, targets: null }] 
    },

    // --- 5. SIZE PROGRESSION ---
    progression_size_active: { label: 'Ramp: Item Size', type: 'toggle', defaultValue: false, description: 'Change size of items over time.' },
    progression_size_rules: { 
        label: 'Size Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: -5, interval: 1, delay: 0, targets: true }] 
    },

    // --- STANDARD MECHANICS ---
    badItemChance: { label: 'Bad Item Chance (%)', type: 'slider', defaultValue: 0.3, min: 0, max: 1.0, step: 0.1 },
    spawnInterval: { label: 'Spawn Speed (ms)', type: 'slider', defaultValue: 900, min: 200, max: 2000, step: 100, description: 'Shorter delay means faster spawning.' },
    dropSpeed: { label: 'Fall Speed', type: 'slider', defaultValue: 1.0, min: 0.3, max: 2.0, step: 0.1 },
    playerSpeed: { label: 'Player Speed', type: 'slider', defaultValue: 1.5, min: 0.3, max: 3.0, step: 0.1 },
    
    survivalPointInterval: { label: 'Survival Point Interval (Sec)', type: 'slider', defaultValue: 1, min: 1, max: 20, step: 0.5 },

    goodItemVariety: { label: 'Number of Good Item Types', type: 'slider', defaultValue: 1, min: 1, max: 4, step: 1 },
    badItemVariety: { label: 'Number of Bad Item Types', type: 'slider', defaultValue: 1, min: 1, max: 4, step: 1 },

    playerSize: { label: 'Player Size (%)', type: 'slider', defaultValue: 20, min: 10, max: 40, step: 0.5 },
    itemSize: { label: 'Item Size (%)', type: 'slider', defaultValue: 8, min: 3, max: 15, step: 1 },
    catchOffset: { label: 'Catch Depth (Y-Offset %)', type: 'slider', defaultValue: 0, min: -100, max: 100, step: 5, description: 'Adjusts how deep items fall into the catcher. Negative values move the catch line up.' }
  },

  // 3. ASSETS
  assets: {
    player: {
      type: 'image',
      label: 'Player',
      description: 'The object that catches items (e.g., a basket, cart, or character).',
      defaultColor: '#3498db',
      associatedMechanics: ['playerSize', 'playerSpeed', 'catchOffset'],
      constraints: { minWidth: 10, maxWidth: 25, maxHeight: 15 },
    },
    goodItem: {
      type: 'image',
      label: 'Good Item',
      description: 'The prize the user wants to catch.',
      defaultColor: '#2ecc71',
      // This now points to the VARIETY slider, not the win score
      quantityDrivenBy: 'goodItemVariety',
      associatedMechanics: ['itemSize', 'dropSpeed'],
      constraints: { minWidth: 5, maxWidth: 15, maxHeight: 15 },
    },
    badItem: {
      type: 'image',
      label: 'Bad Item',
      description: 'The hazard to avoid.',
      defaultColor: '#e74c3c',
      // This now points to the VARIETY slider
      quantityDrivenBy: 'badItemVariety',
      associatedMechanics: ['badItemChance', 'itemSize', 'dropSpeed'],
      constraints: { minWidth: 5, maxWidth: 15, maxHeight: 15 },
    },
    background: {
      type: 'image',
      label: 'Background Image',
      defaultColor: '#2c3e50',
      constraints: { minWidth: 100, maxWidth: 100, maxHeight: 100 }
    },
    // --- AUDIO ASSETS ---
    bgMusic: {
        type: 'audio',
        label: 'Background Music',
        // defaultAudioUrl removed to ensure silence by default in builder
        description: 'Loops during gameplay.'
    },
    sfxCatch: {
        type: 'audio',
        label: 'Action: Catch',
        description: 'Plays when an item is collected.',
        defaultEvents: ['catch_good'],
        // Only show 'catch_good' events (e.g. catch_good:0, catch_good:1)
        allowedEventPatterns: ['catch_good'] 
    },
    sfxFailure: {
        type: 'audio',
        label: 'Action: Failure',
        description: 'Plays when a bad item is hit.',
        defaultEvents: ['catch_bad'],
        // Only show 'catch_bad' events
        allowedEventPatterns: ['catch_bad']
    },
    sfxWin: {
        type: 'audio',
        label: 'Game Win',
        // defaultAudioUrl removed to ensure silence by default in builder
        description: 'Plays when the win condition is met.'
    },
    sfxLoss: { // Added standard Loss sound
        type: 'audio',
        label: 'Game Over (Loss)',
        // defaultAudioUrl removed to ensure silence by default in builder
        description: 'Plays when the player loses.'
    }
  },

  // 4. STRATEGY
  conversionMetadata: {
    pillars: {
      drive_sales: {
        score: 8,
        recommended: true,
        reasoning: "Collecting items builds a sense of accumulation and gain, perfect for discounts."
      },
      capture_leads: {
        score: 6,
        recommended: false,
        reasoning: "Can be too fast-paced for a thoughtful lead submission flow."
      },
      boost_engagement: {
        score: 9,
        recommended: true,
        reasoning: "Highly replayable and addictive."
      }
    },
    presets: {
      drive_sales: {
        label: "Shopping Spree",
        description: "Fill the cart! Fast paced collection game.",
        mechanicOverrides: {
          spawnInterval: 600, // Faster spawn
          dropSpeed: 1.0,     // Faster drop
          badItemChance: 0.2,  // Fewer bad items
          goodItemVariety: 3 // Suggest 3 items to catch
        },
        recommendedConversionMethods: ['coupon_display']
      }
    },
    bestForTip: "Use a shopping cart or bag as the 'Catcher' to implicitly suggest making a purchase.",
    audienceVibe: ["Impulse Buyer", "Gamer"],
    triggers: [
      { label: "Item Caught", id: "catch_good", description: "Trigger sound/effect on catch.", difficulty: "Low" },
      { label: "Win Score Met", id: "win", description: "End game when score is reached.", difficulty: "Medium" }
    ]
  },

  // 5. EVENTS (Updated for Rules Engine)
  events: {
    catch_good: { 
        label: 'Good Item Catch', 
        type: 'per_item',
        canScore: true, 
        defaultPoints: 10, // <--- ADDED: Ensures scoring works by default
        canWinQuota: true,   // "Catch 5 items to win"
        canLossQuota: false,   // "Fail to catch 5 items = Loss"
        relatedAssets: ['goodItem'] // Explicit link
    },
    catch_bad: { 
        label: 'Bad Item Catch', 
        type: 'per_item',
        canScore: true, 
        defaultPoints: -5, // <--- ADDED: Default penalty
        canWinQuota: false,  // Cannot win by hitting bad items
        canLossQuota: true,   // "Hit 3 bad items to lose"
        relatedAssets: ['badItem'] // Explicit link
    },
    survive_interval: {
        label: 'Survival',
        type: 'interval',
        canScore: true,
        defaultPoints: 0,
        canWinQuota: false,
        canLossQuota: false
        // No related assets for time/interval events
    }
  },

  // 6. TECHNICAL
  technical: {
    controls: ['keyboard_arrows', 'keyboard_wasd', 'mouse_click', 'touch'],
    orientation: 'landscape',
    version: '1.0.0'
  },

  // ... (previous content) ...

  // 7. FEATURES (UI Logic)
  features: {
      enableQuotaWin: true,     // Catch can win by collecting 10 items
      enableScoreWin: true,
      enableFailureLoss: true   // "Did not catch 10 items" is a valid failure
  },

  // 8. PROGRESSION CONFIG
  progression: {
      channels: [
          { 
              id: 'speed', label: 'Speed', enabled: true, hasTarget: true 
          },
          { 
              id: 'score', label: 'Point Value', enabled: true, hasTarget: true,
              dependency: { ruleId: 'enablePoints', condition: 'eq', value: false, warning: "Enable 'Point System' below to use this." }
          },
          { 
              id: 'spawn', label: 'Spawn Rate', enabled: true, hasTarget: false 
          },
          { 
              id: 'distribution', label: 'Bad Items Ratio', enabled: true, hasTarget: false // Enabled for Catch
          },
          { 
              id: 'size', label: 'Size', enabled: true, hasTarget: true 
          }
      ]
  }
};