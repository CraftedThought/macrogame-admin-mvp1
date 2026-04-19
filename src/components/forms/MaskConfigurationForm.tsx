/* src/components/forms/MaskConfigurationForm.tsx */

import React from 'react';
import { UseFormRegister, Control, Controller, useWatch } from 'react-hook-form';
import { styles } from '../../App.styles';
import { SmartNumberInput } from '../ui/inputs/SmartNumberInput';

// Helper for Color Inputs (Local reuse)
const ColorPickerField = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div style={{ flex: 1, minWidth: '120px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #ccc', padding: '0.25rem', borderRadius: '4px', backgroundColor: '#fff' }}>
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                style={{ width: '24px', height: '24px', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} 
            />
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                style={{ border: 'none', width: '100%', fontSize: '0.85rem', outline: 'none' }} 
            />
        </div>
    </div>
);

interface MaskConfigFormProps {
    register: UseFormRegister<any>;
    control: Control<any>;
    prefix: string; 
    defaultHeadline?: string;
    isCodeOnlyScope?: boolean;
    maskType?: 'default' | 'point_purchase' | 'point_threshold' | 'on_success';
}

export const MaskConfigurationForm: React.FC<MaskConfigFormProps> = ({ 
    register, 
    control, 
    prefix, 
    defaultHeadline = "LOCKED", 
    isCodeOnlyScope = false,
    maskType = 'default'
}) => {
    
    // Helper to get full path
    const p = (field: string) => `${prefix}.${field}`;

    return (
        <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <h5 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Mask Styling & Content</h5>

            {/* 1. Global Visuals Row */}
            {!isCodeOnlyScope && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {/* Animation selection removed (Defaulting to Fade internally) */}
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.85rem' }}>Stroke Style</label>
                        <select {...register(p('strokeStyle'))} style={styles.input}>
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.85rem' }}>Stroke Width (px)</label>
                        <Controller
                            name={p('strokeWidth')}
                            control={control}
                            render={({ field }) => (
                                <SmartNumberInput 
                                    min={0} max={20}
                                    value={field.value ?? 0}
                                    fallbackValue={0}
                                    onChange={val => {
                                        if (val > 20) val = 20;
                                        if (val < 0) val = 0;
                                        field.onChange(val);
                                    }}
                                    style={styles.input} 
                                />
                            )}
                        />
                    </div>
                </div>
            )}

            {/* 2. Content Row (Hidden for Code Only) */}
            {isCodeOnlyScope ? (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#eaf5fc', color: '#084298', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>Code Only Mode:</strong> The mask text is set to "REVEAL" and layout is compact to fit the small area.
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: '60px' }}>
                            <label style={{ fontSize: '0.85rem' }}>Icon</label>
                            <div style={{ marginTop: '0.5rem' }}>
                                <input type="checkbox" {...register(p('showIcon'))} style={{ transform: 'scale(1.5)' }} />
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem' }}>Headline Text</label>
                            <input type="text" {...register(p('headline'))} placeholder={defaultHeadline} style={styles.input} />
                        </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem' }}>Body Text (Optional)</label>
                        <input type="text" {...register(p('body'))} placeholder="Brief instruction..." style={styles.input} />
                    </div>
                </>
            )}

            

            {/* 4. Theme Colors */}
            <div style={{ display: 'flex', gap: '2rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                {/* Dark Theme */}
                <div style={{ flex: 1 }}>
                    <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#555' }}>Dark Theme (Default)</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Controller name={p('style.backgroundColor')} control={control} defaultValue="#1a1a1a" render={({ field }) => <ColorPickerField label="Background" value={field.value} onChange={field.onChange} />} />
                        <Controller name={p('style.textColor')} control={control} defaultValue="#ffffff" render={({ field }) => <ColorPickerField label="Text" value={field.value} onChange={field.onChange} />} />
                        {!isCodeOnlyScope && (
                            <Controller name={p('style.strokeColor')} control={control} defaultValue="#cfc33a" render={({ field }) => <ColorPickerField label="Stroke" value={field.value} onChange={field.onChange} />} />
                        )}
                        
                        {/* Point Purchase Colors */}
                        {maskType === 'point_purchase' && (
                            <>
                                <Controller name={p('style.buttonColor')} control={control} defaultValue="#1532c1" render={({ field }) => <ColorPickerField label="Button Color" value={field.value} onChange={field.onChange} />} />
                                <Controller name={p('style.buttonTextColor')} control={control} defaultValue="#ffffff" render={({ field }) => <ColorPickerField label="Button Text" value={field.value} onChange={field.onChange} />} />
                            </>
                        )}

                        {/* Point Threshold Colors */}
                        {maskType === 'point_threshold' && (
                            <>
                                <Controller name={p('style.progressBarColor')} control={control} defaultValue="#f1c40f" render={({ field }) => <ColorPickerField label="Progress Fill" value={field.value} onChange={field.onChange} />} />
                                <Controller name={p('style.progressBackgroundColor')} control={control} defaultValue="rgba(255,255,255,0.2)" render={({ field }) => <ColorPickerField label="Progress Bg" value={field.value} onChange={field.onChange} />} />
                            </>
                        )}
                    </div>
                </div>

                {/* Light Theme */}
                <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '2rem' }}>
                    <h6 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#555' }}>Light Theme</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Controller name={p('lightStyle.backgroundColor')} control={control} defaultValue="#f5f5f5" render={({ field }) => <ColorPickerField label="Background" value={field.value} onChange={field.onChange} />} />
                        <Controller name={p('lightStyle.textColor')} control={control} defaultValue="#000000" render={({ field }) => <ColorPickerField label="Text" value={field.value} onChange={field.onChange} />} />
                        {!isCodeOnlyScope && (
                            <Controller name={p('lightStyle.strokeColor')} control={control} defaultValue="#333333" render={({ field }) => <ColorPickerField label="Stroke" value={field.value} onChange={field.onChange} />} />
                        )}

                        {/* Point Purchase Colors (Light) */}
                        {maskType === 'point_purchase' && (
                            <>
                                <Controller name={p('lightStyle.buttonColor')} control={control} defaultValue="#1532c1" render={({ field }) => <ColorPickerField label="Button Color" value={field.value} onChange={field.onChange} />} />
                                <Controller name={p('lightStyle.buttonTextColor')} control={control} defaultValue="#ffffff" render={({ field }) => <ColorPickerField label="Button Text" value={field.value} onChange={field.onChange} />} />
                            </>
                        )}

                        {/* Point Threshold Colors (Light) */}
                        {maskType === 'point_threshold' && (
                            <>
                                <Controller name={p('lightStyle.progressBarColor')} control={control} defaultValue="#f1c40f" render={({ field }) => <ColorPickerField label="Progress Fill" value={field.value} onChange={field.onChange} />} />
                                <Controller name={p('lightStyle.progressBackgroundColor')} control={control} defaultValue="rgba(0,0,0,0.1)" render={({ field }) => <ColorPickerField label="Progress Bg" value={field.value} onChange={field.onChange} />} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};