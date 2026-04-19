/* src/hooks/useMicrogameBuilder.ts */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Microgame, CustomMicrogame } from '../types';
import { useData } from './useData';
import { notifications } from '../utils/notifications';
import { SKINNABLE_ELEMENTS } from '../constants';
import { MICROGAME_DEFINITIONS } from '../microgames/definitions/index';

// Reference Aspect Ratio for calculating "Squareness" in % units.
const SCREEN_ASPECT_RATIO = 16 / 9;

// Keywords that trigger a "Live Preview" (Hiding Overlay)
const VISUAL_MECHANICS = ['size', 'width', 'height', 'scale', 'dropspeed', 'fallspeed', 'obstaclecount', 'catchoffset'];

export const useMicrogameBuilder = (baseGame: Microgame, initialVariant?: CustomMicrogame | null, onSaveSuccess?: () => void) => {
    // --- Derived Data: Game Definition & Elements ---
    const gameDefinition = MICROGAME_DEFINITIONS[baseGame.id];

    // Mechanics & Rules State
    const [mechanicsValues, setMechanicsValues] = useState<{ [key: string]: any }>({});
    const [rulesValues, setRulesValues] = useState<{
        enablePoints: boolean;
        showScore: boolean;
        scores: { [eventId: string]: number };
        winCondition: { type: string; quotaEvent?: string | null; quotaAmount?: number | null; endImmediately?: boolean; showProgress?: boolean };
        lossCondition: { type: string; quotaEvent?: string | null; quotaAmount?: number | null; endImmediately?: boolean; showLives?: boolean };
    }>(() => {
        // 1. Check if the definition has specific factory defaults
        const defaults = gameDefinition.defaultRules;

        return {
            // Use default if present, otherwise fall back to your original hardcoded values (false)
            enablePoints: initialVariant?.rules?.enablePoints ?? defaults?.enablePoints ?? false,
            showScore: initialVariant?.rules?.showScore ?? defaults?.showScore ?? false,
            scores: defaults?.scores ?? {},
            
            winCondition: {
                type: defaults?.winCondition?.type ?? 'time',
                // Use ?? null to prevent undefined
                quotaEvent: defaults?.winCondition?.quotaEvent ?? null,
                quotaAmount: defaults?.winCondition?.quotaAmount ?? null,
                endImmediately: defaults?.winCondition?.endImmediately ?? true,
                showProgress: defaults?.winCondition?.showProgress ?? true
            },
            
            lossCondition: {
                type: defaults?.lossCondition?.type ?? 'none',
                // Use ?? null to prevent undefined
                quotaEvent: defaults?.lossCondition?.quotaEvent ?? null,
                quotaAmount: defaults?.lossCondition?.quotaAmount ?? null,
                endImmediately: defaults?.lossCondition?.endImmediately ?? true,
                showLives: defaults?.lossCondition?.showLives ?? true
            }
        };
    });

    const { saveCustomMicrogame, isGuidedMode, customMicrogames } = useData();

    // --- Asset State ---
    const [skinFiles, setSkinFiles] = useState<{ [key: string]: File | null }>({});
    const [skinPreviews, setSkinPreviews] = useState<{ [key: string]: string }>({});
    const [baseDimensions, setBaseDimensions] = useState<{ [key: string]: { w: number, h: number, aspect: number } }>({});
    const [skinDimensions, setSkinDimensions] = useState<{ [key: string]: { width?: number; height?: number } }>({});
    
    // Audio State
    const [audioVolumes, setAudioVolumes] = useState<{ [key: string]: number }>({});
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
    const [audioTriggers, setAudioTriggers] = useState<{ [key: string]: string[] }>({});
    // Audio Layers State (Maps baseAssetId -> list of layerIds)
    const [audioLayers, setAudioLayers] = useState<{ [key: string]: string[] }>({});

    // Metadata State
    const [itemNames, setItemNames] = useState<{ [key: string]: string }>({});
    const [hitboxScales, setHitboxScales] = useState<{ [key: string]: number }>({});
    const [skinColors, setSkinColors] = useState<{ [key: string]: string }>({});
    
    // Grouping State
    const [slotGroupCounts, setSlotGroupCounts] = useState<{ [key: string]: number }>({});

    // Interaction State (For Live Preview Feedback)
    const [isInteracting, setIsInteracting] = useState(false);
    const [activeHitboxId, setActiveHitboxId] = useState<string | null>(null);
    const [previewKey, setPreviewKey] = useState(0);

    // Strategy Mode State
    const [configMode, setConfigMode] = useState<'manual' | 'strategy'>('manual');
    const [activeStrategy, setActiveStrategy] = useState<string | null>(null);

    // Cleanup Refs
    const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const colorDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const activeUrls = useRef<string[]>([]);
    
    const skinnableElements = useMemo(() => {
        if (gameDefinition && gameDefinition.assets) {
            return Object.entries(gameDefinition.assets).map(([key, def]) => ({
                id: key,
                name: def.label,
                recommendation: def.description,
                constraints: def.constraints,
                quantityDrivenBy: def.quantityDrivenBy,
                overridables: (def as any).overridables,
                associatedMechanics: (def as any).associatedMechanics,
                allowedEventPatterns: (def as any).allowedEventPatterns,
                defaultColor: def.defaultColor,
                physics: def.physics,
                type: def.type
            }));
        }
        // Legacy fallback
        return SKINNABLE_ELEMENTS[baseGame.id.toLowerCase()] || [];
    }, [baseGame.id, gameDefinition]);

    // --- Initialization Effect ---
    useEffect(() => {
        // 1. Initialize Mechanics
        const initialMechanics: any = {};
        if (gameDefinition?.mechanics) {
            Object.entries(gameDefinition.mechanics).forEach(([key, def]) => {
                initialMechanics[key] = def.defaultValue;
            });
        }
        if (initialVariant?.mechanics) {
            Object.assign(initialMechanics, initialVariant.mechanics);
        }
        setMechanicsValues(initialMechanics);

        // 2. Initialize Audio & Triggers
        const initialVolumes: { [key: string]: number } = {};
        const initialTriggers: { [key: string]: string[] } = {};
        const initialLayers: { [key: string]: string[] } = {};
        
        // Defaults from Definition (With Expansion Logic)
        if (gameDefinition?.assets) {
            Object.entries(gameDefinition.assets).forEach(([key, def]) => {
                if (def.type === 'audio' && (def as any).defaultEvents) {
                    const rawDefaults = (def as any).defaultEvents as string[];
                    
                    // FIX: Expand generic defaults (e.g. 'collision') to specific IDs ('collision:0')
                    // This ensures the UI checkboxes (which track specifics) match the initial state.
                    const expandedDefaults = rawDefaults.flatMap(trigger => {
                        const eventDef = gameDefinition.events?.[trigger];
                        const relatedAssetId = (eventDef as any)?.relatedAssets?.[0];
                        if (relatedAssetId) {
                            const assetDef = gameDefinition.assets?.[relatedAssetId];
                            if (assetDef && assetDef.quantityDrivenBy) {
                                const qKey = assetDef.quantityDrivenBy;
                                // Use the mechanics we just calculated in Step 1
                                const qty = initialMechanics[qKey] ?? 1;
                                if (qty > 1) {
                                    return Array.from({ length: qty }, (_, i) => `${trigger}:${i}`);
                                }
                            }
                        }
                        return trigger;
                    });

                    initialTriggers[key] = expandedDefaults;
                }
            });
        }

        // Overrides from Variant
        if (initialVariant?.skinData) {
            Object.entries(initialVariant.skinData).forEach(([key, data]) => {
                if ((data as any).volume !== undefined) initialVolumes[key] = (data as any).volume;
                if ((data as any).triggerEvents) initialTriggers[key] = (data as any).triggerEvents;

                // Detect Layers
                if (key.includes('_layer_')) {
                    const parts = key.split('_layer_');
                    const baseId = parts[0];
                    if (!initialLayers[baseId]) initialLayers[baseId] = [];
                    initialLayers[baseId].push(key);
                }
            });
        }
        setAudioVolumes(initialVolumes);
        setAudioTriggers(initialTriggers);
        setAudioLayers(initialLayers);

        // 3. Initialize Item Names
        const initialNames: { [key: string]: string } = {};
        if (initialVariant?.skinData) {
            Object.entries(initialVariant.skinData).forEach(([key, data]) => {
                if ((data as any).name) initialNames[key] = (data as any).name;
            });
        }
        setItemNames(initialNames);

        // 4. Initialize Rules
        if (initialVariant?.rules) {
            // FIX: Merge saved rules with defaults to ensure scores aren't missing
            const mergedScores = { ...initialVariant.rules.scores };
            
            // If saved scores are missing keys, fill them from definition defaults
            if (gameDefinition?.events) {
                Object.entries(gameDefinition.events).forEach(([key, def]) => {
                    if ((def as any).canScore && mergedScores[key] === undefined) {
                        mergedScores[key] = (def as any).defaultPoints || 0;
                    }
                });
            }

            // FIX: Fallback to defaults if keys were pruned (deleted) from the database
            const defaults = gameDefinition.defaultRules;

            setRulesValues({
                ...initialVariant.rules,
                
                // Ensure pruned booleans are restored from defaults
                enablePoints: initialVariant.rules.enablePoints ?? defaults?.enablePoints ?? false,
                showScore: initialVariant.rules.showScore ?? defaults?.showScore ?? false,
                
                scores: mergedScores,
                
                // Ensure nested objects preserve fallbacks too
                winCondition: {
                    ...rulesValues.winCondition, // Keep current safe defaults as base
                    ...(defaults?.winCondition || {}), // Apply factory defaults
                    ...initialVariant.rules.winCondition // Apply saved overrides
                },
                lossCondition: {
                    ...rulesValues.lossCondition,
                    ...(defaults?.lossCondition || {}),
                    ...initialVariant.rules.lossCondition
                }
            });
        } else if (gameDefinition?.events) {
            // ... (keep existing else block for new games)
            const defaultScores: any = {};
            Object.entries(gameDefinition.events).forEach(([key, def]) => {
                if ((def as any).canScore) defaultScores[key] = (def as any).defaultPoints || 0;
            });
            setRulesValues(prev => ({ ...prev, scores: defaultScores }));
        }

        // 5. Initialize Visuals
        const initialDims: any = {};
        const initialHitboxes: any = {}; 
        const initialUrls: any = {};
        const initialColors: any = {};

        if (gameDefinition?.assets) {
            Object.entries(gameDefinition.assets).forEach(([key, def]) => {
                if (def.defaultColor) initialColors[key] = def.defaultColor;
            });
        }

        if (initialVariant?.skinData) {
            Object.entries(initialVariant.skinData).forEach(([key, data]) => {
                if (data.width && data.height) {
                    initialDims[key] = { width: data.width, height: data.height };
                    setBaseDimensions(prev => ({ ...prev, [key]: { w: data.width!, h: data.height!, aspect: data.width! / data.height! } }));
                }
                
                // FIX: Load hitbox scale independent of dimensions (Fixes persistence for default assets)
                if ((data as any).hitboxScale !== undefined) {
                    initialHitboxes[key] = (data as any).hitboxScale;
                }

                if (data.url) initialUrls[key] = data.url;
                if ((data as any).color) initialColors[key] = (data as any).color;
            });
        }
        
        setSkinDimensions(initialDims);
        setHitboxScales(initialHitboxes);
        setSkinPreviews(initialUrls);
        setSkinColors(initialColors);

    }, [initialVariant, gameDefinition]);

    // --- Cleanup Effect ---
    useEffect(() => {
        return () => {
            activeUrls.current.forEach(url => URL.revokeObjectURL(url));
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
            // Stop all audio
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, []);

    // --- Helper Logic ---
    const createSafeUrl = (file: File) => {
        const url = URL.createObjectURL(file);
        activeUrls.current.push(url);
        return url;
    };

    const triggerPreviewEffect = (elementId: string | null, duration: number = 2000) => {
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
        setIsInteracting(true);
        if (elementId) setActiveHitboxId(elementId);

        overlayTimeoutRef.current = setTimeout(() => {
            setIsInteracting(false);
            setActiveHitboxId(null);
        }, duration);
    };

    // --- Audio Handlers ---
    const handleToggleAudio = (elementId: string, url: string) => {
        if (playingAudioId && playingAudioId !== elementId) {
            const current = audioRefs.current[playingAudioId];
            if (current) { 
                current.pause(); 
                current.currentTime = 0; 
            }
            setPlayingAudioId(null);
        }

        if (!audioRefs.current[elementId]) {
            audioRefs.current[elementId] = new Audio(url);
        }
        const audio = audioRefs.current[elementId];

        if (playingAudioId === elementId) {
            if (url && !audio.src.endsWith(url) && audio.src !== url) {
                audio.src = url;
                audio.volume = audioVolumes[elementId] ?? 1.0;
                audio.play()
                    .then(() => setPreviewKey(k => k + 1))
                    .catch(e => console.error("Audio switch error:", e));
            } else {
                audio.pause();
                setPlayingAudioId(null);
            }
        } 
        else {
            if (url) {
                audio.src = url;
                audio.volume = audioVolumes[elementId] ?? 1.0; 
                audio.play().then(() => {
                    setPlayingAudioId(elementId);
                    setPreviewKey(k => k + 1);
                }).catch(e => console.error("Audio play error:", e));
                
                audio.onended = () => setPlayingAudioId(null);
            }
        }
    };

    // --- Interaction Handlers ---
    const handleSliderStart = (elementId?: string, shouldPreview: boolean = true) => {
        // ALWAYS signal interaction start to pause game loops
        setIsInteracting(true);

        // ALWAYS set the ID so StaticMicrogamePreview knows to skip the "Hard Reset"
        // and perform a "Soft Update" instead.
        if (elementId) setActiveHitboxId(elementId);
        
        if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    };

    const handleSliderEnd = () => {
        if (activeHitboxId && activeHitboxId.includes('dropSpeed')) {
            const dropId = `test_drop_${activeHitboxId}`;
            triggerPreviewEffect(dropId, 1000);
            setPreviewKey(k => k + 1);
        } else {
            triggerPreviewEffect(null, 0);
            setPreviewKey(k => k + 1);
        }
    };

    const getSliderProps = useCallback((mechKey: string) => {
        const isVisual = VISUAL_MECHANICS.some(keyword => mechKey.toLowerCase().includes(keyword));

        return {
            onPointerDown: () => handleSliderStart(mechKey, isVisual),
            onPointerUp: handleSliderEnd,
            style: { width: '100%', cursor: 'pointer' }
        };
    }, [handleSliderEnd]);

    const handleFileChange = (elementId: string, file: File | null) => {
        if (file) {
            if (skinPreviews[elementId] && skinPreviews[elementId].startsWith('blob:')) {
                URL.revokeObjectURL(skinPreviews[elementId]);
            }

            const url = createSafeUrl(file);
            triggerPreviewEffect(elementId, 2000);

            // Auto-play audio upon upload
            if (file.type.startsWith('audio/')) {
                handleToggleAudio(elementId, url);
            }
            
            // Auto-calculate dimensions logic
            const img = new Image();
            img.onload = () => {
                const baseId = elementId.includes('_') && !elementId.startsWith('background') ? elementId.split('_')[0] : elementId;
                const elementDef = gameDefinition?.assets?.[baseId];
                const constraints = elementDef?.constraints;

                if (constraints) {
                    const imgAspect = img.naturalWidth / img.naturalHeight;
                    let bestFitWidth = (constraints.minWidth + constraints.maxWidth) / 2;
                    let bestFitHeight = (bestFitWidth / imgAspect) * (16/9);

                    if (constraints.maxHeight && bestFitHeight > constraints.maxHeight) {
                        bestFitHeight = constraints.maxHeight;
                        bestFitWidth = (bestFitHeight / (16/9)) * imgAspect;
                    }
                    if (constraints.maxWidth && bestFitWidth > constraints.maxWidth) {
                        bestFitWidth = constraints.maxWidth;
                    }

                    setBaseDimensions(prev => ({ ...prev, [elementId]: { w: bestFitWidth, h: bestFitHeight, aspect: imgAspect } }));
                    
                    if (elementDef.associatedMechanics) {
                        const sizeMechKey = elementDef.associatedMechanics.find((m: string) => m.toLowerCase().includes('size') || m.toLowerCase().includes('width')) || elementDef.associatedMechanics[0];
                        if (sizeMechKey) {
                            const specificKey = `${elementId}_${sizeMechKey}`;
                            setMechanicsValues(prev => ({ ...prev, [specificKey]: Number(bestFitWidth.toFixed(1)) }));
                        }
                    }
                }
            };
            img.src = url;

            setSkinFiles(prev => ({ ...prev, [elementId]: file }));
            setSkinPreviews(prev => ({ ...prev, [elementId]: url }));
            setPreviewKey(k => k + 1);
        }
    };

    const handleRemoveFile = (elementId: string) => {
        // 1. Remove File & Preview
        setSkinFiles(prev => { const n = { ...prev }; delete n[elementId]; return n; });
        setSkinPreviews(prev => { 
            const n = { ...prev }; 
            if (n[elementId] && n[elementId].startsWith('blob:')) URL.revokeObjectURL(n[elementId]); 
            n[elementId] = ""; // Signal explicit removal
            return n; 
        });
        setSkinDimensions(prev => { const n = { ...prev }; delete n[elementId]; return n; });

        // 2. Reset Mechanics & Properties to Defaults
        // Determine the base element (e.g. 'obstacle' from 'obstacle_0')
        const baseId = elementId.includes('_') && !elementId.startsWith('background') ? elementId.split('_')[0] : elementId;
        const elementDef = skinnableElements.find(el => el.id === baseId);

        if (elementDef) {
            // A. Reset Associated Mechanics (Size, Speed, etc)
            if (elementDef.associatedMechanics) {
                setMechanicsValues(prev => {
                    const next = { ...prev };
                    elementDef.associatedMechanics.forEach((mechKey: string) => {
                        // Delete specific override (e.g. player_0_playerSize) so it falls back to global default
                        const specificKey = `${elementId}_${mechKey}`;
                        delete next[specificKey];
                    });
                    return next;
                });
            }

            // B. Reset Hitbox
            setHitboxScales(prev => {
                const n = { ...prev };
                delete n[elementId]; // Fall back to default
                return n;
            });

            // C. Reset Color
            setSkinColors(prev => {
                const n = { ...prev };
                delete n[elementId]; // Fall back to default
                return n;
            });
        }

        setPreviewKey(k => k + 1);
    };

    const handleColorChange = (subId: string, color: string) => {
        setSkinColors(prev => ({ ...prev, [subId]: color }));
        triggerPreviewEffect(subId, 2000);
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
        colorDebounceRef.current = setTimeout(() => setPreviewKey(k => k + 1), 300);
    };

    const handleVolumeChange = (elementId: string, volume: number) => {
        setAudioVolumes(prev => ({ ...prev, [elementId]: volume }));
        if (audioRefs.current[elementId]) {
            audioRefs.current[elementId].volume = volume;
        }
    };

    // --- Audio Layer Management ---
    const handleAddAudioLayer = (baseId: string) => {
        const newLayerId = `${baseId}_layer_${Date.now()}`;
        setAudioLayers(prev => ({
            ...prev,
            [baseId]: [...(prev[baseId] || []), newLayerId]
        }));
    };

    const handleRemoveAudioLayer = (baseId: string, layerId: string) => {
        setAudioLayers(prev => ({
            ...prev,
            [baseId]: (prev[baseId] || []).filter(id => id !== layerId)
        }));
        // Cleanup associated state immediately
        handleRemoveFile(layerId);
        setAudioVolumes(prev => { const n = { ...prev }; delete n[layerId]; return n; });
        setAudioTriggers(prev => { const n = { ...prev }; delete n[layerId]; return n; });
    };

    // --- Logic: Probability Distribution ---
    const handleDistributeChance = (baseId: string, targetIndex: number, newValue: number, totalQuantity: number) => {
        if (totalQuantity <= 1) return;
        const clampedValue = Math.max(0, Math.min(100, newValue));
        const remainder = 100 - clampedValue;
        
        const otherIndices = [];
        for (let i = 0; i < totalQuantity; i++) {
            if (i !== targetIndex) otherIndices.push(i);
        }

        const splitValue = Math.floor(remainder / otherIndices.length);
        let crumbs = remainder - (splitValue * otherIndices.length);
        
        const updates: { [key: string]: number } = {};
        updates[`${baseId}_${targetIndex}_chance`] = clampedValue;

        otherIndices.forEach(idx => {
            let val = splitValue;
            if (crumbs > 0) { val += 1; crumbs -= 1; }
            updates[`${baseId}_${idx}_chance`] = val;
        });

        setMechanicsValues(prev => ({ ...prev, ...updates }));
    };

    const resetDistribution = (baseId: string, newQuantity: number) => {
        const splitValue = Math.floor(100 / newQuantity);
        let crumbs = 100 - (splitValue * newQuantity);
        const updates: { [key: string]: number } = {};
        for (let i = 0; i < newQuantity; i++) {
            let val = splitValue;
            if (crumbs > 0) { val += 1; crumbs -= 1; }
            updates[`${baseId}_${i}_chance`] = val;
        }
        setMechanicsValues(prev => ({ ...prev, ...updates }));
    };

    const migrateState = (fromId: string, toId: string) => {
        const copy = (setter: React.Dispatch<React.SetStateAction<any>>) => {
            setter((prev: any) => {
                if (prev[fromId] === undefined) return prev;
                return { ...prev, [toId]: prev[fromId] };
            });
        };
        copy(setSkinFiles); copy(setSkinPreviews); copy(setBaseDimensions);
        copy(setSkinDimensions); copy(setHitboxScales); copy(setSkinColors);
        copy(setAudioVolumes); copy(setAudioTriggers); copy(setItemNames);
    };

    const handleQuantityChange = (elementId: string, newQuantity: number) => {
        const element = skinnableElements.find(el => el.id === elementId);
        if (!element || !element.quantityDrivenBy) return;
        
        const mechKey = element.quantityDrivenBy;
        const currentVal = mechanicsValues[mechKey] ?? gameDefinition?.mechanics?.[mechKey]?.defaultValue ?? 1;
        
        setMechanicsValues(prev => ({ ...prev, [mechKey]: newQuantity }));
        
        if (currentVal === 1 && newQuantity > 1) migrateState(elementId, `${elementId}_0`);
        else if (currentVal > 1 && newQuantity === 1) migrateState(`${elementId}_0`, elementId);

        resetDistribution(elementId, newQuantity);
    };

    const handleToggleGroupAll = (elementId: string, totalQuantity: number, isChecked: boolean) => {
        setSlotGroupCounts(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => { if (k.startsWith(`${elementId}_`)) delete next[k]; });
            if (isChecked) next[`${elementId}_0`] = totalQuantity;
            return next;
        });
    };

    const applyPreset = (pillarId: string) => {
        const metadata = baseGame.conversionMetadata;
        const preset = (metadata as any)?.presets?.[pillarId];

        if (preset && preset.mechanicOverrides) {
            setMechanicsValues(prev => ({ ...prev, ...preset.mechanicOverrides }));
            setActiveStrategy(pillarId);
            setPreviewKey(k => k + 1);
            notifications.success(`Applied "${preset.label}" settings.`);
        }
    };

    const handleSave = async (formData: any) => {
        const loadingToast = notifications.loading("Saving variant...");
        try {
            // --- 1. Ensure Name Uniqueness ---
            let uniqueName = formData.name.trim();
            
            // Get all names EXCLUDING the current variant (if we are editing it)
            const existingNames = new Set(
                customMicrogames
                    .filter((v: any) => initialVariant ? v.id !== initialVariant.id : true)
                    .map((v: any) => v.name)
            );

            // If collision exists, increment counter until unique
            if (existingNames.has(uniqueName)) {
                let counter = 1;
                while (existingNames.has(`${uniqueName} (${counter})`)) {
                    counter++;
                }
                uniqueName = `${uniqueName} (${counter})`;
            }
            const filesToUpload: { [key: string]: File } = {};
            const skinMetadata: any = {};

            // HELPER 1: Enforce Constraints & Align to Step
            const sanitizeValue = (mechKey: string, rawValue: any) => {
                // FIX: Firestore crashes on undefined. Return null or clean value.
                if (rawValue === undefined || rawValue === null || rawValue === '') return null;

                const def = gameDefinition?.mechanics?.[mechKey];
                let val = Number(rawValue); 
                
                if (isNaN(val)) return rawValue; // Keep non-numeric strings if valid

                if (def) {
                    if (def.min !== undefined && val < def.min) val = def.min;
                    if (def.max !== undefined && val > def.max) val = def.max;
                    if (def.step && def.min !== undefined) {
                        const step = def.step;
                        const min = def.min;
                        const stepsFromMin = Math.round((val - min) / step);
                        val = min + (stepsFromMin * step);
                    }
                }
                return Math.round(val * 100) / 100;
            };

            // HELPER 2: Check if value matches default (Data Minimization)
            const isDefaultMechanic = (mechKey: string, val: any) => {
                const def = gameDefinition?.mechanics?.[mechKey];
                if (!def) return false;
                // Compare with default (handling slight floating point diffs)
                return Math.abs(val - def.defaultValue) < 0.001;
            };

            const processAssignment = (targetKey: string, sourceKey: string, sourceFile: File | null, sourceDims: any, sourceHitbox: number, element: any) => {
                if (sourceFile) filesToUpload[targetKey] = sourceFile;
                
                // DATA MINIMIZATION: Only save metadata if strictly necessary
                const metadata: any = {};
                let hasData = false;

                // If we are uploading a file, we MUST create a metadata entry
                // so DataContext can safely read from it.
                if (sourceFile) {
                    hasData = true;
                }

                if (sourceDims) { 
                    metadata.width = Math.round(sourceDims.width); 
                    metadata.height = Math.round(sourceDims.height);
                    hasData = true; 
                }
                // Only save hitbox if changed from 1
                if (sourceHitbox !== 1) { 
                    metadata.hitboxScale = sourceHitbox; 
                    hasData = true; 
                }
                // Only save color if different from default
                if (skinColors[sourceKey] && skinColors[sourceKey] !== element.defaultColor) {
                    metadata.color = skinColors[sourceKey];
                    hasData = true;
                }
                // Only save volume if changed from 1.0
                if (audioVolumes[sourceKey] !== undefined && audioVolumes[sourceKey] !== 1.0) {
                    metadata.volume = audioVolumes[sourceKey];
                    hasData = true;
                }
                // Save triggers if they exist (even if empty array) to enforce "No Sound"
                if (audioTriggers[sourceKey]) {
                    metadata.triggerEvents = audioTriggers[sourceKey];
                    hasData = true;
                }
                if (itemNames[sourceKey]) {
                    metadata.name = itemNames[sourceKey];
                    hasData = true;
                }

                // If no file to upload:
                if (!sourceFile) {
                    // A. If we have a valid URL (Preset or Existing), pass it.
                    if (skinPreviews[sourceKey] && !skinPreviews[sourceKey].startsWith('blob:')) {
                        metadata.url = skinPreviews[sourceKey];
                        hasData = true;
                    }
                    // B. If explicitly removed (empty string), signal removal to DB.
                    else if (skinPreviews[sourceKey] === "") {
                        metadata.url = ""; 
                        hasData = true;
                    }
                }

                if (hasData) {
                    skinMetadata[targetKey] = metadata;
                }

                // Copy Mechanic Overrides with Sanitization & Pruning
                const allKeysToCopy = [...(element.overridables || []), ...(element.associatedMechanics || [])];
                allKeysToCopy.forEach((mechKey: string) => {
                    const leaderSpecificKey = `${sourceKey}_${mechKey}`;
                    const genericKey = mechKey; 

                    let valueToUse = mechanicsValues[leaderSpecificKey];
                    if (valueToUse === undefined) valueToUse = mechanicsValues[genericKey];
                    
                    if (valueToUse !== undefined) {
                        const targetSpecificKey = `${targetKey}_${mechKey}`;
                        const sanitized = sanitizeValue(mechKey, valueToUse);
                        
                        // ONLY save if it differs from default
                        if (!isDefaultMechanic(mechKey, sanitized)) {
                            mechanicsValues[targetSpecificKey] = sanitized;
                        } else {
                            // Ensure we don't accidentally save the default
                            delete mechanicsValues[targetSpecificKey];
                        }
                    }
                });

                // Process Extra Audio Layers
                const layers = audioLayers[sourceKey] || [];
                layers.forEach(layerId => {
                    if (skinFiles[layerId]) filesToUpload[layerId] = skinFiles[layerId]!;
                    
                    // Layers always need their metadata saved as they have no "defaults"
                    skinMetadata[layerId] = {
                        volume: audioVolumes[layerId] ?? 1.0,
                        triggerEvents: audioTriggers[layerId] ?? []
                    };
                });
            };

            // --- MAIN LOOP ---
            skinnableElements.forEach(element => {
                let quantity = 1;
                if (element.quantityDrivenBy) {
                    const val = mechanicsValues[element.quantityDrivenBy];
                    const defaultVal = gameDefinition?.mechanics?.[element.quantityDrivenBy]?.defaultValue;
                    quantity = typeof val === 'number' ? val : (defaultVal as number || 1);
                }

                // Sanitize Quantity
                quantity = sanitizeValue(element.quantityDrivenBy, quantity);

                if (quantity === 1) {
                    processAssignment(element.id, element.id, skinFiles[element.id], skinDimensions[element.id], hitboxScales[element.id] || 1, element);
                } else {
                    let currentIndex = 0;
                    while (currentIndex < quantity) {
                        const leaderKey = `${element.id}_${currentIndex}`;
                        const count = slotGroupCounts[leaderKey] || 1;
                        const leaderFile = skinFiles[leaderKey];
                        const leaderDims = skinDimensions[leaderKey];
                        const leaderHitbox = hitboxScales[leaderKey] || 1;

                        for (let i = 0; i < count; i++) {
                            const targetIndex = currentIndex + i;
                            if (targetIndex >= quantity) break;
                            const targetKey = `${element.id}_${targetIndex}`;
                            processAssignment(targetKey, leaderKey, leaderFile, leaderDims, leaderHitbox, element);
                        }
                        currentIndex += count;
                    }
                }
            });

            // GLOBAL MECHANICS: Prune Defaults
            if (gameDefinition?.mechanics) {
                Object.keys(gameDefinition.mechanics).forEach(mechKey => {
                    if (mechanicsValues[mechKey] !== undefined) {
                        const sanitized = sanitizeValue(mechKey, mechanicsValues[mechKey]);
                        if (isDefaultMechanic(mechKey, sanitized)) {
                            delete mechanicsValues[mechKey]; // Don't save defaults
                        } else {
                            mechanicsValues[mechKey] = sanitized;
                        }
                    }
                });
            }

            // GLOBAL MECHANICS: Prune Defaults
            if (gameDefinition?.mechanics) {
                Object.keys(gameDefinition.mechanics).forEach(mechKey => {
                    if (mechanicsValues[mechKey] !== undefined) {
                        const sanitized = sanitizeValue(mechKey, mechanicsValues[mechKey]);
                        if (isDefaultMechanic(mechKey, sanitized)) {
                            delete mechanicsValues[mechKey]; // Don't save defaults
                        } else {
                            mechanicsValues[mechKey] = sanitized;
                        }
                    }
                });
            }

            // RULES PRUNING
            const defaults = gameDefinition.defaultRules || {};
            
            // Deep copy and Sanitize to prevent undefined crash
            const prunedRules = { 
                ...rulesValues,
                winCondition: {
                    ...rulesValues.winCondition,
                    quotaEvent: rulesValues.winCondition.quotaEvent ?? null,
                    quotaAmount: rulesValues.winCondition.quotaAmount ?? null
                },
                lossCondition: {
                    ...rulesValues.lossCondition,
                    quotaEvent: rulesValues.lossCondition.quotaEvent ?? null,
                    quotaAmount: rulesValues.lossCondition.quotaAmount ?? null
                }
            };
            
            // 1. Prune Flags
            if (prunedRules.enablePoints === defaults.enablePoints) delete (prunedRules as any).enablePoints;
            if (prunedRules.showScore === defaults.showScore) delete (prunedRules as any).showScore;

            // 2. Prune Scores (High Value for Size)
            const scores: any = {};
            let hasScoreOverrides = false;
            const defScores = (defaults.scores || {}) as any;
            
            Object.entries(rulesValues.scores).forEach(([key, val]) => {
                const defVal = defScores[key] ?? (gameDefinition.events?.[key] as any)?.defaultPoints ?? 0;
                if (val !== defVal) {
                    scores[key] = val;
                    hasScoreOverrides = true;
                }
            });
            
            if (hasScoreOverrides) {
                prunedRules.scores = scores;
            } else {
                delete (prunedRules as any).scores;
            }

            const metadataPayload = {
                description: formData.description,
                sectors: formData.sectors,
                categories: formData.categories,
                subcategories: formData.subcategories,
                seasonality: formData.seasonality,
                targetAudience: formData.targetAudience,
                promotionCompatibility: formData.promotionCompatibility
            };

            // --- CRITICAL FIX: OMNI-SANITIZER ---
            // Firestore strictly forbids `undefined` values anywhere in the document tree.
            const stripUndefined = (obj: any) => {
                if (obj === null || typeof obj !== 'object') return;
                Object.keys(obj).forEach(key => {
                    if (obj[key] === undefined) {
                        delete obj[key];
                    } else if (typeof obj[key] === 'object') {
                        stripUndefined(obj[key]);
                    }
                });
            };
            
            stripUndefined(prunedRules);
            stripUndefined(metadataPayload);
            stripUndefined(mechanicsValues);

            // For skinMetadata, we explicitly want nulls instead of deleted keys to ensure DataContext overrides old data
            Object.keys(skinMetadata).forEach(key => {
                const meta = skinMetadata[key];
                if (meta) {
                    Object.keys(meta).forEach(field => {
                        if (meta[field] === undefined) meta[field] = null;
                    });
                }
            });
            // ------------------------------------

            await saveCustomMicrogame(
                baseGame,
                uniqueName,
                filesToUpload, 
                skinMetadata, 
                initialVariant || undefined, 
                mechanicsValues,
                prunedRules, // Use the optimized rules object
                metadataPayload
            );
            
            notifications.dismiss(loadingToast);
            notifications.success("Variant saved!");
            if (onSaveSuccess) onSaveSuccess();

        } catch (error) {
            console.error(error);
            notifications.dismiss(loadingToast);
            notifications.error("Failed to save variant.");
        }
    };

    const previewVariant: CustomMicrogame = useMemo(() => {
        const mergedSkinData: any = {}; 
        const mergedMechanics: any = { ...mechanicsValues };

        const applyData = (targetKey: string, sourceKey: string, element: any) => {
            // Respect empty string (explicit removal) by checking undefined
            const previewUrl = skinPreviews[sourceKey];
            const initialUrl = initialVariant?.skinData[sourceKey]?.url;
            const url = previewUrl !== undefined ? previewUrl : initialUrl;
            
            const color = skinColors[sourceKey];

            if (element.type === 'audio') {
                mergedSkinData[targetKey] = { 
                    url: url || "",
                    fileName: 'preview',
                    volume: audioVolumes[sourceKey] ?? 1.0,
                    // Ensure we read the current trigger state, defaulting to [] if undefined/cleared
                    triggerEvents: audioTriggers[sourceKey] || []
                };

                // Include Layers in Preview
                const layers = audioLayers[sourceKey] || [];
                layers.forEach(layerId => {
                    const layerUrl = skinPreviews[layerId] || initialVariant?.skinData[layerId]?.url;
                    mergedSkinData[layerId] = {
                        url: layerUrl || "",
                        fileName: 'preview',
                        volume: audioVolumes[layerId] ?? 1.0,
                        triggerEvents: audioTriggers[layerId] || []
                    };
                });
            }
            else if (url || color) {
                const baseInfo = baseDimensions[sourceKey];
                const aspect = baseInfo ? baseInfo.aspect : 1;
                let currentWidth = 10;
                
                const sizeMechKey = element.associatedMechanics?.find((m: string) => m.toLowerCase().includes('size') || m.toLowerCase().includes('width')) || element.associatedMechanics?.[0];
                if (sizeMechKey) {
                    const specificKey = `${sourceKey}_${sizeMechKey}`;
                    currentWidth = mechanicsValues[specificKey] ?? mechanicsValues[sizeMechKey] ?? 10;
                }
                const calculatedHeight = (currentWidth / aspect) * (16/9);

                mergedSkinData[targetKey] = { 
                    url: url, fileName: 'preview',
                    width: currentWidth, height: calculatedHeight,
                    hitboxScale: hitboxScales[sourceKey] || 1,
                    color: color, name: itemNames[sourceKey]
                };
            }

            const allKeysToCopy = [...(element.overridables || []), ...(element.associatedMechanics || [])];
            allKeysToCopy.forEach((mechKey: string) => {
                const leaderSpecificKey = `${sourceKey}_${mechKey}`;
                const targetSpecificKey = `${targetKey}_${mechKey}`;
                if (mechanicsValues[leaderSpecificKey] !== undefined) {
                    mergedMechanics[targetSpecificKey] = mechanicsValues[leaderSpecificKey];
                }
            });
        };

        skinnableElements.forEach(element => {
            let quantity = 1;
            if (element.quantityDrivenBy) {
                const val = mechanicsValues[element.quantityDrivenBy];
                const defaultVal = gameDefinition?.mechanics?.[element.quantityDrivenBy]?.defaultValue;
                quantity = typeof val === 'number' ? val : (defaultVal as number || 1);
            }

            if (quantity === 1) {
                applyData(element.id, element.id, element);
            } else {
                let currentIndex = 0;
                while (currentIndex < quantity) {
                    const leaderKey = `${element.id}_${currentIndex}`;
                    const count = slotGroupCounts[leaderKey] || 1;
                    for (let i = 0; i < count; i++) {
                        const targetIndex = currentIndex + i;
                        if (targetIndex >= quantity) break;
                        const targetKey = `${element.id}_${targetIndex}`;
                        applyData(targetKey, leaderKey, element);
                    }
                    currentIndex += count;
                }
            }
        });

        return {
            id: 'preview',
            baseMicrogameId: baseGame.id,
            baseMicrogameName: baseGame.name,
            createdAt: new Date().toISOString(),
            skinData: mergedSkinData,
            mechanics: mergedMechanics,
            rules: rulesValues
        };
    }, [baseGame, skinPreviews, hitboxScales, mechanicsValues, slotGroupCounts, skinnableElements, initialVariant, skinColors, rulesValues, audioVolumes, audioTriggers, itemNames, baseDimensions, audioLayers]);

    // --- REFACTORED: Dynamic Event Expansion ---
    const expandedEvents = useMemo(() => {
        if (!gameDefinition?.events) return [];
        const result: { id: string, label: string }[] = [];

        Object.entries(gameDefinition.events).forEach(([eventId, def]) => {
            // Use SCHEMA RELATIONSHIPS instead of hardcoded strings
            const relatedAssets = (def as any).relatedAssets;
            const tiedAssetId = relatedAssets && relatedAssets.length > 0 ? relatedAssets[0] : null;
            
            if (tiedAssetId) {
                const element = skinnableElements.find(el => el.id === tiedAssetId);
                let quantity = 1;
                if (element && element.quantityDrivenBy) {
                    const val = mechanicsValues[element.quantityDrivenBy];
                    const defaultVal = gameDefinition.mechanics[element.quantityDrivenBy].defaultValue;
                    quantity = typeof val === 'number' ? val : (defaultVal as number || 1);
                }

                // Generic Label Cleaning: Remove common suffixes dynamically if desired, 
                // or just append the number. Here we just use the event label.
                const baseLabelName = def.label; 
                
                if (quantity > 1) {
                    for (let i = 0; i < quantity; i++) {
                        const specificId = `${tiedAssetId}_${i}`;
                        const customName = itemNames[specificId];
                        // If user named the item "Red Ball", event becomes "Red Ball Catch" (assuming label was "Catch")
                        // Or just "Red Ball (Good Item Catch)"
                        const label = customName ? `${customName} (${baseLabelName})` : `${baseLabelName} ${i + 1}`;
                        result.push({ id: `${eventId}:${i}`, label });
                    }
                    return; 
                } else {
                    const customName = itemNames[tiedAssetId];
                    if (customName) {
                        result.push({ id: eventId, label: `${customName} (${baseLabelName})` });
                        return;
                    }
                }
            }
            result.push({ id: eventId, label: def.label });
        });
        return result;
    }, [gameDefinition, mechanicsValues, itemNames, skinnableElements]);

    // --- REFACTORED: Dynamic Ramp Targets ---
    const expandedItems = useMemo(() => {
        const items: { id: string, label: string, followers?: string[] }[] = [];
        
        // 1. DYNAMIC: Add Interval Events (e.g. "Survival") automatically
        if (gameDefinition?.events) {
            Object.entries(gameDefinition.events).forEach(([evtId, def]) => {
                if (def.type === 'interval') {
                    items.push({ id: evtId, label: def.label });
                }
            });
        }

        // 2. Add Skinnable Assets
        skinnableElements.forEach(element => {
            if (element.type === 'audio' || element.id === 'background') return;

            let quantity = 1;
            if (element.quantityDrivenBy) {
                const val = mechanicsValues[element.quantityDrivenBy];
                const defaultVal = gameDefinition?.mechanics?.[element.quantityDrivenBy]?.defaultValue;
                quantity = typeof val === 'number' ? val : (defaultVal as number || 1);
            }

            if (quantity === 1) {
                const name = itemNames[element.id] || element.name;
                items.push({ id: element.id, label: name });
            } else {
                let i = 0;
                while (i < quantity) {
                    const subId = `${element.id}_${i}`;
                    const groupCount = slotGroupCounts[subId] || 1;
                    
                    const followers: string[] = [];
                    for (let f = 1; f < groupCount; f++) {
                        if (i + f < quantity) {
                            followers.push(`${element.id}_${i + f}`);
                        }
                    }

                    const baseName = itemNames[subId] || `${element.name} ${i + 1}`;
                    const label = groupCount > 1 ? `${baseName} (${groupCount})` : baseName;
                    
                    items.push({ id: subId, label, followers });
                    i += groupCount;
                }
            }
        });
        return items;
    }, [skinnableElements, mechanicsValues, itemNames, gameDefinition, slotGroupCounts]);

    return {
        // State
        skinFiles, skinPreviews, audioVolumes, playingAudioId, audioTriggers,
        itemNames, hitboxScales, mechanicsValues, setMechanicsValues,
        rulesValues, setRulesValues, slotGroupCounts, setSlotGroupCounts,
        skinColors, isInteracting, activeHitboxId, previewKey,
        configMode, setConfigMode, activeStrategy,
        // Computed
        audioLayers,
        skinnableElements, previewVariant, expandedEvents, expandedItems, gameDefinition,
        // Setters
        setSkinPreviews, setSkinFiles, setAudioVolumes, setAudioTriggers,
        setItemNames, setHitboxScales,
        // Handlers
        handleSliderStart, handleSliderEnd, handleFileChange, handleRemoveFile,
        getSliderProps,
        handleColorChange, handleToggleAudio, handleVolumeChange,
        handleQuantityChange, handleToggleGroupAll, handleDistributeChance,
        applyPreset, handleSave,
        // Audio Layer Handlers
        handleAddAudioLayer, handleRemoveAudioLayer
    };
};