import React from 'react';
import { styles } from '../../../App.styles';
import { Microgame, CustomMicrogame } from '../../../types';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export interface EconomyFlowItem {
    baseGame: Microgame;
    customVariant?: CustomMicrogame;
    pointRules: { [eventId: string]: number | '' };
    winCondition?: any;
    lossCondition?: any;
}

interface EconomyBalancerProps {
    flow: EconomyFlowItem[];
    onPointRuleChange: (flowIndex: number, eventId: string, value: string) => void;
    onFocusGame: (index: number) => void;
}

export const EconomyBalancer: React.FC<EconomyBalancerProps> = ({
    flow,
    onPointRuleChange,
    onFocusGame
}) => {
    if (flow.length === 0) return null;

    return (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
            <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Game Scoring Rules</h5>
            <p style={{...styles.descriptionText, fontSize: '0.85rem', marginBottom: '1rem'}}>
                Set the point values awarded or deducted for each event in the flow. These payouts are specific to this Macrogame and will not overwrite the original Microgame.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {flow.map((flowItem, index) => {
                    const gameData = flowItem.customVariant || flowItem.baseGame;
                    const baseEvents = flowItem.baseGame.trackableEvents;

                    if (!baseEvents || baseEvents.length === 0) {
                        return (
                            <div key={index} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', backgroundColor: '#fff' }}>
                                <strong style={{ fontSize: '0.95rem', color: '#333' }}>{index + 1}. {gameData.name}</strong>
                                <p style={{...styles.descriptionText, marginTop: '0.5rem'}}>This microgame does not have any trackable point events defined.</p>
                            </div>
                        );
                    }
                    
                    return (
                        <div 
                            key={index} 
                            onClick={() => onFocusGame(index)} 
                            style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', cursor: 'pointer', transition: 'border-color 0.2s', backgroundColor: '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0866ff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ccc'}
                        >
                            <strong style={{ fontSize: '0.95rem', color: '#333' }}>{index + 1}. {gameData.name}</strong>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                {baseEvents.map(event => {
                                    const currentPoints = flowItem.pointRules[event.eventId];
                                    return (
                                        <div key={event.eventId} style={{ ...styles.configRow, alignItems: 'center' }}>
                                            <label style={{ flex: 1, color: '#555', fontSize: '0.9rem' }}>{event.label}</label>
                                            <SmartNumberInput
                                                min={-99999} // Allow negative for deductions
                                                max={99999}
                                                value={currentPoints === '' ? 0 : (currentPoints ?? event.defaultPoints ?? 0)}
                                                fallbackValue={0}
                                                onChange={(val) => onPointRuleChange(index, event.eventId, String(val))}
                                                style={{...styles.input, width: '100px', flex: 'none', textAlign: 'center' }}
                                            />
                                            <span style={{flex: 1, color: '#666', fontSize: '0.85rem'}}>pts</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};