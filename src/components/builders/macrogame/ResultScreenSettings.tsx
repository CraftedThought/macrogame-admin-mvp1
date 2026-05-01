/* src/components/builders/macrogame/ResultScreenSettings.tsx */

import React, { useState } from 'react';
import { styles } from '../../../App.styles';
import { ResultConfig } from '../../../types';
import { SimpleTextEditor } from '../../forms/SimpleTextEditor';
import { ButtonConfigEditor } from '../../forms/ButtonConfigEditor';
import { TransitionSettingsEditor } from './TransitionSettingsEditor';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

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

    const editorBgColor = theme === 'light' ? '#ffffff' : '#333333';
    const editorTextColor = theme === 'light' ? '#333333' : '#ffffff';

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
                            if (isChecked) {
                                if (!config.format || config.format === 'skip' as any) {
                                    onChange('format', 'overlay');
                                }
                                setIsExpanded(true); 
                                onInteract(); // Navigate immediately in the live preview
                                
                                // Automatically restore factory defaults if they were wiped from a previous save
                                if (!config.winText) onChange('winText', '<h1 style="text-align: center; color: #2ecc71; text-transform: uppercase;">WIN!</h1>');
                                if (!config.winBodyText) onChange('winBodyText', '<p style="text-align: center; font-size: 1.25rem;">Congrats, you won! Click to continue to the next stage.</p>');
                                if (!config.lossText) onChange('lossText', '<h1 style="text-align: center; color: #e74c3c; text-transform: uppercase;">GAME OVER</h1>');
                                if (!config.lossBodyText) onChange('lossBodyText', '<p style="text-align: center; font-size: 1.25rem;">Oh no, you lost!</p>');
                                if (!config.tryAgainText) onChange('tryAgainText', '<h1 style="text-align: center; color: #f1c40f; text-transform: uppercase;">TRY AGAIN</h1>');
                                if (!config.tryAgainBodyText) onChange('tryAgainBodyText', '<p style="text-align: center; font-size: 1.25rem;">You didn\'t reach the goal, but don\'t worry. You can try again!</p>');
                                
                                // Restore pruned transition object (Primary Button)
                                if (!config.transition || !config.transition.buttonConfig) {
                                    onChange('transition', {
                                        type: 'interact',
                                        interactionMethod: 'click',
                                        clickFormat: 'button',
                                        disclaimerText: 'Click anywhere to continue',
                                        pulseAnimation: true,
                                        buttonConfig: { text: 'Continue', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'none', strokeWidth: 2 },
                                        buttonStyle: { backgroundColor: '#ffffff', textColor: '#333333', strokeColor: '#ffffff' },
                                        lightButtonStyle: { backgroundColor: '#333333', textColor: '#ffffff', strokeColor: '#333333' }
                                    });
                                }

                                // Restore pruned Secondary Button
                                if (!config.secondaryButtonConfig) {
                                    onChange('secondaryButtonConfig', { text: 'Play Again', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'solid', strokeWidth: 2 });
                                    onChange('secondaryButtonStyle', { backgroundColor: 'transparent', textColor: '#ffffff', strokeColor: '#ffffff' });
                                    onChange('lightSecondaryButtonStyle', { backgroundColor: 'transparent', textColor: '#333333', strokeColor: '#333333' });
                                }
                            }
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
                                        <SmartNumberInput 
                                            min={0} max={120}
                                            fallbackValue={0}
                                            value={config.textSpacing ?? 0}
                                            onChange={val => onChange('textSpacing', Math.min(120, Math.max(0, val)))}
                                            style={styles.input}
                                        />
                                    </div>
                                    
                                    {(config.showPlayAgainOnWin || config.showPlayAgainOnLoss || config.showPlayAgainOnTryAgain) && (
                                        <div style={styles.configItem}>
                                            <label>Between Buttons (px)</label>
                                            <SmartNumberInput 
                                                min={0} max={120}
                                                fallbackValue={0}
                                                value={config.buttonSpacing ?? 0}
                                                onChange={val => onChange('buttonSpacing', Math.min(120, Math.max(0, val)))}
                                                style={styles.input}
                                            />
                                        </div>
                                    )}

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
                                    config={config.secondaryButtonConfig || { text: 'Play Again', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'solid', strokeWidth: 2 }}
                                    darkTheme={config.secondaryButtonStyle || { backgroundColor: 'transparent', textColor: '#ffffff', strokeColor: '#ffffff' }}
                                    lightTheme={config.lightSecondaryButtonStyle || { backgroundColor: 'transparent', textColor: '#333333', strokeColor: '#333333' }}
                                    defaultText="Play Again"
                                    allowTransparentBg={true}
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