/* src/microgames/definitions/avoid.ts */

import { MicrogameDefinition } from '../../types/MicrogameDefinition';

export const avoidDefinition: MicrogameDefinition = {
  // 1. IDENTITY
  id: 'Avoid',
  name: 'Avoid',
  category: 'Action',
  description: 'Navigate through a field of moving obstacles. Survive until the timer runs out!',
  tags: ['reflex', 'survival'],
  baseType: 'Avoidance',
  mechanicType: 'skill',
  tempo: 'Fast',
  // Factory Defaults
  defaultRules: {
      winCondition: { 
          type: 'time', 
          quotaAmount: 0 
      },
      lossCondition: { 
          type: 'quota',       
          quotaEvent: 'collision', 
          quotaAmount: 1,      // 1st Hit = Loss (Standard for Avoid)
          endImmediately: true,
          showLives: true      // Ensure shields are visible by default
      },
      enablePoints: false,
      showScore: false,
  },
  compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
  sectors: ['All'], // Explicitly declare universal sector compatibility
  compatibleProductCategories: ['All'],
  compatibleCustomerTypes: ['All'], // Normalized from empty array
  seasonality: ['All'],
  promotionCompatibility: ['All'], // Normalized from empty array
  
  // --- HUD Configuration ---
  hud: {
      lifeIcon: 'shield'
  },
  
  media: {
      thumbnail: 'https://placehold.co/600x400/1a1a2e/e94560?text=Avoid'
  },

  // 2. MECHANICS
  mechanics: {
    duration: { label: 'Game Duration (Seconds)', type: 'slider', defaultValue: 8, min: 5, max: 20, step: 1, description: 'How long the player must survive to win.' },
    
    // --- NEW: GLOBAL RAMP SETTINGS ---
    progression_global_delay: { 
        label: 'Global Progression Delay (sec)', 
        type: 'slider', 
        defaultValue: 0, 
        min: 0, max: 15, step: 1,
        description: 'Wait this long before ANY progression rules start.'
    },

    // --- 1. SPEED PROGRESSION ---
    progression_speed_active: { label: 'Ramp: Speed', type: 'toggle', defaultValue: false, description: 'Change speed of obstacles or player over time.' },
    progression_speed_rules: { 
        label: 'Speed Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 15, interval: 1, delay: 0, targets: true }] 
    },

    // --- 2. SCORE PROGRESSION ---
    progression_score_active: { label: 'Ramp: Point Value', type: 'toggle', defaultValue: false, description: 'Increase points awarded over time.' },
    progression_score_rules: { 
        label: 'Score Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 15, interval: 1, delay: 0, targets: true }] 
    },

    // --- 3. SPAWN PROGRESSION (Global) ---
    progression_spawn_active: { label: 'Ramp: Spawn Rate', type: 'toggle', defaultValue: false, description: 'Change how frequently obstacles appear.' },
    progression_spawn_rules: { 
        label: 'Spawn Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 15, interval: 1, delay: 0, targets: null }] 
    },

    // --- 4. DISTRIBUTION PROGRESSION (Global - Not used in Avoid yet, but kept for schema consistency) ---
    progression_distribution_active: { label: 'Ramp: Difficulty', type: 'toggle', defaultValue: false, description: 'Not used in standard Avoid mode.' },
    progression_distribution_rules: { 
        label: 'Distribution Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 15, interval: 1, delay: 0, targets: null }] 
    },

    // --- 5. SIZE PROGRESSION ---
    progression_size_active: { label: 'Ramp: Obstacle Size', type: 'toggle', defaultValue: false, description: 'Change size of obstacles over time.' },
    progression_size_rules: { 
        label: 'Size Rules', 
        type: 'hidden', 
        defaultValue: [{ id: 'default', rate: 15, interval: 1, delay: 0, targets: true }] 
    },

    // --- STANDARD MECHANICS ---
    obstacleCount: { label: 'Number of Obstacles', type: 'slider', defaultValue: 4, min: 1, max: 15, step: 1, description: 'The number of obstacles on screen.' },
    playerSize: { label: 'Player Size (%)', type: 'slider', defaultValue: 7, min: 3, max: 15, step: 0.1, description: 'The starting size of the player.' },
    obstacleSize: { label: 'Obstacle Size (%)', type: 'slider', defaultValue: 9, min: 3, max: 15, step: 0.1, description: 'The starting size of obstacles.' },
    generationRate: { 
        label: 'Obstacle Spawn Rate',
        type: 'slider', 
        defaultValue: 0, 
        min: -1, 
        max: 1, 
        step: 0.1, 
        description: '0 = Static. Positive = Add obstacles. Negative = Remove obstacles.' 
    },
    
    // Limits
    maxObstacles: { label: 'Maximum Obstacles', type: 'slider', defaultValue: 10, min: 1, max: 15, step: 1 },
    minObstacles: { label: 'Minimum Obstacles', type: 'slider', defaultValue: 1, min: 1, max: 15, step: 1 },
    
    playerSpeed: { label: 'Player Speed', type: 'slider', defaultValue: 1.0, min: 0.5, max: 3.0, step: 0.1 },
    // Single, static speed for all obstacles
    obstacleSpeed: { label: 'Obstacle Speed', type: 'slider', defaultValue: 0.3, min: 0.1, max: 2.0, step: 0.05 },

    // --- NEW: Survival Interval ---
    survivalPointInterval: { 
        label: 'Survival Point Interval (Sec)', 
        type: 'slider', 
        defaultValue: 1, 
        min: 1, 
        max: 10, 
        step: 0.5 
    }
  },

  // 3. ASSETS
  assets: {
    player: {
      type: 'image',
      label: 'Player Character',
      description: 'The character the user controls. Use a top-down view or icon.',
      defaultColor: '#e94560',
      associatedMechanics: ['playerSize', 'playerSpeed'],
      constraints: { minWidth: 5, maxWidth: 15, maxHeight: 15 },
      physics: { defaultHitboxScale: 1.0 }
    },
    obstacle: {
      type: 'image',
      label: 'Obstacle',
      description: 'The items to avoid. Use a simple shape or hazard icon.',
      defaultColor: '#f0e3e3',
      quantityDrivenBy: 'obstacleCount', 
      associatedMechanics: ['obstacleSize', 'obstacleSpeed'],
      constraints: { minWidth: 5, maxWidth: 20, maxHeight: 20 },
      physics: { defaultHitboxScale: 1.0 }
    },
    background: {
      type: 'image',
      label: 'Background Image',
      description: 'Use a seamless pattern or dark texture.',
      defaultColor: '#1a1a2e',
      constraints: { minWidth: 100, maxWidth: 100, maxHeight: 100 } 
    },
    // --- AUDIO ASSETS ---
    bgMusic: {
      type: 'audio',
      label: 'Background Music',
      description: 'Loops during gameplay.'
    },
    // Dedicated sound for taking damage (Collision)
    sfxCollision: {
      type: 'audio',
      label: 'Action: Collision',
      description: 'Plays when the player hits an obstacle (loses a life).',
      defaultEvents: ['collision'],
      allowedEventPatterns: ['collision']
    },
    // Now dedicated ONLY to the Game Over screen
    sfxLoss: { 
      type: 'audio',
      label: 'Game Over (Loss)',
      description: 'Plays when the player runs out of lives.'
    },
    sfxWin: {
      type: 'audio',
      label: 'Game Win',
      description: 'Plays when the level is completed successfully.'
    }
  },

  // 4. STRATEGY (Source of Truth for Guided Mode)
  conversionMetadata: {
    pillars: {
      drive_sales: {
        score: 9,
        recommended: true,
        reasoning: "The survival mechanic creates a strong 'Endowment Effect'. Users feel they earned the discount, increasing redemption rates."
      },
      capture_leads: {
        score: 7,
        recommended: true,
        reasoning: "Good for 'Leaderboard' style contests where high scores require email entry, or 'Second Chance' revives."
      },
      boost_engagement: {
        score: 5,
        recommended: false,
        reasoning: "Can be too intense/frustrating for casual brand interaction where simple gratification is preferred."
      }
    },
    presets: {
      drive_sales: {
        label: "Challenge Mode",
        description: "Higher speed and more obstacles. Harder difficulty makes the reward feel more valuable.",
        mechanicOverrides: {
          duration: 15,
          obstacleCount: 6,
          playerSpeed: 1.5,
          generationRate: 0.5,
          difficultyRamp: 0 // 0% harder every second
        },
        recommendedConversionMethods: ['coupon_display']
      },
      capture_leads: {
        label: "Fun & Fair",
        description: "Balanced difficulty to encourage completion and positive sentiment before asking for data.",
        mechanicOverrides: {
          duration: 10,
          obstacleCount: 4,
          playerSpeed: 1.2,
          generationRate: 0.2,
          difficultyRamp: 0 // 0% harder every second
        },
        recommendedConversionMethods: ['email_capture', 'form_submit']
      }
    },
    bestForTip: "Use 'Drive Sales' mode with a high-value coupon (e.g., 20% off) to maximize conversion.",
    audienceVibe: ["Competitive", "Focused", "Gamers"],
    triggers: [
      {
        label: "Time Threshold Reached",
        id: "time_survived",
        description: "Trigger a reward after the player survives for a specific duration.",
        difficulty: "Variable"
      },
      {
        label: "Game Win",
        id: "game_win",
        description: "Trigger an action when the timer fully runs out.",
        difficulty: "High"
      }
    ]
  },

  // 5. EVENTS (Updated for Rules Engine)
  events: {
    win: {
        label: 'Game Win',
        type: 'milestone',
        canScore: true,      
        defaultPoints: 100,
        canWinQuota: false,
        canLossQuota: false
    },
    survive_interval: { 
        label: 'Survival', 
        type: 'interval',
        canScore: true,      
        defaultPoints: 10,
        canWinQuota: false,  
        canLossQuota: false 
    },
    collision: { 
        label: 'Obstacle Collision', 
        type: 'per_item',
        canScore: true,      
        defaultPoints: -10,
        canWinQuota: false, 
        canLossQuota: true,   
        relatedAssets: ['obstacle'] 
    }
  },
  
  // 6. TECHNICAL
  technical: {
    controls: ['keyboard_arrows', 'keyboard_wasd', 'mouse_click', 'touch'],
    orientation: 'landscape',
    version: '1.0.0'
  },

  // 7. FEATURES (UI Logic)
  features: {
      enableQuotaWin: false,    // Avoid can't win by collecting things
      enableScoreWin: true,
      enableFailureLoss: false  // "Did not meet win condition" is confusing for survival
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
              id: 'spawn', label: 'Spawn Rate', enabled: true, hasTarget: false,
              dependency: { mechanicId: 'generationRate', condition: 'eq', value: 0, warning: "Set 'Obstacle Spawn Rate' to a non-zero value to enable." }
          },
          { 
              id: 'distribution', label: 'Bad Items Ratio', enabled: false, hasTarget: false // Explicitly Disabled
          },
          { 
              id: 'size', label: 'Size', enabled: true, hasTarget: true 
          }
      ]
  }
};