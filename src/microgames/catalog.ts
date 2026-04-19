/* src/microgames/catalog.ts */

import { MicrogameCatalogItem } from '../types';
import { avoidDefinition } from './definitions/avoid';
import { catchDefinition } from './definitions/catch';

// Helper to format display names
const formatName = (id: string) => id.replace(/([A-Z])/g, ' $1').trim();

// The Master List of all available Microgames
export const MICROGAME_CATALOG: { [key: string]: MicrogameCatalogItem } = {
  
  // --- AVOID (SOURCED FROM DEFINITION) ---
  Avoid: {
    id: avoidDefinition.id,
    name: avoidDefinition.name,
    description: avoidDefinition.description,
    
    // Direct Mappings
    baseType: avoidDefinition.baseType,
    mechanicType: avoidDefinition.mechanicType,
    tempo: avoidDefinition.tempo,
    category: 'Action', // Can move to definition later if needed
    
    // Arrays
    compatibleConversionGoals: avoidDefinition.compatibleConversionGoals,
    compatibleProductCategories: avoidDefinition.compatibleProductCategories,
    compatibleCustomerTypes: avoidDefinition.compatibleCustomerTypes,
    
    // Mapped Fields
    thumbnail: avoidDefinition.media?.thumbnail || '',
    length: (avoidDefinition.mechanics.duration.defaultValue as number),
    controls: avoidDefinition.technical.controls.map(c => 
        c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', '),
    
    // Events Mapping
    // Fix: Convert Object ({ key: def }) to Array for the Catalog
    trackableEvents: Object.entries(avoidDefinition.events).map(([id, def]) => ({
        eventId: id,
        label: def.label,
        defaultPoints: (def as any).defaultPoints !== undefined ? (def as any).defaultPoints : ((def as any).canScore ? 10 : 0)
    })),

    // Strategy Metadata (Direct Pass-through)
    conversionMetadata: avoidDefinition.conversionMetadata as any,
    
    // Fallback for missing fields in catalog type vs definition type
    gameplayExperience: 'Generalized' 
  },
  Build: {
    id: 'Build',
    name: formatName('Build'),
    baseType: 'Jigsaw Puzzle',
    mechanicType: 'skill',
    controls: 'Click and Drag',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Increase Average Order Value (AOV)', 'Promote a Site-Wide Sale or Offer', 'Generate Leads', 'Collect Email or SMS Subscribers', 'Increase Account or Loyalty Program Sign-ups', 'Drive Social Media Engagement'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter', 'Indecisive Shopper'],
    trackableEvents: [
      { eventId: 'win', label: 'Puzzle Complete', defaultPoints: 100 },
      { eventId: 'piece_placed', label: 'Piece Placed', defaultPoints: 10 }
    ]
  },
  Catch: {
    id: catchDefinition.id,
    name: catchDefinition.name,
    description: catchDefinition.description,
    baseType: catchDefinition.baseType,
    mechanicType: catchDefinition.mechanicType,
    tempo: catchDefinition.tempo,
    category: 'Action',

    compatibleConversionGoals: catchDefinition.compatibleConversionGoals,
    compatibleProductCategories: catchDefinition.compatibleProductCategories,
    compatibleCustomerTypes: catchDefinition.compatibleCustomerTypes,

    thumbnail: catchDefinition.media?.thumbnail || '',
    length: (catchDefinition.mechanics.duration.defaultValue as number),
    controls: 'A and D or Left and Right Arrows', // Keep hardcoded or map from definition

    // Events Mapping (Dynamic)
    trackableEvents: Object.entries(catchDefinition.events).map(([id, def]) => ({
        eventId: id,
        label: def.label,
        defaultPoints: (def as any).defaultPoints !== undefined ? (def as any).defaultPoints : ((def as any).canScore ? 10 : 0)
    })),

    conversionMetadata: catchDefinition.conversionMetadata as any,
    gameplayExperience: 'Generalized'
  },
  Claw: {
    id: 'Claw',
    name: formatName('Claw'),
    baseType: 'Claw Machine',
    mechanicType: 'skill',
    controls: 'Arrows to Move, Space to Drop',
    length: 10,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections', 'Generate Leads'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'grab_success', label: 'Prize Grabbed', defaultPoints: 100 },
      { eventId: 'grab_fail', label: 'Missed Prize', defaultPoints: 0 }
    ]
  },
  Clean: {
    id: 'Clean',
    name: formatName('Clean'),
    baseType: 'Wipe to Reveal',
    mechanicType: 'skill',
    controls: 'Click and Drag',
    length: 5,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'],
    trackableEvents: [
      { eventId: 'clean_complete', label: 'Image Revealed', defaultPoints: 100 }
    ]
  },
  Collect: {
    id: 'Collect',
    name: formatName('Collect'),
    baseType: 'Collection',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 5,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Generate Leads'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'item_collected', label: 'Item Collected', defaultPoints: 10 },
      { eventId: 'win', label: 'All Items Collected', defaultPoints: 100 }
    ]
  },
  Consume: {
    id: 'Consume',
    name: formatName('Consume'),
    baseType: 'Rapid Clicking',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 5,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Drive Social Media Engagement'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'click', label: 'Click', defaultPoints: 1 },
      { eventId: 'win', label: 'Goal Reached', defaultPoints: 100 }
    ]
  },
  Drop: {
    id: 'Drop',
    name: formatName('Drop'),
    baseType: 'Timing Drop',
    mechanicType: 'skill',
    controls: 'Click or Spacebar',
    length: 7,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'win', label: 'Successful Drop', defaultPoints: 100 },
      { eventId: 'lose', label: 'Missed Drop', defaultPoints: 0 }
    ]
  },
  Escape: {
    id: 'Escape',
    name: formatName('Escape'),
    baseType: 'Maze Navigation',
    mechanicType: 'skill',
    controls: 'WASD or Arrows for movement',
    length: 5,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper', 'Bargain Hunter'],
    trackableEvents: [
      { eventId: 'win', label: 'Escaped Maze', defaultPoints: 100 }
    ]
  },
  Frame: {
    id: 'Frame',
    name: formatName('Frame'),
    baseType: 'Positioning',
    mechanicType: 'skill',
    controls: 'Click and Drag',
    length: 5,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper', 'Indecisive Shopper'],
    trackableEvents: [
      { eventId: 'win', label: 'Perfect Frame', defaultPoints: 100 }
    ]
  },
  Grab: {
    id: 'Grab',
    name: formatName('Grab'),
    baseType: 'Reaction / Tapping',
    mechanicType: 'skill',
    controls: 'Click or Spacebar',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'win', label: 'Item Grabbed', defaultPoints: 100 }
    ]
  },
  Grow: {
    id: 'Grow',
    name: formatName('Grow'),
    baseType: 'Collection / Growth',
    mechanicType: 'skill',
    controls: 'Click, Drag, and Drop',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'grow_step', label: 'Growth Stage', defaultPoints: 20 },
      { eventId: 'win', label: 'Fully Grown', defaultPoints: 100 }
    ]
  },
  Like: {
    id: 'Like',
    name: formatName('Like'),
    baseType: 'Reaction / Identification',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 7,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Promote Specific Products or Collections', 'Drive Social Media Engagement'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'like', label: 'Item Liked', defaultPoints: 10 },
      { eventId: 'win', label: 'All Liked', defaultPoints: 100 }
    ]
  },
  LineUp: {
    id: 'LineUp',
    name: formatName('LineUp'),
    baseType: 'Sequencing / Ordering',
    mechanicType: 'skill',
    controls: 'Click, Drag, and Drop',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'win', label: 'Correct Order', defaultPoints: 100 }
    ]
  },
  Match: {
    id: 'Match',
    name: formatName('Match'),
    baseType: 'Memory / Card Flip',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'match_found', label: 'Match Found', defaultPoints: 20 },
      { eventId: 'win', label: 'All Matched', defaultPoints: 100 }
    ]
  },
  MatchUp: {
    id: 'MatchUp',
    name: formatName('MatchUp'),
    baseType: 'Matching Pairs',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'match_found', label: 'Match Found', defaultPoints: 20 },
      { eventId: 'win', label: 'All Matched', defaultPoints: 100 }
    ]
  },
  Organize: {
    id: 'Organize',
    name: formatName('Organize'),
    baseType: 'Categorization',
    mechanicType: 'skill',
    controls: 'Click, Drag, and Drop',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'item_sorted', label: 'Item Sorted', defaultPoints: 10 },
      { eventId: 'win', label: 'All Sorted', defaultPoints: 100 }
    ]
  },
  Package: {
    id: 'Package',
    name: formatName('Package'),
    baseType: 'Drag and Drop',
    mechanicType: 'skill',
    controls: 'Click, Drag, and Drop',
    length: 7,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'item_packed', label: 'Item Packed', defaultPoints: 20 },
      { eventId: 'win', label: 'Package Full', defaultPoints: 100 }
    ]
  },
  Pop: {
    id: 'Pop',
    name: formatName('Pop'),
    baseType: 'Reaction / Tapping',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'pop', label: 'Item Popped', defaultPoints: 10 },
      { eventId: 'win', label: 'All Popped', defaultPoints: 100 }
    ]
  },
  Spot: {
    id: 'Spot',
    name: formatName('Spot'),
    baseType: 'Reaction / Identification',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'spot', label: 'Difference Spotted', defaultPoints: 20 },
      { eventId: 'win', label: 'All Spotted', defaultPoints: 100 }
    ]
  },
  Trade: {
    id: 'Trade',
    name: formatName('Trade'),
    baseType: 'Selection',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 7,
    tempo: 'Normal',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Specific Products or Collections'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Bargain Hunter'],
    trackableEvents: [
      { eventId: 'trade', label: 'Trade Complete', defaultPoints: 50 },
      { eventId: 'win', label: 'Best Value', defaultPoints: 100 }
    ]
  },
  Vote: {
    id: 'Vote',
    name: formatName('Vote'),
    baseType: 'Selection',
    mechanicType: 'skill',
    controls: 'Point and Click',
    length: 7,
    tempo: 'Fast',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Drive Social Media Engagement'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['Impulse Shopper'],
    trackableEvents: [
      { eventId: 'vote', label: 'Vote Cast', defaultPoints: 50 }
    ]
  },
  CupAndBall: {
    id: 'CupAndBall',
    name: formatName('CupAndBall'),
    baseType: 'Shell Game',
    mechanicType: 'chance',
    controls: 'Click to Choose',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Site-Wide Sale'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['All'],
    trackableEvents: [
      { eventId: 'win', label: 'Correct Cup', defaultPoints: 100 },
      { eventId: 'lose', label: 'Wrong Cup', defaultPoints: 0 }
    ]
  },
  DiceRoll: {
    id: 'DiceRoll',
    name: formatName('DiceRoll'),
    baseType: 'Dice Roll',
    mechanicType: 'chance',
    controls: 'Click to Roll',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['All'],
    trackableEvents: [
      { eventId: 'roll', label: 'Dice Rolled', defaultPoints: 0 },
      { eventId: 'win_high', label: 'High Roll (Win)', defaultPoints: 100 },
      { eventId: 'win_low', label: 'Low Roll', defaultPoints: 10 }
    ]
  },
  PickAGift: {
    id: 'PickAGift',
    name: formatName('PickAGift'),
    baseType: 'Mystery Box',
    mechanicType: 'chance',
    controls: 'Click to Open',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Site-Wide Sale'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['All'],
    trackableEvents: [
      { eventId: 'open', label: 'Gift Opened', defaultPoints: 100 }
    ]
  },
  ScratchCard: {
    id: 'ScratchCard',
    name: formatName('ScratchCard'),
    baseType: 'Scratch-Off',
    mechanicType: 'chance',
    controls: 'Click and Drag',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Site-Wide Sale'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['All'],
    trackableEvents: [
      { eventId: 'reveal', label: 'Card Scratched', defaultPoints: 100 }
    ]
  },
  SpinTheWheel: {
    id: 'SpinTheWheel',
    name: formatName('SpinTheWheel'),
    baseType: 'Prize Wheel',
    mechanicType: 'chance',
    controls: 'Click to Spin',
    length: 10,
    tempo: 'Slow',
    gameplayExperience: 'Generalized',
    compatibleConversionGoals: ['Increase Overall Conversion Rate', 'Promote Site-Wide Sale'],
    compatibleProductCategories: ['All'],
    compatibleCustomerTypes: ['All'],
    trackableEvents: [
      { eventId: 'spin', label: 'Wheel Spun', defaultPoints: 0 },
      { eventId: 'win_tier_1', label: 'Grand Prize', defaultPoints: 500 },
      { eventId: 'win_tier_2', label: 'Standard Prize', defaultPoints: 100 },
      { eventId: 'win_tier_3', label: 'Consolation Prize', defaultPoints: 10 }
    ]
  }
};