/* src/types/MicrogameDefinition.ts */

// 1. Define Helper Interfaces for Strategy
export type ConversionPillar = 'capture_leads' | 'drive_sales' | 'boost_engagement';

export interface GoalSuitability {
  score: number; // 1-10
  reasoning: string;
  recommended: boolean;
}

// A Preset defines how the game's mechanics should be configured for a specific goal.
export interface MechanicPreset {
  label: string; // e.g. "High Intensity / High Reward"
  description: string;
  mechanicOverrides: { [key: string]: any }; // Key-value pairs matching the game's mechanics
  recommendedConversionMethods: string[]; 
}

export interface MicrogameDefinition {
  // 1. IDENTITY & METADATA
  id: string;
  name: string;
  description: string;
  category: string;
  tags: ('reflex' | 'puzzle' | 'strategy' | 'luck' | 'endless')[];
  baseType: string; // e.g. "Avoidance"
  mechanicType: 'skill' | 'chance' | 'knowledge';
  tempo: 'Slow' | 'Normal' | 'Fast';
  compatibleConversionGoals: string[];
  compatibleProductCategories: string[];
  compatibleCustomerTypes: string[];
  seasonality?: string[];
  promotionCompatibility?: string[];
  media?: {
    icon?: string;          // Square icon URL
    thumbnail?: string;     // 16:9 Card URL
    previewGif?: string;    // Gameplay loop
  };

  // 2. GAME MECHANICS (The "Knobs")
  mechanics: {
    [key: string]: {
      label: string;
      type: 'slider' | 'number' | 'toggle' | 'select' | 'color' | 'hidden'; // Added 'hidden'/'select'
      defaultValue: any; // Changed to 'any' to support arrays (rules)
      min?: number;   // For sliders
      max?: number;   // For sliders
      step?: number;  // For sliders
      description?: string; // Tooltip helper
      options?: { label: string; value: string }[]; // For selects
    };
  };

  // --- HUD CONFIGURATION ---
  hud?: {
      lifeIcon?: 'heart' | 'shield' | 'circle';
  };

  // 3. SKINNABLE ASSETS (The "Graphics" & "Audio")
  assets: {
    [key: string]: {
      type: 'image' | 'audio'; 
      label: string;
      description?: string; 
      
      // Image Specifics
      defaultUrl?: string;
      defaultColor?: string;
      constraints?: {
        minWidth?: number;
        maxWidth?: number;
        maxHeight?: number;
        aspectRatioRecommendation?: number;
      };
      physics?: {
        defaultHitboxScale: number;
      };

      // Audio Specifics
      defaultAudioUrl?: string;
      defaultEvents?: string[];
      // Only show events matching these strings (e.g. ['collision'])
      allowedEventPatterns?: string[];
      
      // Common Logic
      overridables?: string[]; 
      recommendation?: string; 
    };
  };

  // 4. STRATEGY & CONVERSION (The "Brain")
  conversionMetadata?: {
    pillars: {
      capture_leads: GoalSuitability;
      drive_sales: GoalSuitability;
      boost_engagement: GoalSuitability;
    };
    presets: {
      capture_leads?: MechanicPreset;
      drive_sales?: MechanicPreset;
      boost_engagement?: MechanicPreset;
    };
    bestForTip: string;
    audienceVibe: string[];
    triggers?: {
      label: string;
      id: string;
      description: string;
      difficulty: 'Low' | 'Medium' | 'High' | 'Variable';
    }[];
  };

  // 5. TRACKABLE EVENTS (Updated to match Rules Engine Object Structure)
  events: {
    [key: string]: {
        label: string;
        type: 'per_item' | 'interval' | 'milestone';
        canScore: boolean;
        canWinQuota: boolean;
        canLossQuota: boolean;
        description?: string;
        defaultPoints?: number;
        // --- NEW: Schema Link ---
        // Explicitly links this event to specific assets (e.g. 'goodItem')
        // This allows the Builder to automatically filter targets.
        relatedAssets?: string[]; 
    };
  };

  // 6. TECHNICAL SPECS (The "Hardware")
  technical: {
    controls: string[]; // loosened typing to allow string array
    orientation: 'landscape' | 'portrait' | 'responsive';
    version: string; 
  };

  // --- 7. Feature Flags (UI Logic) ---
  features?: {
      enableQuotaWin?: boolean;     
      enableScoreWin?: boolean;     
      enableFailureLoss?: boolean;  
      hideMinObstacles?: boolean;   
      hideMaxObstacles?: boolean;   
  };

  // --- 8. Progression Config ---
  progression?: {
      channels: {
          id: string; // 'speed', 'score', 'spawn', 'distribution', 'size'
          label: string;
          enabled: boolean; 
          hasTarget: boolean; 
          
          // Logic to disable it in UI based on other settings
          dependency?: {
              mechanicId?: string; // e.g. 'generationRate'
              ruleId?: string;     // e.g. 'enablePoints'
              condition: 'eq' | 'neq' | 'gt' | 'lt';
              value: any;
              warning: string;
          };
      }[];
  };

  // --- 9. Factory Defaults ---
  defaultRules?: {
    winCondition?: {
        type: string;
        quotaEvent?: string;
        quotaAmount?: number;
        endImmediately?: boolean;
    };
    lossCondition?: {
        type: string;
        quotaEvent?: string;
        quotaAmount?: number;
        endImmediately?: boolean;
    };
    enablePoints?: boolean;
    showScore?: boolean;
    scores?: Record<string, number>;
  };
}