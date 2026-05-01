/* src/utils/helpers.ts */

import { useEffect } from 'react';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import { Macrogame, Microgame, DeliveryContainer, Alert, CustomMicrogame, ConversionScreen, ConversionMethod } from '../types';
import { UI_SKINS } from '../constants';
// --- Import Definitions for Rules Hydration ---
import { MICROGAME_DEFINITIONS } from '../microgames/definitions/index';

/**
 * Checks if a given macrogame contains any microgames that are archived or deleted.
 * @param macrogame The macrogame to check.
 * @param allMicrogames The complete list of all base microgames.
 * @returns {boolean} True if the macrogame has issues, otherwise false.
 */
export const hasMacrogameIssues = (macrogame: Macrogame, allMicrogames: Microgame[]): boolean => {
  if (!macrogame || !macrogame.flow) return false;
  
  return macrogame.flow.some(flowItem => {
    const gameData = allMicrogames.find(g => g.id === flowItem.microgameId);
    // An issue exists if the game data isn't found OR if the game is explicitly marked as inactive.
    return !gameData || gameData.isActive === false;
  });
};
/**
 * Generates a standard RFC 4122 version 4 UUID.
 * @returns {string} A new unique identifier.
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};
/**
 * --- REFACTOR: Renamed function and updated JSDoc ---
 * Checks a container for configuration issues and returns a structured alert object if any are found.
 * @param container The container to check.
 * @param macrogames The list of all macrogames.
 * @param allMicrogames The list of all microgames.
 * @returns {Alert | null} An Alert object if an issue is found, otherwise null.
 */
// --- REFACTOR: Renamed function and parameters ---
export const getContainerAlert = (container: DeliveryContainer, macrogames: Macrogame[], allMicrogames: Microgame[]): Alert | null => {
  // --- REFACTOR: Use 'container' variable ---
  if (!container.deliveryMethod) {
    return {
      code: 'CONFIG_MISSING_METHOD',
      message: 'Configuration Needed: Select a delivery container type.',
      severity: 'error'
    };
  }
  // --- REFACTOR: Use 'container' variable ---
  if (!container.skinId) {
    return {
      code: 'CONFIG_MISSING_SKIN',
      message: 'Configuration Needed: Select a UI skin.',
      severity: 'error'
    };
  }
  // --- REFACTOR: Use 'container' variable ---
  const macrogame = macrogames.find(m => m.id === container.macrogameId);
  if (!macrogame) {
    return {
      code: 'MACROGAME_DELETED',
      message: 'Needs Attention: The linked macrogame was deleted.',
      severity: 'error'
    };
  }
  if (hasMacrogameIssues(macrogame, allMicrogames)) {
    return {
      code: 'MACROGAME_HAS_ISSUES',
      message: 'Needs Attention: Contains an archived microgame.',
      severity: 'warning'
    };
  }

  return null; // No issues found
};


// A simple rule set for contextual adaptation. This can be expanded significantly.
const adaptationRules: { [key: string]: { [key: string]: { name?: string, description?: string } } } = {
  'catch': {
    'Beauty & Cosmetics': {
      name: 'Beauty Catch!',
      description: 'Catch the falling beauty products to fill your cart!'
    },
    'Gaming & Electronics': {
      name: 'Gadget Catch!',
      description: 'Catch the falling gadgets and avoid the viruses!'
    },
    'Pet Products': {
      name: 'Treat Catch!',
      description: 'Catch the falling treats for your furry friend!'
    },
    'Sporting Goods': {
      name: 'Gear Up!',
      description: 'Catch the essential sports gear for your next game!'
    }
  },
  'clean': {
    'Beauty & Cosmetics': {
      name: 'Skincare Cleanse!',
      description: 'Wipe away the impurities to reveal glowing skin!'
    },
    'Pet Products': {
      name: 'Paw Wash!',
      description: 'Clean the muddy paws before they track dirt in the house!'
    }
  }
};

export const adaptMicrogame = (microgame: Microgame, productCategory: string): Microgame => {
  const rulesForGame = adaptationRules[microgame.id];
  if (rulesForGame && rulesForGame[productCategory]) {
    const adaptations = rulesForGame[productCategory];
    // Return a new object with the original game properties plus the adaptations
    return {
      ...microgame,
      name: adaptations.name || microgame.name,
      skins: { // A placeholder for the description adaptation
        ...microgame.skins,
        [productCategory]: {
          description: adaptations.description || ''
        }
      }
    };
  }
  // If no specific rule applies, return the original game
  return microgame;
};

/**
 * Preloads an array of image URLs.
 * @param {string[]} urls The array of image URLs to preload.
 * @returns {Promise<any[]>} A promise that resolves when all images have been loaded or erroed.
 */
export const preloadImages = (urls: string[]): Promise<any[]> => {
  const promises = urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve; // We resolve on error too, so one bad image doesn't stop the preview.
      img.src = url;
    });
  });
  return Promise.all(promises);
};

/**
 * Creates the configuration object needed to preview a single microgame.
 * @param game The base microgame.
 * @param variant An optional custom variant of the microgame.
 * @returns {object} The configuration object for localStorage.
 */

export const createSingleGamePreviewConfig = (game: Microgame, variant?: CustomMicrogame) => {
    const barebonesSkin = UI_SKINS.find(s => s.id === 'barebones');
    
    // 1. Resolve Rules (Priority: Variant -> Definition Defaults -> Null)
    const definition = MICROGAME_DEFINITIONS[game.id];
    const factoryRules = definition?.defaultRules || {};
    const variantRules = variant?.rules || {};

    // MERGE: Ensure we don't pass a "Pruned" rules object. Fill in the gaps with defaults now.
    const effectiveRules = {
        ...factoryRules,
        ...variantRules,
        enablePoints: variantRules.enablePoints ?? factoryRules.enablePoints ?? false,
        showScore: variantRules.showScore ?? factoryRules.showScore ?? false,
        scores: {
            ...(factoryRules.scores || {}),
            ...(variantRules.scores || {})
        },
        winCondition: { ...(factoryRules.winCondition || {}), ...(variantRules.winCondition || {}) },
        lossCondition: { ...(factoryRules.lossCondition || {}), ...(variantRules.lossCondition || {}) }
    };

    // 2. Resolve Mechanics (Priority: Variant -> Definition Defaults -> Empty)
    let effectiveMechanics = {};
    if (variant?.mechanics) {
        effectiveMechanics = variant.mechanics;
    }

    // 3. Resolve Skin Data
    let customSkinData = {};
    if (variant?.skinData) {
        // Pass full object structure for constraints/size support
        customSkinData = Object.keys(variant.skinData).reduce((acc: any, key: string) => {
            const item = variant.skinData[key];
            acc[key] = { 
                url: item.url, 
                width: item.width, 
                height: item.height,
                hitboxScale: item.hitboxScale,
                color: item.color,
                volume: item.volume,
                triggerEvents: item.triggerEvents
            };
            return acc;
        }, {} as { [key: string]: any });
    }

    const previewMacrogame: any = {
        name: `${game.name} - Preview`,
        category: 'All',
        config: { 
            backgroundMusicUrl: null,
            screenFlowType: 'Overlay',
            preGameConfig: {
                headline: '<h1 style="text-align: center; text-transform: uppercase;">{{game_title}}</h1>',
                bodyText: '<p style="text-align: center; font-size: 1.25rem;">{{game_controls}}</p>',
                transition: { type: 'interact', interactionMethod: 'any_interaction', disclaimerText: 'Click or press any key to continue', pulseAnimation: true }
            },
            resultConfig: {
                enabled: true,
                format: 'overlay',
                winText: '<h1 style="text-align: center; color: #2ecc71;">YOU WIN!</h1>',
                lossText: '<h1 style="text-align: center; color: #e74c3c;">GAME OVER</h1>',
                tryAgainText: '<h1 style="text-align: center; color: #f1c40f;">TIME\'S UP</h1>',
                showPlayAgainOnWin: false,
                showPlayAgainOnLoss: false,
                showPlayAgainOnTryAgain: false,
                transition: { type: 'interact', interactionMethod: 'click', clickFormat: 'button', buttonConfig: { text: 'Play Again', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'wrap' } }
            }
        },
        introScreen: { enabled: false, headline: '', bodyText: '', transition: { type: 'interact' } },
        promoScreen: { enabled: false, headline: '', bodyText: '', transition: { type: 'interact' } },
        flow: [{ 
            ...game, 
            customSkinData,
            rules: effectiveRules,
            mechanics: effectiveMechanics 
        }], 
        conversionScreenId: null,
        conversionGoal: '',
        gameplayExperience: 'Generalized'
    };
    
    return { 
        macrogame: previewMacrogame,
        skinId: barebonesSkin?.id || 'barebones',
        isPreviewMode: 'single_game'
    };
};

/**
 * Launches the preview window with a given configuration.
 * @param {object} config The configuration object from createSingleGamePreviewConfig.
 */
export const launchPreview = (config: object) => {
    localStorage.setItem('macrogame_preview_data', JSON.stringify(config));
    window.open('/preview.html', '_blank');
};

/**
 * A hook that adds a CSS class to the body during window resizing and removes it shortly after.
 */
export const useDebouncedResize = () => {
    useEffect(() => {
        let resizeTimer: number;

        const handleResize = () => {
            document.body.classList.add('is-resizing');
            clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                document.body.classList.remove('is-resizing');
            }, 150); // The class is removed 150ms after the user stops resizing
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
};

/**
 * --- NEW ---
 * Ensures a new name is unique within a set of existing names.
 * If "My Name" exists, it will try "My Name (1)", then "My Name (2)", etc.
 * @param baseName The desired starting name (e.a., "Copy of X" or "X - Deployed")
 * @param existingNames A Set of all names to check against.
 */
export const ensureUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let finalName = baseName;
  let counter = 1; // Start counter at 1

  // Keep checking until we find a name that is *not* in the set
  while (existingNames.has(finalName)) {
    finalName = `${baseName} (${counter})`;
    counter++;
  }

  return finalName;
};

/**
 * Calculates a dynamic value based on linear progression with a "Step Floor".
 * * Strategy:
 * 1. Linear: New = Base + (Base * Rate * Intervals). Avoids compounding infinity.
 * 2. Step Floor: If the calculated change is smaller than the mechanic's step (e.g. 0.025 < 0.1),
 * we force it to the step value so the change is actually visible.
 * * @param baseValue The starting value of the mechanic.
 * @param rate The percentage change per interval (e.g. 10 for 10%, -5 for -5%).
 * @param intervalsPassed How many times the rule has triggered.
 * @param mechanicDef The definition from MICROGAME_DEFINITIONS (for min/max/step).
 */
export const getProgressionValue = (baseValue: number, rate: number, intervalsPassed: number, mechanicDef: any): number => {
    if (intervalsPassed <= 0 || rate === 0) return baseValue;

    // 1. Calculate the ideal "Raw Delta" based on percentage
    // Positive rate = Additive (Bigger numbers)
    // Negative rate = Subtractive (Smaller numbers)
    let rawDelta = baseValue * (rate / 100);

    // 2. Determine the Minimum Step (Granularity)
    // Use the mechanic's defined step, or default to 0.1 to prevent microscopic floats
    const minStep = mechanicDef?.step || 0.1;

    // 3. Apply "Step Floor" Logic
    // If the calculated change is too small to notice, boost it to the minimum step
    // while preserving the direction (positive or negative).
    if (Math.abs(rawDelta) < minStep) {
        const direction = rate > 0 ? 1 : -1;
        rawDelta = direction * minStep;
    }

    // 4. Calculate Linear Result
    // Total Change = Delta * Intervals
    let newValue = baseValue + (rawDelta * intervalsPassed);

    // 5. Apply Hard Limits (Min/Max from Definition)
    if (mechanicDef) {
        if (mechanicDef.min !== undefined && newValue < mechanicDef.min) newValue = mechanicDef.min;
        if (mechanicDef.max !== undefined && newValue > mechanicDef.max) newValue = mechanicDef.max;
    }

    // 6. Round to clean decimals (matches the step precision)
    // This prevents floating point errors like 5.000000001
    return Math.round(newValue * 100) / 100;
};

/**
 * Parses dynamic merge tags in an HTML string with game data.
 * @param htmlString The raw HTML string from the text editor.
 * @param gameName The name of the active microgame.
 * @param gameControls The controls text of the active microgame.
 * @returns {string} The parsed HTML string ready for rendering.
 */
export const parseGameMergeTags = (
    htmlString: string, 
    gameName: string = 'Microgame', 
    gameControls: string = 'Get Ready!',
    targetScore?: number,
    targetRewardName?: string
): string => {
    if (!htmlString) return '';
    return htmlString
        .replace(/\{\{game_title\}\}/gi, gameName)
        .replace(/\{\{game_controls\}\}/gi, gameControls)
        .replace(/\{\{target_points\}\}/gi, targetScore !== undefined ? String(targetScore) : '???')
        .replace(/\{\{target_reward\}\}/gi, targetRewardName || 'Reward');
};

/**
 * Deep-merges an existing macrogame configuration with the master default state.
 * This guarantees that new, nested config properties added later are automatically 
 * populated so the UI never crashes on undefined properties.
 */
export const hydrateMacrogame = (
    existingData: Partial<Macrogame> | null | undefined,
    defaultState: Omit<Macrogame, 'id' | 'type'> & { id: string | null }
): Omit<Macrogame, 'id' | 'type'> & { id: string | null } => {
    if (!existingData) return { ...defaultState };

    return {
        ...defaultState,
        ...existingData,
        globalStyling: {
            ...defaultState.globalStyling,
            ...(existingData.globalStyling || {})
        },
        config: {
            ...defaultState.config,
            ...(existingData.config || {}),
            progressStyle: {
                ...defaultState.config.progressStyle,
                ...(existingData.config?.progressStyle || {})
            },
            lightProgressStyle: {
                ...defaultState.config.lightProgressStyle,
                ...(existingData.config?.lightProgressStyle || {})
            },
            preGameConfig: {
                ...defaultState.config.preGameConfig,
                ...(existingData.config?.preGameConfig || {}),
                transition: {
                    ...defaultState.config.preGameConfig?.transition,
                    ...(existingData.config?.preGameConfig?.transition || {}),
                    buttonConfig: {
                        ...defaultState.config.preGameConfig?.transition?.buttonConfig,
                        ...(existingData.config?.preGameConfig?.transition?.buttonConfig || {})
                    },
                    buttonStyle: {
                        ...defaultState.config.preGameConfig?.transition?.buttonStyle,
                        ...(existingData.config?.preGameConfig?.transition?.buttonStyle || {})
                    },
                    lightButtonStyle: {
                        ...defaultState.config.preGameConfig?.transition?.lightButtonStyle,
                        ...(existingData.config?.preGameConfig?.transition?.lightButtonStyle || {})
                    }
                }
            },
            resultConfig: {
                ...defaultState.config.resultConfig,
                ...(existingData.config?.resultConfig || {}),
                transition: {
                    ...defaultState.config.resultConfig?.transition,
                    ...(existingData.config?.resultConfig?.transition || {}),
                    buttonConfig: {
                        ...defaultState.config.resultConfig?.transition?.buttonConfig,
                        ...(existingData.config?.resultConfig?.transition?.buttonConfig || {})
                    },
                    buttonStyle: {
                        ...defaultState.config.resultConfig?.transition?.buttonStyle,
                        ...(existingData.config?.resultConfig?.transition?.buttonStyle || {})
                    },
                    lightButtonStyle: {
                        ...defaultState.config.resultConfig?.transition?.lightButtonStyle,
                        ...(existingData.config?.resultConfig?.transition?.lightButtonStyle || {})
                    }
                },
                secondaryButtonConfig: {
                    ...defaultState.config.resultConfig?.secondaryButtonConfig,
                    ...(existingData.config?.resultConfig?.secondaryButtonConfig || {})
                },
                secondaryButtonStyle: {
                    ...defaultState.config.resultConfig?.secondaryButtonStyle,
                    ...(existingData.config?.resultConfig?.secondaryButtonStyle || {})
                },
                lightSecondaryButtonStyle: {
                    ...defaultState.config.resultConfig?.lightSecondaryButtonStyle,
                    ...(existingData.config?.resultConfig?.lightSecondaryButtonStyle || {})
                }
            },
            conversionScreenConfig: {
                ...defaultState.config.conversionScreenConfig,
                ...(existingData.config?.conversionScreenConfig || {})
            }
        },
        introScreen: {
            ...defaultState.introScreen,
            ...(existingData.introScreen || {}),
            transition: {
                ...defaultState.introScreen.transition,
                ...(existingData.introScreen?.transition || {}),
                buttonConfig: {
                    ...defaultState.introScreen.transition.buttonConfig,
                    ...(existingData.introScreen?.transition?.buttonConfig || {})
                },
                buttonStyle: {
                    ...defaultState.introScreen.transition.buttonStyle,
                    ...(existingData.introScreen?.transition?.buttonStyle || {})
                },
                lightButtonStyle: {
                    ...defaultState.introScreen.transition.lightButtonStyle,
                    ...(existingData.introScreen?.transition?.lightButtonStyle || {})
                }
            },
            style: {
                ...defaultState.introScreen.style,
                ...(existingData.introScreen?.style || {})
            },
            lightStyle: {
                ...defaultState.introScreen.lightStyle,
                ...(existingData.introScreen?.lightStyle || {})
            }
        },
        promoScreen: {
            ...defaultState.promoScreen,
            ...(existingData.promoScreen || {}),
            transition: {
                ...defaultState.promoScreen.transition,
                ...(existingData.promoScreen?.transition || {}),
                buttonConfig: {
                    ...defaultState.promoScreen.transition.buttonConfig,
                    ...(existingData.promoScreen?.transition?.buttonConfig || {})
                },
                buttonStyle: {
                    ...defaultState.promoScreen.transition.buttonStyle,
                    ...(existingData.promoScreen?.transition?.buttonStyle || {})
                },
                lightButtonStyle: {
                    ...defaultState.promoScreen.transition.lightButtonStyle,
                    ...(existingData.promoScreen?.transition?.lightButtonStyle || {})
                }
            },
            style: {
                ...defaultState.promoScreen.style,
                ...(existingData.promoScreen?.style || {})
            },
            lightStyle: {
                ...defaultState.promoScreen.lightStyle,
                ...(existingData.promoScreen?.lightStyle || {})
            }
        },
        // Arrays and standard object maps should not be deep-merged item-by-item here to prevent ghost data
        flow: existingData.flow || [],
        audioConfig: {
            global: {
                bgMusic: existingData.audioConfig?.global?.bgMusic || {},
                buttonClick: existingData.audioConfig?.global?.buttonClick || {},
                screenTransition: existingData.audioConfig?.global?.screenTransition || existingData.audioConfig?.global?.transition || {},
                timerTick: existingData.audioConfig?.global?.timerTick || {},
                timerGo: existingData.audioConfig?.global?.timerGo || {}
            },
            stages: existingData.audioConfig?.stages || {},
            events: {
                pointPurchaseSuccess: existingData.audioConfig?.events?.pointPurchaseSuccess || {},
                pointPurchaseFailure: existingData.audioConfig?.events?.pointPurchaseFailure || {},
                couponReveal: existingData.audioConfig?.events?.couponReveal || {},
                formSuccess: existingData.audioConfig?.events?.formSuccess || {},
                formError: existingData.audioConfig?.events?.formError || {}
            }
        },
        pointCosts: existingData.pointCosts || {}
    };
};

export type MatchTier = 'perfect' | 'neutral' | 'partial' | 'mismatch' | 'none';

export interface TaxonomyTags {
    sectors?: string[];
    categories?: string[];
    subcategories?: string[];
    seasonality?: string[];
    targetAudience?: string[];
    promotionCompatibility?: string[];
}

/**
 * Calculates an alignment score and tier between a Macrogame's tags and a Microgame's tags.
 * Used for dynamic sorting and visual badging in the Sandbox and Intelligence Layer.
 */
export const calculateAlignmentScore = (macroTags: TaxonomyTags, microTags: TaxonomyTags): { tier: MatchTier, score: number } => {
    const hasSpecific = (arr?: string[]) => arr && arr.length > 0 && !arr.includes('All');
    const intersects = (arr1?: string[], arr2?: string[]) => {
        if (!arr1 || !arr2) return false;
        return arr1.some(item => arr2.includes(item));
    };

    const macroHasSector = hasSpecific(macroTags.sectors);
    const microHasSector = hasSpecific(microTags.sectors);

    // 1. Hard Conflict Check (Tier 4)
    if (macroHasSector && microHasSector && !intersects(macroTags.sectors, microTags.sectors)) {
        return { tier: 'mismatch', score: 0 };
    }

    const macroHasAnyTags = macroHasSector || hasSpecific(macroTags.categories) || hasSpecific(macroTags.subcategories) || 
                            hasSpecific(macroTags.seasonality) || hasSpecific(macroTags.targetAudience) || hasSpecific(macroTags.promotionCompatibility);

    // If the macrogame hasn't had any specific tags set yet, everything is neutral
    if (!macroHasAnyTags) {
        return { tier: 'none', score: 50 };
    }

    // 2. Evaluate Soft Tags
    let overlapScore = 0;
    let softConflict = false;

    const evaluateSoftTag = (macroArr?: string[], microArr?: string[]) => {
        if (hasSpecific(macroArr) && hasSpecific(microArr)) {
            if (intersects(macroArr, microArr)) {
                overlapScore += 10;
            } else {
                softConflict = true;
            }
        }
    };

    evaluateSoftTag(macroTags.categories, microTags.categories);
    evaluateSoftTag(macroTags.subcategories, microTags.subcategories);
    evaluateSoftTag(macroTags.seasonality, microTags.seasonality);
    evaluateSoftTag(macroTags.targetAudience, microTags.targetAudience);
    evaluateSoftTag(macroTags.promotionCompatibility, microTags.promotionCompatibility);

    // 3. Determine Tier & Score
    if (softConflict) {
        return { tier: 'partial', score: 25 + overlapScore }; // Tier 3: Soft Conflict
    }

    if (overlapScore > 0 || (macroHasSector && microHasSector && intersects(macroTags.sectors, microTags.sectors))) {
        return { tier: 'perfect', score: 80 + overlapScore }; // Tier 1: Strong Match
    }

    // Tier 2: Versatile/Generic (No explicit conflicts, but no specific matching tags either)
    return { tier: 'neutral', score: 50 };
};

/**
 * Recursively traverses a Conversion Screen's method gates to find the true point cost
 * required to unlock a specific target method, safely resolving 'on_success' dependency chains.
 */
export const getEffectiveTargetCost = (
    targetInstanceId: string | undefined,
    methods: ConversionScreen['methods'] | undefined,
    pointCosts: { [methodInstanceId: string]: number } | undefined,
    visited = new Set<string>()
): number => {
    if (!targetInstanceId || !methods || !pointCosts || visited.has(targetInstanceId)) return 0;
    
    // Prevent infinite loops in case of malformed circular dependencies
    visited.add(targetInstanceId);

    const method = methods.find(m => m.instanceId === targetInstanceId);
    if (!method || !method.gate) return 0;

    if (method.gate.type === 'point_purchase' || method.gate.type === 'point_threshold') {
        return pointCosts[targetInstanceId] || 0;
    }

    if (method.gate.type === 'on_success' && method.gate.methodInstanceId) {
        return getEffectiveTargetCost(method.gate.methodInstanceId, methods, pointCosts, visited);
    }

    return 0;
};

/**
 * Intelligently resolves the target instance ID. If one is explicitly set, it returns it.
 * If not, it scans the screen methods, finds the point gate with the highest cost, and traverses
 * forward through any "on_success" dependencies to auto-select the TRUE end-reward of the chain.
 */
export const getResolvedTargetInstanceId = (
    explicitTargetId: string | undefined,
    methods: ConversionScreen['methods'] | undefined,
    pointCosts: { [methodInstanceId: string]: number } | undefined
): string | undefined => {
    if (explicitTargetId === 'none') return undefined; // Explicitly hidden
    if (explicitTargetId) return explicitTargetId;     // Explicitly selected

    if (!methods || !pointCosts) return undefined;

    let highestCost = -1;
    let startId: string | undefined = undefined;

    // 1. Find the start of the highest cost chain
    methods.forEach(m => {
        if (m.gate?.type === 'point_purchase' || m.gate?.type === 'point_threshold') {
            const cost = pointCosts[m.instanceId] || 0;
            if (cost > highestCost) {
                highestCost = cost;
                startId = m.instanceId;
            }
        }
    });

    if (!startId) return undefined;

    // 2. Traverse forward to find the end-method of this chain
    let currentId = startId;
    let keepSearching = true;
    let visited = new Set<string>();

    while (keepSearching) {
        visited.add(currentId);
        // Find a method whose prerequisite is currentId
        const nextMethod = methods.find(m => 
            m.gate?.type === 'on_success' && m.gate.methodInstanceId === currentId
        );
        
        if (nextMethod && !visited.has(nextMethod.instanceId)) {
            currentId = nextMethod.instanceId;
        } else {
            keepSearching = false;
        }
    }

    return currentId;
};

/**
 * Retrieves the name of the target reward method for UI display and merge tags,
 * prioritizing the admin's custom name override if it exists.
 */
export const getTargetRewardName = (
    targetInstanceId: string | undefined,
    screenMethods: ConversionScreen['methods'] | undefined,
    allMethods: ConversionMethod[] | undefined,
    nameOverride?: string
): string => {
    if (nameOverride && nameOverride.trim() !== '') return nameOverride.trim();
    if (!targetInstanceId || !screenMethods || !allMethods) return '';
    
    const methodLink = screenMethods.find(m => m.instanceId === targetInstanceId);
    if (!methodLink) return '';
    
    const methodData = allMethods.find(m => m.id === methodLink.methodId);
    return methodData?.name || 'Reward';
};

/**
 * Traces a dependency chain of conversion methods from a starting instance ID
 * and returns an ordered array of the method names in that chain.
 */
export const getRewardChain = (
    startInstanceId: string,
    methods: ConversionScreen['methods'] | undefined,
    allMethods: ConversionMethod[] | undefined
): string[] => {
    if (!methods || !allMethods) return [];
    
    const chainNames: string[] = [];
    let currentId: string | undefined = startInstanceId;
    let visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const screenMethod = methods.find(m => m.instanceId === currentId);
        if (screenMethod) {
            const methodData = allMethods.find(m => m.id === screenMethod.methodId);
            chainNames.push(methodData?.name || 'Unknown Reward');
        }

        // Find the next method whose prerequisite is the current one
        const nextMethod = methods.find(m => m.gate?.type === 'on_success' && m.gate.methodInstanceId === currentId);
        currentId = nextMethod?.instanceId;
    }

    return chainNames;
};