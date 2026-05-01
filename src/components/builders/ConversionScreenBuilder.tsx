/* src/components/builders/ConversionScreenBuilder.tsx */

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionScreen, ConversionMethod, EntityStatus } from '../../types';
import { useData } from '../../hooks/useData';
import { StaticConversionPreview } from '../previews/StaticConversionPreview';
import { ConversionMethodFormFields } from '../forms/ConversionMethodFormFields';
import { SimpleTextEditor } from '../forms/SimpleTextEditor';
import { generateUUID, ensureUniqueName } from '../../utils/helpers';
import { notifications } from '../../utils/notifications';
import { MaskConfigurationForm } from '../forms/MaskConfigurationForm';
import { SmartNumberInput } from '../ui/inputs/SmartNumberInput';
import { GateResolutionEditor } from './conversion/screen/GateResolutionEditor';

// --- Types ---

interface FormMethodItem {
    instanceId: string;
    methodId: string; 
    isCreatingNew: boolean;
    isExpanded?: boolean; 
    isSectionCollapsed?: boolean; // Tracks if the whole method card is collapsed
    draftMethod?: Partial<ConversionMethod>; 
    showContentAbove: boolean;
    contentAbove: string;
    showContentBelow: boolean;
    contentBelow: string;
    gate: {
        type: 'none' | 'on_success' | 'point_threshold' | 'point_purchase';
        methodInstanceId?: string;
        resolutionConfig?: any; // Form state container
    };
}

interface ScreenBuilderFormValues {
    name: string;
    headline: string;
    bodyText: string;
    layout: 'single_column';
    style: {
        width: number;
        spacing: number; 
        textSpacing?: number;
        methodSpacing?: number;
        padding: number;
        verticalAlign: 'top' | 'center' | 'bottom';
    };
    methods: FormMethodItem[];
}

interface ConversionScreenBuilderProps {
    initialScreen?: ConversionScreen | null;
    onSave: () => void; 
    onCancel: () => void;
}

// --- Helper: Standard Defaults (Mirrors ConversionMethodBuilder) ---
const getStandardDefaults = (type: string): Partial<ConversionMethod> => {
    const defaults: Partial<ConversionMethod> = {
        name: `New ${type.replace(/_/g, ' ')}`,
        type: type as any,
        style: { size: 60, textSpacing: 10, methodSpacing: 20 }, // Base defaults
        fields: [],
        links: []
    };

    // 1. Text Defaults
    if (type === 'coupon_display') {
        // MATCHING STANDALONE DEFAULTS
        defaults.headline = '<h2 style="text-align: center;">New Customer Deal</h2>';
        defaults.subheadline = '<p style="text-align: center;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>';
        (defaults as any).revealText = 'Click to Reveal Code';
        (defaults as any).clickToReveal = false;

        defaults.style = { 
            ...defaults.style, 
            textSpacing: 10, methodSpacing: 15,
            // Visual Defaults (Matches Form Fields)
            strokeWidth: 2,
            strokeStyle: 'dashed',
            strokeColor: '#cfc33a',
            paddingTop: 20,
            paddingBottom: 20,
            paddingX: 20,
            boxShadowOpacity: 15, // Default opacity
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff'
        };
        // Light Theme Defaults
        (defaults as any).lightStyle = {
            strokeColor: '#333333',
            backgroundColor: '#f5f5f5',
            textColor: '#000000',
            boxShadowOpacity: 15
        };
    } else if (type === 'email_capture') {
        defaults.headline = '<h2 style="text-align: center;">Join Our Community!</h2>';
        defaults.subheadline = '<p style="text-align: center;">Sign up for exclusive discounts, updates, and insider perks.</p>';
        defaults.style = { ...defaults.style, fieldBorderRadius: 6 };
        (defaults as any).emailPlaceholderText = 'Enter your email...';
        (defaults as any).buttonConfig = { text: 'Submit', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, widthMode: 'max', enableHoverAnimation: true };
        (defaults as any).buttonStyle = { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' };
        (defaults as any).lightButtonStyle = { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' };
    } else if (type === 'link_redirect') {
        defaults.headline = '<h2 style="text-align: center;">Visit This Link</h2>';
        defaults.subheadline = '<p style="text-align: center;">Click the button below to be redirected to the destination.</p>';
        (defaults as any).openInNewTab = true;
        (defaults as any).transition = {
            type: 'interact',
            interactionMethod: 'click',
            clickFormat: 'button',
            buttonConfig: { text: 'Continue', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, widthMode: 'max', enableHoverAnimation: true },
            buttonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
            lightButtonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
            autoDuration: 5,
            showCountdown: true,
            countdownText: 'Redirecting in {{time}}'
        };
    } else if (type === 'form_submit') {
        defaults.headline = '<h2 style="text-align: center;">Submit Your Information</h2>';
        defaults.subheadline = '<p style="text-align: center;">Submit the required information using the form below.</p>';
        defaults.style = { ...defaults.style, fieldSpacing: 10, fieldBorderRadius: 6 };
        defaults.fields = [{ label: 'First Name', placeholder: 'Enter first name...', type: 'text', required: true, name: 'field_1', row: 1 }];
        (defaults as any).buttonConfig = { text: 'Submit', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, widthMode: 'max', enableHoverAnimation: true };
        (defaults as any).buttonStyle = { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' };
        (defaults as any).lightButtonStyle = { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' };
    } else if (type === 'social_follow') {
        defaults.headline = '<h2 style="text-align: center;">Follow Us</h2>';
        defaults.subheadline = '<p style="text-align: center;">Stay updated on our socials!</p>';
        defaults.style = { ...defaults.style, iconSpacing: 15, iconColor: '#ffffff', iconSize: 40 };
        (defaults as any).lightStyle = { iconColor: '#000000' };
        defaults.links = [
            { platform: 'facebook', url: '', isEnabled: true },
            { platform: 'instagram', url: '', isEnabled: false },
            { platform: 'linkedin', url: '', isEnabled: false },
            { platform: 'tiktok', url: '', isEnabled: false },
            { platform: 'x', url: '', isEnabled: false },
            { platform: 'youtube', url: '', isEnabled: false }
        ];
    }
    
    return defaults;
};

// --- Component ---

export const ConversionScreenBuilder: React.FC<ConversionScreenBuilderProps> = ({ initialScreen, onSave, onCancel }) => {
    const { allConversionMethods, allConversionScreens, createConversionMethod, createConversionScreen, updateConversionScreen } = useData();
    const [isSaving, setIsSaving] = useState(false);

    // --- Simulation State for Point Threshold ---
    const [simProgress, setSimProgress] = useState(50);
    const [simReqPoints, setSimReqPoints] = useState(1000);

    // --- Preview State ---
    const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
    const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [previewGateState, setPreviewGateState] = useState<'locked' | 'unlocked'>('locked');

    // --- Content Memory Refs ---
    const lastScreenHeadline = React.useRef<string>('');
    const lastScreenBody = React.useRef<string>('');
    const lastMethodContent = React.useRef<Record<string, { above?: string, below?: string }>>({});

    // --- Preview Reset State ---
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const [revealResetTrigger, setRevealResetTrigger] = useState<{ instanceId?: string; timestamp: number }>({ timestamp: 0 });
    
    // Play/Pause State for Transitions
    const [previewIsPlaying, setPreviewIsPlaying] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    // Helper for Editor Styling based on Preview Theme
    const editorStyle = previewTheme === 'dark' 
        ? { backgroundColor: '#080817', defaultTextColor: '#ffffff' }
        : { backgroundColor: '#ffffff', defaultTextColor: '#000000' };

    // Toggle states for main content blocks
    const [showHeadline, setShowHeadline] = useState(initialScreen ? !!initialScreen.headline : true);
    const [showBodyText, setShowBodyText] = useState(initialScreen ? !!initialScreen.bodyText : true);

    // 1. Prepare Default Method (Ensure at least one exists for new screens)
    // Helper to generate default Resolution Config
    const getDefaultResolutionConfig = () => ({
        isPlayAgainEnabled: true,
        playAgainBehavior: 'reset_points',
        playAgainTargetIndex: 0,
        isContinueEnabled: false,
        routeTargetId: '',
        transition: {
            type: 'interact',
            interactionMethod: 'click',
            clickFormat: 'button',
            buttonConfig: { text: 'Play Again', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'none', strokeWidth: 2 },
            buttonStyle: { backgroundColor: '#ffffff', textColor: '#333333', strokeColor: '#ffffff' },
            lightButtonStyle: { backgroundColor: '#333333', textColor: '#ffffff', strokeColor: '#333333' }
        }
    });

    // 1. Prepare Default Method (Ensure at least one exists for new screens)
    const defaultMethodItem: FormMethodItem = {
        instanceId: generateUUID(),
        methodId: '',
        isCreatingNew: false,
        showContentAbove: false,
        contentAbove: '',
        showContentBelow: false,
        contentBelow: '',
        gate: { type: 'none', resolutionConfig: getDefaultResolutionConfig() }
    };

    // Initialize Form
    const { register, control, handleSubmit, watch, setValue, getValues } = useForm<ScreenBuilderFormValues>({
        defaultValues: {
            name: initialScreen?.name || '',
            headline: initialScreen?.headline || '<h1 style="text-align: center;">Unlock Your Reward!</h1>',
            bodyText: initialScreen?.bodyText || '<p style="text-align: center; font-size: 1.25rem;">You can redeem your special offer here on the Conversion Screen.</p>',
            layout: 'single_column',
            style: {
                width: initialScreen?.style?.width || 60,
                spacing: initialScreen?.style?.spacing !== undefined ? initialScreen.style.spacing : 20,
                textSpacing: initialScreen?.style?.textSpacing !== undefined ? initialScreen.style.textSpacing : 10,
                methodSpacing: initialScreen?.style?.methodSpacing !== undefined ? initialScreen.style.methodSpacing : 20,
                verticalAlign: initialScreen?.style?.verticalAlign || 'center'
            },
            methods: (initialScreen?.methods && initialScreen.methods.length > 0)
                ? initialScreen.methods.map(m => {
                    // Find the existing method data to populate the draft immediately
                    const existingData = allConversionMethods.find(cm => cm.id === m.methodId);
                    
                    return {
                        ...m,
                        isCreatingNew: false, 
                        showContentAbove: !!m.contentAbove,
                        contentAbove: m.contentAbove || '',
                        showContentBelow: !!m.contentBelow,
                        contentBelow: m.contentBelow || '',
                        // Update: Force string 'true'/'false' (Default to 'false' if undefined)
                        gate: m.gate ? { 
                            ...m.gate,
                            replacePrerequisite: m.gate.replacePrerequisite ? 'true' : 'false',
                            resolutionConfig: m.gate.resolutionConfig || getDefaultResolutionConfig()
                        } : { type: 'none', resolutionConfig: getDefaultResolutionConfig() },
                        // Pre-fill draftMethod so Hoisted UI works immediately without clicking "Edit"
                        draftMethod: existingData ? JSON.parse(JSON.stringify(existingData)) : undefined
                    };
                })
                : [defaultMethodItem]
        }
    });

    const { fields, append, remove, move, update, replace } = useFieldArray({
        control,
        name: "methods"
    });

    // Watch form state for Live Preview
    const watchedValues = watch();

    // Calculate display conditions for Screen Spacing
    const rawHeadline = watchedValues.headline;
    const rawBodyText = watchedValues.bodyText;
    const hasHeadlineContent = showHeadline && !!rawHeadline && rawHeadline !== '<p><br></p>';
    const hasBodyContent = showBodyText && !!rawBodyText && rawBodyText !== '<p><br></p>';
    const hasBothScreenText = hasHeadlineContent && hasBodyContent;
    const hasAnyScreenText = hasHeadlineContent || hasBodyContent;
    
    // Check if there are ACTUAL methods configured, not just a blank placeholder
    const validMethods = (watchedValues.methods || []).filter((m: any) => m.methodId || m.isCreatingNew);
    const hasMethods = validMethods.length > 0;
    const hasMultipleMethods = validMethods.length > 1;
    
    const showSpacingSection = hasBothScreenText || (hasAnyScreenText && hasMethods) || hasMultipleMethods;

    // --- Live Preview Data Construction ---
    const previewScreen = useMemo(() => {
        const processedMethods = watchedValues.methods?.map(m => {
            // 1. Resolve Data Source
            let baseData = m.isCreatingNew 
                ? { ...m.draftMethod, id: 'PREVIEW_TEMP_ID', type: m.draftMethod?.type || 'coupon_display' } 
                : allConversionMethods.find(ex => ex.id === m.methodId);

            // 2. Clone to avoid mutating state
            let effectiveData = baseData ? { ...baseData } : undefined;

            // 3. Apply Light Theme Override for Preview
            if (effectiveData && previewTheme === 'light' && (effectiveData as any).lightStyle) {
                const lightStyle = (effectiveData as any).lightStyle;
                // Merge lightStyle into style
                effectiveData.style = {
                    ...effectiveData.style,
                    ...lightStyle,
                    // Ensure size is preserved if not overridden, though usually we force 100% in Host
                };
            }

            // Update: Sanitize Gate Boolean for Preview
            // We must convert the string "false" (from radio buttons) back to boolean false
            let previewGate = undefined;
            if (m.gate && m.gate.type !== 'none') {
                previewGate = {
                    ...m.gate,
                    replacePrerequisite: (m.gate.replacePrerequisite === true || m.gate.replacePrerequisite === 'true')
                };
            }

            return {
                instanceId: m.instanceId,
                methodId: m.methodId || 'PREVIEW_TEMP_ID',
                contentAbove: m.showContentAbove ? m.contentAbove : undefined,
                contentBelow: m.showContentBelow ? m.contentBelow : undefined,
                gate: previewGate,
                data: effectiveData as ConversionMethod
            };
        }) || [];

        return {
            id: initialScreen?.id || 'PREVIEW',
            name: watchedValues.name || 'New Screen',
            headline: showHeadline ? watchedValues.headline : '', 
            bodyText: showBodyText ? watchedValues.bodyText : '', 
            layout: 'single_column',
            
            style: { 
                ...watchedValues.style, 
                width: previewOrientation === 'portrait' 
                    ? 100 
                    : (() => {
                        const val = watchedValues.style?.width;
                        // Update: Robust check for "empty" state (includes 0 and NaN)
                        // This ensures that if the input is cleared, we default to 60 instead of clamping to 20
                        if (val === '' || val === undefined || val === null || Number.isNaN(Number(val)) || val === 0) {
                            return 60;
                        }
                        return val;
                    })()
            },
            
            methods: processedMethods,
            status: { code: 'ok', message: '' },
            // Inject Theme Colors for Preview
            textColor: previewTheme === 'light' ? '#000000' : '#ffffff',
            backgroundColor: previewTheme === 'light' ? '#ffffff' : 'transparent', 
        } as any as ConversionScreen;

    }, [watchedValues, allConversionMethods, initialScreen, previewTheme, previewOrientation]);

    const handleMethodTypeChange = (index: number, type: string) => {
        const currentItem = getValues(`methods.${index}`);
        
        // 1. Get Standard Defaults for this type
        const defaults = getStandardDefaults(type);

        // 2. Context-Aware Cleanup
        // If the Screen has a Headline or Body enabled, we start the method with EMPTY text fields.
        // The ConversionMethodFormFields component is smart enough to restore the *correct* default 
        // text (specific to the method type) if the user clicks "+ Add Headline/Body".
        if (type !== 'coupon_display' && (showHeadline || showBodyText)) {
            defaults.headline = '';
            defaults.subheadline = ''; 
        }

        update(index, {
            ...currentItem,
            methodId: '', 
            isCreatingNew: true, 
            isExpanded: false, 
            draftMethod: defaults,
            gate: currentItem.gate 
        });
    };

    const handleVariantChange = (index: number, value: string) => {
        const currentItem = getValues(`methods.${index}`);
        
        if (value === 'DEFAULT') {
            // Use the CURRENT type, do not default to coupon
            const currentType = currentItem.draftMethod?.type 
                || allConversionMethods.find(m => m.id === currentItem.methodId)?.type 
                || 'coupon_display';
                
            const defaults = getStandardDefaults(currentType);
            
            // Context-Aware Cleanup
            if (currentType !== 'coupon_display' && (showHeadline || showBodyText)) {
                defaults.headline = '';
                defaults.subheadline = '';
            }
            
            update(index, {
                ...currentItem,
                methodId: '',
                isCreatingNew: true,
                isExpanded: false,
                draftMethod: defaults
            });
        } else {
            // Select existing variant
            update(index, {
                ...currentItem,
                methodId: value,
                isCreatingNew: false, // It's an existing method
                isExpanded: false,
                draftMethod: undefined // Clear draft since we are linking
            });
        }
    };

    const handleSave: SubmitHandler<ScreenBuilderFormValues> = async (data) => {
        if (!data.name.trim()) { notifications.error("Please enter an internal name."); return; }
        
        const validMethods = data.methods.filter(m => m.methodId || m.isCreatingNew);

        if (validMethods.length === 0) { 
            notifications.error("Please add and configure at least one conversion method."); 
            return; 
        }

        // --- VALIDATION LOOP ---
        for (const [i, m] of validMethods.entries()) {
            if (m.isCreatingNew && m.draftMethod) {
                const draft = m.draftMethod;
                const label = `Method ${i + 1}`; 

                if (!draft.name?.trim()) { notifications.error(`${label}: Internal Name is required`); return; }

                if (draft.type === 'coupon_display') {
                    if (!draft.staticCode?.trim()) { notifications.error(`${label}: Coupon Code is required`); return; }
                    if (!draft.discountValue || Number(draft.discountValue) <= 0) { notifications.error(`${label}: Discount Value must be positive`); return; }
                }
                
                if (draft.type === 'email_capture') {
                    if (!draft.emailPlaceholderText?.trim()) { notifications.error(`${label}: Placeholder text is required`); return; }
                    if (!draft.buttonConfig?.text?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                }

                if (draft.type === 'link_redirect') {
                    const t = draft.transition || {};
                    const isButton = t.type !== 'auto' && t.interactionMethod === 'click' && t.clickFormat === 'button';
                    if (isButton && !t.buttonConfig?.text?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                    if (!draft.url?.trim()) { notifications.error(`${label}: Destination URL is required`); return; }
                }

                if (draft.type === 'form_submit') {
                    if (!draft.buttonConfig?.text?.trim()) { notifications.error(`${label}: Button text is required`); return; }
                    if (draft.fields?.some((f: any) => !f.label?.trim())) { notifications.error(`${label}: All form fields must have a label`); return; }
                }

                if (draft.type === 'social_follow') {
                    if (!draft.links?.some((l: any) => l.isEnabled)) { notifications.error(`${label}: At least one social platform must be enabled`); return; }
                    if (draft.links?.some((l: any) => l.isEnabled && !l.url?.trim())) { notifications.error(`${label}: All enabled social links must have a URL`); return; }
                }
            }
        }
        
        setIsSaving(true);

        try {
            // --- SANITIZATION HELPERS ---
            // These ensure empty strings/undefined become valid numbers/defaults before DB save,
            // preventing mathematical layout errors in the Host engine.
            
            const sanitizeStyle = (style: any) => {
                if (!style) return {};
                const s = { ...style };
                // Expanded list to cover Button Configs and Resolution Routing fields
                ['textSpacing', 'methodSpacing', 'buttonSpacing', 'paddingTop', 'paddingBottom', 'paddingX', 'paddingVertical', 'paddingHorizontal', 'borderRadius', 'customWidth', 'strokeWidth', 'boxShadowOpacity', 'fieldSpacing', 'iconSpacing', 'size', 'fieldBorderRadius'].forEach(k => {
                    if (k in s) s[k] = (s[k] === '' || s[k] === null || s[k] === undefined || isNaN(Number(s[k]))) ? 0 : Number(s[k]);
                });
                // Icon Size special case (default 40)
                if ('iconSize' in s) {
                    const size = Number(s.iconSize);
                    s.iconSize = (size > 0) ? size : 40;
                }
                return s;
            };

            const sanitizeMask = (mask: any) => {
                if (!mask) return undefined;
                const m = { ...mask };
                // Top level mask numbers
                ['strokeWidth', 'paddingTop', 'paddingBottom', 'paddingX', 'spacing'].forEach(k => {
                    if (k in m) m[k] = (m[k] === '' || m[k] === null || m[k] === undefined || isNaN(Number(m[k]))) ? 0 : Number(m[k]);
                });
                // Pass inner styles through the standard style sanitizer to catch numbers like boxShadowOpacity
                if (m.style) m.style = sanitizeStyle(m.style);
                if (m.lightStyle) m.lightStyle = sanitizeStyle(m.lightStyle);
                return m;
            };

            const sanitizeResolutionConfig = (config: any) => {
                if (!config) return undefined;
                const c = { ...config };
                
                c.playAgainTargetIndex = Number(c.playAgainTargetIndex) || 0;
                
                if (c.transition) {
                    c.transition = { ...c.transition };
                    c.transition.duration = Number(c.transition.duration) || 0.5;
                    
                    if (c.transition.buttonConfig) c.transition.buttonConfig = sanitizeStyle(c.transition.buttonConfig);
                    if (c.transition.buttonStyle) c.transition.buttonStyle = sanitizeStyle(c.transition.buttonStyle);
                    if (c.transition.lightButtonStyle) c.transition.lightButtonStyle = sanitizeStyle(c.transition.lightButtonStyle);
                }
                
                if (c.secondaryButtonConfig) c.secondaryButtonConfig = sanitizeStyle(c.secondaryButtonConfig);
                if (c.secondaryButtonStyle) c.secondaryButtonStyle = sanitizeStyle(c.secondaryButtonStyle);
                if (c.lightSecondaryButtonStyle) c.lightSecondaryButtonStyle = sanitizeStyle(c.lightSecondaryButtonStyle);
                
                return c;
            };

            // --- PROCESS METHODS ---
            const finalMethods = await Promise.all(validMethods.map(async (m) => {
                let finalMethodId = m.methodId;
                
                if (m.isCreatingNew && m.draftMethod) {
                    const existingNames = new Set(allConversionMethods.map(cm => cm.name));
                    const uniqueName = ensureUniqueName(m.draftMethod.name || "New Method", existingNames);

                    // Deep clone to apply sanitization
                    const newMethodData = JSON.parse(JSON.stringify({
                        ...m.draftMethod,
                        name: uniqueName,
                        createdAt: new Date().toISOString(),
                        status: { code: 'ok', message: '' } as EntityStatus
                    }));

                    // Apply Sanitization to Styles
                    if (newMethodData.style) newMethodData.style = sanitizeStyle(newMethodData.style);
                    if (newMethodData.lightStyle) newMethodData.lightStyle = sanitizeStyle(newMethodData.lightStyle);
                    
                    // Apply Sanitization to Coupon Mask (if exists)
                    if (newMethodData.maskConfig) newMethodData.maskConfig = sanitizeMask(newMethodData.maskConfig);

                    // Aggressive Pruning (Prevents DB Bloat from Type Switching)
                    if (newMethodData.type !== 'form_submit') delete newMethodData.fields;
                    if (newMethodData.type !== 'social_follow') delete newMethodData.links;
                    if (newMethodData.type !== 'coupon_display') {
                        delete newMethodData.staticCode;
                        delete newMethodData.discountType;
                        delete newMethodData.discountValue;
                        delete newMethodData.clickToReveal;
                        delete newMethodData.revealScope;
                        delete newMethodData.maskConfig;
                    } else if (!newMethodData.clickToReveal) {
                        delete newMethodData.maskConfig;
                        delete newMethodData.revealScope;
                    }

                    const savedMethod = await createConversionMethod(newMethodData);
                    if (savedMethod) finalMethodId = savedMethod.id;
                    else throw new Error("Failed to save new method.");
                }

                const methodObj: any = {
                    instanceId: m.instanceId,
                    methodId: finalMethodId,
                };

                if (m.showContentAbove && m.contentAbove) methodObj.contentAbove = m.contentAbove;
                if (m.showContentBelow && m.contentBelow) methodObj.contentBelow = m.contentBelow;

                if (m.gate && m.gate.type !== 'none') {
                    // Sanitize Gate Mask Config & Resolution Config
                    const cleanGateMask = m.gate.maskConfig ? sanitizeMask(m.gate.maskConfig) : undefined;
                    const cleanResolutionConfig = m.gate.resolutionConfig ? sanitizeResolutionConfig(m.gate.resolutionConfig) : undefined;

                    if (m.gate.type === 'point_threshold' || m.gate.type === 'point_purchase') {
                         methodObj.gate = { 
                             type: m.gate.type,
                             ...(cleanGateMask ? { maskConfig: cleanGateMask } : {}),
                             ...(cleanResolutionConfig ? { resolutionConfig: cleanResolutionConfig } : {})
                         };
                    } else if (m.gate.type === 'on_success' && m.gate.methodInstanceId) {
                        const rawReplace = (m.gate as any).replacePrerequisite;
                        const isReplace = rawReplace === true || rawReplace === 'true';
                        
                        const rawVis = (m.gate as any).visibility;
                        const visibility = (rawVis === 'locked_mask' || rawVis === 'hidden') ? rawVis : 'hidden';

                        methodObj.gate = {
                            type: 'on_success',
                            methodInstanceId: m.gate.methodInstanceId,
                            visibility: visibility,
                            ...(isReplace ? { replacePrerequisite: true } : {}),
                            ...(cleanGateMask ? { maskConfig: cleanGateMask } : {})
                        };
                    }
                }

                return methodObj;
            }));

            // --- SCREEN SANITIZATION ---
            let validWidth = Number(data.style.width);
            if (data.style.width === '' || data.style.width === undefined || data.style.width === null || isNaN(validWidth) || validWidth === 0) {
                validWidth = 60;
            }

            let validSpacing = Number(data.style.spacing);
            if (data.style.spacing === '' || data.style.spacing === undefined || data.style.spacing === null || isNaN(validSpacing)) {
                validSpacing = 0;
            }

            const existingNames = new Set(
                allConversionScreens
                    .filter(s => s.id !== initialScreen?.id)
                    .map(s => s.name)
            );
            const finalName = ensureUniqueName(data.name, existingNames);

            const screenData: any = {
                name: finalName,
                layout: 'single_column',
                style: {
                    width: validWidth,
                    spacing: validSpacing,
                    verticalAlign: data.style.verticalAlign || 'center'
                },
                methods: finalMethods, 
                status: { code: 'ok', message: '' }
            };

            screenData.headline = showHeadline ? data.headline : '';
            screenData.bodyText = showBodyText ? data.bodyText : '';

            if (initialScreen?.id) await updateConversionScreen(initialScreen.id, screenData);
            else await createConversionScreen(screenData as Omit<ConversionScreen, 'id'>);

            notifications.success("Conversion Screen saved!");
            onSave(); 
        } catch (error) {
            console.error(error);
            notifications.error("Failed to save. Please try again.");
            setIsSaving(false);
        }
    };

    return (
        // Use height: 100% and overflow: hidden to contain the layout within the viewport
        <div style={{ display: 'flex', height: '650px', gap: '2rem', overflow: 'hidden' }}>
            
            {/* LEFT: BUILDER - Scrolls independently */}
            <div id="screen-builder-scroll-container" style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '1rem', height: '100%', overflowAnchor: 'none' }}>
                <button
                    type="button" 
                    onClick={onCancel}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: 0,
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                >
                    <span>←</span> Back
                </button>
                
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{...styles.h2, marginBottom: '0.5rem'}}>Create New Conversion Screen</h2>
                    <p style={styles.descriptionText}>Configure the final screen of your Macrogame.</p>
                </div>

                <div style={styles.configItem}>
                    <label>Internal Name</label>
                    <input type="text" {...register("name")} placeholder="e.g., Default Reward Screen" style={styles.input} />
                </div>

                {/* Main Content Section */}
                <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <h4 style={styles.h4}>Screen Content</h4>
                    
                    {/* HEADLINE */}
                    {!showHeadline && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                // Restore from memory or use default
                                const saved = lastScreenHeadline.current;
                                setValue('headline', saved || '<h1 style="text-align: center;">Unlock Your Reward!</h1>');
                                setShowHeadline(true); 
                            }} 
                            style={{ 
                                ...styles.secondaryButton, 
                                fontSize: '0.8rem', 
                                padding: '0.25rem 0.5rem', 
                                marginBottom: '1rem', 
                                width: 'fit-content' // Prevent stretching
                            }}
                        >
                            + Add Main Headline
                        </button>
                    )}
                    {showHeadline && (
                        <div style={styles.configItem}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Headline</label>
                            <SimpleTextEditor 
                                initialHtml={getValues('headline')} 
                                onChange={(html) => setValue('headline', html)} 
                                backgroundColor={editorStyle.backgroundColor}
                                defaultTextColor={editorStyle.defaultTextColor}
                            />
                            <button 
                                type="button" 
                                onClick={() => { 
                                    // Save to memory
                                    const current = getValues('headline');
                                    if (current) lastScreenHeadline.current = current;
                                    
                                    setShowHeadline(false); 
                                    setValue('headline', ''); 
                                }} 
                                style={{ 
                                    ...styles.deleteButton, 
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    width: 'fit-content' // Prevent stretching
                                }}
                            >
                                Remove Headline
                            </button>
                        </div>
                    )}
                    
                    {/* BODY TEXT */}
                    {!showBodyText && (
                        <button 
                            type="button" 
                            onClick={() => { 
                                // Restore from memory or use default
                                const saved = lastScreenBody.current;
                                setValue('bodyText', saved || '<p style="text-align: center; font-size: 1.25rem;">You can redeem your special offer here on the Conversion Screen.</p>');
                                setShowBodyText(true); 
                            }}
                            style={{ 
                                ...styles.secondaryButton, 
                                fontSize: '0.8rem', 
                                padding: '0.25rem 0.5rem', 
                                marginBottom: '1rem', 
                                width: 'fit-content' // Prevent stretching
                            }}
                        >
                            + Add Main Body Text
                        </button>
                    )}
                    {showBodyText && (
                        <div style={{ ...styles.configItem, marginTop: '1.5rem' }}>
                            <label style={{ marginBottom: '0.5rem', display: 'block' }}>Body Text</label>
                            <SimpleTextEditor 
                                initialHtml={getValues('bodyText')} 
                                onChange={(html) => setValue('bodyText', html)} 
                                backgroundColor={editorStyle.backgroundColor}
                                defaultTextColor={editorStyle.defaultTextColor}
                            />
                            <button 
                                type="button" 
                                onClick={() => { 
                                    // Save to memory
                                    const current = getValues('bodyText');
                                    if (current) lastScreenBody.current = current;

                                    setShowBodyText(false); 
                                    setValue('bodyText', ''); 
                                }} 
                                style={{ 
                                    ...styles.deleteButton, 
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    width: 'fit-content' // Prevent stretching
                                }}
                            >
                                Remove Body Text
                            </button>
                        </div>
                    )}
                </div>

                <h4 style={{ ...styles.h4, marginTop: '2rem' }}>Conversion Methods</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {fields.map((field, index) => {
                        const isCollapsed = watch(`methods.${index}.isSectionCollapsed`);
                        
                        // --- FIX: Define variables here so they are available for the Header ---
                        const selectedMethodId = watch(`methods.${index}.methodId`);
                        const selectedMethod = allConversionMethods.find(m => m.id === selectedMethodId);
                        
                        const isCreatingNew = watch(`methods.${index}.isCreatingNew`);
                        const showContentAbove = watch(`methods.${index}.showContentAbove`);
                        const showContentBelow = watch(`methods.${index}.showContentBelow`);
                        // Filter available prerequisites:
                        // 1. Must come BEFORE current method
                        // 2. If Coupon, MUST have 'clickToReveal' enabled
                        const availableGates = watchedValues.methods.filter((m, i) => {
                            if (i >= index) return false; // Must be before

                            // Resolve the actual data (Draft vs Saved)
                            const methodData = m.isCreatingNew 
                                ? m.draftMethod 
                                : allConversionMethods.find(saved => saved.id === m.methodId);

                            if (!methodData) return false;

                            // Specific Rule: Coupon Display
                            if (methodData.type === 'coupon_display') {
                                // Cast to any to access the specific field safely
                                return (methodData as any).clickToReveal === true;
                            }

                            // All other methods (Email, Form, Link, Social) imply action/success by default
                            return true;
                        });

                        return (
                            <div key={field.id} id={`method-card-${index}`} style={{ border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', overflow: 'hidden', marginBottom: '1rem' }}>
                                
                                {/* HEADER (Always Visible) */}
                                <div 
                                    style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '1rem',
                                        backgroundColor: isCollapsed ? '#f9f9f9' : '#fff',
                                        borderBottom: isCollapsed ? 'none' : '1px solid #eee',
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                                        const current = getValues(`methods.${index}`);
                                        update(index, { ...current, isSectionCollapsed: !current.isSectionCollapsed });
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#666', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block' }}>▼</span>
                                        <h5 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
                                            Method {index + 1}
                                            {isCollapsed && selectedMethod && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>— {selectedMethod.name}</span>}
                                            {isCollapsed && isCreatingNew && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>— (New Draft)</span>}
                                        </h5>
                                    </div>
                                    <div>
                                        <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} style={styles.flowCardButton}>▲</button>
                                        <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} style={styles.flowCardButton}>▼</button>
                                        <button type="button" onClick={() => remove(index)} style={{ ...styles.deleteButton, marginLeft: '0.5rem' }}>Remove</button>
                                    </div>
                                </div>

                                {/* CARD BODY (Collapsible) */}
                                {!isCollapsed && (
                                    <div style={{ padding: '1.5rem' }}>
                                        {/* Content Above */}
                                        {(!showContentAbove && (watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`))) && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    // Update: Restore from memory if exists
                                                    const instanceId = getValues(`methods.${index}.instanceId`);
                                                    const saved = lastMethodContent.current[instanceId]?.above;
                                                    if (saved) setValue(`methods.${index}.contentAbove`, saved);
                                                    
                                                    setValue(`methods.${index}.showContentAbove`, true);
                                                }} 
                                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: '100%' }}
                                            >
                                                + Add Content Block (Above Method)
                                            </button>
                                        )}
                                        {showContentAbove && (
                                            <div style={{ marginBottom: '1rem', borderLeft: '3px solid #0866ff', paddingLeft: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Content Above</label>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { 
                                                            // Update: Save to memory before clearing
                                                            const instanceId = getValues(`methods.${index}.instanceId`);
                                                            const currentVal = getValues(`methods.${index}.contentAbove`);
                                                            if (!lastMethodContent.current[instanceId]) lastMethodContent.current[instanceId] = {};
                                                            lastMethodContent.current[instanceId].above = currentVal;

                                                            setValue(`methods.${index}.showContentAbove`, false); 
                                                            setValue(`methods.${index}.contentAbove`, ''); 
                                                        }} 
                                                        style={{ color: '#d9534f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <SimpleTextEditor initialHtml={getValues(`methods.${index}.contentAbove`)} onChange={(html) => setValue(`methods.${index}.contentAbove`, html)} backgroundColor={editorStyle.backgroundColor} defaultTextColor={editorStyle.defaultTextColor} />
                                            </div>
                                        )}

                                        {/* --- METHOD CONFIGURATION AREA --- */}
                                        <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
                                            
                                            {/* 1. Method Type Selector */}
                                            <div style={styles.configItem}>
                                                <label>Method Type</label>
                                                <select value={isCreatingNew ? (watch(`methods.${index}.draftMethod.type`) || '') : (allConversionMethods.find(m => m.id === watch(`methods.${index}.methodId`))?.type || '')} onChange={(e) => handleMethodTypeChange(index, e.target.value)} style={styles.input}>
                                                    <option value="" disabled>Select a method type...</option>
                                                    <option value="coupon_display">Coupon Display</option>
                                                    <option value="email_capture">Email Capture</option>
                                                    <option value="link_redirect">Link Redirect</option>
                                                    <option value="form_submit">Form Submit</option>
                                                    <option value="social_follow">Social Follow</option>
                                                </select>
                                            </div>

                                            {/* 2. Variant Selector & Name Assignment */}
                                            {(() => {
                                                const currentType = isCreatingNew ? watch(`methods.${index}.draftMethod.type`) : allConversionMethods.find(m => m.id === watch(`methods.${index}.methodId`))?.type;
                                                if (!currentType) return null;
                                                const variants = allConversionMethods.filter(m => m.type === currentType);
                                                
                                                return (
                                                    <div style={{ marginTop: '1rem' }}>
                                                        <div style={styles.configItem}>
                                                            <label>Select Variant</label>
                                                            <select 
                                                                value={isCreatingNew ? 'DEFAULT' : watch(`methods.${index}.methodId`)} 
                                                                onChange={(e) => handleVariantChange(index, e.target.value)} 
                                                                style={styles.input}
                                                            >
                                                                <option value="DEFAULT">Default Template</option>
                                                                {variants.length > 0 && (
                                                                    <optgroup label="My Saved Variants">
                                                                        {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                                    </optgroup>
                                                                )}
                                                            </select>
                                                        </div>

                                                        {isCreatingNew && (
                                                            <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe' }}>
                                                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#084298' }}>
                                                                    A new conversion method will be saved if you use the Default Template.
                                                                </p>
                                                                <div style={styles.configItem}>
                                                                    <label style={{ fontSize: '0.85rem', color: '#084298', fontWeight: 'bold' }}>Method Name</label>
                                                                    <input 
                                                                        type="text" 
                                                                        {...register(`methods.${index}.draftMethod.name`)} 
                                                                        placeholder={`New ${currentType.replace(/_/g, ' ')}`}
                                                                        style={{ ...styles.input, borderColor: '#b6d4fe' }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* --- HOISTED COUPON FIELDS (Quick Access) --- */}
                                            {/* Only show if creating new (draft) and it is a coupon */}
                                            {(() => {
                                                // Update: Allow rendering if we have a draftMethod with correct type, regardless of isCreatingNew
                                                const draft = watch(`methods.${index}.draftMethod`);
                                                if (!draft || draft.type !== 'coupon_display') return null;

                                                // Helper: Auto-fork on edit
                                                const handleTouch = () => {
                                                    const current = getValues(`methods.${index}`);
                                                    if (!current.isCreatingNew) {
                                                        setValue(`methods.${index}.isCreatingNew`, true);
                                                        setValue(`methods.${index}.methodId`, ''); // Clear ID to force new creation
                                                    }
                                                };

                                                return (
                                                    <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
                                                        
                                                        {/* HOISTED CONTENT SECTION */}
                                                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Coupon Content</h4>
                                                        
                                                        <div style={{ marginBottom: '1.5rem' }}>
                                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>Headline</label>
                                                            <SimpleTextEditor 
                                                                initialHtml={getValues(`methods.${index}.draftMethod.headline`)} 
                                                                onChange={(html) => { handleTouch(); setValue(`methods.${index}.draftMethod.headline`, html); }} 
                                                                backgroundColor={editorStyle.backgroundColor} 
                                                                defaultTextColor={editorStyle.defaultTextColor} 
                                                            />
                                                        </div>

                                                        <div style={{ marginBottom: '2rem' }}>
                                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>Body Text</label>
                                                            <SimpleTextEditor 
                                                                initialHtml={getValues(`methods.${index}.draftMethod.subheadline`)} 
                                                                onChange={(html) => { handleTouch(); setValue(`methods.${index}.draftMethod.subheadline`, html); }} 
                                                                backgroundColor={editorStyle.backgroundColor} 
                                                                defaultTextColor={editorStyle.defaultTextColor} 
                                                            />
                                                        </div>

                                                        {/* EXISTING COUPON LOGIC SECTION */}
                                                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Coupon Code & Logic</h4>
                                                        
                                                        {/* Row 1: Type & Code */}
                                                        <div style={styles.configRow}>
                                                            <div style={styles.configItem}>
                                                                <label>Coupon Type</label>
                                                                <select 
                                                                    {...register(`methods.${index}.draftMethod.codeType`, { onChange: handleTouch })} 
                                                                    style={styles.input}
                                                                >
                                                                    <option value="static">Static Code</option>
                                                                    <option value="dynamic" disabled>Dynamic (Coming Soon)</option>
                                                                </select>
                                                            </div>
                                                            <div style={styles.configItem}>
                                                                <label>Static Code</label>
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="" 
                                                                    {...register(`methods.${index}.draftMethod.staticCode`, {
                                                                        onChange: (e) => {
                                                                            handleTouch();
                                                                            // Update: Enforce Uppercase
                                                                            setValue(`methods.${index}.draftMethod.staticCode`, e.target.value.toUpperCase());
                                                                        }
                                                                    })} 
                                                                    style={{ ...styles.input, textTransform: 'uppercase' }} 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Discount & Value */}
                                                        <div style={{...styles.configRow, marginTop: '1rem'}}>
                                                            <div style={styles.configItem}>
                                                                <label>Discount Type</label>
                                                                <select 
                                                                    {...register(`methods.${index}.draftMethod.discountType`, { onChange: handleTouch })} 
                                                                    style={styles.input}
                                                                >
                                                                    <option value="percentage">% Percentage</option>
                                                                    <option value="fixed_amount">$ Fixed</option>
                                                                </select>
                                                            </div>
                                                            <div style={styles.configItem}>
                                                                <label>Value</label>
                                                                <Controller
                                                                    name={`methods.${index}.draftMethod.discountValue`}
                                                                    control={control}
                                                                    render={({ field }) => {
                                                                        const type = watch(`methods.${index}.draftMethod.discountType`);
                                                                        const max = type === 'percentage' ? 100 : undefined;
                                                                        return (
                                                                            <SmartNumberInput 
                                                                                step="0.01" 
                                                                                min={0} max={max}
                                                                                fallbackValue={0}
                                                                                value={field.value ?? 0}
                                                                                onChange={val => {
                                                                                    handleTouch(); // Ensures preview branches to draft properly
                                                                                    let num = val;
                                                                                    if (max && num > max) num = max;
                                                                                    if (num < 0) num = 0;
                                                                                    field.onChange(num);
                                                                                }}
                                                                                style={styles.input} 
                                                                            />
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>

                                                    {/* REVEAL SETTINGS BLOCK */}
                                                    <div style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px', border: '1px solid #eee' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0, fontSize: '0.95rem', color: '#333' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    {...register(`methods.${index}.draftMethod.clickToReveal`, {
                                                                        onChange: (e) => {
                                                                            handleTouch(); // Force branch to draft
                                                                            if (e.target.checked) {
                                                                                // 1. Text & Icon Defaults
                                                                            setValue(`methods.${index}.draftMethod.maskConfig.headline`, "Click to Reveal the Coupon Code");
                                                                            setValue(`methods.${index}.draftMethod.maskConfig.showIcon`, true);
                                                                            setValue(`methods.${index}.draftMethod.maskConfig.codeHeadline`, "REVEAL");
                                                                            
                                                                            // 2. Color Defaults based on Scope
                                                                                const currentScope = getValues(`methods.${index}.draftMethod.revealScope`);
                                                                                const maskPrefix = `methods.${index}.draftMethod.maskConfig`;

                                                                                if (currentScope === 'code_only') {
                                                                                    // Dark Theme (Yellow/Black)
                                                                                    setValue(`${maskPrefix}.style.backgroundColor`, "#cfc33a");
                                                                                    setValue(`${maskPrefix}.style.textColor`, "#000000");
                                                                                    // Light Theme (Dark/White)
                                                                                    setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#1a1a1a");
                                                                                    setValue(`${maskPrefix}.lightStyle.textColor`, "#ffffff");
                                                                                } else {
                                                                                    setValue(`${maskPrefix}.style.backgroundColor`, "#1a1a1a");
                                                                                    setValue(`${maskPrefix}.style.textColor`, "#ffffff");
                                                                                }
                                                                            }
                                                                        }
                                                                    })} 
                                                                />
                                                                <span style={{ fontWeight: 'bold' }}>Enable Click to Reveal</span>
                                                            </label>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setRevealResetTrigger({ instanceId: getValues(`methods.${index}.instanceId`), timestamp: Date.now() })} 
                                                                title="Reset Preview to test reveal"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#0866ff',
                                                                    fontSize: '0.85rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    padding: 0
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>↻</span> Reset Reveal
                                                            </button>
                                                        </div>

                                                        {watch(`methods.${index}.draftMethod.clickToReveal`) && (
                                                            <>
                                                                <div style={{ marginBottom: '1.5rem' }}>
                                                                    <div style={styles.configItem}>
                                                                        <label>Reveal Scope</label>
                                                                        <select 
                                                                            {...register(`methods.${index}.draftMethod.revealScope`, {
                                                                                onChange: (e) => {
                                                                                    handleTouch(); // Force branch to draft
                                                                                    const val = e.target.value;
                                                                                    const maskPrefix = `methods.${index}.draftMethod.maskConfig`;

                                                                                    if (val === 'code_only') {
                                                                                        // Dark Theme (Yellow/Black)
                                                                                        setValue(`${maskPrefix}.style.backgroundColor`, "#cfc33a");
                                                                                        setValue(`${maskPrefix}.style.textColor`, "#000000");
                                                                                        
                                                                                        // Light Theme (Dark/White)
                                                                                        setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#1a1a1a");
                                                                                        setValue(`${maskPrefix}.lightStyle.textColor`, "#ffffff");
                                                                                        // Inject Short Headline into the correct variable
                                                                                        setValue(`${maskPrefix}.codeHeadline`, "REVEAL");
                                                                                    } else {
                                                                                        // Full Reveal Defaults
                                                                                        
                                                                                        // Dark Theme (Dark/White)
                                                                                        setValue(`${maskPrefix}.style.backgroundColor`, "#1a1a1a");
                                                                                        setValue(`${maskPrefix}.style.textColor`, "#ffffff");

                                                                                        // Light Theme (Light/Black)
                                                                                        setValue(`${maskPrefix}.lightStyle.backgroundColor`, "#f5f5f5");
                                                                                        setValue(`${maskPrefix}.lightStyle.textColor`, "#000000");
                                                                                    }
                                                                                }
                                                                            })} 
                                                                            style={styles.input}
                                                                        >
                                                                            <option value="entire_card">Cover Entire Coupon</option>
                                                                            <option value="code_only">Cover Code Only</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Unified Mask Configuration Form */}
                                                                <MaskConfigurationForm 
                                                                    register={register}
                                                                    control={control}
                                                                    setValue={setValue}
                                                                    prefix={`methods.${index}.draftMethod.maskConfig`}
                                                                    defaultHeadline="Click to Reveal the Coupon Code"
                                                                    isCodeOnlyScope={watch(`methods.${index}.draftMethod.revealScope`) === 'code_only'}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })()}

                                            {/* --- HOISTED SOCIAL FIELDS (Quick Access) --- */}
                                            {(() => {
                                                const draft = watch(`methods.${index}.draftMethod`);
                                                if (!draft || draft.type !== 'social_follow') return null;

                                                const handleTouch = () => {
                                                    const current = getValues(`methods.${index}`);
                                                    if (!current.isCreatingNew) {
                                                        setValue(`methods.${index}.isCreatingNew`, true);
                                                        setValue(`methods.${index}.methodId`, ''); 
                                                    }
                                                };

                                                const links = draft.links || [];

                                                return (
                                                    <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
                                                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Social Platforms</h4>
                                                        <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                                                            {links.map((link: any, linkIdx: number) => {
                                                                const isEnabled = watch(`methods.${index}.draftMethod.links.${linkIdx}.isEnabled`);
                                                                return (
                                                                    <div key={link.platform || linkIdx} style={{ ...styles.configRow, alignItems: 'center', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '140px' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                {...register(`methods.${index}.draftMethod.links.${linkIdx}.isEnabled`, { onChange: handleTouch })}
                                                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                                            />
                                                                            <input type="hidden" {...register(`methods.${index}.draftMethod.links.${linkIdx}.platform`)} />
                                                                            <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.95rem', color: isEnabled ? '#000' : '#999' }}>
                                                                                {link.platform}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ flex: 1, opacity: isEnabled ? 1 : 0.3, pointerEvents: isEnabled ? 'auto' : 'none' }}>
                                                                            <input
                                                                                placeholder={`https://${link.platform}.com/...`}
                                                                                type="url"
                                                                                {...register(`methods.${index}.draftMethod.links.${linkIdx}.url`, { onChange: handleTouch })}
                                                                                style={styles.input}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* --- HOISTED LINK REDIRECT FIELDS (Quick Access) --- */}
                                            {(() => {
                                                const draft = watch(`methods.${index}.draftMethod`);
                                                if (!draft || draft.type !== 'link_redirect') return null;

                                                const handleTouch = () => {
                                                    const current = getValues(`methods.${index}`);
                                                    if (!current.isCreatingNew) {
                                                        setValue(`methods.${index}.isCreatingNew`, true);
                                                        setValue(`methods.${index}.methodId`, ''); 
                                                    }
                                                };

                                                return (
                                                    <div style={{ marginTop: '1rem', padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px' }}>
                                                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Destination</h4>
                                                        <div style={styles.configItem}>
                                                            <label>Destination URL</label>
                                                            <input type="url" placeholder="https://..." {...register(`methods.${index}.draftMethod.url`, { onChange: handleTouch })} style={styles.input} />
                                                        </div>
                                                        <div style={styles.configItem}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                                <input type="checkbox" {...register(`methods.${index}.draftMethod.utmEnabled`, { onChange: handleTouch })} />
                                                                <span><strong>Auto-Append UTM Parameters</strong></span>
                                                            </label>
                                                        </div>
                                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Window</label>
                                                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                                    <input type="radio" value="true" {...register(`methods.${index}.draftMethod.openInNewTab`, { onChange: handleTouch })} checked={String(watch(`methods.${index}.draftMethod.openInNewTab`)) === 'true'} />
                                                                    New Tab
                                                                </label>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                                    <input type="radio" value="false" {...register(`methods.${index}.draftMethod.openInNewTab`, { onChange: handleTouch })} checked={String(watch(`methods.${index}.draftMethod.openInNewTab`)) === 'false'} />
                                                                    Same Tab
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* 3. Edit / Customize Button */}
                                            {(watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`)) && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const scrollContainer = document.getElementById('screen-builder-scroll-container');
                                                            const currentScroll = scrollContainer?.scrollTop;

                                                            const current = getValues(`methods.${index}`);
                                                            if (!current.isCreatingNew && !current.isExpanded) {
                                                                const originalId = current.methodId;
                                                                const originalData = allConversionMethods.find(m => m.id === originalId);
                                                                if (originalData) {
                                                                    update(index, {
                                                                        ...current,
                                                                        isCreatingNew: true,
                                                                        isExpanded: true,
                                                                        methodId: '',
                                                                        draftMethod: { ...originalData }
                                                                    });
                                                                }
                                                            } else {
                                                                update(index, { ...current, isExpanded: !current.isExpanded });
                                                            }

                                                            // Force restore scroll position to prevent browser/Quill from jumping
                                                            if (scrollContainer && currentScroll !== undefined) {
                                                                setTimeout(() => {
                                                                    scrollContainer.scrollTop = currentScroll;
                                                                }, 0);
                                                                setTimeout(() => {
                                                                    scrollContainer.scrollTop = currentScroll;
                                                                }, 50); // Double safety net for React render cycle completion
                                                            }
                                                        }} 
                                                        style={watch(`methods.${index}.isExpanded`) ? { ...styles.secondaryButton, backgroundColor: '#e4e6eb', color: '#666' } : styles.secondaryButton}
                                                    >
                                                        {watch(`methods.${index}.isExpanded`) 
                                                            ? 'Close Editor' 
                                                            : (watch(`methods.${index}.isCreatingNew`) ? 'Customize Further' : 'Duplicate & Customize Variant')
                                                        }
                                                    </button>
                                                    
                                                    {(!watch(`methods.${index}.isExpanded`) && !watch(`methods.${index}.isCreatingNew`)) && (
                                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', marginLeft: '0.25rem' }}>
                                                            Modifying this will create a detached copy to protect your saved variant.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 4. The Builder Form */}
                                            {(watch(`methods.${index}.isCreatingNew`) && watch(`methods.${index}.isExpanded`)) && (
                                                <div style={{ marginTop: '1rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                                    <ConversionMethodFormFields 
                                                        control={control} 
                                                        register={register} 
                                                        watch={watch} 
                                                        setValue={setValue} 
                                                        getValues={getValues} 
                                                        prefix={`methods.${index}.draftMethod`} 
                                                        hideTypeSelector={true}
                                                        hideCouponConfiguration={true}
                                                        hideSocialConfiguration={true}
                                                        hideContentSection={watch(`methods.${index}.draftMethod.type`) === 'coupon_display'}
                                                        hideInternalName={true}
                                                        hideDestinationConfiguration={true}
                                                        previewIsPlaying={previewIsPlaying}
                                                        hasStartedPlaying={hasStartedPlaying}
                                                        onTogglePlay={() => { setPreviewIsPlaying(!previewIsPlaying); setHasStartedPlaying(true); }}
                                                        onResetPreview={() => { setPreviewRefreshKey(prev => prev + 1); setPreviewIsPlaying(false); setHasStartedPlaying(false); }}
                                                        onResetReveal={() => setRevealResetTrigger({ instanceId: getValues(`methods.${index}.instanceId`), timestamp: Date.now() })}
                                                    />
                                                </div>
                                            )}

                                            {/* 5. Gate Controls */}
                                            {(watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`)) && (
                                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                                                    <div style={styles.configItem}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <label>Gate Type</label>
                                                            {/* REFRESH BUTTON */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewRefreshKey(prev => prev + 1)}
                                                                title="Reset Preview to test gating logic"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    color: '#0866ff',
                                                                    fontSize: '0.85rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.25rem',
                                                                    padding: 0
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>↻</span> Reset Preview
                                                            </button>
                                                        </div>
                                                        <select 
                                                            {...register(`methods.${index}.gate.type`, {
                                                                onChange: (e) => {
                                                                    const val = e.target.value;
                                                                    setValue(`methods.${index}.gate.type`, val as any);

                                                                    // 1. Clear Prerequisite ID if not on_success
                                                                    if (val !== 'on_success') {
                                                                        setValue(`methods.${index}.gate.methodInstanceId`, undefined);
                                                                    }

                                                                    // 2. Set Defaults for the Mask based on Type
                                                                    const maskPath = `methods.${index}.gate.maskConfig`;
                                                                    
                                                                    if (val === 'point_threshold') {
                                                                        setValue(`${maskPath}.headline`, "Earn enough points to unlock the reward!");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                        setValue(`${maskPath}.showPointLabel`, true);
                                                                        setValue(`${maskPath}.strokeStyle`, 'none');
                                                                    } else if (val === 'point_purchase') {
                                                                        setValue(`${maskPath}.headline`, "Exclusive Reward");
                                                                        setValue(`${maskPath}.body`, "Spend your points to unlock this reward.");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                        setValue(`${maskPath}.unaffordableHeadline`, "Keep Playing!");
                                                                        setValue(`${maskPath}.unaffordableBody`, "You don't have enough points yet.");
                                                                        setValue(`${maskPath}.unaffordableShowIcon`, true);
                                                                        setValue(`${maskPath}.purchaseButtonText`, "Buy for {{cost}} Points");
                                                                        setValue(`${maskPath}.showPointLabel`, true); // Default label to true
                                                                        setValue(`${maskPath}.strokeStyle`, 'none'); // Default stroke to none
                                                                        
                                                                        // Initialize Resolution Routing Defaults so it overrides the fallback button
                                                                        setValue(`methods.${index}.gate.resolutionConfig`, {
                                                                            isPlayAgainEnabled: true,
                                                                            isContinueEnabled: false,
                                                                            playAgainBehavior: 'keep_points',
                                                                            transition: {
                                                                                type: 'zoom_in',
                                                                                duration: 0.5,
                                                                                buttonConfig: { text: "Play Again to Earn Points" }
                                                                            }
                                                                        });
                                                                    } else if (val === 'on_success') {
                                                                        setValue(`${maskPath}.headline`, "Unlock by completing the prior step.");
                                                                        setValue(`${maskPath}.body`, "");
                                                                        setValue(`${maskPath}.showIcon`, true);
                                                                        setValue(`${maskPath}.strokeStyle`, 'none');
                                                                    }
                                                                }
                                                            })} 
                                                            style={styles.input}
                                                        >
                                                            <option value="none">None (Always Visible)</option>
                                                            <option value="on_success">On Method Success</option>
                                                            <option value="point_threshold">Point Threshold (Milestone)</option>
                                                            <option value="point_purchase">Point Purchase (Spend)</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* UI for On Success */}
                                                    {watch(`methods.${index}.gate.type`) === 'on_success' && (
                                                        <>
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <label style={{ fontSize: '0.9rem' }}>Required Method</label>
                                                                <select {...register(`methods.${index}.gate.methodInstanceId`)} style={styles.input}>
                                                                    <option value="">Select prerequisite...</option>
                                                                    {availableGates.map((g, i) => (
                                                                        <option key={g.instanceId} value={g.instanceId}>Method {i + 1}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Show Locked Mask?</label>
                                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input type="radio" value="hidden" {...register(`methods.${index}.gate.visibility` as any)} defaultChecked={!watch(`methods.${index}.gate.visibility`) || watch(`methods.${index}.gate.visibility`) === 'hidden'} style={{ marginRight: '0.3rem' }} /> No (Hide)
                                                                        </label>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input type="radio" value="locked_mask" {...register(`methods.${index}.gate.visibility` as any)} style={{ marginRight: '0.3rem' }} /> Yes (Mask)
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>Replace Prerequisite?</label>
                                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input 
                                                                                type="radio" 
                                                                                value="false" 
                                                                                {...register(`methods.${index}.gate.replacePrerequisite` as any)} 
                                                                                style={{ marginRight: '0.3rem' }} 
                                                                            /> 
                                                                            No
                                                                        </label>
                                                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                            <input 
                                                                                type="radio" 
                                                                                value="true" 
                                                                                {...register(`methods.${index}.gate.replacePrerequisite` as any)} 
                                                                                style={{ marginRight: '0.3rem' }} 
                                                                            /> 
                                                                            Yes
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Helper UI for Points */}
                                                    {(watch(`methods.${index}.gate.type`) === 'point_threshold' || watch(`methods.${index}.gate.type`) === 'point_purchase') && (
                                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe', color: '#084298', fontSize: '0.85rem' }}>
                                                            <strong>Note:</strong> You will set the actual point value for this reward in the <em>Macrogame Creator</em>. The controls below are just for previewing the look.
                                                        </div>
                                                    )}

                                                    {/* Point Simulation Controls */}
                                                    {(watch(`methods.${index}.gate.type`) === 'point_threshold' || watch(`methods.${index}.gate.type`) === 'point_purchase') && (
                                                        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
                                                            <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Preview Simulation</h6>
                                                            
                                                            {previewGateState === 'unlocked' ? (
                                                                <div style={{ padding: '0.75rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', border: '1px solid #ffeeba', fontSize: '0.85rem' }}>
                                                                    <strong>Simulation Disabled:</strong> You are currently in "Force Unlock All" mode. Switch back to "Evaluate Locks" in the preview toolbar to test gate logic and thresholds.
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div style={{ marginBottom: '1rem' }}>
                                                                        <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                                                            Progress
                                                                            <span>{simProgress}%</span>
                                                                        </label>
                                                                        <input 
                                                                            type="range" 
                                                                            min="0" max="100" 
                                                                            value={simProgress} 
                                                                            onChange={(e) => setSimProgress(Number(e.target.value))}
                                                                            style={{ width: '100%' }} 
                                                                        />
                                                                    </div>

                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                                                                        <input type="checkbox" {...register(`methods.${index}.gate.maskConfig.showPointLabel`)} />
                                                                        Include "Point Label" (e.g. 500 / 1000 Points)
                                                                    </label>

                                                                    {watch(`methods.${index}.gate.maskConfig.showPointLabel`) && (
                                                                        <div style={styles.configItem}>
                                                                            <label style={{ fontSize: '0.8rem' }}>Simulated "Required Points"</label>
                                                                            <SmartNumberInput 
                                                                                value={simReqPoints} 
                                                                                onChange={(val) => setSimReqPoints(val)}
                                                                                fallbackValue={1000}
                                                                                style={styles.input} 
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* --- MASK CONFIGURATION FORM --- */}
                                                    {/* Show if: 
                                                        1. Gate is Point Purchase
                                                        2. Gate is On Success AND Visibility is 'locked_mask' 
                                                        3. Gate is Point Threshold
                                                    */}
                                                    {(() => {
                                                        const gType = watch(`methods.${index}.gate.type`);
                                                        const gVis = watch(`methods.${index}.gate.visibility`);
                                                        
                                                        const showMaskConfig = 
                                                            gType === 'point_purchase' || 
                                                            gType === 'point_threshold' ||
                                                            (gType === 'on_success' && gVis === 'locked_mask');

                                                        if (!showMaskConfig) return null;

                                                        return (
                                                            <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                                                <MaskConfigurationForm 
                                                                    register={register}
                                                                    control={control}
                                                                    setValue={setValue}
                                                                    prefix={`methods.${index}.gate.maskConfig`}
                                                                    defaultHeadline={gType === 'point_purchase' ? "Purchase Reward" : "LOCKED"}
                                                                    maskType={gType as any} // Pass the gate type to control color pickers
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    {/* --- RESOLUTION ROUTING EDITOR --- */}
                                                    {(() => {
                                                        const gType = watch(`methods.${index}.gate.type`);
                                                        if (gType !== 'point_purchase' && gType !== 'point_threshold') return null;

                                                        return (
                                                            <GateResolutionEditor 
                                                                index={index}
                                                                register={register}
                                                                control={control}
                                                                watch={watch}
                                                                setValue={setValue}
                                                                getValues={getValues}
                                                                allConversionScreens={allConversionScreens}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Below */}
                                        {(!showContentBelow && (watch(`methods.${index}.methodId`) || watch(`methods.${index}.isCreatingNew`))) && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    // Update: Restore from memory if exists
                                                    const instanceId = getValues(`methods.${index}.instanceId`);
                                                    const saved = lastMethodContent.current[instanceId]?.below;
                                                    if (saved) setValue(`methods.${index}.contentBelow`, saved);

                                                    setValue(`methods.${index}.showContentBelow`, true);
                                                }} 
                                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginTop: '1rem', width: '100%' }}
                                            >
                                                + Add Content Block (Below Method)
                                            </button>
                                        )}
                                        {showContentBelow && (
                                            <div style={{ marginTop: '1rem', borderLeft: '3px solid #0866ff', paddingLeft: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.8rem' }}>Content Below</label>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => { 
                                                            // Update: Save to memory before clearing
                                                            const instanceId = getValues(`methods.${index}.instanceId`);
                                                            const currentVal = getValues(`methods.${index}.contentBelow`);
                                                            if (!lastMethodContent.current[instanceId]) lastMethodContent.current[instanceId] = {};
                                                            lastMethodContent.current[instanceId].below = currentVal;

                                                            setValue(`methods.${index}.showContentBelow`, false); 
                                                            setValue(`methods.${index}.contentBelow`, ''); 
                                                        }} 
                                                        style={{ color: '#d9534f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <SimpleTextEditor initialHtml={getValues(`methods.${index}.contentBelow`)} onChange={(html) => setValue(`methods.${index}.contentBelow`, html)} backgroundColor={editorStyle.backgroundColor} defaultTextColor={editorStyle.defaultTextColor} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Method Button with Auto-Collapse Logic */}
                    {(() => {
                        const lastMethod = fields[fields.length - 1];
                        // Logic: Can add if NO methods exist, OR if the last method has a selection
                        const canAdd = !lastMethod || (watch(`methods.${fields.length - 1}.methodId`) || watch(`methods.${fields.length - 1}.isCreatingNew`));
                        
                        return canAdd && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    const currentMethods = getValues('methods');
                                    const newIndex = currentMethods.length; // The index of the new card being added
                                    
                                    // 1. Collapse all existing methods to save space
                                    const collapsedMethods = currentMethods.map(m => ({ ...m, isSectionCollapsed: true }));
                                    
                                    // 2. Update the list with collapsed items + new open item
                                    replace([
                                        ...collapsedMethods,
                                        { 
                                            instanceId: generateUUID(), 
                                            methodId: '', 
                                            isCreatingNew: false, 
                                            isSectionCollapsed: false, // New one starts open
                                            showContentAbove: false, 
                                            contentAbove: '', 
                                            showContentBelow: false, 
                                            contentBelow: '', 
                                            gate: { type: 'none', resolutionConfig: getDefaultResolutionConfig() } 
                                        }
                                    ]);

                                    // 3. Frame the new method card in the viewport
                                    setTimeout(() => {
                                        const scrollContainer = document.getElementById('screen-builder-scroll-container');
                                        const newCard = document.getElementById(`method-card-${newIndex}`);
                                        
                                        if (scrollContainer && newCard) {
                                            const containerRect = scrollContainer.getBoundingClientRect();
                                            const cardRect = newCard.getBoundingClientRect();
                                            
                                            // Set the scroll position so the top of the new card is 20px from the top of the container
                                            scrollContainer.scrollTop += (cardRect.top - containerRect.top) - 20;
                                        }
                                    }, 50); // 50ms ensures React has fully painted the collapsed states and the new card
                                }} 
                                style={{ ...styles.secondaryButton, marginTop: '1rem' }}
                            >
                                + Add Method
                            </button>
                        );
                    })()}
                </div>

                {/* Layout & Sizing Section (Below Methods) */}
                <div style={{ marginTop: '3rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                    <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem' }}>Layout & Sizing</h4>
                    
                    <div style={{ padding: '0.75rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe', color: '#084298', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        <strong>Note:</strong> Outer padding and global bounds are inherited automatically from the Macrogame's Global Settings to ensure a perfectly cohesive layout.
                    </div>

                    <div style={styles.configRow}>
                        <div style={styles.configItem}>
                            <label>
                                Container Width (%)
                                {previewOrientation === 'portrait' && <span style={{ color: '#f39c12', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Locked in Portrait)</span>}
                            </label>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* 1. Slider (Coarse Adjustment) */}
                                <input 
                                    type="range" 
                                    min="20" 
                                    max="100" 
                                    step="5"
                                    {...register("style.width", { valueAsNumber: true })} 
                                    disabled={previewOrientation === 'portrait'}
                                    style={{
                                        flex: 1, // Takes up remaining space
                                        cursor: previewOrientation === 'portrait' ? 'not-allowed' : 'pointer',
                                        opacity: previewOrientation === 'portrait' ? 0.5 : 1,
                                        margin: 0
                                    }}
                                />

                                {/* 2. Number Input (Fine Adjustment) */}
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <SmartNumberInput 
                                        min={20} max={100}
                                        fallbackValue={60}
                                        value={watch("style.width") ?? 60}
                                        onChange={val => { if (val > 100) val = 100; if (val < 20 && val !== 0) val = 20; setValue("style.width", val); }}
                                        disabled={previewOrientation === 'portrait'}
                                        style={{
                                            ...styles.input,
                                            width: '100px',
                                            textAlign: 'left',
                                            paddingRight: '2.5rem', 
                                            backgroundColor: previewOrientation === 'portrait' ? '#e9ecef' : '#fff',
                                            color: previewOrientation === 'portrait' ? '#6c757d' : 'inherit',
                                            cursor: previewOrientation === 'portrait' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <span style={{ 
                                        position: 'absolute', 
                                        right: '25px', 
                                        fontSize: '0.8rem', 
                                        color: '#666',
                                        opacity: previewOrientation === 'portrait' ? 0.5 : 1 
                                    }}>%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style={styles.configItem}>
                            <label>Vertical Alignment</label>
                            <select {...register("style.verticalAlign")} style={styles.input}>
                                <option value="top">Top Aligned</option>
                                <option value="center">Center Aligned</option>
                                <option value="bottom">Bottom Aligned</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Conditional Vertical Spacing Section */}
                {showSpacingSection && (
                    <div style={{ marginTop: '1rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                        <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1.5rem' }}>Vertical Spacing</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {hasBothScreenText && (
                                <div style={styles.configItem}>
                                    <label>Between Text (px)</label>
                                    <Controller name="style.textSpacing" control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                </div>
                            )}
                            {hasAnyScreenText && hasMethods && (
                                <div style={styles.configItem}>
                                    <label>Between Text & Methods (px)</label>
                                    <Controller name="style.methodSpacing" control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                </div>
                            )}
                            {hasMultipleMethods && (
                                <div style={styles.configItem}>
                                    <label>Between Methods (px)</label>
                                    <Controller name="style.spacing" control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '2rem' }}>
                    <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancel</button>
                    <button type="button" onClick={handleSubmit(handleSave)} style={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Conversion Screen'}</button>
                </div>
            </div>

            {/* RIGHT: PREVIEW - Fits nicely, doesn't force page scroll */}
            <div style={{ flex: 1, minWidth: 0, height: '100%', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', border: '1px solid #eee' }}>
                <StaticConversionPreview 
                    screen={previewScreen} 
                    themeMode={previewTheme}
                    onThemeChange={setPreviewTheme}
                    orientation={previewOrientation}
                    onOrientationChange={setPreviewOrientation}
                    previewIsPlaying={previewIsPlaying}
                    previewGateState={previewGateState}
                    onPreviewGateStateChange={setPreviewGateState}
                    revealResetTrigger={revealResetTrigger}
                    // Pass the refresh key down so the host can use it internally
                    refreshKey={previewRefreshKey}
                    onRefresh={() => setPreviewRefreshKey(prev => prev + 1)}
                    // Calculate simulated score based on slider %
                    previewTotalScore={Math.floor(simReqPoints * (simProgress / 100))}
                    // Construct a map of instanceId -> simulatedCost
                    previewPointCosts={
                        previewScreen.methods.reduce((acc: any, m: any) => {
                            acc[m.instanceId] = simReqPoints;
                            return acc;
                        }, {})
                    }
                />
            </div>
        </div>
    );
};