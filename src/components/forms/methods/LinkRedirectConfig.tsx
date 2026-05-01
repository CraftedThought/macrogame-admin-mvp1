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
    hideDestinationConfiguration?: boolean;
    previewIsPlaying?: boolean;
    hasStartedPlaying?: boolean;
    onTogglePlay?: () => void;
    onResetPreview?: () => void;
}

export const LinkRedirectConfig: React.FC<MethodConfigProps> = ({ 
    register, 
    watch, 
    setValue, 
    getValues, 
    control, 
    prefix = '',
    hideDestinationConfiguration = false,
    previewIsPlaying = false,
    hasStartedPlaying = false,
    onTogglePlay,
    onResetPreview
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
            {!hideDestinationConfiguration && (
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
            )}

            {/* B. BEHAVIOR (USING NEW TRANSITION ENGINE) */}
            <TransitionSettingsEditor 
                transition={currentTransition}
                defaultButtonText="Continue"
                autoWarningMessage={
                    <><strong>⚠️ Warning:</strong> Auto-transitions for link redirects are not recommended because most modern browsers will block this popup.</>
                }
                onChange={(newTransition) => {
                    setValue(getFieldName('transition'), newTransition, { shouldDirty: true, shouldTouch: true });
                }}
            />

            {/* PLAY/PAUSE CONTROLS FOR METHOD BUILDER PREVIEW */}
            {currentTransition.type === 'auto' && (
                <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>
                        <strong>Auto-Redirect Preview:</strong> Test your countdown visually.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button 
                            type="button" 
                            onClick={() => onTogglePlay?.()} 
                            title={previewIsPlaying ? "Pause" : "Play"} 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: previewIsPlaying ? '#e74c3c' : '#0866ff', color: 'white', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                            {previewIsPlaying ? '⏸' : '▶'}
                        </button>
                        {hasStartedPlaying && (
                            <button 
                                type="button" 
                                onClick={() => onResetPreview?.()} 
                                title="Reset Preview" 
                                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                ↺
                            </button>
                        )}
                    </div>
                </div>
            )}

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