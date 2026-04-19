/* src/components/builders/macrogame/ResultScreenSettings.tsx */

import React, { useState } from 'react';
import { styles } from '../../../App.styles';
import { ResultConfig } from '../../../types';
import { SimpleTextEditor } from '../../forms/SimpleTextEditor';
import { ButtonConfigEditor } from '../../forms/ButtonConfigEditor';
import { TransitionSettingsEditor } from './TransitionSettingsEditor';

interface ResultScreenSettingsProps {
    config: ResultConfig;
    theme: 'dark' | 'light';
    showPoints?: boolean;
    canLose?: boolean;
    canTryAgain?: boolean;
    onChange: (key: keyof ResultConfig, value: any) => void;
    onStyleChange: (mode: string, key: string, value: any) => void;
    onInteract: () => void;
}

export const ResultScreenSettings: React.FC<ResultScreenSettingsProps> = ({
    config,
    theme,
    showPoints = false,
    canLose = true,
    canTryAgain = true,
    onChange,
    onStyleChange,
    onInteract
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = Number(value);
        return (!isNaN(num) && num >= 0) ? num : '';
    };

    // Overlay is always a dark mask, so simulate that in the editor background
    const editorBgColor = '#333333';
    const editorTextColor = '#ffffff';

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
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: config.enabled ? '#333' : '#999', transition: 'color 0.2s' }}>Game Result Screen Settings</h4>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        checked={config.enabled ?? true} 
                        onChange={e => { 
                            const isChecked = e.target.checked;
                            onChange('enabled', isChecked);
                            if (isChecked && (!config.format || config.format === 'skip' as any)) {
                                onChange('format', 'overlay');
                            }
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
                    
                    {/* FORMAT DROPDOWN */}
                    <div style={styles.configItem}>
                        <label>Result Screen Format</label>
                        <select 
                            value={config.format || 'overlay'} 
                            onChange={e => {
                                onChange('format', e.target.value);
                                onInteract();
                            }}
                            style={styles.input}
                        >
                            <option value="overlay">Game Overlay</option>
                            <option value="stand_alone">Stand-Alone Screen</option>
                        </select>
                    </div>

                    {config.enabled && (
                        <>
                            <div style={{ padding: '0.75rem', backgroundColor: '#eaf5fc', borderRadius: '4px', border: '1px solid #b6d4fe', color: '#084298', fontSize: '0.85rem', marginTop: '-0.5rem' }}>
                                <strong>Overlay Mode:</strong> The background is locked to a hardcoded translucent mask over the frozen game canvas.
                            </div>

                            {/* --- CONTENT BLOCKS --- */}
                            <div>
                                <h5 style={{ margin: '0 0 1rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Text Content by State</h5>
                                
                                {/* WIN STATE CARD */}
                                <div style={{ border: '1px solid #a3e6cd', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#f4fbf8' }}>
                                    <h6 style={{ margin: '0 0 1rem 0', color: '#27ae60', fontSize: '1rem', textTransform: 'uppercase' }}>Win State</h6>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Headline</label>
                                        <SimpleTextEditor 
                                            initialHtml={config.winText || ''}
                                            onChange={(html) => onChange('winText', html)}
                                            backgroundColor={editorBgColor}
                                            defaultTextColor={editorTextColor}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Body Text</label>
                                        <SimpleTextEditor 
                                            initialHtml={config.winBodyText || ''}
                                            onChange={(html) => onChange('winBodyText', html)}
                                            backgroundColor={editorBgColor}
                                            defaultTextColor={editorTextColor}
                                        />
                                    </div>
                                </div>

                                {/* LOSS STATE CARD */}
                                <div style={{ border: canLose ? '1px solid #f5b7b1' : '1px dashed #ccc', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: canLose ? '#fdf4f4' : '#f9f9f9', opacity: canLose ? 1 : 0.6, cursor: canLose ? 'default' : 'not-allowed' }}>
                                    <div style={{ pointerEvents: canLose ? 'auto' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h6 style={{ margin: '0 0 1rem 0', color: canLose ? '#c0392b' : '#999', fontSize: '1rem', textTransform: 'uppercase' }}>Loss State</h6>
                                            {!canLose && <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>Not applicable for this microgame.</span>}
                                        </div>
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Headline</label>
                                            <SimpleTextEditor 
                                                initialHtml={config.lossText || ''}
                                                onChange={(html) => onChange('lossText', html)}
                                                backgroundColor={editorBgColor}
                                                defaultTextColor={editorTextColor}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Body Text</label>
                                            <SimpleTextEditor 
                                                initialHtml={config.lossBodyText || ''}
                                                onChange={(html) => onChange('lossBodyText', html)}
                                                backgroundColor={editorBgColor}
                                                defaultTextColor={editorTextColor}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* TRY AGAIN STATE CARD */}
                                <div style={{ border: canTryAgain ? '1px solid #f9e79f' : '1px dashed #ccc', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: canTryAgain ? '#fefbf0' : '#f9f9f9', opacity: canTryAgain ? 1 : 0.6, cursor: canTryAgain ? 'default' : 'not-allowed' }}>
                                    <div style={{ pointerEvents: canTryAgain ? 'auto' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h6 style={{ margin: '0 0 1rem 0', color: canTryAgain ? '#d4ac0d' : '#999', fontSize: '1rem', textTransform: 'uppercase' }}>Try Again State</h6>
                                            {!canTryAgain && <span style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>Not applicable for this microgame.</span>}
                                        </div>
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Headline</label>
                                            <SimpleTextEditor 
                                                initialHtml={config.tryAgainText || ''}
                                                onChange={(html) => onChange('tryAgainText', html)}
                                                backgroundColor={editorBgColor}
                                                defaultTextColor={editorTextColor}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#555' }}>Body Text</label>
                                            <SimpleTextEditor 
                                                initialHtml={config.tryAgainBodyText || ''}
                                                onChange={(html) => onChange('tryAgainBodyText', html)}
                                                backgroundColor={editorBgColor}
                                                defaultTextColor={editorTextColor}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- LAYOUT SECTION --- */}
                            <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee', marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Spacing & Padding</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 1rem', marginBottom: '1.5rem' }}>
                                    <div style={styles.configItem}>
                                        <label>Between Text (px)</label>
                                        <input 
                                            type="number" min="0" max="120"
                                            value={config.textSpacing ?? 0}
                                            onChange={e => onChange('textSpacing', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('textSpacing', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                    
                                    {(config.showPlayAgainOnWin || config.showPlayAgainOnLoss || config.showPlayAgainOnTryAgain) && (
                                        <div style={styles.configItem}>
                                            <label>Between Buttons (px)</label>
                                            <input 
                                                type="number" min="0" max="120"
                                                value={config.buttonSpacing ?? 0}
                                                onChange={e => onChange('buttonSpacing', handleNumberChange(e.target.value))}
                                                onBlur={(e) => { if (e.target.value === '') onChange('buttonSpacing', 0); }}
                                                style={styles.input}
                                            />
                                        </div>
                                    )}

                                    <div style={styles.configItem}>
                                        <label>Between Groups (px)</label>
                                        <input 
                                            type="number" min="0" max="120"
                                            value={config.blockSpacing ?? 0}
                                            onChange={e => onChange('blockSpacing', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('blockSpacing', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem 1rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                                    <div style={styles.configItem}>
                                        <label>Padding Top (px)</label>
                                        <input 
                                            type="number" min="0" max="200"
                                            value={config.paddingTop ?? 0}
                                            onChange={e => onChange('paddingTop', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('paddingTop', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Bottom (px)</label>
                                        <input 
                                            type="number" min="0" max="200"
                                            value={config.paddingBottom ?? 0}
                                            onChange={e => onChange('paddingBottom', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('paddingBottom', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Left (px)</label>
                                        <input 
                                            type="number" min="0" max="200"
                                            value={config.paddingLeft ?? 0}
                                            onChange={e => onChange('paddingLeft', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('paddingLeft', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.configItem}>
                                        <label>Padding Right (px)</label>
                                        <input 
                                            type="number" min="0" max="200"
                                            value={config.paddingRight ?? 0}
                                            onChange={e => onChange('paddingRight', handleNumberChange(e.target.value))}
                                            onBlur={(e) => { if (e.target.value === '') onChange('paddingRight', 0); }}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- BEHAVIOR SECTION --- */}
                            <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
                                <h5 style={{ margin: '0 0 1.5rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Behavior & Interactions</h5>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px dashed #ccc' }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>Show Secondary "Play Again" button when player:</label>
                                    
                                    {config.transition?.type === 'auto' ? (
                                        <div style={{ fontSize: '0.85rem', color: '#e74c3c', backgroundColor: '#fdf4f4', padding: '0.75rem', borderRadius: '4px', border: '1px solid #f5b7b1', marginBottom: '0.5rem' }}>
                                            <strong>Note:</strong> Secondary buttons cannot be used on Win or Loss screens when the transition mode is set to "Auto-Transition".
                                        </div>
                                    ) : (
                                        <>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={config.showPlayAgainOnWin} onChange={e => onChange('showPlayAgainOnWin', e.target.checked)} />
                                                Wins the Microgame
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canLose ? 'pointer' : 'not-allowed', opacity: canLose ? 1 : 0.5 }}>
                                                <input type="checkbox" checked={canLose && config.showPlayAgainOnLoss} disabled={!canLose} onChange={e => onChange('showPlayAgainOnLoss', e.target.checked)} />
                                                Loses the Microgame (Hard Loss)
                                            </label>
                                        </>
                                    )}
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canTryAgain ? 'pointer' : 'not-allowed', opacity: canTryAgain ? 1 : 0.5 }}>
                                        <input type="checkbox" checked={canTryAgain && config.showPlayAgainOnTryAgain} disabled={!canTryAgain} onChange={e => onChange('showPlayAgainOnTryAgain', e.target.checked)} />
                                        Include secondary "Continue" button on Try Again screen <span style={{fontSize: '0.8rem', color: '#888'}}>("Play Again" is always primary)</span>
                                    </label>
                                </div>

                                {/* --- TRANSITION ENGINE (CONTINUE ACTION) --- */}
                                <TransitionSettingsEditor 
                                    transition={config.transition} 
                                    defaultButtonText="Continue"
                                    onChange={(t) => onChange('transition', t)} 
                                />
                                
                                <ButtonConfigEditor 
                                    title="Secondary Action (Play Again)"
                                    config={config.secondaryButtonConfig!}
                                    darkTheme={config.secondaryButtonStyle!}
                                    lightTheme={config.lightSecondaryButtonStyle!}
                                    defaultText="Play Again"
                                    onChangeConfig={(key, value) => onStyleChange('secondaryButtonConfig', key, value)}
                                    onChangeTheme={(mode, key, value) => {
                                        const themeKey = mode === 'dark' ? 'secondaryButtonStyle' : 'lightSecondaryButtonStyle';
                                        onStyleChange(themeKey, key, value);
                                    }}
                                />

                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};