/* src/components/builders/macrogame/MacrogameFormFields.tsx */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { notifications } from '../../../utils/notifications';
import { styles } from '../../../App.styles';
import { Macrogame, Microgame, CustomMicrogame, ScreenConfig, MacrogameFlowItem } from '../../../types';
import { adaptMicrogame, generateUUID, createSingleGamePreviewConfig, launchPreview, calculateAlignmentScore } from '../../../utils/helpers';
import { MACROGAME_MUSIC_LIBRARY, TEMPO_OPTIONS } from '../../../constants';
import { SECTORS, SECTOR_CATEGORIES, CATEGORY_SUBCATEGORIES, SEASONALITY_OPTIONS, TARGET_AUDIENCE_OPTIONS, PROMOTION_COMPATIBILITY_OPTIONS } from '../../../constants/taxonomy';
import { FilterBar, FilterConfig } from '../../ui/FilterBar';
import { useData } from '../../../hooks/useData';
import { MicrogameCard } from '../../ui/MicrogameCard';
import { MICROGAME_DEFINITIONS } from '../../../microgames/definitions/index';
import { FlowCard } from '../../ui/FlowCard';
import { ConversionScreenSelectModal } from '../../modals/ConversionScreenSelectModal';
import { ScreenCanvasBuilder } from './ScreenCanvasBuilder';
import { PreGameSettings } from './PreGameSettings';
import { ResultScreenSettings } from './ResultScreenSettings';
import { EconomyBalancer } from './EconomyBalancer';
import { FlowRuleOverrides } from './FlowRuleOverrides';
import { AudioJourneyEditor } from './AudioJourneyEditor';
import { MacrogameTaxonomy } from './MacrogameTaxonomy';
import { StaticMacrogamePreview } from '../../previews/StaticMacrogamePreview';
import { PreGameConfig, ResultConfig } from '../../../types';
import { storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const FONT_OPTIONS = [
    { label: 'System Default (San Francisco / Segoe UI)', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { label: 'Serif (Times New Roman / Georgia)', value: "Georgia, 'Times New Roman', Times, serif" },
    { label: 'Monospace (Courier New)', value: "'Courier New', Courier, monospace" },
    { label: 'Modern Sans (Verdana / Geneva)', value: "Verdana, Geneva, Tahoma, sans-serif" },
    { label: 'Classic Sans (Arial / Helvetica)', value: "Arial, Helvetica, sans-serif" }
];

// Define the shape of an item in the local component flow state
type FormFlowItem = {
    baseGame: Microgame;
    customVariant?: CustomMicrogame;
    pointRules: { [eventId: string]: number };
};

interface MacrogameFormFieldsProps {
    initialData: Omit<Macrogame, 'id' | 'type'> & { id: string | null };
    onSave: (macrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null }) => void;
    onLaunchWizard: (data: object) => void;
    flowFromWizard: Microgame[] | null;
    onClearWizardFlow: () => void;
}

export const MacrogameFormFields: React.FC<MacrogameFormFieldsProps> = ({ initialData, onSave, onLaunchWizard, flowFromWizard, onClearWizardFlow }) => {
    const { allMicrogames, customMicrogames, allConversionScreens, allConversionMethods } = useData();
    
    // --- State Declarations ---
    const [gameName, setGameName] = useState(initialData.name);

    // --- Taxonomy State ---
    // Load new arrays, falling back to legacy strings to prevent breaking existing data
    const [sectors, setSectors] = useState<string[]>(initialData.sectors || []);
    const [categories, setCategories] = useState<string[]>(
        initialData.categories || (initialData.category && initialData.category !== 'All' ? [initialData.category] : [])
    );
    const [subcategories, setSubcategories] = useState<string[]>(
        initialData.subcategories || (initialData.subcategory ? [initialData.subcategory] : [])
    );
    const [seasonality, setSeasonality] = useState<string[]>(initialData.seasonality || []);
    const [targetAudience, setTargetAudience] = useState<string[]>(initialData.targetAudience || []);
    const [promotionCompatibility, setPromotionCompatibility] = useState<string[]>(initialData.promotionCompatibility || []);

    const [globalStyling, setGlobalStyling] = useState(initialData.globalStyling);
    const [resultConfig, setResultConfig] = useState<ResultConfig>(initialData.config.resultConfig as ResultConfig);
    const [conversionScreenConfig, setConversionScreenConfig] = useState(initialData.config.conversionScreenConfig);
    
    const [filters, setFilters] = useState({
        searchTerm: '', typeFilter: 'All', tempoFilter: 'All',
        variantTypeFilter: 'All', variantTempoFilter: 'All',
        categoryFilter: 'All', subcategoryFilter: 'All', seasonalityFilter: 'All', audienceFilter: 'All', promoFilter: 'All', descriptionFilter: 'All',
        skinnedFilter: [] as string[], audioFilter: [] as string[], progressionFilter: [] as string[], winLossFilter: [] as string[], baseGameFilter: [] as string[]
    });
    
    const [flow, setFlow] = useState<FormFlowItem[]>([]);
    
    const [conversionScreenId, setConversionScreenId] = useState(initialData.conversionScreenId);
    const [isConversionScreenModalOpen, setIsConversionScreenModalOpen] = useState(false);
    const [introScreen, setIntroScreen] = useState<ScreenConfig>(initialData.introScreen);
    const [promoScreen, setPromoScreen] = useState<ScreenConfig>(initialData.promoScreen);
    const [screenFlowType, setScreenFlowType] = useState<'Separate' | 'Combined' | 'Skip' | 'Overlay'>(initialData.config?.screenFlowType || 'Separate');
    const [preGameConfig, setPreGameConfig] = useState<PreGameConfig>(initialData.config.preGameConfig as PreGameConfig);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [activeScreenEditorIndex, setActiveScreenEditorIndex] = useState(0);
    const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
    const [isSelectionExpanded, setIsSelectionExpanded] = useState(!initialData.id);
    const [isIntroPromoExpanded, setIsIntroPromoExpanded] = useState(true);
    const [isPreGameResultExpanded, setIsPreGameResultExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'base' | 'custom' | 'favorites'>('base');
    const flowSectionRef = useRef<HTMLHeadingElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [introImageFile, setIntroImageFile] = useState<File | null>(null);
    const [introSpotlightImageFile, setIntroSpotlightImageFile] = useState<File | null>(null);
    const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
    const [promoSpotlightImageFile, setPromoSpotlightImageFile] = useState<File | null>(null);
    const [customFontFile, setCustomFontFile] = useState<File | null>(null);
    const [fontInputKey, setFontInputKey] = useState(0);
    const [audioConfig, setAudioConfig] = useState(initialData.audioConfig);

    const [hasHardConflict, setHasHardConflict] = useState(false);

    const [showPoints, setShowPoints] = useState(initialData.config?.showPoints ?? false);
    
    // --- Local State for Point Display Settings ---
    const [pointDisplayMode, setPointDisplayMode] = useState<'none' | 'simple' | 'detailed'>(initialData.config.pointDisplayMode || 'none');
    const [showLineItemDetails, setShowLineItemDetails] = useState<boolean>(initialData.config.showLineItemDetails ?? false);
    const [enableTallyAnimation, setEnableTallyAnimation] = useState<boolean>(initialData.config.enableTallyAnimation ?? false);

    const [showProgress, setShowProgress] = useState(initialData.config.showProgress ?? false);
    const [progressFormat, setProgressFormat] = useState<'text' | 'visual'>((initialData.config as any).progressFormat || 'visual');
    const [progressShowLabels, setProgressShowLabels] = useState<boolean>((initialData.config as any).progressShowLabels ?? false);
    const [progressStyle, setProgressStyle] = useState<any>(initialData.config.progressStyle || {});
    const [lightProgressStyle, setLightProgressStyle] = useState<any>(initialData.config.lightProgressStyle || {});

    // --- State for the "Reward Store" ---
    const [pointCosts, setPointCosts] = useState(initialData.pointCosts);

    // --- SMART JUMP STATE ---
    const [previewFocusTarget, setPreviewFocusTarget] = useState<{ view: string, index?: number, timestamp?: number }>(() => {
        if (initialData.introScreen?.enabled) return { view: 'intro', timestamp: Date.now() };
        if (initialData.flow?.length > 0) return { view: 'game', index: 0, timestamp: Date.now() };
        if (initialData.promoScreen?.enabled) return { view: 'promo', timestamp: Date.now() };
        return { view: 'end', timestamp: Date.now() };
    });

    // Helper to determine where to jump when clicking a Microgame Flow card
    const getTargetViewForGame = (flowType: string) => {
        if (flowType === 'Separate') return 'title';
        if (flowType === 'Combined') return 'combined';
        return 'game'; // 'Overlay' or 'Skip'
    };

    // Helper to intelligently refocus the preview IMMEDIATELY when an item is removed
    const refocusAfterRemoval = (
        removedType: 'intro' | 'promo' | 'game', 
        futureFlowLength: number, 
        futureIntroEnabled: boolean, 
        futurePromoEnabled: boolean,
        removedIndex?: number
    ) => {
        if (removedType === 'intro') {
            if (futureFlowLength > 0) setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: 0, timestamp: Date.now() });
            else if (futurePromoEnabled) setPreviewFocusTarget({ view: 'promo', timestamp: Date.now() });
            else setPreviewFocusTarget({ view: 'end', timestamp: Date.now() });
        } 
        else if (removedType === 'promo') {
            setPreviewFocusTarget({ view: 'end', timestamp: Date.now() });
        } 
        else if (removedType === 'game' && removedIndex !== undefined) {
            if (futureFlowLength > 0) {
                // Safely focus the nearest game.
                const nextIndex = Math.min(removedIndex, futureFlowLength - 1);
                setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: nextIndex, timestamp: Date.now() });
            } 
            else if (futureIntroEnabled) setPreviewFocusTarget({ view: 'intro', timestamp: Date.now() });
            else if (futurePromoEnabled) setPreviewFocusTarget({ view: 'promo', timestamp: Date.now() });
            else setPreviewFocusTarget({ view: 'end', timestamp: Date.now() });
        }
    };

    const processAndSetImage = (file: File, setFileState: (file: File) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const processedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        setFileState(processedFile);
                    }
                }, 'image/jpeg', 0.9);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const hasInitializedFlowRef = useRef(false);

    useEffect(() => {
        if (hasInitializedFlowRef.current) return;
        if (allMicrogames.length === 0) return; // Wait for microgames to load

        const flowDetails = initialData.flow.map(flowItem => {
            const baseGame = allMicrogames.find(m => m.id === flowItem.microgameId);
            
            let pointRules: { [key: string]: number } = {};

            if (!baseGame) {
                return { 
                    baseGame: { id: flowItem.microgameId, name: 'Deleted Microgame', length: 0, controls: '', baseType: '', tempo: 'Normal', skins: {}, isActive: false, gameplayExperience: 'Generalized', compatibleConversionGoals: [], compatibleProductCategories: [], compatibleCustomerTypes: [], trackableEvents: [] }, 
                    customVariant: undefined,
                    pointRules: {}
                };
            }

            const customVariant = flowItem.variantId ? customMicrogames.find(v => v.id === flowItem.variantId) : undefined;
            
            // Safely resolve the exact game definition to get the true factory defaults
            let definition = MICROGAME_DEFINITIONS[baseGame.id];
            if (!definition) {
                const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === baseGame.id.toLowerCase());
                if (key) definition = MICROGAME_DEFINITIONS[key];
            }

            // Fallback chain: Saved Flow Config -> Custom Variant Rules -> Factory Definitions -> Empty
            const defaultWin = flowItem.winCondition || customVariant?.rules?.winCondition || definition?.defaultRules?.winCondition || {};
            const defaultLoss = flowItem.lossCondition || customVariant?.rules?.lossCondition || definition?.defaultRules?.lossCondition || {};
            
            // Hydrate per-game screen configs, falling back to the global initial data if absent
            const itemPreGame = flowItem.preGameConfig || initialData.config.preGameConfig;
            const itemResult = flowItem.resultConfig || initialData.config.resultConfig;

            if (flowItem.pointRules) {
                pointRules = flowItem.pointRules;
            } else {
                pointRules = (baseGame.trackableEvents || []).reduce((acc, event) => {
                    // Check if the custom variant has an explicit override for this event
                    if (customVariant?.rules?.scores && customVariant.rules.scores[event.eventId] !== undefined) {
                        acc[event.eventId] = customVariant.rules.scores[event.eventId];
                    } else if (event.eventId === 'win') {
                        // Legacy fallback for old flow items that just saved 'points'
                        acc[event.eventId] = (flowItem as any).points || event.defaultPoints;
                    } else {
                        // Ultimate fallback to base game definitions
                        acc[event.eventId] = event.defaultPoints;
                    }
                    return acc;
                }, {} as { [key: string]: number });
            }

            return { baseGame, customVariant, pointRules, winCondition: defaultWin, lossCondition: defaultLoss, preGameConfig: itemPreGame, resultConfig: itemResult };
        });
        setFlow(flowDetails as FormFlowItem[]);
        // --- Initialize point costs state ---
        setPointCosts(initialData.pointCosts || {});
        
        hasInitializedFlowRef.current = true; // Lock the initialization so local edits are preserved
    }, [initialData.flow, initialData.pointCosts, allMicrogames, customMicrogames]);

    // --- Safe Preview Focusing ---
    // Guarantees we only route the preview window AFTER React has securely saved the new game to the flow array.
    useEffect(() => {
        if (pendingFocusIndex !== null && flow[pendingFocusIndex]) {
            setActiveScreenEditorIndex(pendingFocusIndex);
            setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: pendingFocusIndex, timestamp: Date.now() });
            setPendingFocusIndex(null);
        }
    }, [pendingFocusIndex, flow, screenFlowType]);
    
    useEffect(() => {
        if (flowFromWizard && flowFromWizard.length > 0) {
            const newFlow = flowFromWizard.map(game => {
                const defaultRules = (game.trackableEvents || []).reduce((acc, event) => {
                    acc[event.eventId] = event.defaultPoints;
                    return acc;
                }, {} as { [key: string]: number });

                return { baseGame: game, customVariant: undefined, pointRules: defaultRules };
            });
            setFlow(newFlow);
            onClearWizardFlow();
            flowSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [flowFromWizard, onClearWizardFlow]);

    const isLocked = !!initialData.id && flow.length > 0;
    const lockTooltip = "Please remove all Microgames from the flow to change this field.";

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    const handleSaveClick = async () => {
        // --- VALIDATION BLOCK ---
        const errors: string[] = [];
        if (!gameName.trim()) { errors.push("Please provide a name for the macrogame."); }
        if (flow.length === 0) { errors.push("Please add at least one microgame to the flow."); }
        if (hasHardConflict) { errors.push("Please resolve the Business Sector conflict before saving."); }
        
        // Explicit Taxonomy Validation (Cascading Logic)
        if (sectors.length === 0) { 
            errors.push("Please select at least one Business Sector (or 'All')."); 
        } else if (!sectors.includes('All')) {
            if (categories.length === 0) { 
                errors.push("Please select at least one Product Category (or 'All')."); 
            } else if (!categories.includes('All')) {
                if (subcategories.length === 0) { 
                    errors.push("Please select at least one Subcategory (or 'All')."); 
                }
            }
        }

        if (seasonality.length === 0 || !seasonality[0]) { errors.push("Please select a Seasonality option (or 'All')."); }
        if (targetAudience.length === 0 || !targetAudience[0]) { errors.push("Please select a Target Audience option (or 'All')."); }
        if (promotionCompatibility.length === 0 || !promotionCompatibility[0]) { errors.push("Please select a Promo Compatibility option (or 'All')."); }
        
        if (promoScreen.enabled && promoScreen.spotlightImageLayout && !promoSpotlightImageFile && !promoScreen.spotlightImageUrl) {
            errors.push("A promo screen with a spotlight layout requires a spotlight image.");
        }
        if (errors.length > 0) {
            errors.forEach(error => notifications.error(error));
            return;
        }

        setIsSaving(true);
        const validFlow = flow.filter(f => f.baseGame.isActive !== false);

        // --- IMAGE UPLOAD & DATA PREPARATION ---
        let introUrl = introScreen.backgroundImageUrl;
        let introSpotlightUrl = introScreen.spotlightImageUrl;
        let promoBgUrl = promoScreen.backgroundImageUrl;
        let promoSpotlightUrl = promoScreen.spotlightImageUrl;
        let customFontUrl = globalStyling.customFontUrl;
        const macrogameId = initialData.id || generateUUID();

        try {
            if (customFontFile) {
                const filePath = `fonts/${macrogameId}/${customFontFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, customFontFile);
                customFontUrl = await getDownloadURL(storageRef);
            }
            if (introImageFile) {
                const filePath = `screen-backgrounds/${macrogameId}/intro-bg-${introImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, introImageFile);
                introUrl = await getDownloadURL(storageRef);
            }
            if (introSpotlightImageFile) {
                const filePath = `promo-spotlights/${macrogameId}/intro-spot-${introSpotlightImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, introSpotlightImageFile);
                introSpotlightUrl = await getDownloadURL(storageRef);
            }
            if (promoImageFile) {
                const filePath = `screen-backgrounds/${macrogameId}/promo-bg-${promoImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, promoImageFile);
                promoBgUrl = await getDownloadURL(storageRef);
            }
            if (promoSpotlightImageFile) {
                const filePath = `promo-spotlights/${macrogameId}/${promoSpotlightImageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, promoSpotlightImageFile);
                promoSpotlightUrl = await getDownloadURL(storageRef);
            }
        } catch (error) {
            console.error("Error uploading images:", error);
            notifications.error("An error occurred while uploading images. Please try again.");
            setIsSaving(false);
            return;
        }

        // --- 1. PRUNE GLOBAL STYLING ---
        const prunedStyling = { ...globalStyling };
        if (prunedStyling.fontType === 'standard') {
            delete prunedStyling.googleFontUrl;
            delete prunedStyling.customFontUrl;
        } else if (prunedStyling.fontType === 'google') {
            delete prunedStyling.customFontUrl;
        } else if (prunedStyling.fontType === 'custom') {
            delete prunedStyling.googleFontUrl;
        }

        // --- 2. PRUNE CONFIG & ECONOMY ---
        const prunedPointCosts = Object.fromEntries(
            Object.entries(pointCosts).filter(([_, val]) => val !== '')
        ) as { [key: string]: number };

        const prunedResultConfig = resultConfig.enabled 
            ? resultConfig 
            // If disabled, wipe heavy HTML strings to save bytes
            : { enabled: false, winText: '', lossText: '', tryAgainText: '', transition: { type: 'interact' as const } };

        const prunedConfig = {
            screenFlowType: screenFlowType || 'Separate',
            showPoints: !!showPoints,
            ...(showPoints ? {
                pointDisplayMode: pointDisplayMode || 'none',
                showLineItemDetails: !!showLineItemDetails,
                enableTallyAnimation: !!enableTallyAnimation
            } : {}),
            showProgress: !!showProgress,
            ...(showProgress ? {
                progressFormat: progressFormat || 'visual',
                progressShowLabels: !!progressShowLabels,
                progressStyle: progressStyle || {},
                lightProgressStyle: lightProgressStyle || {}
            } : {}),
            resultConfig: prunedResultConfig as ResultConfig,
            preGameConfig: preGameConfig || {},
            ...(conversionScreenId ? { conversionScreenConfig: conversionScreenConfig || { syncWidth: true } } : {})
        };

        // --- 3. PRUNE SCREENS ---
        const prunedIntro = introScreen.enabled 
            ? { ...introScreen, backgroundImageUrl: introUrl, spotlightImageUrl: introSpotlightUrl } 
            : { enabled: false, headline: '', bodyText: '', transition: { type: 'interact' as const } };
            
        const prunedPromo = promoScreen.enabled 
            ? { ...promoScreen, backgroundImageUrl: promoBgUrl, spotlightImageUrl: promoSpotlightUrl } 
            : { enabled: false, headline: '', bodyText: '', transition: { type: 'interact' as const } };

        // --- 4. PRUNE AUDIO CONFIG ---
        // Deep clean undefined/null tracks to prevent bloated empty objects
        const cleanAudioObj = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;
            const cleaned = Object.fromEntries(
                Object.entries(obj)
                    .map(([k, v]) => [k, cleanAudioObj(v)])
                    .filter(([_, v]) => v !== undefined && v !== null && (typeof v !== 'object' || Object.keys(v).length > 0))
            );
            return Object.keys(cleaned).length > 0 ? cleaned : undefined;
        };
        const prunedAudioConfig = cleanAudioObj(audioConfig) || {};

        // --- 5. CONSTRUCT FINAL PAYLOAD ---
        const macrogameData: Omit<Macrogame, 'id' | 'type'> & { id: string | null } = {
            id: initialData.id,
            name: gameName,
            conversionGoal: '',
            gameplayExperience: 'Generalized',
            sectors: sectors,
            categories: categories,
            subcategories: subcategories,
            seasonality: seasonality,
            targetAudience: targetAudience,
            promotionCompatibility: promotionCompatibility,
            createdAt: initialData.createdAt,
            config: prunedConfig as any,
            introScreen: prunedIntro as ScreenConfig,
            promoScreen: prunedPromo as ScreenConfig,
            flow: validFlow.map((flowItem, index) => {
                
                // Prune empty point rules
                const prunedPointRules = Object.fromEntries(
                    Object.entries(flowItem.pointRules).filter(([_, val]) => val !== '')
                ) as { [key: string]: number };

                // Prune disabled result screens at the item level
                const itemResult = flowItem.resultConfig;
                const prunedItemResult = itemResult ? (itemResult.enabled ? itemResult : { enabled: false, winText: '', lossText: '', tryAgainText: '', transition: { type: 'interact' as const } }) : undefined;

                return {
                    microgameId: flowItem.baseGame.id,
                    variantId: flowItem.customVariant ? flowItem.customVariant.id : null,
                    order: index + 1,
                    pointRules: prunedPointRules,
                    winCondition: flowItem.winCondition,
                    lossCondition: flowItem.lossCondition,
                    preGameConfig: flowItem.preGameConfig,
                    resultConfig: prunedItemResult as any
                };
            }),
            conversionScreenId: conversionScreenId,
            audioConfig: prunedAudioConfig,
            pointCosts: prunedPointCosts,
            globalStyling: prunedStyling,
        };

        await onSave(macrogameData);
        setIsSaving(false);
    };

    const handleAddToFlow = (baseGame: Microgame, customVariant?: CustomMicrogame) => {
        const defaultRules = (baseGame.trackableEvents || []).reduce((acc, event) => {
            // Intelligent inheritance: Custom Variant Rules -> Base Game Defaults
            if (customVariant?.rules?.scores && customVariant.rules.scores[event.eventId] !== undefined) {
                acc[event.eventId] = customVariant.rules.scores[event.eventId];
            } else {
                acc[event.eventId] = event.defaultPoints;
            }
            return acc;
        }, {} as { [key: string]: number });
        
        // Safely resolve the exact game definition to get the true factory defaults
        let definition = MICROGAME_DEFINITIONS[baseGame.id];
        if (!definition) {
            const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === baseGame.id.toLowerCase());
            if (key) definition = MICROGAME_DEFINITIONS[key];
        }

        // Intelligent inheritance: Custom Variant Rules -> Factory Definitions -> Empty
        const defaultWin = customVariant?.rules?.winCondition || definition?.defaultRules?.winCondition || {};
        const defaultLoss = customVariant?.rules?.lossCondition || definition?.defaultRules?.lossCondition || {};
        
        // Seed new games with the current form's global default screens
        const defaultPreGame = preGameConfig;
        const defaultResult = resultConfig;
        
        setFlow(prevFlow => {
            const newFlow = [...prevFlow, { baseGame, customVariant, pointRules: defaultRules, winCondition: defaultWin, lossCondition: defaultLoss, preGameConfig: defaultPreGame, resultConfig: defaultResult }];
            // Trigger the safe-focus hook with the guaranteed correct index
            setPendingFocusIndex(newFlow.length - 1);
            return newFlow;
        });
    };
    
    const handleMoveInFlow = (index: number, direction: 'up' | 'down') => { 
        const newFlow = [...flow]; 
        const [item] = newFlow.splice(index, 1); 
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        newFlow.splice(newIndex, 0, item); 
        setFlow(newFlow); 
        
        // Intelligently follow the moved card (or the card it swapped with)
        setPreviewFocusTarget(prev => {
            if (['game', 'title', 'controls', 'combined', 'result'].includes(prev.view)) {
                if (prev.index === index) return { ...prev, index: newIndex, timestamp: Date.now() };
                if (prev.index === newIndex) return { ...prev, index: index, timestamp: Date.now() };
            }
            return prev;
        });
    };

    const handleDuplicateInFlow = (index: number) => { 
        const newFlow = [...flow]; 
        newFlow.splice(index + 1, 0, newFlow[index]); 
        setFlow(newFlow); 
        
        // Auto-focus the newly duplicated card
        setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: index + 1, timestamp: Date.now() });
    };

    const handleRemoveFromFlow = (indexToRemove: number) => {
        setFlow(prevFlow => prevFlow.filter((_, i) => i !== indexToRemove));
        // Force the preview to immediately adapt to the new flow structure
        refocusAfterRemoval('game', flow.length - 1, introScreen.enabled, promoScreen.enabled, indexToRemove);
    };
    
    const handlePointRuleChange = (flowIndex: number, eventId: string, value: string) => {
        let finalPoints: number | '' = ''; // Allow empty string
        const newPoints = parseInt(value, 10);

        if (value === '') {
            finalPoints = ''; // Store empty string
        } else if (!isNaN(newPoints)) { // Allow negative/positive numbers
            finalPoints = newPoints;
        } else {
            return; // Invalid (e.g., "abc")
        }

        const newFlow = [...flow];
        if (newFlow[flowIndex]) {
            newFlow[flowIndex].pointRules[eventId] = finalPoints;
            setFlow(newFlow);
        }
    };

    const handleConditionUpdate = (flowIndex: number, conditionType: 'winCondition' | 'lossCondition', newConditionObj: any) => {
        const newFlow = [...flow];
        if (newFlow[flowIndex]) {
            newFlow[flowIndex][conditionType] = newConditionObj;
            setFlow(newFlow);
        }
    };

    // --- Handler for reward cost changes ---
    const handlePointCostChange = (instanceId: string, value: string) => {
        let finalCost: number | '' = '';
        const newCost = parseInt(value, 10);

        if (value === '') {
            finalCost = '';
        } else if (!isNaN(newCost) && newCost >= 0) { // Costs can't be negative
            finalCost = newCost;
        } else {
            return; // Invalid
        }

        setPointCosts(prev => ({
            ...prev,
            [instanceId]: finalCost
        }));
    };

    const handleRemoveImage = (type: 'intro' | 'promoBg' | 'promoSpotlight') => {
        if (type === 'intro') { setIntroImageFile(null); setIntroScreen(p => ({ ...p, backgroundImageUrl: null })); }
        else if (type === 'introSpotlight') { setIntroSpotlightImageFile(null); setIntroScreen(p => ({ ...p, spotlightImageUrl: null })); }
        else if (type === 'promoBg') { setPromoImageFile(null); setPromoScreen(p => ({ ...p, backgroundImageUrl: null })); } 
        else if (type === 'promoSpotlight') { setPromoSpotlightImageFile(null); setPromoScreen(p => ({ ...p, spotlightImageUrl: null })); }
    };

    // --- LIVE PREVIEW HYDRATION ---
    const previewMacrogame = useMemo(() => {
        return {
            id: initialData.id || 'preview-id',
            name: gameName || 'Draft Macrogame',
            conversionGoal: '',
            gameplayExperience: 'Generalized',
            category: '',
            subcategory: '',
            createdAt: initialData.createdAt || new Date().toISOString(),
            config: {
                // legacy backgroundMusicUrl removed
                screenFlowType: screenFlowType,
                showPoints: showPoints,
                pointDisplayMode: pointDisplayMode,
                showLineItemDetails: showLineItemDetails,
                enableTallyAnimation: enableTallyAnimation,
                showProgress: showProgress,
                progressFormat: progressFormat,
                progressShowLabels: progressShowLabels,
                progressStyle: progressStyle,
                lightProgressStyle: lightProgressStyle,
                resultConfig: resultConfig,
                preGameConfig: preGameConfig,
                conversionScreenConfig: conversionScreenConfig,
            },
            introScreen: {
                ...introScreen,
                backgroundImageUrl: introImageFile ? URL.createObjectURL(introImageFile) : introScreen.backgroundImageUrl,
                spotlightImageUrl: introSpotlightImageFile ? URL.createObjectURL(introSpotlightImageFile) : introScreen.spotlightImageUrl,
            },
            promoScreen: {
                ...promoScreen,
                backgroundImageUrl: promoImageFile ? URL.createObjectURL(promoImageFile) : promoScreen.backgroundImageUrl,
                spotlightImageUrl: promoSpotlightImageFile ? URL.createObjectURL(promoSpotlightImageFile) : promoScreen.spotlightImageUrl,
            },
            flow: flow.filter(f => f.baseGame.isActive !== false).map((flowItem, index) => ({
                microgameId: flowItem.baseGame.id,
                variantId: flowItem.customVariant ? flowItem.customVariant.id : null,
                order: index + 1,
                pointRules: flowItem.pointRules,
                winCondition: flowItem.winCondition,
                lossCondition: flowItem.lossCondition,
            preGameConfig: flowItem.preGameConfig,
            resultConfig: flowItem.resultConfig
        })),
        conversionScreenId: conversionScreenId,
        audioConfig: audioConfig,
        pointCosts: pointCosts,
        globalStyling: globalStyling,
    } as Macrogame;
}, [initialData.id, initialData.createdAt, gameName, screenFlowType, showPoints, introScreen, introImageFile, introSpotlightImageFile, promoScreen, promoImageFile, promoSpotlightImageFile, customFontFile, flow, conversionScreenId, audioConfig, pointCosts, globalStyling, resultConfig, preGameConfig, conversionScreenConfig, showProgress, progressFormat, progressShowLabels, progressStyle, lightProgressStyle, pointDisplayMode, showLineItemDetails, enableTallyAnimation]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            if (key === 'categoryFilter') {
                newFilters.subcategoryFilter = 'All';
            }
            return newFilters;
        });
    };

    const handleResetFilters = () => {
        setFilters({ 
            searchTerm: '', typeFilter: 'All', tempoFilter: 'All',
            variantTypeFilter: 'All', variantTempoFilter: 'All',
            categoryFilter: 'All', subcategoryFilter: 'All', seasonalityFilter: 'All', audienceFilter: 'All', promoFilter: 'All', descriptionFilter: 'All',
            skinnedFilter: [], audioFilter: [], progressionFilter: [], winLossFilter: [], baseGameFilter: []
        });
    };

    const gameMatchesFilters = (game: Microgame) => {
        if (game.isActive === false) return false;
        if (filters.tempoFilter !== 'All' && game.tempo !== filters.tempoFilter) return false;
        if (filters.typeFilter !== 'All') {
            let type = '';
            if (filters.typeFilter === 'Chance-Based') type = 'chance';
            else if (filters.typeFilter === 'Knowledge-Based') type = 'knowledge';
            else if (filters.typeFilter === 'Skill-Based') type = 'skill';
            if (game.mechanicType !== type) return false;
        }
        if (filters.searchTerm && !game.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
        return true;
    };

    const variantMatchesFilters = (variant: CustomMicrogame, baseGame: Microgame) => {
        if (baseGame.isActive === false) return false;
        if (filters.variantTempoFilter !== 'All' && baseGame.tempo !== filters.variantTempoFilter) return false;
        if (filters.variantTypeFilter !== 'All') {
            let type = '';
            if (filters.variantTypeFilter === 'Chance-Based') type = 'chance';
            else if (filters.variantTypeFilter === 'Knowledge-Based') type = 'knowledge';
            else if (filters.variantTypeFilter === 'Skill-Based') type = 'skill';
            if (baseGame.mechanicType !== type) return false;
        }
        if (filters.categoryFilter !== 'All') {
            if (filters.categoryFilter === 'None' && variant.productCategory) return false;
            if (filters.categoryFilter !== 'None' && variant.productCategory !== filters.categoryFilter) return false;
        }
        if (filters.subcategoryFilter !== 'All') {
            if (filters.subcategoryFilter === 'None' && variant.productSubcategory) return false;
            if (filters.subcategoryFilter !== 'None' && variant.productSubcategory !== filters.subcategoryFilter) return false;
        }
        if (filters.seasonalityFilter !== 'All') {
            const hasSeason = variant.seasonality && variant.seasonality.length > 0;
            if (filters.seasonalityFilter === 'None' && hasSeason) return false;
            if (filters.seasonalityFilter !== 'None' && !(variant.seasonality || []).includes(filters.seasonalityFilter)) return false;
        }
        if (filters.audienceFilter !== 'All') {
            const hasAudience = variant.targetAudience && variant.targetAudience.length > 0;
            if (filters.audienceFilter === 'None' && hasAudience) return false;
            if (filters.audienceFilter !== 'None' && !(variant.targetAudience || []).includes(filters.audienceFilter)) return false;
        }
        if (filters.promoFilter !== 'All') {
            const hasPromo = variant.promotionCompatibility && variant.promotionCompatibility.length > 0;
            if (filters.promoFilter === 'None' && hasPromo) return false;
            if (filters.promoFilter !== 'None' && !(variant.promotionCompatibility || []).includes(filters.promoFilter)) return false;
        }
        if (filters.descriptionFilter !== 'All') {
            const hasDesc = !!variant.description && variant.description.trim().length > 0;
            if (filters.descriptionFilter === 'Yes' && !hasDesc) return false;
            if (filters.descriptionFilter === 'No' && hasDesc) return false;
        }
        if (filters.baseGameFilter.length > 0 && !filters.baseGameFilter.includes(baseGame.id)) return false;
        if (filters.searchTerm && !variant.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
        return true;
    };

    // --- Standalone Preview Handler for Cards ---
    const handlePreviewStandalone = (baseGame: Microgame, customVariant?: CustomMicrogame) => {
        const previewConfig = createSingleGamePreviewConfig(baseGame, customVariant);
        launchPreview(previewConfig);
    };

    const currentMacroTags = useMemo(() => ({ sectors, categories, subcategories, seasonality, targetAudience, promotionCompatibility }), [sectors, categories, subcategories, seasonality, targetAudience, promotionCompatibility]);

    const alignedBaseGames = useMemo(() => {
        return allMicrogames
            .filter(gameMatchesFilters)
            .map(game => {
                const microTags = {
                    categories: game.compatibleProductCategories || [],
                    seasonality: game.seasonality || [],
                    targetAudience: game.compatibleCustomerTypes || [],
                    promotionCompatibility: game.promotionCompatibility || []
                };
                return { game, alignment: calculateAlignmentScore(currentMacroTags, microTags) };
            })
            .sort((a, b) => b.alignment.score - a.alignment.score);
    }, [allMicrogames, filters, currentMacroTags]);

    const favoriteBaseGames = useMemo(() => alignedBaseGames.filter(item => item.game.isFavorite), [alignedBaseGames]);
    
    const alignedCustomVariants = useMemo(() => {
        return customMicrogames
            .filter(variant => {
                const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
                if (!baseGame) return false;
                return variantMatchesFilters(variant, baseGame);
            })
            .map(variant => {
                const microTags = {
                    sectors: variant.sectors || [],
                    categories: variant.categories || [],
                    subcategories: variant.subcategories || [],
                    seasonality: variant.seasonality || [],
                    targetAudience: variant.targetAudience || [],
                    promotionCompatibility: variant.promotionCompatibility || []
                };
                return { variant, alignment: calculateAlignmentScore(currentMacroTags, microTags) };
            })
            .sort((a, b) => b.alignment.score - a.alignment.score);
    }, [customMicrogames, allMicrogames, filters, currentMacroTags]);

    // Cast to any since isFavorite is planned but not strictly typed on CustomMicrogame yet
    const favoriteCustomVariants = useMemo(() => alignedCustomVariants.filter((item: any) => item.variant.isFavorite), [alignedCustomVariants]);

    // --- Memoize point-gated rewards for the "Reward Store" ---
    const pointGatedMethods = useMemo(() => {
        if (!conversionScreenId) return [];
        const screen = allConversionScreens.find(s => s.id === conversionScreenId);
        if (!screen) return [];
        
        return screen.methods
            .filter(method => method.gate?.type === 'point_purchase' || method.gate?.type === 'point_threshold')
            .map(method => {
                const methodData = allConversionMethods.find(m => m.id === method.methodId);
                return {
                    instanceId: method.instanceId,
                    name: methodData?.name || 'Unknown Reward'
                };
            });
    }, [conversionScreenId, allConversionScreens, allConversionMethods]);

    const isPointsForced = pointGatedMethods.length > 0;

    const hasGamesWithPoints = useMemo(() => {
        return flow.some(item => {
            let definition = MICROGAME_DEFINITIONS[item.baseGame.id];
            if (!definition) {
                const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === item.baseGame.id.toLowerCase());
                if (key) definition = MICROGAME_DEFINITIONS[key];
            }
            const variantHasPoints = item.customVariant?.rules?.enablePoints;
            const baseHasPoints = definition?.defaultRules?.enablePoints ?? false;
            return variantHasPoints ?? baseHasPoints;
        });
    }, [flow]);

    const hasGamesWithoutPoints = useMemo(() => {
        return flow.some(item => {
            let definition = MICROGAME_DEFINITIONS[item.baseGame.id];
            if (!definition) {
                const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === item.baseGame.id.toLowerCase());
                if (key) definition = MICROGAME_DEFINITIONS[key];
            }
            const variantHasPoints = item.customVariant?.rules?.enablePoints;
            const baseHasPoints = definition?.defaultRules?.enablePoints ?? false;
            return !(variantHasPoints ?? baseHasPoints);
        });
    }, [flow]);

    const previousFlowLength = useRef(flow.length);

    // --- EXTENDED: Intelligence Layer Hook ---
    useEffect(() => {
        if (isPointsForced && !showPoints) {
            setShowPoints(true);
        } else if (hasGamesWithPoints && !showPoints && flow.length > previousFlowLength.current) {
            // Auto-enable if a NEW game with points was just added
            setShowPoints(true);
        }
        previousFlowLength.current = flow.length;
    }, [isPointsForced, hasGamesWithPoints, flow.length, showPoints]);

    const formTitle = initialData.id ? 'Edit Macrogame' : 'Create New Macrogame';
    const saveButtonText = isSaving ? 'Saving...' : (initialData.id ? 'Save Changes' : 'Create Macrogame');
    const promoStepNumber = flow.filter(f => f.baseGame.isActive !== false).length + 1;
    
    const baseFilterConfig: FilterConfig[] = [
        { type: 'select', label: 'Type', options: ['All', 'Chance-Based', 'Knowledge-Based', 'Skill-Based'], stateKey: 'typeFilter' },
        { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'tempoFilter' }
    ];

    const variantFilterConfig: FilterConfig[] = [
        { 
            type: 'multiselect', 
            label: 'Base Microgame', 
            options: Array.from(new Set(customMicrogames.map(v => v.baseMicrogameId)))
                .map(id => {
                    const bg = allMicrogames.find(g => g.id === id);
                    return { value: id, label: bg ? bg.name : id };
                })
                .filter(opt => opt.label !== opt.value) // Filter out orphaned variants
                .sort((a, b) => a.label.localeCompare(b.label)),
            stateKey: 'baseGameFilter' 
        },
        { type: 'select', label: 'Type', options: ['All', 'Chance-Based', 'Knowledge-Based', 'Skill-Based'], stateKey: 'variantTypeFilter' },
        { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'variantTempoFilter' },
        { type: 'select', label: 'Product Category', options: ['All', 'None', ...Object.values(SECTOR_CATEGORIES).flat()], stateKey: 'categoryFilter' }
    ];
    if (filters.categoryFilter !== 'All' && filters.categoryFilter !== 'None') {
        variantFilterConfig.push({ type: 'select', label: 'Subcategory', options: ['All', 'None', ...(CATEGORY_SUBCATEGORIES[filters.categoryFilter] || [])], stateKey: 'subcategoryFilter' });
    }
    variantFilterConfig.push(
        { type: 'select', label: 'Seasonality', options: ['All', 'None', ...SEASONALITY_OPTIONS.map(s => ({ value: s.id, label: s.label }))], stateKey: 'seasonalityFilter' },
        { type: 'select', label: 'Target Audience', options: ['All', 'None', ...TARGET_AUDIENCE_OPTIONS.map(a => ({ value: a.id, label: a.label }))], stateKey: 'audienceFilter' },
        { type: 'select', label: 'Promo Compatibility', options: ['All', 'None', ...PROMOTION_COMPATIBILITY_OPTIONS.map(p => ({ value: p.id, label: p.label }))], stateKey: 'promoFilter' },
        { type: 'select', label: 'Has Description?', options: ['All', 'Yes', 'No'], stateKey: 'descriptionFilter' }
    );

    const getPromoLayoutTip = () => {
        const layout = promoScreen.spotlightImageLayout;
        if (layout === 'left' || layout === 'right') return "💡 Tip: A vertical (portrait) image will look best.";
        if (layout === 'top' || layout === 'bottom') return "💡 Tip: A horizontal (landscape) image will look best.";
        return "";
    };

    const handleConversionScreenSelect = (id: string | null) => {
        setConversionScreenId(id);
        if (id) {
            const screen = allConversionScreens.find(s => s.id === id);
            // Default to synced, but seed the custom width slider with the screen's original saved width
            setConversionScreenConfig({
                syncWidth: true,
                customWidth: screen?.style?.width ?? 100
            });
        }
    };

    return (
        <>
            <ConversionScreenSelectModal isOpen={isConversionScreenModalOpen} onClose={() => setIsConversionScreenModalOpen(false)} currentScreenId={conversionScreenId} onSave={handleConversionScreenSelect} isEditing={!!initialData.id} />
            
            {/* Wrap EVERYTHING in the creatorSection card if not editing */}
            <div style={!initialData.id ? styles.creatorSection : {}}>
                <div style={{ display: 'flex', height: 'calc(100vh - 160px)', minHeight: '600px', gap: '2rem', overflow: 'hidden' }}>
                    {/* LEFT: SETTINGS SCROLL AREA */}
                    <div className="custom-scrollbar" style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '2rem', paddingLeft: '0.25rem', paddingBottom: '2rem' }}>
                {/* Header and Initial Fields... */}
                <div style={styles.formHeader}><h2 style={{...styles.h2, ...(initialData.id && {display: 'none'})}}>{formTitle}</h2></div>
                <div style={styles.configItem}><label>Macrogame Name</label><input type="text" value={gameName} onChange={e => setGameName(e.target.value)} style={styles.input} placeholder="e.g., Summer Skincare Challenge"/></div>
                
                {/* Microgame Selection... */}
                <div style={{...styles.managerHeader, cursor: 'pointer', marginTop: '1.5rem'}} onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}>
                    <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Add Microgame</h3>
                    <button type="button" style={styles.accordionButton}>{isSelectionExpanded ? '▲' : '▼'}</button>
                </div>
                
                {isSelectionExpanded && (
                    <div style={{ marginTop: '1rem' }}>
                        <p style={styles.descriptionText}>Add one or more Microgames to your Macrogame Flow.</p>
                        
                        <div style={styles.tabContainer}>
                            <button type="button" onClick={() => setActiveTab('base')} style={activeTab === 'base' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Base Microgames</button>
                            <button type="button" onClick={() => setActiveTab('custom')} style={activeTab === 'custom' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Custom Variants</button>
                            <button type="button" onClick={() => setActiveTab('favorites')} style={activeTab === 'favorites' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Favorites</button>
                        </div>

                        <div style={{...styles.configItem, marginTop: '1rem'}}>
                            <input
                                type="text" placeholder="Search by name..." value={filters.searchTerm}
                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)} style={styles.input}
                            />
                        </div>

                        {activeTab === 'favorites' && (
                            <>
                                {/* --- FAVORITE BASE GAMES --- */}
                                <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Base Microgames</h4>
                                <div style={{ marginBottom: '1rem' }}>
                                    <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                                </div>
                                <div style={styles.cardContainer}>
                                    {favoriteBaseGames.length > 0 ? (
                                        favoriteBaseGames.map(({ game, alignment }) => (
                                            <MicrogameCard key={`fav-base-${game.id}`} game={game} matchTier={alignment.tier as any} isExpanded={expandedCard === `fav-base-${game.id}`} onExpand={() => setExpandedCard(expandedCard === `fav-base-${game.id}` ? null : `fav-base-${game.id}`)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(game)} macrogameFlow={flow as any} />
                                        ))
                                    ) : (
                                        <p style={styles.descriptionText}>You have no favorited base microgames matching your filters.</p>
                                    )}
                                </div>

                                {/* --- FAVORITE CUSTOM VARIANTS --- */}
                                <h4 style={{...styles.h4, marginTop: '2.5rem', marginBottom: '0.5rem'}}>Custom Variants</h4>
                                <div style={{ marginBottom: '1rem' }}>
                                    <FilterBar filters={variantFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                                </div>
                                <div style={styles.cardContainer}>
                                    {favoriteCustomVariants.length > 0 ? (
                                        favoriteCustomVariants.map(({ variant, alignment }) => {
                                            const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
                                            if (!baseGame) return null;
                                            return (
                                                <MicrogameCard key={`fav-var-${variant.id}`} game={baseGame} customVariant={variant} matchTier={alignment.tier as any} isExpanded={expandedCard === `fav-var-${variant.id}`} onExpand={() => setExpandedCard(expandedCard === `fav-var-${variant.id}` ? null : `fav-var-${variant.id}`)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(baseGame, variant)} macrogameFlow={flow as any} />
                                            );
                                        })
                                    ) : (
                                        <p style={styles.descriptionText}>You have no favorited custom variants matching your filters.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'base' && (
                            <>
                                <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Available Microgames</h4>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                                </div>
                                <div style={{...styles.cardContainer, marginTop: '1rem'}}>
                                    {alignedBaseGames.length > 0 ? (
                                        alignedBaseGames.map(({ game, alignment }) => (
                                            <MicrogameCard key={game.id} game={game} matchTier={alignment.tier as any} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(game)} macrogameFlow={flow as any} />
                                        ))
                                    ) : (
                                        <p style={styles.descriptionText}>No base microgames match your filters.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'custom' && (
                            <>
                                {customMicrogames.length > 0 ? (
                                    <>
                                        <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Available Microgames</h4>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <FilterBar filters={variantFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                                        </div>
                                        <div style={{...styles.cardContainer, marginTop: '1rem'}}>
                                            {alignedCustomVariants.length > 0 ? (
                                                alignedCustomVariants.map(({ variant, alignment }) => {
                                                    const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
                                                    if (!baseGame) return null;
                                                    return (
                                                        <MicrogameCard key={variant.id} game={baseGame} customVariant={variant} matchTier={alignment.tier as any} isExpanded={expandedCard === variant.id} onExpand={() => setExpandedCard(expandedCard === variant.id ? null : variant.id)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(baseGame, variant)} macrogameFlow={flow as any} />
                                                    );
                                                })
                                            ) : (
                                                <p style={styles.descriptionText}>No custom variants match your filters.</p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p style={{...styles.descriptionText, marginTop: '1.5rem'}}>You haven't created any custom variants yet.</p>
                                )}
                            </>
                        )}
                    </div>
                )}
                
                {/* Macrogame Flow... */}
                <h3 style={styles.h3} ref={flowSectionRef}>Macrogame Flow</h3>
                <div style={styles.flowContainer}>
                    {introScreen.enabled && (
                        <>
                            <div 
                                style={{
                                    ...styles.flowCard, 
                                    ...styles.staticFlowCard, 
                                    cursor: 'pointer', 
                                    position: 'relative',
                                    borderWidth: previewFocusTarget.view === 'intro' ? '2px' : '1px',
                                    borderStyle: 'solid',
                                    borderColor: previewFocusTarget.view === 'intro' ? '#0866ff' : 'transparent',
                                    backgroundColor: previewFocusTarget.view === 'intro' ? '#f0f7ff' : '#fff',
                                    boxShadow: previewFocusTarget.view === 'intro' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
                                }} 
                                onClick={() => setPreviewFocusTarget({ view: 'intro', timestamp: Date.now() })}
                            >
                                <div style={styles.flowCardStep}>0</div>Intro
                                <button 
                                    title="Disable Intro Screen" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setIntroScreen(p => ({ ...p, enabled: false })); 
                                        refocusAfterRemoval('intro', flow.length, false, promoScreen.enabled);
                                    }} 
                                    style={{
                                        position: 'absolute', top: '-8px', right: '-8px', 
                                        background: '#e74c3c', color: 'white', border: 'none', 
                                        borderRadius: '50%', width: '22px', height: '22px', 
                                        fontSize: '12px', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={styles.flowArrow}>&rarr;</div>
                        </>
                    )}
                    {flow.map((flowItem, index) => {
                        // Broaden the match so the card stays highlighted even if the preview is showing the game's Title/Result screen
                        const isGameSelected = ['game', 'title', 'controls', 'combined', 'result'].includes(previewFocusTarget.view) && previewFocusTarget.index === index;
                        return (
                            <React.Fragment key={`${flowItem.baseGame.id}-${flowItem.customVariant?.id || 'base'}-${index}`}>
                                <div onClick={() => setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index, timestamp: Date.now() })} style={{ cursor: 'pointer' }}>
                                    <FlowCard index={index} flowItem={flowItem as any} isFirst={index === 0} isLast={index === flow.length - 1} onMove={(dir) => handleMoveInFlow(index, dir)} onDuplicate={() => handleDuplicateInFlow(index)} onRemove={() => handleRemoveFromFlow(index)} isSelected={isGameSelected} />
                                </div>
                                <div style={styles.flowArrow}>&rarr;</div>
                            </React.Fragment>
                        );
                    })}
                    {promoScreen.enabled && (
                        <>
                            <div 
                                style={{
                                    ...styles.flowCard, 
                                    ...styles.staticFlowCard, 
                                    cursor: 'pointer', 
                                    borderWidth: previewFocusTarget.view === 'promo' ? '2px' : '1px',
                                    borderStyle: 'solid',
                                    borderColor: previewFocusTarget.view === 'promo' ? '#0866ff' : 'transparent',
                                    backgroundColor: previewFocusTarget.view === 'promo' ? '#f0f7ff' : '#fff',
                                    boxShadow: previewFocusTarget.view === 'promo' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
                                }} 
                                onClick={() => setPreviewFocusTarget({ view: 'promo', timestamp: Date.now() })}
                            >
                                <div style={styles.flowCardStep}>{promoStepNumber}</div>Promo
                            </div>
                            <div style={styles.flowArrow}>&rarr;</div>
                        </>
                    )}
                    
                    <div 
                        onClick={() => setPreviewFocusTarget({ view: 'end', timestamp: Date.now() })}
                        style={{
                            ...styles.flowCard, 
                            ...styles.staticFlowCard, 
                            cursor: 'pointer', 
                            position: 'relative',
                            borderWidth: previewFocusTarget.view === 'end' ? '2px' : '1px',
                            borderStyle: 'solid',
                            borderColor: previewFocusTarget.view === 'end' ? '#0866ff' : 'transparent',
                            backgroundColor: previewFocusTarget.view === 'end' ? '#f0f7ff' : '#fff',
                            boxShadow: previewFocusTarget.view === 'end' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>Conversion Screen</div>
                            
                            {conversionScreenId ? (
                                <>
                                    <div style={{ flexShrink: 0, fontSize: '0.7rem', color: '#0866ff', backgroundColor: '#eaf5fc', padding: '4px 8px', borderRadius: '10px', maxWidth: '95%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '6px' }} title={allConversionScreens.find(s => s.id === conversionScreenId)?.name || 'Attached Screen'}>
                                        {allConversionScreens.find(s => s.id === conversionScreenId)?.name || 'Attached Screen'}
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setIsConversionScreenModalOpen(true); setPreviewFocusTarget({ view: 'end', timestamp: Date.now() }); }}
                                        style={{ width: '90%', padding: '0.25rem', fontSize: '0.75rem', backgroundColor: '#e9ecef', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}
                                    >
                                        Change Screen
                                    </button>
                                </>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setIsConversionScreenModalOpen(true); setPreviewFocusTarget({ view: 'end', timestamp: Date.now() }); }}
                                    style={{ width: '90%', padding: '0.25rem', fontSize: '0.75rem', backgroundColor: '#0866ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}
                                >
                                    + Set Screen
                                </button>
                            )}
                        </div>
                        {conversionScreenId && (
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConversionScreenId(null); }}
                                style={{
                                    position: 'absolute', top: '-8px', right: '-8px', 
                                    background: '#e74c3c', color: 'white', border: 'none', 
                                    borderRadius: '50%', width: '22px', height: '22px', 
                                    fontSize: '12px', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                                title="Remove Conversion Screen"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
                
                {/* --- GLOBAL MACROGAME STYLING --- */}
                <h3 style={{...styles.h3, marginTop: '2rem'}}>Macrogame Styling</h3>
                <div style={styles.configContainer}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={styles.configItem}>
                            <label>Global Mode</label>
                            <select 
                                value={globalStyling.theme} 
                                onChange={e => setGlobalStyling(p => ({ ...p, theme: e.target.value as 'dark' | 'light' }))} 
                                style={styles.input}
                            >
                                <option value="dark">Dark Mode (Default)</option>
                                <option value="light">Light Mode</option>
                            </select>
                        </div>
                        <div style={styles.configItem}>
                            <label>Font Source</label>
                            <select 
                                value={globalStyling.fontType || 'standard'} 
                                onChange={e => setGlobalStyling(p => ({ ...p, fontType: e.target.value as any, fontFamily: e.target.value === 'standard' ? FONT_OPTIONS[0].value : '' }))} 
                                style={styles.input}
                            >
                                <option value="standard">Standard Web Fonts</option>
                                <option value="google">Google Fonts</option>
                                <option value="custom">Upload Custom Font</option>
                            </select>
                        </div>

                        {(!globalStyling.fontType || globalStyling.fontType === 'standard') && (
                            <div style={styles.configItem}>
                                <label>Global Font Family</label>
                                <select 
                                    value={globalStyling.fontFamily} 
                                    onChange={e => setGlobalStyling(p => ({ ...p, fontFamily: e.target.value }))} 
                                    style={styles.input}
                                >
                                    {FONT_OPTIONS.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        )}

                        {globalStyling.fontType === 'google' && (
                            <>
                                <div style={styles.configItem}>
                                    <label>Google Font Embed Code (or URL)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Paste the entire <link> block from Google Fonts here..." 
                                        value={globalStyling.googleFontUrl || ''} 
                                        onChange={e => {
                                            const rawInput = e.target.value;
                                            let finalUrl = rawInput;
                                            let inferredFamily = globalStyling.fontFamily;

                                            // 1. Extract the href URL if they pasted the entire HTML block
                                            const hrefMatch = rawInput.match(/href=["'](https:\/\/fonts\.googleapis\.com[^"']+)["']/);
                                            if (hrefMatch && hrefMatch[1]) {
                                                finalUrl = hrefMatch[1];
                                            }

                                            // 2. Try to auto-detect the font family name from the URL to save them a step
                                            const familyMatch = finalUrl.match(/family=([^&:]+)/);
                                            if (familyMatch && familyMatch[1]) {
                                                // Convert "Bitcount+Prop+Double+Ink" -> "Bitcount Prop Double Ink"
                                                const parsedName = familyMatch[1].replace(/\+/g, ' ');
                                                inferredFamily = `'${parsedName}', sans-serif`;
                                            }

                                            setGlobalStyling(p => ({ 
                                                ...p, 
                                                googleFontUrl: finalUrl,
                                                fontFamily: inferredFamily
                                            }));
                                        }} 
                                        style={styles.input} 
                                    />
                                    <p style={{...styles.descriptionText, marginTop: '0.25rem', fontSize: '0.8rem'}}>Just copy and paste the block Google gives you. We will extract what we need.</p>
                                </div>
                                <div style={styles.configItem}>
                                    <label>CSS Font Family Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., 'Roboto', sans-serif" 
                                        value={globalStyling.fontFamily || ''} 
                                        onChange={e => setGlobalStyling(p => ({ ...p, fontFamily: e.target.value }))} 
                                        style={styles.input} 
                                    />
                                </div>
                            </>
                        )}

                        {globalStyling.fontType === 'custom' && (
                            <>
                                <div style={styles.configItem}>
                                    <label>Upload Font File (.ttf, .woff2, .otf)</label>
                                    {(globalStyling.customFontUrl || customFontFile) ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                                            <p style={{fontSize: '0.8rem', margin: 0}}>Current: {customFontFile ? customFontFile.name : 'Uploaded Font'}</p>
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    setCustomFontFile(null); 
                                                    // Reset back to standard system font when removing
                                                    setGlobalStyling(p => ({...p, customFontUrl: '', fontFamily: FONT_OPTIONS[0].value})); 
                                                    setFontInputKey(k => k + 1); 
                                                }} 
                                                style={{...styles.deleteButton, padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <input 
                                            key={`font-input-${fontInputKey}`} 
                                            type="file" 
                                            accept=".ttf,.otf,.woff,.woff2" 
                                            style={styles.input} 
                                            onChange={e => { 
                                                if (e.target.files?.[0]) {
                                                    const file = e.target.files[0];
                                                    setCustomFontFile(file);
                                                    
                                                    // Create the Blob URL ONCE so it doesn't regenerate on keystrokes
                                                    const blobUrl = URL.createObjectURL(file);
                                                    const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '');
                                                    
                                                    setGlobalStyling(p => ({ 
                                                        ...p, 
                                                        customFontUrl: blobUrl, // Store blob securely
                                                        fontFamily: p.fontFamily ? p.fontFamily : `'${safeName}', sans-serif` 
                                                    }));
                                                } 
                                            }} 
                                        />
                                    )}
                                </div>
                                <div style={styles.configItem}>
                                    <label>CSS Font Family Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., 'MyBrandFont', sans-serif" 
                                        value={globalStyling.fontFamily || ''} 
                                        onChange={e => setGlobalStyling(p => ({ ...p, fontFamily: e.target.value }))} 
                                        style={styles.input} 
                                    />
                                </div>
                            </>
                        )}
                        <div style={styles.configItem}>
                            <label>Global Border Radius (px)</label>
                            <input 
                                type="number" min="0" max="60"
                                value={globalStyling.borderRadius ?? ''}
                                onChange={e => setGlobalStyling(p => ({ ...p, borderRadius: handleNumberChange(e.target.value) }))}
                                onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, borderRadius: 0 })); }}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ ...styles.configItem, flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', gridColumn: conversionScreenId ? '1 / -1' : 'auto' }}>
                            <label>Global Content Width (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" min="20" max="100" step="5"
                                    value={globalStyling.width}
                                    onChange={e => setGlobalStyling(p => ({ ...p, width: Number(e.target.value) }))}
                                    style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                                />
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="number" min="20" max="100"
                                        value={globalStyling.width}
                                        onChange={e => setGlobalStyling(p => ({ ...p, width: Math.min(100, Math.max(20, Number(e.target.value))) }))}
                                        style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                </div>
                            </div>

                            {conversionScreenId && (
                                <div style={{ 
                                    marginTop: '0.5rem', 
                                    padding: '1.25rem', 
                                    backgroundColor: '#f8f9fa', 
                                    borderRadius: '0 6px 6px 0', 
                                    borderTop: '1px solid #ddd',
                                    borderRight: '1px solid #ddd',
                                    borderBottom: '1px solid #ddd',
                                    borderLeft: '4px solid #0866ff' 
                                }}>
                                    <h6 style={{ margin: '0 0 0.25rem 0', color: '#333', fontSize: '0.9rem', textTransform: 'uppercase' }}>Conversion Screen Content Width</h6>
                                    <p style={{...styles.descriptionText, marginBottom: '1.25rem', fontSize: '0.85rem'}}>
                                        Control how your attached Conversion Screen adapts to the Global Content Width set above.
                                    </p>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: conversionScreenConfig.syncWidth ? 0 : '1.5rem', fontSize: '0.85rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={conversionScreenConfig.syncWidth} 
                                            onChange={e => setConversionScreenConfig(p => ({ ...p, syncWidth: e.target.checked }))} 
                                        />
                                        <strong>Sync perfectly with Global Content Width</strong>
                                    </label>

                                    {!conversionScreenConfig.syncWidth && (
                                        <>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>Custom Conversion Screen Width (%)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input 
                                                    type="range" min="20" max="100" step="5"
                                                    value={conversionScreenConfig.customWidth}
                                                    onChange={e => setConversionScreenConfig(p => ({ ...p, customWidth: Number(e.target.value) }))}
                                                    style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                                                />
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <input 
                                                        type="number" min="20" max="100"
                                                        value={conversionScreenConfig.customWidth}
                                                        onChange={e => setConversionScreenConfig(p => ({ ...p, customWidth: Math.min(100, Math.max(20, Number(e.target.value))) }))}
                                                        style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                                    />
                                                    <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ ...styles.configItem, gridColumn: conversionScreenId ? '1 / -1' : 'auto' }}>
                            <label>Content Height (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" min="20" max="100" step="5"
                                    value={globalStyling.height}
                                    onChange={e => setGlobalStyling(p => ({ ...p, height: Number(e.target.value) }))}
                                    style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                                />
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="number" min="20" max="100"
                                        value={globalStyling.height}
                                        onChange={e => setGlobalStyling(p => ({ ...p, height: Math.min(100, Math.max(20, Number(e.target.value))) }))}
                                        style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                    />
                                    <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                </div>
                            </div>
                        </div>

                        {/* --- HUD POSITIONING --- */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                            <h6 style={{ margin: '0 0 0.25rem 0', color: '#555', fontSize: '0.85rem', textTransform: 'uppercase' }}>HUD Positioning (Unified Chrome)</h6>
                            <p style={{...styles.descriptionText, marginBottom: '1rem', fontSize: '0.8rem'}}>
                                Control where the Game HUD (Points, Timer, Progress) sits relative to the device screen or the content safe area.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div style={styles.configItem}>
                                    <label>HUD Layout Constraint</label>
                                    <select 
                                        value={globalStyling.hudLayout || 'viewport'} 
                                        onChange={e => setGlobalStyling(p => ({ ...p, hudLayout: e.target.value as 'viewport' | 'safe_area' }))} 
                                        style={styles.input}
                                    >
                                        <option value="viewport">Span Full Screen (Viewport)</option>
                                        <option value="safe_area">Align to Content (Safe Area)</option>
                                    </select>
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Top/Bottom (px)</label>
                                    <input 
                                        type="number" min="0" max="100"
                                        value={globalStyling.hudPaddingY ?? 16}
                                        onChange={e => setGlobalStyling(p => ({ ...p, hudPaddingY: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, hudPaddingY: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Left/Right (px)</label>
                                    <input 
                                        type="number" min="0" max="100"
                                        value={globalStyling.hudPaddingX ?? 16}
                                        onChange={e => setGlobalStyling(p => ({ ...p, hudPaddingX: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, hudPaddingX: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* --- BEZEL / OUTER FRAME PADDING --- */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc', marginBottom: '2rem' }}>
                            <h6 style={{ margin: '0 0 0.25rem 0', color: '#555', fontSize: '0.85rem', textTransform: 'uppercase' }}>Outer Frame (Bezel) Padding</h6>
                            <p style={{...styles.descriptionText, marginBottom: '1rem', fontSize: '0.8rem'}}>
                                This creates a physical frame around your entire macrogame. This is mostly useful if you are embedding via an iframe and want strict boundary controls.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={styles.configItem}>
                                    <label>Padding Top (px)</label>
                                    <input 
                                        type="number" min="0" max="200"
                                        value={globalStyling.paddingTop ?? ''}
                                        onChange={e => setGlobalStyling(p => ({ ...p, paddingTop: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, paddingTop: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Bottom (px)</label>
                                    <input 
                                        type="number" min="0" max="200"
                                        value={globalStyling.paddingBottom ?? ''}
                                        onChange={e => setGlobalStyling(p => ({ ...p, paddingBottom: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, paddingBottom: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Left (px)</label>
                                    <input 
                                        type="number" min="0" max="200"
                                        value={globalStyling.paddingLeft ?? ''}
                                        onChange={e => setGlobalStyling(p => ({ ...p, paddingLeft: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, paddingLeft: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Right (px)</label>
                                    <input 
                                        type="number" min="0" max="200"
                                        value={globalStyling.paddingRight ?? ''}
                                        onChange={e => setGlobalStyling(p => ({ ...p, paddingRight: handleNumberChange(e.target.value) }))}
                                        onBlur={(e) => { if (e.target.value === '') setGlobalStyling(p => ({ ...p, paddingRight: 0 })); }}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* --- INTRO & PROMO SCREENS --- */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{...styles.managerHeader, cursor: 'pointer', marginBottom: '0'}} onClick={() => setIsIntroPromoExpanded(!isIntroPromoExpanded)}>
                        <h4 style={{...styles.h4, margin: 0, border: 'none'}}>Intro & Promo Screens</h4>
                        <button type="button" style={styles.accordionButton}>{isIntroPromoExpanded ? '▲' : '▼'}</button>
                    </div>
                    
                    {isIntroPromoExpanded && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
                            <p style={{...styles.descriptionText, marginBottom: '1.5rem'}}>Configure optional global screens that appear at the beginning and end of your macrogame.</p>
                            
                            <ScreenCanvasBuilder
                                title="Intro Screen Settings"
                                type="intro"
                                config={introScreen}
                                theme={globalStyling.theme}
                                onChange={(key, value) => {
                                    setIntroScreen(p => ({ ...p, [key]: value }));
                                    if (key === 'enabled') {
                                        if (value === false) refocusAfterRemoval('intro', flow.length, false, promoScreen.enabled);
                                        else setPreviewFocusTarget({ view: 'intro', timestamp: Date.now() });
                                    }
                                }}
                                onStyleChange={(mode, key, value) => setIntroScreen(p => ({ ...p, [mode]: { ...(p[mode] || {}), [key]: value } }))}
                                imageFile={introImageFile}
                                onImageFileChange={file => { if (file) processAndSetImage(file, setIntroImageFile); }}
                                spotlightImageFile={introSpotlightImageFile}
                                onSpotlightImageFileChange={file => { if (file) processAndSetImage(file, setIntroSpotlightImageFile); }}
                                onRemoveImage={(imgType) => handleRemoveImage(imgType === 'bg' ? 'intro' : 'introSpotlight')}
                                onInteract={() => setPreviewFocusTarget({ view: 'intro', timestamp: Date.now() })}
                            />

                            <ScreenCanvasBuilder
                                title="Promo Screen Settings"
                                type="promo"
                                config={promoScreen}
                                theme={globalStyling.theme}
                                onChange={(key, value) => {
                                    setPromoScreen(p => ({ ...p, [key]: value }));
                                    if (key === 'enabled') {
                                        if (value === false) refocusAfterRemoval('promo', flow.length, introScreen.enabled, false);
                                        else setPreviewFocusTarget({ view: 'promo', timestamp: Date.now() });
                                    }
                                }}
                                onStyleChange={(mode, key, value) => setPromoScreen(p => ({ ...p, [mode]: { ...(p[mode] || {}), [key]: value } }))}
                                imageFile={promoImageFile}
                                onImageFileChange={file => { if (file) processAndSetImage(file, setPromoImageFile); }}
                                spotlightImageFile={promoSpotlightImageFile}
                                onSpotlightImageFileChange={file => { if (file) processAndSetImage(file, setPromoSpotlightImageFile); }}
                                onRemoveImage={(imgType) => handleRemoveImage(imgType === 'bg' ? 'promoBg' : 'promoSpotlight')}
                                onInteract={() => setPreviewFocusTarget({ view: 'promo', timestamp: Date.now() })}
                            />
                        </div>
                    )}
                </div>

                {/* --- PER-GAME SCREENS (PRE-GAME & RESULT) --- */}
                {flow.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{...styles.managerHeader, cursor: 'pointer', marginBottom: '0'}} onClick={() => setIsPreGameResultExpanded(!isPreGameResultExpanded)}>
                            <h4 style={{...styles.h4, margin: 0, border: 'none'}}>Pre-Game & Result Screens</h4>
                            <button type="button" style={styles.accordionButton}>{isPreGameResultExpanded ? '▲' : '▼'}</button>
                        </div>
                        
                        {isPreGameResultExpanded && (
                            <div style={{ marginTop: '1rem' }}>
                                <p style={styles.descriptionText}>Customize the pre-game instructions and result screens for each microgame in your flow.</p>
                                
                                {/* Game Selector Tabs */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                    {flow.map((item, idx) => {
                                        const gameName = item.customVariant?.name || item.baseGame.name;
                                        const isActive = activeScreenEditorIndex === idx;
                                        return (
                                            <button 
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setActiveScreenEditorIndex(idx);
                                                    setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: idx, timestamp: Date.now() });
                                                }}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: isActive ? '#0866ff' : '#f0f2f5',
                                                    color: isActive ? '#fff' : '#666',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    cursor: 'pointer',
                                                    fontWeight: isActive ? 'bold' : 'normal',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isActive ? '0 2px 4px rgba(8, 102, 255, 0.2)' : 'none'
                                                }}
                                            >
                                                {idx + 1}. {gameName}
                                            </button>
                                        );
                                    })}
                                </div>

                                {flow[activeScreenEditorIndex] && (
                                    <>
                                        <PreGameSettings 
                                            config={flow[activeScreenEditorIndex].preGameConfig || preGameConfig}
                                            flowType={screenFlowType}
                                            theme={globalStyling.theme}
                                            onChange={(key, value) => {
                                                const newFlow = [...flow];
                                                newFlow[activeScreenEditorIndex].preGameConfig = { 
                                                    ...(newFlow[activeScreenEditorIndex].preGameConfig || preGameConfig), 
                                                    [key]: value 
                                                };
                                                setFlow(newFlow);
                                            }}
                                            onStyleChange={(mode, key, value) => {
                                                const newFlow = [...flow];
                                                const currentConfig = newFlow[activeScreenEditorIndex].preGameConfig || preGameConfig;
                                                newFlow[activeScreenEditorIndex].preGameConfig = {
                                                    ...currentConfig,
                                                    [mode]: { ...(currentConfig[mode] || {}), [key]: value }
                                                };
                                                setFlow(newFlow);
                                            }}
                                            onFlowTypeChange={(newFlowType) => {
                                                setScreenFlowType(newFlowType);
                                                setPreviewFocusTarget(prevTarget => {
                                                    if (['title', 'controls', 'combined', 'game'].includes(prevTarget.view) && prevTarget.index !== undefined) {
                                                        return { view: getTargetViewForGame(newFlowType), index: prevTarget.index, timestamp: Date.now() };
                                                    }
                                                    return prevTarget;
                                                });
                                            }}
                                            onInteract={() => setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index: activeScreenEditorIndex, timestamp: Date.now() })}
                                        />
                                        
                                        <ResultScreenSettings 
                                            config={flow[activeScreenEditorIndex].resultConfig || resultConfig}
                                            theme={globalStyling.theme}
                                            showPoints={showPoints}
                                            canLose={(flow[activeScreenEditorIndex].lossCondition?.type || 'none') !== 'none'}
                                            canTryAgain={(flow[activeScreenEditorIndex].winCondition?.type || 'time') !== 'time' && (flow[activeScreenEditorIndex].lossCondition?.type || 'none') !== 'failure'}
                                            onChange={(key, value) => {
                                                const newFlow = [...flow];
                                                newFlow[activeScreenEditorIndex].resultConfig = { 
                                                    ...(newFlow[activeScreenEditorIndex].resultConfig || resultConfig), 
                                                    [key]: value 
                                                };
                                                setFlow(newFlow);
                                            }}
                                            onStyleChange={(mode, key, value) => {
                                                const newFlow = [...flow];
                                                const currentConfig = newFlow[activeScreenEditorIndex].resultConfig || resultConfig;
                                                newFlow[activeScreenEditorIndex].resultConfig = {
                                                    ...currentConfig,
                                                    [mode]: { ...(currentConfig[mode] || {}), [key]: value }
                                                };
                                                setFlow(newFlow);
                                            }}
                                            onInteract={() => setPreviewFocusTarget({ view: 'result', index: activeScreenEditorIndex, timestamp: Date.now() })}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* --- Macrogame Configuration Section --- */}
                <h3 style={styles.h3}>Macrogame Configuration</h3>
                <div style={styles.configContainer}>
                    
                    {/* ENABLE ECONOMY BLOCK */}
                    <div style={{...styles.configItem, border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
                        <label 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPointsForced ? 0.6 : 1, cursor: isPointsForced ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.05rem' }} 
                            title={isPointsForced ? "Points are required because your attached Conversion Screen contains point-locked rewards." : ""}
                        >
                            <input type="checkbox" checked={showPoints || isPointsForced} disabled={isPointsForced} onChange={e => setShowPoints(e.target.checked)} style={{ cursor: isPointsForced ? 'not-allowed' : 'pointer', width: '18px', height: '18px' }} />
                            Enable Economy (Point System)
                        </label>
                        
                        <p style={{...styles.descriptionText, marginTop: '0.5rem', fontSize: '0.85rem', marginBottom: 0}}>
                            {isPointsForced ? (
                                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Points are forced ON because your attached Conversion Screen contains point-locked rewards.</span>
                            ) : (hasGamesWithPoints && showPoints) ? (
                                <span style={{ color: '#0866ff', fontWeight: 'bold' }}>Points are enabled because one or more microgames in your flow use a point system.</span>
                            ) : (
                                "If enabled, a points total will be displayed in the UI."
                            )}
                        </p>

                        {showPoints && hasGamesWithPoints && hasGamesWithoutPoints && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '4px', color: '#664d03', fontSize: '0.85rem' }}>
                                <strong>⚠️ Mixed Economy:</strong> One or more microgames in the flow do not have an underlying point system enabled. Consider aligning your games.
                            </div>
                        )}
                        
                        {showPoints && hasGamesWithPoints && !isPointsForced && conversionScreenId && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '4px', color: '#664d03', fontSize: '0.85rem' }}>
                                <strong>⚠️ Missing Rewards:</strong> Your games award points, but your conversion screen does not use them. Consider adding point-locked rewards to your conversion screen.
                            </div>
                        )}

                        {/* --- POINT DISPLAY SETTINGS (RECEIPT) --- */}
                        {showPoints && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                                <h5 style={{ margin: '0 0 0.25rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Point Display</h5>
                                <p style={{...styles.descriptionText, fontSize: '0.8rem', marginBottom: '1rem'}}>
                                    The Point Display always shows on the top left and can additionally be shown on the Game Result Screens.
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={styles.configItem}>
                                        <label>Result Screen Point Display</label>
                                        <select 
                                            value={pointDisplayMode} 
                                            onChange={e => setPointDisplayMode(e.target.value as any)}
                                            style={styles.input}
                                        >
                                            <option value="none">None (Hidden)</option>
                                            <option value="simple">Simple (Final Score Only)</option>
                                            <option value="detailed">Detailed (Itemized Receipt)</option>
                                        </select>
                                    </div>
                                    
                                    {pointDisplayMode !== 'none' && (
                                        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid #ccc', paddingLeft: '1rem' }}>
                                            {pointDisplayMode === 'detailed' && (
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={showLineItemDetails} 
                                                        onChange={e => setShowLineItemDetails(e.target.checked)} 
                                                    />
                                                    Show Line-Item Details for Current Game (e.g. "Survival: 30 pts")
                                                </label>
                                            )}
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={enableTallyAnimation} 
                                                    onChange={e => setEnableTallyAnimation(e.target.checked)} 
                                                />
                                                Enable Tally Animation (Numbers count up rapidly)
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* PROGRESS TRACKER SETTINGS */}
                    <div style={{...styles.configItem, border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showProgress} onChange={e => setShowProgress(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            Enable Progress Tracker
                        </label>
                        <p style={{...styles.descriptionText, marginTop: '0.5rem', fontSize: '0.85rem', marginBottom: showProgress ? '1.5rem' : 0}}>
                            Show users how close they are to the final reward while playing.
                        </p>
                        
                        {showProgress && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }}>Tracker Style</label>
                                    <select value={progressFormat} onChange={e => setProgressFormat(e.target.value as 'text' | 'visual')} style={{...styles.input, maxWidth: '300px'}}>
                                        <option value="visual">Reward Path (Visual Nodes)</option>
                                        <option value="text">Standard Text (e.g., "Game 1 of 3")</option>
                                    </select>
                                </div>
                                
                                {progressFormat === 'visual' && (
                                    <>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#333' }}>
                                            <input type="checkbox" checked={progressShowLabels} onChange={e => setProgressShowLabels(e.target.checked)} />
                                            Show Text Labels Below Nodes (e.g., "Intro", "Game 1", "Reward")
                                        </label>

                                        {/* --- COLOR PICKERS FOR TRACKER --- */}
                                        {['dark', 'light'].map((mode) => {
                                            const isDark = mode === 'dark';
                                            const title = isDark ? "Tracker Colors (Dark Mode)" : "Tracker Colors (Light Mode)";
                                            const activeStyle = isDark ? progressStyle : lightProgressStyle;
                                            const setStyle = isDark ? setProgressStyle : setLightProgressStyle;

                                            return (
                                                <div key={mode} style={{ marginTop: '1.5rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                                                    <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>{title}</h5>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                        <div style={styles.configItem}>
                                                            <label style={{ fontSize: '0.8rem' }}>Active Base Color (Current/Completed Node)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input type="color" value={activeStyle?.activeColor || (isDark ? '#00d2d3' : '#0866ff')} onChange={e => setStyle((p: any) => ({ ...p, activeColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                                <input type="text" value={activeStyle?.activeColor || (isDark ? '#00d2d3' : '#0866ff')} onChange={e => setStyle((p: any) => ({ ...p, activeColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                            </div>
                                                        </div>
                                                        <div style={styles.configItem}>
                                                            <label style={{ fontSize: '0.8rem' }}>Inactive Base Color (Upcoming Nodes)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input type="color" value={(activeStyle?.inactiveColor?.startsWith('#') ? activeStyle.inactiveColor.substring(0, 7) : (isDark ? '#cccccc' : '#e0e0e0'))} onChange={e => setStyle((p: any) => ({ ...p, inactiveColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                                <input type="text" value={activeStyle?.inactiveColor || (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')} onChange={e => setStyle((p: any) => ({ ...p, inactiveColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                            </div>
                                                        </div>
                                                        <div style={styles.configItem}>
                                                            <label style={{ fontSize: '0.8rem' }}>Reward Node Color (Final Step)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input type="color" value={activeStyle?.rewardColor || '#f1c40f'} onChange={e => setStyle((p: any) => ({ ...p, rewardColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                                <input type="text" value={activeStyle?.rewardColor || '#f1c40f'} onChange={e => setStyle((p: any) => ({ ...p, rewardColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                            </div>
                                                        </div>
                                                        
                                                        {progressShowLabels && (
                                                            <>
                                                                <div style={styles.configItem}>
                                                                    <label style={{ fontSize: '0.8rem' }}>Active Text Color</label>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <input type="color" value={activeStyle?.activeTextColor || (isDark ? '#ffffff' : '#333333')} onChange={e => setStyle((p: any) => ({ ...p, activeTextColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                                        <input type="text" value={activeStyle?.activeTextColor || (isDark ? '#ffffff' : '#333333')} onChange={e => setStyle((p: any) => ({ ...p, activeTextColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                                    </div>
                                                                </div>
                                                                <div style={styles.configItem}>
                                                                    <label style={{ fontSize: '0.8rem' }}>Inactive Text Color</label>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <input type="color" value={(activeStyle?.inactiveTextColor?.startsWith('#') ? activeStyle.inactiveTextColor.substring(0, 7) : (isDark ? '#aaaaaa' : '#666666'))} onChange={e => setStyle((p: any) => ({ ...p, inactiveTextColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                                        <input type="text" value={activeStyle?.inactiveTextColor || (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)')} onChange={e => setStyle((p: any) => ({ ...p, inactiveTextColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* --- MACROGAME ECONOMY BALANCER --- */}
                {showPoints && (
                    <EconomyBalancer 
                        flow={flow as any}
                        pointGatedMethods={pointGatedMethods}
                        pointCosts={pointCosts as any}
                        onPointRuleChange={handlePointRuleChange}
                        onPointCostChange={handlePointCostChange}
                        onFocusGame={(index) => setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index, timestamp: Date.now() })}
                    />
                )}
                {/* --- END: MACROGAME ECONOMY BALANCER --- */}

                {/* --- MICROGAME WIN & LOSS CONDITIONS --- */}
                <FlowRuleOverrides 
                    flow={flow as any}
                    showPoints={showPoints}
                    onConditionUpdate={handleConditionUpdate}
                    onFocusGame={(index) => setPreviewFocusTarget({ view: getTargetViewForGame(screenFlowType), index, timestamp: Date.now() })}
                />
                
                {/* --- AUDIO JOURNEY --- */}
                <AudioJourneyEditor
                    audioConfig={audioConfig!}
                    onChange={setAudioConfig}
                    flow={flow as any}
                    introScreen={introScreen}
                    promoScreen={promoScreen}
                    globalPreGameConfig={preGameConfig}
                    globalResultConfig={resultConfig}
                    conversionScreen={allConversionScreens.find(s => s.id === conversionScreenId)}
                    allConversionMethods={allConversionMethods}
                    showPoints={showPoints}
                    pointDisplayMode={pointDisplayMode}
                    enableTallyAnimation={enableTallyAnimation}
                />

                <MacrogameTaxonomy 
                    sectors={sectors}
                    categories={categories}
                    subcategories={subcategories}
                    seasonality={seasonality}
                    targetAudience={targetAudience}
                    promotionCompatibility={promotionCompatibility}
                    flow={flow}
                    onHardConflictChange={setHasHardConflict}
                    onChange={(key, value) => {
                        if (key === 'sectors') setSectors(value);
                        if (key === 'categories') setCategories(value);
                        if (key === 'subcategories') setSubcategories(value);
                        if (key === 'seasonality') setSeasonality(value);
                        if (key === 'targetAudience') setTargetAudience(value);
                        if (key === 'promotionCompatibility') setPromotionCompatibility(value);
                    }}
                    onRemoveConflictingGames={(indicesToRemove: number[]) => {
                        setFlow(prevFlow => {
                            const newFlow = prevFlow.filter((_, index) => !indicesToRemove.includes(index));
                            
                            // Safely adjust the preview engine focus to prevent crashes
                            setPreviewFocusTarget(prevTarget => {
                                // Only adjust if we are currently looking at a game screen
                                if (['game', 'title', 'controls', 'combined', 'result'].includes(prevTarget.view) && prevTarget.index !== undefined) {
                                    // If the specific game we are looking at was removed
                                    if (indicesToRemove.includes(prevTarget.index)) {
                                        if (newFlow.length > 0) {
                                            return { view: getTargetViewForGame(screenFlowType), index: 0, timestamp: Date.now() };
                                        } else {
                                            if (introScreen.enabled) return { view: 'intro', timestamp: Date.now() };
                                            if (promoScreen.enabled) return { view: 'promo', timestamp: Date.now() };
                                            return { view: 'end', timestamp: Date.now() };
                                        }
                                    } else {
                                        // The game wasn't removed, but its index may have shifted. 
                                        // Count how many removed games came BEFORE it to find its new index.
                                        const shiftAmount = indicesToRemove.filter(idx => idx < prevTarget.index!).length;
                                        return { ...prevTarget, index: prevTarget.index! - shiftAmount, timestamp: Date.now() };
                                    }
                                }
                                return prevTarget;
                            });
                            
                            return newFlow;
                        });
                        notifications.success("Conflicting games removed successfully.");
                    }}
                />

                <div style={{...styles.managerHeader, borderTop: '1px solid #ccc', marginTop: '2rem', paddingTop: '1.5rem', justifyContent: 'flex-end'}}>
                        {!initialData.id && (
                            <button 
                                onClick={handleSaveClick} 
                                style={{ ...styles.saveButton, opacity: (isSaving || hasHardConflict) ? 0.5 : 1, cursor: (isSaving || hasHardConflict) ? 'not-allowed' : 'pointer' }} 
                                disabled={isSaving || hasHardConflict}
                            >
                                {saveButtonText}
                            </button>
                        )}
                    </div>
                    
                    {/* Hidden button for programmatic saves from parent if needed */}
                    <button id="macrogame-form-save-button" onClick={handleSaveClick} style={{display: 'none'}} disabled={isSaving || hasHardConflict} />
                </div>

                {/* RIGHT: LIVE PREVIEW */}
                <div style={{ flex: 1, minWidth: 0, backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <StaticMacrogamePreview 
                        macrogame={previewMacrogame} 
                        previewFocusTarget={previewFocusTarget} 
                        onThemeChange={(theme) => setGlobalStyling(p => ({ ...p, theme }))}
                        onEngineStateChange={(state) => {
                            setPreviewFocusTarget(prev => {
                                const prevIndex = prev.index || 0;
                                const incomingIndex = state.index || 0;
                                
                                if (state.view === prev.view && incomingIndex === prevIndex) {
                                    return prev;
                                }
                                // Return the state WITHOUT a timestamp so it highlights the card 
                                // without triggering the child's jump effect
                                return { view: state.view, index: incomingIndex }; 
                            });
                        }}
                    />
                </div>
            </div>
        </div>
        </>
    );
};