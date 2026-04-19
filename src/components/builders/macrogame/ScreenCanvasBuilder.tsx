/* src/components/builders/macrogame/ScreenCanvasBuilder.tsx */

import React, { useState, useRef, useEffect } from 'react';
import { styles } from '../../../App.styles';
import { ScreenConfig } from '../../../types';
import { SimpleTextEditor } from '../../forms/SimpleTextEditor';
import { TransitionSettingsEditor } from './TransitionSettingsEditor';

interface ScreenCanvasBuilderProps {
    title: string;
    type: 'intro' | 'promo';
    config: ScreenConfig;
    theme: 'dark' | 'light'; 
    onChange: (key: keyof ScreenConfig, value: any) => void;
    onStyleChange: (mode: 'style' | 'lightStyle', key: string, value: any) => void;
    onInteract: () => void;
    
    // Image Handling
    imageFile: File | null;
    onImageFileChange: (file: File | null) => void;
    spotlightImageFile?: File | null;
    onSpotlightImageFileChange?: (file: File | null) => void;
    onRemoveImage: (imageType: 'bg' | 'spotlight') => void;
}

export const ScreenCanvasBuilder: React.FC<ScreenCanvasBuilderProps> = ({
    title,
    type,
    config,
    theme,
    onChange,
    onStyleChange,
    onInteract,
    imageFile,
    onImageFileChange,
    spotlightImageFile,
    onSpotlightImageFileChange,
    onRemoveImage
}) => {
    // --- State & Memory Caching ---
    const [showHeadline, setShowHeadline] = useState(!!config.headline);
    const [showBodyText, setShowBodyText] = useState(!!config.bodyText);
    const [isExpanded, setIsExpanded] = useState(config.enabled);
    
    const lastHeadline = useRef<string>(config.headline || '');
    const lastBodyText = useRef<string>(config.bodyText || '');

    // Independent counters to safely reset file inputs ONLY on removal
    const [fileInputKeys, setFileInputKeys] = useState({ bg: 0, spot: 0 });

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = parseInt(value, 10);
        return isNaN(num) ? '' : Math.max(0, num);
    };

    // Dynamically pull the exact colors selected for the active mode, falling back to defaults
    const activeStyle = theme === 'light' ? (config.lightStyle || {}) : (config.style || {});
    const editorBgColor = activeStyle.backgroundColor || (theme === 'light' ? '#ffffff' : '#1a1a2e');
    const editorTextColor = activeStyle.textColor || (theme === 'light' ? '#333333' : '#ffffff');

    return (
        <div style={{ backgroundColor: '#fff', padding: '1.5rem 2rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div 
                    onClick={() => { if (config.enabled) setIsExpanded(!isExpanded); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: config.enabled ? 'pointer' : 'default', flex: 1 }}
                >
                    {config.enabled ? (
                        <span style={{ fontSize: '1.2rem', color: '#666', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                    ) : (
                        <span style={{ width: '1.2rem', display: 'inline-block' }}></span> /* Invisible placeholder to keep text aligned */
                    )}
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: config.enabled ? '#333' : '#999', transition: 'color 0.2s' }}>{title}</h4>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        checked={config.enabled} 
                        onChange={e => { 
                            const isChecked = e.target.checked;
                            onChange('enabled', isChecked); 
                            // Auto-expand when they enable the screen
                            if (isChecked) setIsExpanded(true); 
                        }} 
                        style={{ width: '18px', height: '18px' }} 
                    />
                    Enable Screen
                </label>
            </div>

            {config.enabled && isExpanded && (
                <div 
                    onFocus={onInteract} 
                    onClick={onInteract}
                    style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}
                >
                    
                    {/* --- CONTENT BLOCKS --- */}
                    <div>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Screen Content</h5>
                        
                        {/* HEADLINE */}
                        {!showHeadline && (
                            <button 
                                type="button" 
                                onClick={() => { 
                                    const saved = lastHeadline.current;
                                    onChange('headline', saved || (type === 'intro' ? '<h1 style="text-align: center;">GET READY!</h1>' : '<h1 style="text-align: center;">Special Promotion!</h1>'));
                                    setShowHeadline(true); 
                                }}
                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: 'fit-content' }}
                            >
                                + Add Main Headline
                            </button>
                        )}
                        {showHeadline && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Headline</label>
                                <SimpleTextEditor 
                                    initialHtml={config.headline || ''}
                                    onChange={(html) => onChange('headline', html)}
                                    backgroundColor={editorBgColor}
                                    defaultTextColor={editorTextColor}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => { 
                                        if (config.headline) lastHeadline.current = config.headline;
                                        setShowHeadline(false); 
                                        onChange('headline', ''); 
                                    }} 
                                    style={{ ...styles.deleteButton, marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.3rem 0.8rem', width: 'fit-content' }}
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
                                    const saved = lastBodyText.current;
                                    onChange('bodyText', saved || (type === 'intro' ? '<p style="text-align: center; font-size: 1.25rem;">Play a 10 second minigame for a chance to win a special reward!</p>' : '<p style="text-align: center; font-size: 1.25rem;">Check out this special offer just for you. Submit the required information on the next screen to get your reward!</p>'));
                                    setShowBodyText(true); 
                                }}
                                style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: 'fit-content' }}
                            >
                                + Add Body Text
                            </button>
                        )}
                        {showBodyText && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Body Text</label>
                                <SimpleTextEditor 
                                    initialHtml={config.bodyText || ''}
                                    onChange={(html) => onChange('bodyText', html)}
                                    backgroundColor={editorBgColor}
                                    defaultTextColor={editorTextColor}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => { 
                                        if (config.bodyText) lastBodyText.current = config.bodyText;
                                        setShowBodyText(false); 
                                        onChange('bodyText', ''); 
                                    }} 
                                    style={{ ...styles.deleteButton, marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.3rem 0.8rem', width: 'fit-content' }}
                                >
                                    Remove Body Text
                                </button>
                            </div>
                        )}
                        
                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #cce4ff' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#0056b3', margin: 0 }}>
                                <input 
                                    type="checkbox" 
                                    checked={config.textShadowEnabled ?? true} 
                                    onChange={e => onChange('textShadowEnabled', e.target.checked)} 
                                /> 
                                <strong>Enable text drop shadow</strong> (Improves readability over background images)
                            </label>
                        </div>
                    </div>

                    {/* --- STYLING & LAYOUT SECTION --- */}
                    <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Text Block Layout</h5>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ ...styles.configItem, flex: 1 }}>
                                    <label>Vertical Alignment</label>
                                    <select 
                                        value={config.style.verticalAlign} 
                                        onChange={e => onStyleChange('style', 'verticalAlign', e.target.value)} 
                                        style={styles.input}
                                    >
                                        <option value="top">Top</option>
                                        <option value="center">Center</option>
                                        <option value="bottom">Bottom</option>
                                    </select>
                                </div>
                                <div style={{ ...styles.configItem, flex: 1 }}>
                                    <label>Between Text (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style.spacing ?? ''}
                                        onChange={e => onStyleChange('style', 'spacing', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spacing', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={{ ...styles.configItem, flex: 1 }}>
                                    <label>Between Groups (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style.blockSpacing ?? ''}
                                        onChange={e => onStyleChange('style', 'blockSpacing', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'blockSpacing', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={styles.configItem}>
                                    <label>Padding Top (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style?.textPaddingTop ?? ''}
                                        onChange={e => onStyleChange('style', 'textPaddingTop', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'textPaddingTop', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Bottom (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style?.textPaddingBottom ?? ''}
                                        onChange={e => onStyleChange('style', 'textPaddingBottom', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'textPaddingBottom', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Left (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style?.textPaddingLeft ?? ''}
                                        onChange={e => onStyleChange('style', 'textPaddingLeft', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'textPaddingLeft', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Padding Right (px)</label>
                                    <input 
                                        type="number" min="0" max="120"
                                        value={config.style?.textPaddingRight ?? ''}
                                        onChange={e => onStyleChange('style', 'textPaddingRight', handleNumberChange(e.target.value))}
                                        onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'textPaddingRight', 0); }}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>

                        <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Dark and Light Mode</h5>
                        
                        {/* --- LOOP: Render Styling for Dark Mode then Light Mode --- */}
                        {['style', 'lightStyle'].map((modePrefix) => {
                            const isDark = modePrefix === 'style';
                            const title = isDark ? "Dark Mode Colors (Default)" : "Light Mode Colors";
                            const sectionBg = isDark ? '#f0f2f5' : '#ffffff';
                            const sectionBorder = isDark ? '1px solid #999' : '1px dashed #ccc';
                            const activeStyle = isDark ? config.style : config.lightStyle;

                            return (
                                <div key={modePrefix} style={{ backgroundColor: sectionBg, border: sectionBorder, padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                    <h6 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '0.95rem' }}>{title}</h6>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ ...styles.configItem, flex: 1 }}>
                                            <label>Background Color</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="color" 
                                                    value={activeStyle?.backgroundColor || (isDark ? '#1a1a2e' : '#ffffff')}
                                                    onChange={e => onStyleChange(modePrefix as 'style' | 'lightStyle', 'backgroundColor', e.target.value)}
                                                    style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                                                />
                                                <input 
                                                    type="text" 
                                                    value={activeStyle?.backgroundColor ?? (isDark ? '#1a1a2e' : '#ffffff')}
                                                    onChange={e => onStyleChange(modePrefix as 'style' | 'lightStyle', 'backgroundColor', e.target.value)}
                                                    style={{ ...styles.input, flex: 1 }}
                                                    placeholder={isDark ? '#1a1a2e' : '#ffffff'}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ ...styles.configItem, flex: 1 }}>
                                            <label>Text Color</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input 
                                                    type="color" 
                                                    value={activeStyle?.textColor || (isDark ? '#ffffff' : '#000000')}
                                                    onChange={e => onStyleChange(modePrefix as 'style' | 'lightStyle', 'textColor', e.target.value)}
                                                    style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                                                />
                                                <input 
                                                    type="text" 
                                                    value={activeStyle?.textColor ?? (isDark ? '#ffffff' : '#000000')}
                                                    onChange={e => onStyleChange(modePrefix as 'style' | 'lightStyle', 'textColor', e.target.value)}
                                                    style={{ ...styles.input, flex: 1 }}
                                                    placeholder={isDark ? '#ffffff' : '#000000'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* --- MEDIA & BEHAVIOR SECTION --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                        <div style={styles.configItem}>
                            <label>Background Image (Optional Overlay)</label>
                            {(config.backgroundImageUrl || imageFile) ? (
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                                    <p style={{fontSize: '0.8rem', margin: 0}}>Current: <a href={imageFile ? URL.createObjectURL(imageFile) : config.backgroundImageUrl!} target="_blank" rel="noopener noreferrer">View Image</a></p>
                                    <button 
                                        type="button" 
                                        onClick={() => { 
                                            onRemoveImage('bg'); 
                                            setFileInputKeys(prev => ({ ...prev, bg: prev.bg + 1 })); 
                                        }} 
                                        style={{...styles.deleteButton, padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <input 
                                    key={`bg-input-${fileInputKeys.bg}`} 
                                    type="file" 
                                    accept="image/jpeg,image/png" 
                                    style={styles.input} 
                                    onChange={e => { if (e.target.files?.[0]) onImageFileChange(e.target.files[0]); }} 
                                />
                            )}
                        </div>

                        {/* --- SPOTLIGHT IMAGE SECTION --- */}
                        <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '2px solid #eee' }}>
                            <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Spotlight Image</h5>
                            <div style={styles.configItem}>
                                <label>Spotlight Layout Position</label>
                                <select 
                                    value={config.spotlightImageLayout || ''} 
                                    onChange={e => onChange('spotlightImageLayout', e.target.value || null)} 
                                    style={styles.input}
                                >
                                    <option value="">No Spotlight Image</option>
                                    <option value="left">Image on Left</option>
                                    <option value="right">Image on Right</option>
                                    <option value="top">Image on Top</option>
                                    <option value="bottom">Image on Bottom</option>
                                </select>
                            </div>

                            {config.spotlightImageLayout && (
                                <div style={{ ...styles.configItem, marginTop: '1.5rem' }}>
                                    <label>Upload Spotlight Image</label>
                                    {(config.spotlightImageUrl || spotlightImageFile) ? (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                                            <p style={{fontSize: '0.8rem', margin: 0}}>Current: <a href={spotlightImageFile ? URL.createObjectURL(spotlightImageFile) : config.spotlightImageUrl!} target="_blank" rel="noopener noreferrer">View</a></p>
                                            <button 
                                                type="button" 
                                                onClick={() => { 
                                                    onRemoveImage('spotlight'); 
                                                    setFileInputKeys(prev => ({ ...prev, spot: prev.spot + 1 })); 
                                                }} 
                                                style={{...styles.deleteButton, padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <input 
                                            key={`spot-input-${fileInputKeys.spot}`}
                                            type="file" 
                                            accept="image/jpeg,image/png" 
                                            style={styles.input} 
                                            onChange={e => { if (e.target.files?.[0]) onSpotlightImageFileChange(e.target.files[0]); }} 
                                        />
                                    )}

                                    {/* --- SPOTLIGHT FORMATTING PANEL --- */}
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                                        <h6 style={{ margin: '0 0 1rem 0', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' }}>Spotlight Formatting</h6>
                                        
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{...styles.configItem, flex: 1 }}>
                                                <label>Layout Split (%)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input 
                                                        type="range" min="10" max="90" step="5"
                                                        value={config.style.spotlightSize}
                                                        onChange={e => onStyleChange('style', 'spotlightSize', Number(e.target.value))}
                                                        style={{ flex: 1, margin: 0, cursor: 'pointer' }}
                                                    />
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type="number" min="10" max="90"
                                                            value={config.style.spotlightSize}
                                                            onChange={e => onStyleChange('style', 'spotlightSize', Math.min(90, Math.max(10, Number(e.target.value))))}
                                                            style={{ ...styles.input, width: '80px', paddingRight: '1.5rem' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '8px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{...styles.configItem, flex: 1 }}>
                                                <label>Image Scale (%)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input 
                                                        type="range" min="10" max="100" step="5"
                                                        value={config.style.spotlightScale}
                                                        onChange={e => onStyleChange('style', 'spotlightScale', Number(e.target.value))}
                                                        style={{ flex: 1, margin: 0, cursor: 'pointer' }}
                                                    />
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type="number" min="10" max="100"
                                                            value={config.style.spotlightScale}
                                                            onChange={e => onStyleChange('style', 'spotlightScale', Math.min(100, Math.max(10, Number(e.target.value))))}
                                                            style={{ ...styles.input, width: '80px', paddingRight: '1.5rem' }}
                                                        />
                                                        <span style={{ position: 'absolute', right: '8px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ ...styles.configItem, flex: 1 }}>
                                                <label>Horizontal Align</label>
                                                <select 
                                                    value={config.style.spotlightAlignX}
                                                    onChange={e => onStyleChange('style', 'spotlightAlignX', e.target.value)}
                                                    style={styles.input}
                                                >
                                                    <option value="left">Left</option>
                                                    <option value="center">Center</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </div>

                                            <div style={{ ...styles.configItem, flex: 1 }}>
                                                <label>Vertical Align</label>
                                                <select 
                                                    value={config.style.spotlightAlignY}
                                                    onChange={e => onStyleChange('style', 'spotlightAlignY', e.target.value)}
                                                    style={styles.input}
                                                >
                                                    <option value="top">Top</option>
                                                    <option value="center">Center</option>
                                                    <option value="bottom">Bottom</option>
                                                </select>
                                            </div>

                                            <div style={{ ...styles.configItem, flex: 1 }}>
                                                <label>Image Fit</label>
                                                <select 
                                                    value={config.style.spotlightFit}
                                                    onChange={e => onStyleChange('style', 'spotlightFit', e.target.value)}
                                                    style={styles.input}
                                                >
                                                    <option value="cover">Fill Area (Cover)</option>
                                                    <option value="contain">Fit Image (Contain)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ ...styles.configItem, flex: 1 }}>
                                                <label>Content Gap (px)</label>
                                                <input 
                                                    type="number" min="0" max="120"
                                                    value={config.style.contentGap ?? ''}
                                                    onChange={e => onStyleChange('style', 'contentGap', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'contentGap', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                            
                                            <div style={{ ...styles.configItem, flex: 1 }}>
                                                <label>Border Radius (px)</label>
                                                <input 
                                                    type="number" min="0" max="60"
                                                    value={config.style.spotlightBorderRadius ?? ''}
                                                    onChange={e => onStyleChange('style', 'spotlightBorderRadius', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spotlightBorderRadius', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={styles.configItem}>
                                                <label>Padding Top (px)</label>
                                                <input 
                                                    type="number" min="0" max="120"
                                                    value={config.style?.spotlightPaddingTop ?? ''}
                                                    onChange={e => onStyleChange('style', 'spotlightPaddingTop', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spotlightPaddingTop', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <div style={styles.configItem}>
                                                <label>Padding Bottom (px)</label>
                                                <input 
                                                    type="number" min="0" max="120"
                                                    value={config.style?.spotlightPaddingBottom ?? ''}
                                                    onChange={e => onStyleChange('style', 'spotlightPaddingBottom', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spotlightPaddingBottom', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <div style={styles.configItem}>
                                                <label>Padding Left (px)</label>
                                                <input 
                                                    type="number" min="0" max="120"
                                                    value={config.style?.spotlightPaddingLeft ?? ''}
                                                    onChange={e => onStyleChange('style', 'spotlightPaddingLeft', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spotlightPaddingLeft', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <div style={styles.configItem}>
                                                <label>Padding Right (px)</label>
                                                <input 
                                                    type="number" min="0" max="120"
                                                    value={config.style?.spotlightPaddingRight ?? ''}
                                                    onChange={e => onStyleChange('style', 'spotlightPaddingRight', handleNumberChange(e.target.value))}
                                                    onBlur={(e) => { if (e.target.value === '') onStyleChange('style', 'spotlightPaddingRight', 0); }}
                                                    style={styles.input}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- TRANSITION ENGINE SECTION --- */}
                        <TransitionSettingsEditor 
                            transition={config.transition} 
                            defaultButtonText={type === 'intro' ? 'Start' : 'Continue'}
                            onChange={(t) => onChange('transition', t)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};