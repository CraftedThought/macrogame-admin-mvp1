/* src/components/builders/macrogame/PreGameSettings.tsx */

import React, { useState, useRef } from 'react';
import { styles } from '../../../App.styles';
import { PreGameConfig } from '../../../types';
import { SimpleTextEditor } from '../../forms/SimpleTextEditor';
import { TransitionSettingsEditor } from './TransitionSettingsEditor';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

interface PreGameSettingsProps {
    config: PreGameConfig;
    flowType: 'Separate' | 'Skip' | 'Overlay';
    theme: 'dark' | 'light';
    onChange: (key: keyof PreGameConfig, value: any) => void;
    onStyleChange: (mode: 'buttonStyle' | 'lightButtonStyle' | 'buttonConfig', key: string, value: any) => void;
    onFlowTypeChange: (type: 'Separate' | 'Skip' | 'Overlay') => void;
    onInteract: () => void;
}

export const PreGameSettings: React.FC<PreGameSettingsProps> = ({
    config,
    flowType,
    theme,
    onChange,
    onStyleChange,
    onFlowTypeChange,
    onInteract
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showHeadline, setShowHeadline] = useState(!!config.headline);
    const [showBodyText, setShowBodyText] = useState(!!config.bodyText);
    
    const lastHeadline = useRef<string>(config.headline || '<h1 style="text-align: center; text-transform: uppercase;">{{game_title}}</h1>');
    const lastBodyText = useRef<string>(config.bodyText || '<p style="text-align: center; font-size: 1.25rem;">{{game_controls}}</p>');

    const isOverlay = flowType === 'Overlay';
    
    // Dynamically adapt the editor background to the current theme to prevent white-on-white text issues in the Live Preview
    const editorBgColor = theme === 'light' ? '#ffffff' : '#1a1a2e';
    const editorTextColor = theme === 'light' ? '#333333' : '#ffffff';

    return (
        <div style={{ backgroundColor: '#fff', padding: '1.5rem 2rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div 
                    onClick={() => { if (flowType !== 'Skip') setIsExpanded(!isExpanded); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: flowType !== 'Skip' ? 'pointer' : 'default', flex: 1 }}
                >
                    {flowType !== 'Skip' ? (
                        <span style={{ fontSize: '1.2rem', color: '#666', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                    ) : (
                        <span style={{ width: '1.2rem', display: 'inline-block' }}></span> /* Invisible placeholder to keep text aligned */
                    )}
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: flowType !== 'Skip' ? '#333' : '#999', transition: 'color 0.2s' }}>Pre-Game Screen Settings</h4>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        checked={flowType !== 'Skip'} 
                        onChange={e => { 
                            const isChecked = e.target.checked;
                            onFlowTypeChange(isChecked ? 'Overlay' : 'Skip'); 
                            if (isChecked) {
                                setIsExpanded(true);
                                onInteract(); // Navigate immediately in the live preview
                                
                                // Automatically restore factory defaults if they were wiped from a previous save
                                if (!config.headline) {
                                    onChange('headline', '<h1 style="text-align: center; text-transform: uppercase;">{{game_title}}</h1>');
                                    setShowHeadline(true);
                                }
                                if (!config.bodyText) {
                                    onChange('bodyText', '<p style="text-align: center; font-size: 1.25rem;">{{game_controls}}</p>');
                                    setShowBodyText(true);
                                }

                                // Restore pruned transition object (Default is Auto-Countdown for Pre-Game)
                                if (!config.transition || !config.transition.buttonConfig) {
                                    onChange('transition', {
                                        type: 'auto',
                                        autoDuration: 3,
                                        showCountdown: true,
                                        countdownText: 'Continuing in {{time}}',
                                        interactionMethod: 'click',
                                        clickFormat: 'button',
                                        disclaimerText: 'Click anywhere to start',
                                        pulseAnimation: true,
                                        buttonConfig: { text: 'Start', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'none', strokeWidth: 2, enableHoverAnimation: true },
                                        buttonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeColor: '#0866ff' },
                                        lightButtonStyle: { backgroundColor: '#0866ff', textColor: '#ffffff', strokeColor: '#0866ff' }
                                    });
                                }
                            }
                        }}
                        style={{ width: '18px', height: '18px' }} 
                    />
                    Enable Screen
                </label>
            </div>

            {flowType !== 'Skip' && isExpanded && (
                <div 
                    onFocus={onInteract} 
                    onClick={onInteract}
                    style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}
                >
                    
                    {/* FORMAT DROPDOWN */}
                    <div style={styles.configItem}>
                        <label>Pre-Game Screen Format</label>
                        <select 
                            value={flowType === 'Skip' ? 'Overlay' : flowType} 
                            onChange={e => onFlowTypeChange(e.target.value as any)} 
                            style={styles.input}
                        >
                            <option value="Separate">Separate Screen</option>
                            <option value="Overlay">Game Overlay</option>
                        </select>
                    </div>

                    {/* ONLY RENDER THE REST IF NOT SKIPPING */}
                    {flowType !== 'Skip' && (
                        <>
                            {isOverlay && (
                                <div style={{ padding: '0.75rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe', color: '#084298', fontSize: '0.85rem', marginTop: '-0.5rem' }}>
                                    <strong>Overlay Mode:</strong> The background is locked to a hardcoded translucent mask over the loaded game canvas.
                                </div>
                            )}

                            {/* --- CONTENT BLOCKS --- */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h5 style={{ margin: 0, color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Text Content</h5>
                                    <span style={{ fontSize: '0.8rem', color: '#0866ff' }}>💡 Tip: Use <strong>{`{{game_title}}`}</strong> and <strong>{`{{game_controls}}`}</strong> for dynamic text.</span>
                                </div>
                                
                                {/* HEADLINE */}
                                {!showHeadline && (
                                    <button 
                                        type="button" 
                                        onClick={() => { 
                                            onChange('headline', lastHeadline.current);
                                            setShowHeadline(true); 
                                        }} 
                                        style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: 'fit-content' }}
                                    >
                                        + Add Headline
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
                                            onChange('bodyText', lastBodyText.current);
                                            setShowBodyText(true); 
                                        }} 
                                        style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.25rem 0.5rem', marginBottom: '1rem', width: 'fit-content' }}
                                    >
                                        + Add Body Text
                                    </button>
                                )}
                                {showBodyText && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Body Text / Controls</label>
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
                            </div>

                            {/* --- LAYOUT SECTION --- */}
                            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee', marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Spacing & Padding</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 1rem', marginBottom: '1.5rem' }}>
                                    <div style={styles.configItem}>
                                        <label>Between Text (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.textSpacing ?? 0}
                                            onChange={val => onChange('textSpacing', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Between Groups (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.blockSpacing ?? 0}
                                            onChange={val => onChange('blockSpacing', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 1rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                                    <div style={styles.configItem}>
                                        <label>Padding Top (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.paddingTop ?? 0}
                                            onChange={val => onChange('paddingTop', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Bottom (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.paddingBottom ?? 0}
                                            onChange={val => onChange('paddingBottom', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Left (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.paddingLeft ?? 0}
                                            onChange={val => onChange('paddingLeft', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Right (px)</label>
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.paddingRight ?? 0}
                                            onChange={val => onChange('paddingRight', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- TRANSITION ENGINE SECTION --- */}
                            <TransitionSettingsEditor 
                                transition={config.transition} 
                                defaultButtonText="Start"
                                onChange={(t) => onChange('transition', t)} 
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
};