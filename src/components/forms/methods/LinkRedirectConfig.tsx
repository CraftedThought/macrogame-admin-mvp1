/* src/components/forms/methods/LinkRedirectConfig.tsx */

import React from 'react';
import { Control, UseFormRegister, UseFormWatch, UseFormSetValue, UseFormGetValues, Controller } from 'react-hook-form';
import { styles } from '../../../App.styles';
import { TransitionSettingsEditor } from '../../builders/macrogame/TransitionSettingsEditor';
import { TransitionConfig } from '../../../types';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export interface MethodConfigProps {
    control: Control<any>;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
    prefix?: string;
    onRefreshPreview?: () => void;
    activeTheme?: 'dark' | 'light';
    previewOrientation?: 'landscape' | 'portrait';
}

export const LinkRedirectConfig: React.FC<MethodConfigProps> = ({ 
    register, 
    watch, 
    setValue, 
    getValues, 
    control, 
    prefix = '' 
}) => {
    const getFieldName = (name: string) => prefix ? `${prefix}.${name}` : name;
    
    // Safely grab the current transition state. We cast to TransitionConfig for strict typing.
    const currentTransition = (watch(getFieldName('transition')) || {}) as TransitionConfig;

    const rawHeadline = watch(getFieldName('headline'));
    const rawSubheadline = watch(getFieldName('subheadline'));
    const hasHeadline = !!rawHeadline && rawHeadline !== '<p><br></p>';
    const hasSubheadline = !!rawSubheadline && rawSubheadline !== '<p><br></p>';
    const hasBothText = hasHeadline && hasSubheadline;
    const hasAnyText = hasHeadline || hasSubheadline;

    return (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* A. DESTINATION */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Destination</h4>
                <div style={styles.configItem}>
                    <label>Destination URL</label>
                    <input type="url" placeholder="https://..." {...register(getFieldName("url"))} style={styles.input} />
                </div>
                <div style={styles.configItem}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" {...register(getFieldName("utmEnabled"))} /> 
                        <span><strong>Auto-Append UTM Parameters</strong></span>
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                        Automatically attach <code>utm_source</code>, <code>utm_campaign</code>, etc.
                    </p>
                </div>
                
                {/* TARGET WINDOW */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Window</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" value="true" {...register(getFieldName("openInNewTab"))} onChange={() => setValue(getFieldName("openInNewTab"), true)} checked={String(watch(getFieldName("openInNewTab"))) === 'true'} />
                            New Tab
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" value="false" {...register(getFieldName("openInNewTab"))} onChange={() => setValue(getFieldName("openInNewTab"), false)} checked={String(watch(getFieldName("openInNewTab"))) === 'false'} />
                            Same Tab
                        </label>
                    </div>
                </div>
            </div>

            {/* B. BEHAVIOR (USING NEW TRANSITION ENGINE) */}
            <TransitionSettingsEditor 
                transition={currentTransition}
                defaultButtonText="Continue"
                onChange={(newTransition) => {
                    // Update form state without overwriting the user's text!
                    setValue(getFieldName('transition'), newTransition, { shouldDirty: true, shouldTouch: true });
                }}
            />

            {/* C. VERTICAL SPACING */}
            {hasAnyText && (
                <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Vertical Spacing</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {hasBothText && (
                            <div style={styles.configItem}>
                                <label>Between Text (px)</label>
                                <Controller name={getFieldName("style.textSpacing")} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={field.onChange} style={styles.input} /> )} />
                            </div>
                        )}
                        <div style={styles.configItem}>
                            <label>Between Method & Text (px)</label>
                            <Controller name={getFieldName("style.methodSpacing")} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={field.onChange} style={styles.input} /> )} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};