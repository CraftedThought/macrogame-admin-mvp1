/* src/components/builders/macrogame/TransitionSettingsEditor.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { TransitionConfig } from '../../../types';
import { ButtonConfigEditor } from '../../forms/ButtonConfigEditor';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

interface TransitionSettingsEditorProps {
    transition: TransitionConfig;
    defaultButtonText?: string;
    onChange: (transition: TransitionConfig) => void;
}

export const TransitionSettingsEditor: React.FC<TransitionSettingsEditorProps> = ({ transition, defaultButtonText, onChange }) => {
    const currentConfig = transition;
    
    const type = currentConfig.type;
    const interactionMethod = currentConfig.interactionMethod;
    const clickFormat = currentConfig.clickFormat;

    const handleNumberChange = (value: string): number | '' => {
        if (value === '') return '';
        const num = Number(value);
        return (!isNaN(num) && num >= 0) ? num : '';
    };

    const handleTransitionChange = (key: string, value: any) => {
        const newTransition = { ...currentConfig, [key]: value };
        
        // Proactively seed missing defaults so the DB and Preview match the UI instantly
        if (key === 'type' && value === 'interact') {
            newTransition.interactionMethod = newTransition.interactionMethod || 'click';
            newTransition.clickFormat = newTransition.clickFormat || 'disclaimer';
        } else if (key === 'type' && value === 'auto') {
            newTransition.showCountdown = newTransition.showCountdown ?? true;
        } else if (key === 'interactionMethod') {
            if (value === 'click') {
                newTransition.clickFormat = newTransition.clickFormat || 'disclaimer';
                newTransition.disclaimerText = 'Click anywhere to continue';
            } else if (value === 'any_interaction') {
                newTransition.disclaimerText = 'Click or press any key to continue';
            }
        }
        
        onChange(newTransition);
    };

    const handleTransitionStyleChange = (mode: string, key: string, value: any) => {
        const currentModeConfig = (currentConfig as any)[mode] || {};
        onChange({
            ...currentConfig,
            [mode]: { ...currentModeConfig, [key]: value }
        });
    };

    return (
        <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid #eee' }}>
            <h5 style={{ margin: '0 0 1.5rem 0', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>Transition Settings</h5>
            
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Transition Mode</label>
                <select 
                    value={type}
                    onChange={e => handleTransitionChange('type', e.target.value)}
                    style={styles.input}
                >
                    <option value="auto">Auto-Transition (Timer)</option>
                    <option value="interact">Interact to Continue</option>
                </select>
            </div>

            {type === 'auto' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                    <div style={styles.configItem}>
                        <label>Duration (seconds)</label>
                        <SmartNumberInput 
                            min={1} max={60}
                            fallbackValue={3}
                            value={currentConfig.autoDuration ?? 3}
                            onChange={val => handleTransitionChange('autoDuration', val)}
                            onBlur={() => {
                                if (currentConfig.autoDuration === 0) handleTransitionChange('autoDuration', 3);
                            }}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.configItem}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '100%' }}>
                            <input 
                                type="checkbox" 
                                checked={currentConfig.showCountdown ?? false}
                                onChange={e => handleTransitionChange('showCountdown', e.target.checked)}
                            />
                            Show Countdown Text
                        </label>
                    </div>
                    {currentConfig.showCountdown && (
                        <div style={{ ...styles.configItem, gridColumn: '1 / -1' }}>
                            <label>Countdown Text (use {'{{time}}'} for the number)</label>
                            <input 
                                type="text" 
                                value={currentConfig.countdownText ?? 'Continuing in {{time}}'}
                                onChange={e => handleTransitionChange('countdownText', e.target.value)}
                                style={styles.input}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={styles.configItem}>
                            <label>Interaction Method</label>
                            <select
                                value={interactionMethod}
                                onChange={e => handleTransitionChange('interactionMethod', e.target.value)}
                                style={styles.input}
                            >
                                <option value="click">Click</option>
                                <option value="any_interaction">Click or Keypress</option>
                            </select>
                        </div>
                        
                        {interactionMethod !== 'any_interaction' && (
                            <div style={styles.configItem}>
                                <label>Click Format</label>
                                <select
                                    value={clickFormat}
                                    onChange={e => handleTransitionChange('clickFormat', e.target.value)}
                                    style={styles.input}
                                >
                                    <option value="disclaimer">Disclaimer Text</option>
                                    <option value="button">Button</option>
                                </select>
                            </div>
                        )}
                    </div>
                    
                    {(interactionMethod === 'any_interaction' || clickFormat === 'disclaimer') ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={styles.configItem}>
                                <label>Disclaimer Text</label>
                                <input 
                                    type="text" 
                                    value={currentConfig.disclaimerText ?? (interactionMethod === 'any_interaction' ? 'Click or press any key to continue' : 'Click anywhere to continue')}
                                    onChange={e => handleTransitionChange('disclaimerText', e.target.value)}
                                    onBlur={(e) => { 
                                        if (e.target.value.trim() === '') {
                                            handleTransitionChange('disclaimerText', interactionMethod === 'any_interaction' ? 'Click or press any key to continue' : 'Click anywhere to continue');
                                        }
                                    }}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.configItem}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '100%' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={currentConfig.pulseAnimation ?? true}
                                        onChange={e => handleTransitionChange('pulseAnimation', e.target.checked)}
                                    />
                                    Enable Pulse Animation
                                </label>
                            </div>
                        </div>
                    ) : (
                        <ButtonConfigEditor 
                            title="Button"
                            config={currentConfig.buttonConfig || {}}
                            darkTheme={currentConfig.buttonStyle || {}}
                            lightTheme={currentConfig.lightButtonStyle || {}}
                            defaultText={defaultButtonText || 'Continue'}
                            onChangeConfig={(key, value) => handleTransitionStyleChange('buttonConfig', key, value)}
                            onChangeTheme={(mode, key, value) => {
                                const themeKey = mode === 'dark' ? 'buttonStyle' : 'lightButtonStyle';
                                handleTransitionStyleChange(themeKey, key, value);
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
};