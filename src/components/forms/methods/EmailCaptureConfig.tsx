/* src/components/forms/methods/EmailCaptureConfig.tsx */
import React from 'react';
import { Controller } from 'react-hook-form';
import { styles } from '../../../App.styles';
import { ButtonConfigEditor } from '../ButtonConfigEditor';
import { MethodConfigProps } from './LinkRedirectConfig';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export const EmailCaptureConfig: React.FC<MethodConfigProps> = ({
    control,
    register,
    watch,
    setValue,
    prefix = ''
}) => {
    const getFieldName = (name: string) => prefix ? `${prefix}.${name}` : name;

    const buttonConfig = watch(getFieldName('buttonConfig')) || {};
    const buttonStyle = watch(getFieldName('buttonStyle')) || {};
    const lightButtonStyle = watch(getFieldName('lightButtonStyle')) || {};

    const rawHeadline = watch(getFieldName('headline'));
    const rawSubheadline = watch(getFieldName('subheadline'));
    const hasHeadline = !!rawHeadline && rawHeadline !== '<p><br></p>';
    const hasSubheadline = !!rawSubheadline && rawSubheadline !== '<p><br></p>';
    const hasBothText = hasHeadline && hasSubheadline;
    const hasAnyText = hasHeadline || hasSubheadline;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. VERTICAL SPACING GROUP */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Vertical Spacing</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {hasBothText && (
                        <div style={styles.configItem}>
                            <label>Between Text (px)</label>
                            <Controller name={getFieldName("style.textSpacing")} control={control} defaultValue={10} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 10} onChange={field.onChange} style={styles.input} /> )} />
                        </div>
                    )}
                    {hasAnyText && (
                        <div style={styles.configItem}>
                            <label>Between Method & Text (px)</label>
                            <Controller name={getFieldName("style.methodSpacing")} control={control} defaultValue={20} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 20} onChange={field.onChange} style={styles.input} /> )} />
                        </div>
                    )}
                    <div style={styles.configItem}>
                        <label>Between Field & Button (px)</label>
                        <Controller name={getFieldName("style.buttonSpacing")} control={control} defaultValue={15} render={({ field }) => ( <SmartNumberInput min={0} max={120} fallbackValue={0} value={field.value ?? 15} onChange={field.onChange} style={styles.input} /> )} />
                    </div>
                </div>
            </div>

            {/* 2. EMAIL FIELD CONFIG */}
            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
                <h4 style={{ ...styles.h4, marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Email Field</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={styles.configItem}>
                        <label>Placeholder (Gray Text)</label>
                        <input
                            type="text"
                            {...register(getFieldName("emailPlaceholderText"), {
                                onBlur: (e) => {
                                    if (e.target.value.trim() === '') {
                                        setValue(getFieldName("emailPlaceholderText"), 'Enter your email...');
                                    }
                                }
                            })}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.configItem}>
                        <label>Border Radius (px)</label>
                        <Controller 
                            name={getFieldName("style.fieldBorderRadius")} 
                            control={control} 
                            defaultValue={6} 
                            render={({ field }) => ( 
                                <SmartNumberInput 
                                    min={0} max={100} 
                                    fallbackValue={0} 
                                    value={field.value ?? 6} 
                                    onChange={val => { if (val > 100) val = 100; if (val < 0) val = 0; field.onChange(val); }} 
                                    style={styles.input} 
                                /> 
                            )} 
                        />
                    </div>
                </div>
            </div>

            {/* 3. SUBMIT BUTTON CONFIG (USING NEW BUTTON ENGINE) */}
            <ButtonConfigEditor
                title="Submit Button"
                config={buttonConfig}
                darkTheme={buttonStyle}
                lightTheme={lightButtonStyle}
                defaultText="Submit"
                onChangeConfig={(key, value) => setValue(getFieldName(`buttonConfig.${key}`), value, { shouldDirty: true, shouldTouch: true })}
                onChangeTheme={(mode, key, value) => {
                    const themeKey = mode === 'dark' ? 'buttonStyle' : 'lightButtonStyle';
                    setValue(getFieldName(`${themeKey}.${key}`), value, { shouldDirty: true, shouldTouch: true });
                }}
            />
        </div>
    );
};