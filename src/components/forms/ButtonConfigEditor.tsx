/* src/components/forms/ButtonConfigEditor.tsx */

import React from 'react';
import { styles } from '../../App.styles';
import { ButtonStructureConfig, ButtonThemeStyle } from '../../types';
import { SmartNumberInput } from '../ui/inputs/SmartNumberInput';

interface ButtonConfigEditorProps {
    title: string;
    config: ButtonStructureConfig;
    darkTheme: ButtonThemeStyle;
    lightTheme: ButtonThemeStyle;
    defaultText?: string;
    allowTransparentBg?: boolean;
    onChangeConfig: (key: keyof ButtonStructureConfig, value: any) => void;
    onChangeTheme: (mode: 'dark' | 'light', key: keyof ButtonThemeStyle, value: any) => void;
}

export const ButtonConfigEditor: React.FC<ButtonConfigEditorProps> = ({
    title,
    config,
    darkTheme,
    lightTheme,
    defaultText,
    allowTransparentBg = false,
    onChangeConfig,
    onChangeTheme
}) => {
    return (
        <div style={{ marginTop: '0.5rem', padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h6 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '0.95rem' }}>{title} Structure</h6>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={styles.configItem}>
                    <label>Button Text</label>
                    <input 
                        type="text" 
                        value={config.text ?? ''} 
                        onChange={e => onChangeConfig('text', e.target.value)} 
                        onBlur={(e) => { if (e.target.value.trim() === '') onChangeConfig('text', defaultText || 'Continue'); }}
                        style={styles.input} 
                    />
                </div>
                <div style={styles.configItem}>
                    <label>Border Radius (px)</label>
                    <SmartNumberInput 
                        min={0} max={100}
                        fallbackValue={6}
                        value={config.borderRadius ?? 6} 
                        onChange={val => onChangeConfig('borderRadius', Math.min(100, Math.max(0, val)))} 
                        style={styles.input} 
                    />
                </div>
                <div style={styles.configItem}>
                    <label>Vertical Padding (px)</label>
                    <SmartNumberInput 
                        min={0} max={60}
                        fallbackValue={0}
                        value={config.paddingVertical ?? 0} 
                        onChange={val => onChangeConfig('paddingVertical', Math.min(60, Math.max(0, val)))} 
                        style={styles.input} 
                    />
                </div>
                <div style={styles.configItem}>
                    <label>Horizontal Padding (px)</label>
                    <SmartNumberInput 
                        min={0} max={100}
                        fallbackValue={0}
                        value={config.paddingHorizontal ?? 0} 
                        onChange={val => onChangeConfig('paddingHorizontal', Math.min(100, Math.max(0, val)))} 
                        style={{ ...styles.input, opacity: (config.widthMode === 'max' || config.widthMode === 'custom') ? 0.5 : 1 }}
                        disabled={config.widthMode === 'max' || config.widthMode === 'custom'}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={styles.configItem}>
                    <label>Stroke Style</label>
                    <select 
                        value={config.strokeStyle || 'none'} 
                        onChange={e => onChangeConfig('strokeStyle', e.target.value as any)} 
                        style={styles.input}
                    >
                        <option value="none">None</option>
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                    </select>
                </div>
                {config.strokeStyle && config.strokeStyle !== 'none' && (
                    <div style={styles.configItem}>
                        <label>Stroke Width (px)</label>
                        <SmartNumberInput 
                            min={0} max={20}
                            fallbackValue={0}
                            value={config.strokeWidth ?? 0} 
                            onChange={val => onChangeConfig('strokeWidth', Math.min(20, Math.max(0, val)))} 
                            style={styles.input}
                        />
                    </div>
                )}
            </div>

            <div style={{ ...styles.configItem, marginBottom: '1.5rem' }}>
                <label>Button Width</label>
                <select 
                    value={config.widthMode || 'wrap'} 
                    onChange={e => onChangeConfig('widthMode', e.target.value as any)} 
                    style={styles.input}
                >
                    <option value="wrap">Wrap Text (Fit Content)</option>
                    <option value="max">Max Width (Full Container)</option>
                    <option value="custom">Custom Width (%)</option>
                </select>
            </div>

            {config.widthMode === 'custom' && (
                <div style={{ ...styles.configItem, marginBottom: '1.5rem' }}>
                    <label>Custom Width (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input 
                            type="range" min="20" max="100" step="5"
                            value={config.customWidth ?? 100}
                            onChange={e => onChangeConfig('customWidth', Number(e.target.value))}
                            style={{ flex: 1, margin: 0, cursor: 'pointer' }}
                        />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <SmartNumberInput 
                                min={20} max={100}
                                value={config.customWidth ?? 100}
                                onChange={val => onChangeConfig('customWidth', Math.min(100, Math.max(20, val)))}
                                style={{ ...styles.input, width: '80px', paddingRight: '1.5rem' }}
                            />
                            <span style={{ position: 'absolute', right: '8px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ ...styles.configItem, marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed #ccc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                        type="checkbox" 
                        checked={config.enableHoverAnimation !== false} 
                        onChange={e => onChangeConfig('enableHoverAnimation', e.target.checked)} 
                    />
                    Enable Hover Animation
                </label>
            </div>

            <h6 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '0.95rem' }}>{title} Theme</h6>
            {(['dark', 'light'] as const).map((mode) => {
                const isDark = mode === 'dark';
                const modeTitle = isDark ? "Dark Mode Colors" : "Light Mode Colors";
                const activeStyle = isDark ? darkTheme : lightTheme;

                // Robust defaults for fallback rendering
                const defaultBg = isDark ? '#ffffff' : '#333333';
                const defaultText = isDark ? '#333333' : '#ffffff';
                const defaultStroke = isDark ? '#ffffff' : '#333333';

                return (
                    <div key={mode} style={{ marginBottom: isDark ? '1rem' : 0 }}>
                        <strong style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>{modeTitle}</strong>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Background Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input 
                                        type="color" 
                                        value={activeStyle.backgroundColor === 'transparent' ? defaultBg : (activeStyle.backgroundColor || defaultBg)}
                                        onChange={e => onChangeTheme(mode, 'backgroundColor', e.target.value)}
                                        style={{ width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                                    />
                                    <input 
                                        type="text" 
                                        value={activeStyle.backgroundColor ?? defaultBg}
                                        onChange={e => onChangeTheme(mode, 'backgroundColor', e.target.value)}
                                        style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '0.3rem' }}
                                        placeholder={defaultBg}
                                    />
                                    {allowTransparentBg && (
                                        <button 
                                            type="button"
                                            title="Set to Transparent"
                                            onClick={() => onChangeTheme(mode, 'backgroundColor', 'transparent')}
                                            style={{ 
                                                border: activeStyle.backgroundColor === 'transparent' ? '1px solid #0866ff' : '1px solid #ccc',
                                                borderRadius: '4px',
                                                padding: '0.3rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer',
                                                color: activeStyle.backgroundColor === 'transparent' ? '#ffffff' : '#666666', 
                                                backgroundColor: activeStyle.backgroundColor === 'transparent' ? '#0866ff' : '#f9f9f9', 
                                                whiteSpace: 'nowrap',
                                                fontWeight: activeStyle.backgroundColor === 'transparent' ? 'bold' : 'normal',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                        >
                                            ⊘ Transparent
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Text Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input 
                                        type="color" 
                                        value={activeStyle.textColor === 'transparent' ? defaultText : (activeStyle.textColor || defaultText)}
                                        onChange={e => onChangeTheme(mode, 'textColor', e.target.value)}
                                        style={{ width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                                    />
                                    <input 
                                        type="text" 
                                        value={activeStyle.textColor ?? defaultText}
                                        onChange={e => onChangeTheme(mode, 'textColor', e.target.value)}
                                        style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '0.3rem' }}
                                        placeholder={defaultText}
                                    />
                                </div>
                            </div>
                            {config.strokeStyle && config.strokeStyle !== 'none' && (
                                <div style={{ ...styles.configItem, flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem' }}>Stroke Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                            type="color" 
                                            value={activeStyle.strokeColor === 'transparent' ? defaultStroke : (activeStyle.strokeColor || defaultStroke)}
                                            onChange={e => onChangeTheme(mode, 'strokeColor', e.target.value)}
                                            style={{ width: '30px', height: '30px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                                        />
                                        <input 
                                            type="text" 
                                            value={activeStyle.strokeColor ?? defaultStroke}
                                            onChange={e => onChangeTheme(mode, 'strokeColor', e.target.value)}
                                            style={{ ...styles.input, flex: 1, fontSize: '0.85rem', padding: '0.3rem' }}
                                            placeholder={defaultStroke}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};