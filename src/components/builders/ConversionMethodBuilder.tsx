/* src/components/builders/ConversionMethodBuilder.tsx */

import React, { useMemo, useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { styles } from '../../App.styles';
import { ConversionMethod } from '../../types';
import { useData } from '../../hooks/useData';
import { StaticConversionPreview } from '../previews/StaticConversionPreview';
import { ConversionMethodFormFields } from '../forms/ConversionMethodFormFields';
import { notifications } from '../../utils/notifications';
import { generateUUID, ensureUniqueName } from '../../utils/helpers'; // Ensure ensureUniqueName is imported

interface ConversionMethodBuilderProps {
    initialMethod?: ConversionMethod | null;
    onSave: () => void;
    onCancel: () => void;
    onNameChange?: (name: string) => void;
}

export const ConversionMethodBuilder: React.FC<ConversionMethodBuilderProps> = ({ initialMethod, onSave, onCancel, onNameChange }) => {
    const { createConversionMethod, updateConversionMethod, allConversionMethods } = useData();
    const [isSaving, setIsSaving] = useState(false);
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
    const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [previewWidth, setPreviewWidth] = useState(60);

    // --- Draft Storage ---
    const draftsRef = React.useRef<Record<string, any>>({});
    const previousTypeRef = React.useRef<string>(initialMethod?.type || 'coupon_display');

    const defaultValues: Partial<ConversionMethod> = {
        name: '',
        // Default to H2 centered with specific text for Coupon
        headline: '<h2 style="text-align: center;">New Customer Deal</h2>',
        // Default Body to Paragraph centered
        subheadline: '<p style="text-align: center;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>',
        type: 'coupon_display',
        // Email Capture Defaults
        submitButtonText: 'Submit', 
        // Note: Using 'any' cast properties in form until types are strictly updated
        ...({ emailPlaceholderText: 'Enter your email...' } as any),
        style: { 
            size: 50, // Default width 50
            spacing: 20, 
            ...({ buttonSpacing: 15, buttonColor: '#0866ff', buttonTextColor: '#ffffff' } as any) // Default Blue Button
        },
        lightStyle: {
            ...({ buttonColor: '#0866ff', buttonTextColor: '#ffffff' } as any)
        },
        fields: [],
        links: [],
    };

    const { register, handleSubmit, control, watch, reset, setValue, getValues } = useForm<Partial<ConversionMethod>>({
        defaultValues: initialMethod || defaultValues,
    });

    // --- 1. DEFINE WATCHERS FIRST (Must be before useEffect) ---
    const currentType = watch('type');
    const watchedName = watch('name');
    const allValues = watch();

    // --- 2. INITIALIZATION EFFECT ---
    useEffect(() => {
        if (initialMethod) {
            reset(initialMethod);
            draftsRef.current[initialMethod.type] = initialMethod;
            previousTypeRef.current = initialMethod.type;
        } else {
            reset(defaultValues);
            previousTypeRef.current = 'coupon_display';
        }
    }, [initialMethod, reset]);

    // --- 3. DRAFT STORAGE EFFECT (Now safe to use allValues) ---
    useEffect(() => {
        if (currentType === previousTypeRef.current) return;

        const prevType = previousTypeRef.current;
        // This line caused the crash because allValues wasn't defined yet
        draftsRef.current[prevType] = { ...allValues, type: prevType };

        const savedDraft = draftsRef.current[currentType];
        
        if (savedDraft) {
            reset(savedDraft);
        } else {
            // Start Fresh: Load defaults for this specific type
            const freshStart = {
                ...defaultValues,
                name: allValues.name,
                type: currentType,
                
                // --- CUSTOM DEFAULTS PER TYPE ---
                headline: (currentType === 'coupon_display') 
                    ? '<h2 style="text-align: center;">New Customer Deal</h2>'
                    : (currentType === 'email_capture')
                        ? '<h2 style="text-align: center;">Join Our Community!</h2>'
                        : (currentType === 'link_redirect')
                            ? '<h2 style="text-align: center;">Visit This Link</h2>'
                            : (currentType === 'form_submit') 
                                ? '<h2 style="text-align: center;">Submit Your Information</h2>'
                                : (currentType === 'social_follow') // <--- NEW: Social Default
                                    ? '<h2 style="text-align: center;">Follow Us</h2>'
                                    : '',
                
                subheadline: (currentType === 'coupon_display') 
                    ? '<p style="text-align: center;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>'
                    : (currentType === 'email_capture')
                        ? '<p style="text-align: center;">Sign up for exclusive discounts, updates, and insider perks.</p>'
                        : (currentType === 'link_redirect')
                            ? '<p style="text-align: center;">Click the button below to be redirected to the destination.</p>'
                            : (currentType === 'form_submit') 
                                ? '<p style="text-align: center;">Submit the required information using the form below.</p>'
                                : (currentType === 'social_follow') // <--- NEW: Social Default
                                    ? '<p style="text-align: center;">Stay updated on our socials!</p>'
                                    : '',

                // Type specific defaults
                style: currentType === 'coupon_display' 
                    ? { size: 50, textSpacing: 10, methodSpacing: 15 } 
                    : currentType === 'social_follow'
                        ? { size: 50, textSpacing: 10, methodSpacing: 20, iconSpacing: 15, iconColor: '#ffffff', iconSize: 40 }
                        : currentType === 'link_redirect'
                            ? { size: 50, textSpacing: 10, methodSpacing: 20 }
                            : { size: 50, textSpacing: 10, methodSpacing: 20, fieldSpacing: 10, fieldBorderRadius: 6 },               
                
                lightStyle: (currentType === 'social_follow')
                    ? { iconColor: '#000000' }
                    : {},

                // Standardized Button Config for Forms
                ...((currentType === 'email_capture' || currentType === 'form_submit') ? {
                    buttonConfig: { text: 'Submit', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, widthMode: 'max', enableHoverAnimation: true },
                    buttonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
                    lightButtonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
                } : {}),

                // Link Redirect Specifics
                ...({ 
                    emailPlaceholderText: currentType === 'email_capture' ? 'Enter your email...' : '',
                    openInNewTab: currentType === 'link_redirect' ? true : undefined,
                    
                    // Full Transition Engine support for Link Redirect
                    ...(currentType === 'link_redirect' ? {
                        transition: {
                            type: 'interact',
                            interactionMethod: 'click',
                            clickFormat: 'button',
                            buttonConfig: { text: 'Continue', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, widthMode: 'max', enableHoverAnimation: true },
                            buttonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
                            lightButtonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeStyle: 'none' },
                            autoDuration: 5,
                            showCountdown: true,
                            countdownText: 'Redirecting in {{time}}'
                        }
                    } : {})
                } as any),
                
                // Consolidated Fields Logic
                fields: currentType === 'form_submit' 
                    ? [{ label: 'First Name', placeholder: 'Enter first name...', type: 'text', required: true, name: 'field_1', row: 1 }] 
                    : [],
                    
                // <--- Social Links Initialization
                links: currentType === 'social_follow' ? [
                    { platform: 'facebook', url: '', isEnabled: true },
                    { platform: 'instagram', url: '', isEnabled: false },
                    { platform: 'linkedin', url: '', isEnabled: false },
                    { platform: 'tiktok', url: '', isEnabled: false },
                    { platform: 'x', url: '', isEnabled: false },
                    { platform: 'youtube', url: '', isEnabled: false }
                ] : []
            };
            reset(freshStart);
        }

        previousTypeRef.current = currentType;
    }, [currentType, reset]); // Removed allValues from dependency to avoid loop, it's read from closure
    
    // --- 4. NAME BROADCAST EFFECT (For the Modal Header) ---
    useEffect(() => {
        if (onNameChange) {
            onNameChange(watchedName || initialMethod?.name || '');
        }
    }, [watchedName, initialMethod, onNameChange]);

    const watchedValues = watch();
    const previewMethod = useMemo(() => {
        if (!watchedValues.type) return null;
        return {
            id: 'preview',
            createdAt: new Date().toISOString(),
            ...watchedValues,
            discountValue: Number(watchedValues.discountValue) || 0
        } as ConversionMethod;
    }, [watchedValues]);

    const handleSaveMethod: SubmitHandler<any> = async (data) => {
        if (!data.name?.trim()) { 
            notifications.error('Name required'); 
            return; 
        }

        // --- VALIDATION CHECKS ---

        if (data.type === 'email_capture') {
            if (!data.emailPlaceholderText?.trim()) {
                notifications.error('Email placeholder text is required');
                return;
            }
            if (!data.buttonConfig?.text?.trim()) {
                notifications.error('Submit button text is required');
                return;
            }
        }

        if (data.type === 'form_submit') {
            if (!data.buttonConfig?.text?.trim()) {
                notifications.error('Submit button text is required');
                return;
            }
            const hasEmptyLabels = data.fields?.some((f: any) => !f.label?.trim());
            if (hasEmptyLabels) {
                notifications.error('All form fields must have a label');
                return;
            }
        }

        if (data.type === 'social_follow') {
            if (!data.links?.some((link: any) => link.isEnabled)) {
                notifications.error('At least one social platform must be enabled');
                return;
            }
            const hasInvalidLinks = data.links?.some((link: any) => link.isEnabled && !link.url?.trim());
            if (hasInvalidLinks) {
                notifications.error('All enabled social platforms must have a valid URL');
                return;
            }
        }

        if (data.type === 'link_redirect') {
            if (!data.url?.trim()) {
                notifications.error('Destination URL is required');
                return;
            }
            const isAuto = data.transition?.type === 'auto';
            const isButton = data.transition?.interactionMethod === 'click' && data.transition?.clickFormat === 'button';
            
            if (!isAuto && isButton && !data.transition?.buttonConfig?.text?.trim()) {
                notifications.error('Button text is required for manual redirect');
                return;
            }
        }

        if (data.type === 'coupon_display') {
            if (!data.staticCode?.trim()) {
                notifications.error('Coupon Code is required');
                return;
            }
            if (!data.discountValue || Number(data.discountValue) <= 0) {
                notifications.error('Discount Value must be greater than 0');
                return;
            }
        }

        setIsSaving(true);
        
        try {
            // --- DATA SANITIZATION ---
            // Helper to convert empty strings to 0 (or default)
            const sanitizeNumber = (val: any) => (val === '' || val === null || val === undefined || isNaN(Number(val))) ? 0 : Number(val);
            
            // Deep clone to avoid mutating form state directly
            const cleanData = JSON.parse(JSON.stringify(data));

            // 1. Sanitize Style Numbers (Force to 0 if empty)
            if (cleanData.style) {
                ['textSpacing', 'methodSpacing', 'buttonSpacing', 'paddingTop', 'paddingBottom', 'paddingX', 'strokeWidth', 'boxShadowOpacity', 'fieldSpacing', 'iconSpacing', 'fieldBorderRadius'].forEach(key => {
                    if (cleanData.style[key] !== undefined) {
                        cleanData.style[key] = sanitizeNumber(cleanData.style[key]);
                    }
                });
                // Icon Size: If 0 or empty, default to 40 (standard default)
                if (cleanData.style.iconSize !== undefined) {
                     const size = Number(cleanData.style.iconSize);
                     cleanData.style.iconSize = (size > 0) ? size : 40;
                }
            }

            // 2. Sanitize Light Style Numbers
            if (cleanData.lightStyle) {
                ['spacing', 'buttonSpacing', 'paddingTop', 'paddingBottom', 'paddingX', 'strokeWidth', 'boxShadowOpacity'].forEach(key => {
                    if (cleanData.lightStyle[key] !== undefined) {
                        cleanData.lightStyle[key] = sanitizeNumber(cleanData.lightStyle[key]);
                    }
                });
            }

            // 3. Mask Sanitization (Syncs logic with Screen Builder)
            if (cleanData.maskConfig) {
                ['strokeWidth', 'paddingTop', 'paddingBottom', 'paddingX', 'spacing'].forEach(k => {
                    if (cleanData.maskConfig[k] !== undefined) {
                        cleanData.maskConfig[k] = sanitizeNumber(cleanData.maskConfig[k]);
                    }
                });
            }

            // 4. Aggressive Pruning (Prevents DB Bloat from Type Switching)
            if (cleanData.type !== 'form_submit') delete cleanData.fields;
            if (cleanData.type !== 'social_follow') delete cleanData.links;
            
            // Clean up unused new structures based on type
            if (cleanData.type !== 'link_redirect') {
                delete cleanData.transition;
            }
            if (cleanData.type !== 'form_submit' && cleanData.type !== 'email_capture') {
                delete cleanData.buttonConfig;
                delete cleanData.buttonStyle;
                delete cleanData.lightButtonStyle;
            }

            if (cleanData.type !== 'coupon_display') {
                delete cleanData.staticCode;
                delete cleanData.discountType;
                delete cleanData.discountValue;
                delete cleanData.clickToReveal;
                delete cleanData.revealScope;
                delete cleanData.maskConfig;
            } else if (!cleanData.clickToReveal) {
                delete cleanData.maskConfig;
                delete cleanData.revealScope;
            } else {
                cleanData.discountValue = Number(cleanData.discountValue) || 0;
            }

            cleanData.subheadline = cleanData.subheadline || '';

            // Update: Enforce Unique Name with (X) pattern
            const existingNames = new Set(
                allConversionMethods
                    .filter(m => m.id !== initialMethod?.id) // Exclude current method if editing
                    .map(m => m.name)
            );
            cleanData.name = ensureUniqueName(cleanData.name, existingNames);

            // --- DATABASE SAVE ---
            if (initialMethod?.id) {
                await updateConversionMethod(initialMethod.id, cleanData);
            } else {
                await createConversionMethod({
                    ...cleanData,
                    createdAt: new Date().toISOString()
                });
            }

            notifications.success('Method saved');
            onSave();
        } catch (e: any) {
            console.error("Save Error:", e);
            notifications.error(`Error saving method: ${e.message || 'Unknown error'}`);
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', gap: '2rem' }}>
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '1rem' }}>
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
                <form onSubmit={handleSubmit(handleSaveMethod)}>
                    <ConversionMethodFormFields 
                        control={control} 
                        register={register} 
                        watch={watch} 
                        setValue={setValue}
                        getValues={getValues}
                        previewWidth={previewWidth}
                        onRefreshPreview={() => setPreviewRefreshKey(prev => prev + 1)}
                        activeTheme={themeMode}
                        previewOrientation={previewOrientation}
                    />
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingBottom: '1rem' }}>
                        <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancel</button>
                        <button type="submit" disabled={isSaving} style={styles.saveButton}>
                            {isSaving ? 'Saving...' : 'Save Method'}
                        </button>
                    </div>
                </form>
            </div>
            <div style={{ flex: 1, minWidth: 0, backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', border: '1px solid #eee' }}>
                <StaticConversionPreview 
                    method={previewMethod} 
                    refreshKey={previewRefreshKey} 
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    orientation={previewOrientation} // Pass state
                    onOrientationChange={setPreviewOrientation} // Pass setter
                    previewWidth={previewWidth}
                    onPreviewWidthChange={setPreviewWidth}
                />
            </div>
        </div>
    );
};