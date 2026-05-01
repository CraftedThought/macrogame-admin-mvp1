/* src/components/builders/conversion/screen/GateResolutionEditor.tsx */

import React from 'react';
import { Control, UseFormRegister, UseFormWatch, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import { styles } from '../../../../App.styles';
import { ConversionScreen } from '../../../../types';
import { TransitionSettingsEditor } from '../../macrogame/TransitionSettingsEditor';
import { ButtonConfigEditor } from '../../../forms/ButtonConfigEditor';

interface GateResolutionEditorProps {
    index: number;
    register: UseFormRegister<any>;
    control: Control<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
    allConversionScreens: ConversionScreen[];
}

export const GateResolutionEditor: React.FC<GateResolutionEditorProps> = ({
    index,
    register,
    control,
    watch,
    setValue,
    getValues,
    allConversionScreens
}) => {
    const prefix = `methods.${index}.gate.resolutionConfig`;
    
    const isPlayAgainEnabled = watch(`${prefix}.isPlayAgainEnabled`);
    const isContinueEnabled = watch(`${prefix}.isContinueEnabled`);

    // Determine the logical mapping for Primary vs Secondary based on toggles
    const primaryActionLabel = isPlayAgainEnabled ? 'Play Again' : (isContinueEnabled ? 'Continue (Route)' : 'None');
    const secondaryActionLabel = (isPlayAgainEnabled && isContinueEnabled) ? 'Continue (Route)' : 'None';

    const handleTogglePlayAgain = (checked: boolean) => {
        setValue(`${prefix}.isPlayAgainEnabled`, checked);
        
        // Smart Text Defaults
        if (checked) {
            setValue(`${prefix}.transition.buttonConfig.text`, 'Play Again');
            if (isContinueEnabled) {
                // Initialize secondary button if it doesn't exist
                if (!getValues(`${prefix}.secondaryButtonConfig`)) {
                    setValue(`${prefix}.secondaryButtonConfig`, { text: 'Continue', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'solid', strokeWidth: 2 });
                    setValue(`${prefix}.secondaryButtonStyle`, { backgroundColor: 'transparent', textColor: '#ffffff', strokeColor: '#ffffff' });
                    setValue(`${prefix}.lightSecondaryButtonStyle`, { backgroundColor: 'transparent', textColor: '#333333', strokeColor: '#333333' });
                } else {
                    setValue(`${prefix}.secondaryButtonConfig.text`, 'Continue');
                }
            }
        } else if (isContinueEnabled) {
            // Continue moves up to Primary
            setValue(`${prefix}.transition.buttonConfig.text`, 'Continue');
        }
    };

    const handleToggleContinue = (checked: boolean) => {
        setValue(`${prefix}.isContinueEnabled`, checked);
        
        // Smart Text Defaults
        if (checked) {
            if (isPlayAgainEnabled) {
                // Play Again is Primary, Continue is Secondary
                if (!getValues(`${prefix}.secondaryButtonConfig`)) {
                    setValue(`${prefix}.secondaryButtonConfig`, { text: 'Continue', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, widthMode: 'max', customWidth: 50, strokeStyle: 'solid', strokeWidth: 2 });
                    setValue(`${prefix}.secondaryButtonStyle`, { backgroundColor: 'transparent', textColor: '#ffffff', strokeColor: '#ffffff' });
                    setValue(`${prefix}.lightSecondaryButtonStyle`, { backgroundColor: 'transparent', textColor: '#333333', strokeColor: '#333333' });
                } else {
                    setValue(`${prefix}.secondaryButtonConfig.text`, 'Continue');
                }
            } else {
                // Continue is Primary
                setValue(`${prefix}.transition.buttonConfig.text`, 'Continue');
            }
        }
    };

    return (
        <div style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <h5 style={{ ...styles.h4, marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: '#333' }}>
                Resolution Routing
            </h5>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem', opacity: 0.9 }}>
                Configure the buttons and actions presented to the user on this mask when they do not have enough points.
            </p>

            {/* --- 1. ACTION TOGGLES & CONFIG --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Play Again Configuration */}
                <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #eee' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>
                        <input 
                            type="checkbox" 
                            checked={isPlayAgainEnabled} 
                            onChange={(e) => handleTogglePlayAgain(e.target.checked)} 
                        />
                        Enable "Play Again" Action
                    </label>
                    
                    {isPlayAgainEnabled && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Point Behavior</label>
                                <select {...register(`${prefix}.playAgainBehavior`)} style={styles.input}>
                                    <option value="reset_points">Reset Points (Start from 0)</option>
                                    <option value="keep_points">Keep Points (Accumulate)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Restart From</label>
                                <select {...register(`${prefix}.playAgainTargetIndex`)} style={styles.input}>
                                    <option value={0}>First Microgame</option>
                                    {/* In V2, we can dynamically pull the macrogame's flow to list specific games here */}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Continue (Route) Configuration */}
                <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #eee' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>
                        <input 
                            type="checkbox" 
                            checked={isContinueEnabled} 
                            onChange={(e) => handleToggleContinue(e.target.checked)} 
                        />
                        Enable "Continue" Action (Branching Route)
                    </label>

                    {isContinueEnabled && (
                        <div style={{ marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Fallback Conversion Screen</label>
                            <select {...register(`${prefix}.routeTargetId`)} style={styles.input}>
                                <option value="">Select a target screen...</option>
                                {allConversionScreens.map(screen => (
                                    <option key={screen.id} value={screen.id}>{screen.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* --- 2. DYNAMIC BUTTON EDITORS --- */}
            {(!isPlayAgainEnabled && !isContinueEnabled) ? (
                <div style={{ padding: '1rem', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', border: '1px solid #ffeeba', fontSize: '0.85rem' }}>
                    <strong>Warning:</strong> You have disabled both actions. Users without enough points will see a locked mask with no way to proceed or replay.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px dashed #f5b7b1', paddingTop: '1.5rem' }}>
                    
                    {/* Primary Slot (Always Transition Config) */}
                    <div>
                        <h6 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                            {primaryActionLabel} Button (Primary)
                        </h6>
                        <TransitionSettingsEditor 
                            transition={watch(`${prefix}.transition`)}
                            defaultButtonText={primaryActionLabel.split(' ')[0]} 
                            onChange={(t) => setValue(`${prefix}.transition`, t)}
                        />
                    </div>

                    {/* Secondary Slot (Only if BOTH are enabled) */}
                    {(isPlayAgainEnabled && isContinueEnabled) && (
                        <div>
                            <h6 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                {secondaryActionLabel} Button (Secondary)
                            </h6>
                            <ButtonConfigEditor 
                                title="Secondary Action"
                                config={watch(`${prefix}.secondaryButtonConfig`) || {}}
                                darkTheme={watch(`${prefix}.secondaryButtonStyle`) || {}}
                                lightTheme={watch(`${prefix}.lightSecondaryButtonStyle`) || {}}
                                defaultText="Continue"
                                allowTransparentBg={true}
                                onChangeConfig={(key, value) => setValue(`${prefix}.secondaryButtonConfig.${key}`, value)}
                                onChangeTheme={(mode, key, value) => {
                                    const themeKey = mode === 'dark' ? 'secondaryButtonStyle' : 'lightSecondaryButtonStyle';
                                    setValue(`${prefix}.${themeKey}.${key}`, value);
                                }}
                            />
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};