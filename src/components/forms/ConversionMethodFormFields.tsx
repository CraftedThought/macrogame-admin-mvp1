/* src/components/forms/ConversionMethodFormFields.tsx */

import React from 'react';
import { useFieldArray, Control, UseFormRegister, UseFormWatch, Controller, UseFormSetValue } from 'react-hook-form';
import { styles } from '../../App.styles';
import { SimpleTextEditor } from './SimpleTextEditor';
import { MaskConfigurationForm } from './MaskConfigurationForm';
import { LinkRedirectConfig } from './methods/LinkRedirectConfig';
import { EmailCaptureConfig } from './methods/EmailCaptureConfig';
import { FormSubmitConfig } from './methods/FormSubmitConfig';
import { SmartNumberInput } from '../ui/inputs/SmartNumberInput';

interface ConversionMethodFormFieldsProps {
    control: Control<any>;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
    previewWidth?: number;
    prefix?: string;
    onRefreshPreview?: () => void;
    activeTheme?: 'dark' | 'light';
    previewOrientation?: 'landscape' | 'portrait';
    hideTypeSelector?: boolean;
    hideCouponConfiguration?: boolean;
    hideSocialConfiguration?: boolean;
    hideContentSection?: boolean;
    hideInternalName?: boolean;
    hideDestinationConfiguration?: boolean;
    previewIsPlaying?: boolean;
    hasStartedPlaying?: boolean;
    onTogglePlay?: () => void;
    onResetPreview?: () => void;
    onResetReveal?: () => void;
}

// Helper: Simple Color Picker for this form
const ColorInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div style={styles.configItem}>
        <label>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="#ffffff"
            />
        </div>
    </div>
);

// Helper: Adjust Hex Brightness (percent: -100 to 100)
const adjustBrightness = (hex: string, percent: number) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    if (percent > 0) {
        // Lighten
        r += (255 - r) * (percent / 100);
        g += (255 - g) * (percent / 100);
        b += (255 - b) * (percent / 100);
    } else {
        // Darken
        const adjustment = 1 + (percent / 100); // e.g., 1 + (-0.5) = 0.5
        r *= adjustment;
        g *= adjustment;
        b *= adjustment;
    }

    const rr = Math.round(Math.min(Math.max(0, r), 255)).toString(16).padStart(2, '0');
    const gg = Math.round(Math.min(Math.max(0, g), 255)).toString(16).padStart(2, '0');
    const bb = Math.round(Math.min(Math.max(0, b), 255)).toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
};

export const ConversionMethodFormFields: React.FC<ConversionMethodFormFieldsProps> = ({ 
    control, 
    register, 
    watch, 
    setValue,
    getValues,
    // Destructure new prop (default to 100 if missing)
    previewWidth = 100,
    onRefreshPreview,
    activeTheme = 'dark',
    prefix = '',
    previewOrientation = 'landscape',
    hideTypeSelector = false,
    hideCouponConfiguration = false,
    hideSocialConfiguration = false,
    hideContentSection = false,
    hideInternalName = false,
    hideDestinationConfiguration = false,
    previewIsPlaying = false,
    hasStartedPlaying = false,
    onTogglePlay,
    onResetPreview,
}) => {
    const getFieldName = (name: string) => prefix ? `${prefix}.${name}` : name;
    const selectedType = watch(getFieldName('type'));
    const revealScope = watch(getFieldName('revealScope'));
    
    const rawHeadline = watch(getFieldName('headline'));
    const rawSubheadline = watch(getFieldName('subheadline'));
    const hasHeadline = !!rawHeadline && rawHeadline !== '<p><br></p>';
    const hasSubheadline = !!rawSubheadline && rawSubheadline !== '<p><br></p>';
    const hasBothText = hasHeadline && hasSubheadline;
    const hasAnyText = hasHeadline || hasSubheadline;
    const backgroundColor = watch(getFieldName('style.backgroundColor')) || '#1a1a1a'; // Default for preview context

    // --- Memory for removed subheadlines (Keyed by type) ---
    const lastSubheadlines = React.useRef<Record<string, string>>({});
    // --- Memory for removed headlines (Keyed by type) ---
    const lastHeadlines = React.useRef<Record<string, string>>({});

    // Dynamic fields for forms/social
    const linksName = getFieldName('links');
    const { fields: socialLinks } = useFieldArray({ control, name: linksName });

    const [iconSizeError, setIconSizeError] = React.useState<string | null>(null);

    return (
        <div>
            <div style={styles.configRow}>
                {!hideInternalName && (
                    <div style={styles.configItem}>
                        <label>Internal Name</label>
                        <input type="text" placeholder="e.g., Summer Sale Coupon" {...register(getFieldName("name"))} style={styles.input} />
                    </div>
                )}
                {!hideTypeSelector && (
                    <div style={styles.configItem}>
                        <label>Method Type</label>
                        <select {...register(getFieldName("type"))} style={styles.input}>
                            <option value="coupon_display">Coupon Display</option>
                            <option value="email_capture">Email Capture</option>
                            <option value="link_redirect">Link Redirect</option>
                            <option value="form_submit">Form Submit</option>
                            <option value="social_follow">Social Follow</option>
                        </select>
                    </div>
                )}
            </div>

            {/* 2. LINK REDIRECT SPECIFIC */}
            {selectedType === 'link_redirect' && (
                <LinkRedirectConfig 
                    control={control} register={register} watch={watch} setValue={setValue} getValues={getValues} prefix={prefix} onRefreshPreview={onRefreshPreview} 
                    hideDestinationConfiguration={hideDestinationConfiguration}
                    previewIsPlaying={previewIsPlaying}
                    hasStartedPlaying={hasStartedPlaying}
                    onTogglePlay={onTogglePlay}
                    onResetPreview={onResetPreview}
                />
            )}

            {/* --- RICH TEXT EDITORS: HEADLINE & BODY --- */}
            {!hideContentSection && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Content</h4>

                    {/* 1. HEADLINE (Heading 1/2) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Headline
                    </label>
                    <Controller
                        name={getFieldName("headline")}
                        control={control}
                        render={({ field }) => {
                            // Check if content exists (and isn't just an empty paragraph tag)
                            const hasContent = field.value && field.value !== '<p><br></p>';

                            // Logic to determine colors (Shared with Subheadline)
                            let editorBg = '#ffffff';
                            let editorText: string | undefined = undefined;

                            if (selectedType === 'coupon_display') {
                                if (activeTheme === 'light') {
                                    const lightBg = watch(getFieldName('lightStyle.backgroundColor'));
                                    const lightText = watch(getFieldName('lightStyle.textColor'));
                                    editorBg = lightBg || '#f5f5f5';
                                    editorText = lightText || '#000000';
                                } else {
                                    const darkBg = watch(getFieldName('style.backgroundColor'));
                                    editorBg = darkBg || '#1a1a1a';
                                    editorText = '#ffffff'; 
                                }
                            } else {
                                if (activeTheme === 'light') {
                                    editorBg = '#ffffff';
                                    editorText = '#000000';
                                } else {
                                    editorBg = '#080817';
                                    editorText = '#ffffff';
                                }
                            }

                            if (!hasContent) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const savedContent = lastHeadlines.current[selectedType];
                                            if (savedContent) {
                                                field.onChange(savedContent);
                                                return;
                                            }
                                            // Default Text Logic based on Type
                                            let defaultText = '<h2 style="text-align: center;">Headline</h2>';
                                            if (selectedType === 'coupon_display') {
                                                defaultText = '<h2 style="text-align: center;">New Customer Deal</h2>';
                                            } else if (selectedType === 'email_capture') {
                                                defaultText = '<h2 style="text-align: center;">Join Our Community!</h2>';
                                            } else if (selectedType === 'link_redirect') {
                                                defaultText = '<h2 style="text-align: center;">Visit This Link</h2>';
                                            } else if (selectedType === 'form_submit') {
                                                defaultText = '<h2 style="text-align: center;">Submit Your Information</h2>';
                                            } else if (selectedType === 'social_follow') {
                                                defaultText = '<h2 style="text-align: center;">Follow Us</h2>';
                                            }
                                            field.onChange(defaultText);
                                        }}
                                        style={styles.secondaryButton}
                                    >
                                        + Add Headline
                                    </button>
                                );
                            }

                            return (
                                <div style={{ position: 'relative' }}>
                                    <SimpleTextEditor
                                        initialHtml={field.value}
                                        onChange={field.onChange}
                                        backgroundColor={editorBg}
                                        defaultTextColor={editorText}
                                        placeholder="Enter headline..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (field.value) {
                                                lastHeadlines.current[selectedType] = field.value;
                                            }
                                            field.onChange('');
                                        }}
                                        style={{ 
                                            ...styles.deleteButton, 
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            padding: '0.3rem 0.8rem'
                                        }}
                                    >
                                        Remove Headline
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>

                {/* 2. SUBHEADLINE (Body) */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Body Text / Subheadline
                    </label>
                    <Controller
                        name={getFieldName("subheadline")}
                        control={control}
                        render={({ field }) => {
                            const hasContent = field.value && field.value !== '<p><br></p>';

                            if (!hasContent) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const savedContent = lastSubheadlines.current[selectedType];
                                            if (savedContent) {
                                                field.onChange(savedContent);
                                                return;
                                            }
                                            let defaultText = '<p style="text-align: center; font-size: 1.25rem;">Enter body text...</p>';
                                            if (selectedType === 'coupon_display') {
                                                defaultText = '<p style="text-align: center; font-size: 1.25rem;">Enjoy 50% off your first purchase as a new customer! Use the code below at checkout to redeem.</p>';
                                            } else if (selectedType === 'email_capture') {
                                                defaultText = '<p style="text-align: center; font-size: 1.25rem;">Sign up for exclusive discounts, updates, and insider perks.</p>';
                                            } else if (selectedType === 'link_redirect') {
                                                defaultText = '<p style="text-align: center; font-size: 1.25rem;">Click the button below to be redirected to the destination.</p>';
                                            } else if (selectedType === 'form_submit') {
                                                defaultText = '<p style="text-align: center; font-size: 1.25rem;">Submit the required information using the form below.</p>';
                                            } else if (selectedType === 'social_follow') {
                                                defaultText = '<p style="text-align: center; font-size: 1.25rem;">Stay updated on our socials!</p>';
                                            }

                                            field.onChange(defaultText);
                                        }}
                                        style={styles.secondaryButton}
                                    >
                                        + Add Body Text
                                    </button>
                                );
                            }

                            // Reuse logic for colors
                            let editorBg = '#ffffff';
                            let editorText: string | undefined = undefined;

                            if (selectedType === 'coupon_display') {
                                if (activeTheme === 'light') {
                                    const lightBg = watch(getFieldName('lightStyle.backgroundColor'));
                                    const lightText = watch(getFieldName('lightStyle.textColor'));
                                    editorBg = lightBg || '#f5f5f5';
                                    editorText = lightText || '#000000';
                                } else {
                                    const darkBg = watch(getFieldName('style.backgroundColor'));
                                    editorBg = darkBg || '#1a1a1a';
                                    editorText = '#ffffff'; 
                                }
                            } else {
                                if (activeTheme === 'light') {
                                    editorBg = '#ffffff';
                                    editorText = '#000000';
                                } else {
                                    editorBg = '#080817';
                                    editorText = '#ffffff';
                                }
                            }

                            return (
                                <div style={{ position: 'relative' }}>
                                    <SimpleTextEditor
                                        initialHtml={field.value}
                                        onChange={field.onChange}
                                        backgroundColor={editorBg}
                                        defaultTextColor={editorText}
                                        placeholder="Enter body text..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (field.value) {
                                                lastSubheadlines.current[selectedType] = field.value;
                                            }
                                            field.onChange('');
                                        }}
                                        style={{ 
                                            ...styles.deleteButton, 
                                            marginTop: '0.5rem',
                                            fontSize: '0.85rem',
                                            padding: '0.3rem 0.8rem'
                                        }}
                                    >
                                        Remove Body Content
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>
            </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
                {selectedType === 'coupon_display' && (
                    <>
                        {/* --- LOOP: Render Styling for Default (Dark) then Light --- */}
                        {['style', 'lightStyle'].map((prefix, index) => {
                            const isDark = prefix === 'style';
                            const title = isDark ? "Dark Mode Styling (Default)" : "Light Mode Styling";
                            const sectionBg = isDark ? '#f0f2f5' : '#ffffff';
                            const sectionBorder = isDark ? '1px solid #ccc' : '1px dashed #ccc';

                            return (
                                <div key={prefix} style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: sectionBg, borderRadius: '8px', border: sectionBorder }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
                                        <h4 style={{ ...styles.h4, margin: 0 }}>{title}</h4>
                                        
                                        {!isDark && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentDark = watch(getFieldName('style'));
                                                    if (!currentDark) return;

                                                    const newStroke = adjustBrightness(currentDark.strokeColor || '#cfc33a', -50);
                                                    const newBg = adjustBrightness(currentDark.backgroundColor || '#1a1a1a', 67);
                                                    
                                                    const lightPrefix = getFieldName('lightStyle');
                                                    setValue(`${lightPrefix}.size`, currentDark.size);
                                                    setValue(`${lightPrefix}.spacing`, currentDark.spacing);
                                                    setValue(`${lightPrefix}.paddingTop`, currentDark.paddingTop);
                                                    setValue(`${lightPrefix}.paddingBottom`, currentDark.paddingBottom);
                                                    setValue(`${lightPrefix}.paddingX`, currentDark.paddingX);
                                                    setValue(`${lightPrefix}.strokeStyle`, currentDark.strokeStyle);
                                                    setValue(`${lightPrefix}.strokeWidth`, currentDark.strokeWidth);
                                                    setValue(`${lightPrefix}.revealAnimation`, currentDark.revealAnimation);
                                                    setValue(`${lightPrefix}.revealBackgroundColor`, currentDark.revealBackgroundColor ?? '#cfc33a');
                                                    setValue(`${lightPrefix}.revealTextColor`, currentDark.revealTextColor ?? '#1c1e21');
                                                    setValue(`${lightPrefix}.boxShadowOpacity`, currentDark.boxShadowOpacity ?? 50);
                                                    setValue(`${lightPrefix}.strokeColor`, newStroke);
                                                    setValue(`${lightPrefix}.backgroundColor`, newBg);
                                                    setValue(`${lightPrefix}.textColor`, '#000000');
                                                }}
                                                style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: '1px solid #0866ff', color: '#0866ff', borderRadius: '4px', padding: '0.2rem 0.5rem', fontWeight: 'bold' }}
                                            >
                                                ✨ Auto-Generate from Dark
                                            </button>
                                        )}
                                    </div>

                                    {/* 1. Size & Colors */}
                                    <div style={styles.configRow}>
                                        {!isDark && (
                                            <Controller
                                                name={getFieldName(`${prefix}.textColor`)}
                                                control={control}
                                                defaultValue="#000000"
                                                render={({ field }) => (
                                                    <ColorInput label="Text Color" value={field.value ?? '#000000'} onChange={field.onChange} />
                                                )}
                                            />
                                        )}

                                        <Controller
                                            name={getFieldName(`${prefix}.backgroundColor`)}
                                            control={control}
                                            defaultValue={isDark ? "#1a1a1a" : "#f5f5f5"}
                                            render={({ field }) => (
                                                <ColorInput label="Background Color" value={field.value ?? (isDark ? '#1a1a1a' : '#f5f5f5')} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>

                                    {/* 2. Spacing & Shadow */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                        {hasBothText && (
                                            <div style={styles.configItem}>
                                                <label>Between Text (px)</label>
                                                <Controller name={getFieldName(`${prefix}.textSpacing`)} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                            </div>
                                        )}
                                        {hasAnyText && (
                                            <div style={styles.configItem}>
                                                <label>Between Code & Text (px)</label>
                                                <Controller name={getFieldName(`${prefix}.methodSpacing`)} control={control} defaultValue={15} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 15} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                            </div>
                                        )}
                                        <div style={styles.configItem}>
                                            <label>Box Shadow Opacity (%)</label>
                                            <Controller name={getFieldName(`${prefix}.boxShadowOpacity`)} control={control} defaultValue={15} render={({ field }) => ( <SmartNumberInput min={0} max={100} fallbackValue={0} value={field.value ?? 15} onChange={val => { if (val > 100) val = 100; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                        </div>
                                    </div>

                                    {/* 3. Padding Controls */}
                                    <div style={{ ...styles.configRow, marginTop: '1rem' }}>
                                        <div style={styles.configItem}>
                                            <label>Padding Top (px)</label>
                                            <Controller name={getFieldName(`${prefix}.paddingTop`)} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Padding Bottom (px)</label>
                                            <Controller name={getFieldName(`${prefix}.paddingBottom`)} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Padding Sides (px)</label>
                                            <Controller name={getFieldName(`${prefix}.paddingX`)} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={val => { if (val > 120) val = 120; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                        </div>
                                    </div>

                                    {/* 4. Stroke Controls */}
                                    <div style={{ ...styles.configRow, marginTop: '1rem' }}>
                                        <div style={styles.configItem}>
                                            <label>Stroke Style</label>
                                            <select {...register(getFieldName(`${prefix}.strokeStyle`))} style={styles.input} defaultValue="dashed">
                                                <option value="dashed">Dashed</option>
                                                <option value="solid">Solid</option>
                                                <option value="dotted">Dotted</option>
                                                <option value="none">None</option>
                                            </select>
                                        </div>
                                        <div style={styles.configItem}>
                                            <label>Stroke Width (px)</label>
                                            <Controller name={getFieldName(`${prefix}.strokeWidth`)} control={control} defaultValue={2} render={({ field }) => ( <SmartNumberInput min={0} max={50} fallbackValue={0} value={field.value ?? 2} onChange={val => { if (val > 50) val = 50; if (val < 0) val = 0; field.onChange(val); }} style={styles.input} /> )} />
                                        </div>
                                        <Controller
                                            name={getFieldName(`${prefix}.strokeColor`)}
                                            control={control}
                                            defaultValue={isDark ? "#cfc33a" : "#333333"}
                                            render={({ field }) => (
                                                <ColorInput label="Stroke Color" value={field.value ?? (isDark ? '#cfc33a' : '#333333')} onChange={field.onChange} />
                                            )}
                                        />
                                    </div>
                                    
                                </div>
                            );
                        })}

                        {/* --- CONDITIONAL: Coupon Logic & Reveal (Hide if Hoisted) --- */}
                        {!hideCouponConfiguration && (
                            <>
                                <h4 style={{ ...styles.h4, marginTop: '2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Coupon Code & Logic</h4>
                        
                                <div style={styles.configRow}>
                                    <div style={styles.configItem}>
                                        <label>Coupon Type</label>
                                        <select {...register(getFieldName("codeType"))} style={styles.input}>
                                            <option value="static">Static Code</option>
                                            <option value="dynamic" disabled>Dynamic (Coming Soon)</option>
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Static Code</label>
                                        <input 
                                            type="text" 
                                            placeholder="" 
                                            {...register(getFieldName("staticCode"), {
                                                onChange: (e) => {
                                                    // Force Uppercase in Data
                                                    setValue(getFieldName("staticCode"), e.target.value.toUpperCase());
                                                }
                                            })} 
                                            style={{ ...styles.input, textTransform: 'uppercase' }} // Visual Uppercase
                                        />
                                    </div>
                                </div>
                                <div style={{...styles.configRow, marginTop: '1rem'}}>
                                    <div style={styles.configItem}>
                                        <label>Discount Type</label>
                                        <select {...register(getFieldName("discountType"))} style={styles.input}>
                                            <option value="percentage">% Percentage</option>
                                            <option value="fixed_amount">$ Fixed</option>
                                        </select>
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Value</label>
                                        <Controller
                                            name={getFieldName("discountValue")}
                                            control={control}
                                            render={({ field }) => {
                                                const type = watch(getFieldName("discountType"));
                                                const max = type === 'percentage' ? 100 : undefined;
                                                return (
                                                    <SmartNumberInput 
                                                        step="0.01" 
                                                        min={0} max={max}
                                                        fallbackValue={0}
                                                        value={field.value ?? 0}
                                                        onChange={val => {
                                                            let num = val;
                                                            if (max && num > max) num = max; // Snap to max
                                                            if (num < 0) num = 0; // Snap to min
                                                            field.onChange(num);
                                                        }}
                                                        style={styles.input} 
                                                    />
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                        
                                {/* Reveal Settings Block (Standard, keeping brief) */}
                                <div style={{ marginTop: '1rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                                            <input 
                                                type="checkbox" 
                                                {...register(getFieldName("clickToReveal"), {
                                                    onChange: (e) => {
                                                        if (e.target.checked) {
                                                            // 1. Text & Icon Defaults
                                                            setValue(getFieldName("maskConfig.headline"), "Click to Reveal the Coupon Code");
                                                            setValue(getFieldName("maskConfig.showIcon"), true);
                                                            setValue(getFieldName("maskConfig.codeHeadline"), "REVEAL");
                                                            
                                                            // 2. Color Defaults based on Scope
                                                            // We must read the current scope value to decide
                                                            const currentScope = getValues(getFieldName("revealScope"));
                                                
                                                            if (currentScope === 'code_only') {
                                                                // Dark Mode Defaults (Yellow/Black)
                                                                setValue(getFieldName("maskConfig.style.backgroundColor"), "#cfc33a");
                                                                setValue(getFieldName("maskConfig.style.textColor"), "#000000");
                                                    
                                                                // Light Mode Defaults (Dark/White)
                                                                setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#1a1a1a");
                                                                setValue(getFieldName("maskConfig.lightStyle.textColor"), "#ffffff");
                                                            } else {
                                                                // Full Reveal Defaults (Standard Dark/White)
                                                                setValue(getFieldName("maskConfig.style.backgroundColor"), "#1a1a1a");
                                                                setValue(getFieldName("maskConfig.style.textColor"), "#ffffff");
                                                                // Reset Light Mode to defaults if needed, or leave empty to inherit structure
                                                            }
                                                        }
                                                    }
                                                })} 
                                            />
                                            <span style={{ fontWeight: 'bold' }}>Enable Click to Reveal</span>
                                        </label>
                                        <button 
                                            type="button" 
                                            onClick={onResetReveal || onRefreshPreview} 
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
                                    {watch(getFieldName("clickToReveal")) && (
                                        <div style={{ marginTop: '1rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '4px' }}>
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={styles.configItem}>
                                                    <label>Reveal Scope</label>
                                                    <select 
                                                        {...register(getFieldName("revealScope"), {
                                                            onChange: (e) => {
                                                                const val = e.target.value;
                                                                if (val === 'code_only') {
                                                                    // Code Only Defaults (Yellow/Black)
                                                                    setValue(getFieldName("maskConfig.style.backgroundColor"), "#cfc33a");
                                                                    setValue(getFieldName("maskConfig.style.textColor"), "#000000");
                                                                    
                                                                    setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#1a1a1a");
                                                                    setValue(getFieldName("maskConfig.lightStyle.textColor"), "#ffffff");
                                                                    // Inject Short Headline into the correct variable
                                                                    setValue(getFieldName("maskConfig.codeHeadline"), "REVEAL");
                                                                } else {
                                                                    // Full Reveal Defaults
                                                                    
                                                                    // Dark Mode (Dark/White)
                                                                    setValue(getFieldName("maskConfig.style.backgroundColor"), "#1a1a1a");
                                                                    setValue(getFieldName("maskConfig.style.textColor"), "#ffffff");
                                                                    
                                                                    // Light Mode (Light/Black) - Resetting to standard defaults
                                                                    setValue(getFieldName("maskConfig.lightStyle.backgroundColor"), "#f5f5f5");
                                                                    setValue(getFieldName("maskConfig.lightStyle.textColor"), "#000000");
                                                                }
                                                            }
                                                        })} 
                                                        style={styles.input} 
                                                        defaultValue="entire_card"
                                                    >
                                                        <option value="entire_card">Cover Entire Coupon</option>
                                                        <option value="code_only">Cover Code Only</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <MaskConfigurationForm 
                                                register={register}
                                                control={control}
                                                setValue={setValue}
                                                prefix={getFieldName("maskConfig")}
                                                defaultHeadline="Click to Reveal the Coupon Code"
                                                isCodeOnlyScope={revealScope === 'code_only'}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* 3. EMAIL CAPTURE SPECIFIC */}
                {selectedType === 'email_capture' && (
                    <EmailCaptureConfig 
                        control={control} register={register} watch={watch} setValue={setValue} getValues={getValues} prefix={prefix} 
                    />
                )}

                {/* 4. FORM SUBMIT SPECIFIC */}
                {selectedType === 'form_submit' && (
                    <FormSubmitConfig 
                        control={control} register={register} watch={watch} setValue={setValue} getValues={getValues} prefix={prefix} previewWidth={previewWidth} previewOrientation={previewOrientation} 
                    />
                )}

                {selectedType === 'social_follow' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
                        {/* --- 1. Colors & Basic Style --- */}
                        <div style={{ ...styles.configRow, borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                            {/* Dark Mode Color */}
                            <div style={styles.configItem}>
                                <label style={styles.label}>Dark Mode Icon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        {...register('style.iconColor')}
                                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            {/* Light Mode Color */}
                             <div style={styles.configItem}>
                                <label style={styles.label}>Light Mode Icon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        {...register('lightStyle.iconColor')}
                                        style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            {/* Icon Size */}
                            <div style={styles.configItem}>
                                <label style={styles.label}>Icon Size (px)</label>
                                <Controller
                                    name={getFieldName("style.iconSize")}
                                    control={control}
                                    defaultValue={40}
                                    render={({ field }) => {
                                        // Global Limits
                                        const GLOBAL_MAX = 75;
                                        const GLOBAL_MIN = 20;
                                        const PORTRAIT_CAP = 40;

                                        // Validation Helpers
                                        const valNum = Number(field.value);
                                        const isError = field.value !== '' && (isNaN(valNum) || valNum < GLOBAL_MIN || valNum > GLOBAL_MAX);
                                        const isWarning = !isError && previewOrientation === 'portrait' && valNum > PORTRAIT_CAP;

                                        return (
                                            <>
                                                <SmartNumberInput
                                                    min={GLOBAL_MIN}
                                                    max={GLOBAL_MAX}
                                                    placeholder="20"
                                                    value={field.value ?? 40}
                                                    onChange={val => {
                                                        if (val <= GLOBAL_MAX) field.onChange(val);
                                                    }}
                                                    style={{
                                                        ...styles.input,
                                                        borderColor: isError ? '#e74c3c' : isWarning ? '#f39c12' : '#ccc',
                                                        outlineColor: isError ? '#e74c3c' : isWarning ? '#f39c12' : undefined
                                                    }}
                                                />
                                                
                                                {/* Error Message */}
                                                {isError && (
                                                    <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                                        Value must be {GLOBAL_MIN}-{GLOBAL_MAX}
                                                    </span>
                                                )}

                                                {/* Warning Message */}
                                                {isWarning && (
                                                    <span style={{ color: '#f39c12', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                                                        Value &gt; 40px will be capped at 40px in portrait view.
                                                    </span>
                                                )}
                                            </>
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        {/* --- 2. Platforms List --- */}
                        {!hideSocialConfiguration && (
                            <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                                <label style={{...styles.label, marginBottom: 0}}>Social Platforms</label>
                                {socialLinks.map((field, index) => {
                                const isEnabled = watch(`${linksName}.${index}.isEnabled`);
                                return (
                                    <div key={field.id} style={{ ...styles.configRow, alignItems: 'center', padding: '0.5rem', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                        
                                        {/* Checkbox & Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '140px' }}>
                                            <input
                                                type="checkbox"
                                                {...register(`${linksName}.${index}.isEnabled`)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                            {/* Hidden input to ensure platform persists */}
                                            <input type="hidden" {...register(`${linksName}.${index}.platform`)} />
                            
                                            <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.95rem', color: isEnabled ? '#000' : '#999' }}>
                                                {field.platform || ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'youtube'][index]}
                                            </span>
                                        </div>

                                        {/* URL Input (Only visible if checked) */}
                                        <div style={{ flex: 1, opacity: isEnabled ? 1 : 0.3, pointerEvents: isEnabled ? 'auto' : 'none' }}>
                                            <input
                                                placeholder={`https://${field.platform || 'social'}.com/...`}
                                                type="url"
                                                {...register(`${linksName}.${index}.url`)}
                                                style={styles.input}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        )}

                        {/* --- 3. Spacing Section --- */}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <h4 style={{ ...styles.h4, marginBottom: '1rem' }}>Spacing</h4>
            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {hasBothText && (
                                    <div style={styles.configItem}>
                                        <label style={styles.label}>Between Text (px)</label>
                                        <Controller name={getFieldName("style.textSpacing")} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={field.onChange} style={styles.input} /> )} />
                                    </div>
                                )}
                                {hasAnyText && (
                                    <div style={styles.configItem}>
                                        <label style={styles.label}>Between Icons & Text (px)</label>
                                        <Controller name={getFieldName("style.methodSpacing")} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={field.onChange} style={styles.input} /> )} />
                                    </div>
                                )}
                                <div style={styles.configItem}>
                                    <label style={styles.label}>Between Icons (px)</label>
                                    <Controller name={getFieldName("style.iconSpacing")} control={control} defaultValue={15} render={({ field }) => ( <SmartNumberInput min={0} max={75} fallbackValue={0} value={field.value ?? 15} onChange={field.onChange} style={styles.input} /> )} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};