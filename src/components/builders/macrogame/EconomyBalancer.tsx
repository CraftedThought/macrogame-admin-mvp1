/* src/components/builders/macrogame/EconomyBalancer.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { Microgame, CustomMicrogame } from '../../../types';

export interface EconomyFlowItem {
    baseGame: Microgame;
    customVariant?: CustomMicrogame;
    pointRules: { [eventId: string]: number | '' };
    winCondition?: any;
    lossCondition?: any;
}

interface EconomyBalancerProps {
    flow: EconomyFlowItem[];
    pointGatedMethods: { instanceId: string; name: string }[];
    pointCosts: { [key: string]: number | '' };
    onPointRuleChange: (flowIndex: number, eventId: string, value: string) => void;
    onPointCostChange: (instanceId: string, value: string) => void;
    onFocusGame: (index: number) => void;
}

export const EconomyBalancer: React.FC<EconomyBalancerProps> = ({
    flow,
    pointGatedMethods,
    pointCosts,
    onPointRuleChange,
    onPointCostChange,
    onFocusGame
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
            {/* --- TOP HALF: REWARD STORE (TARGETS) --- */}
            {pointGatedMethods.length > 0 && (
                <div style={styles.configSection}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#333' }}>Reward Store (Targets)</h4>
                    <p style={styles.descriptionText}>
                        Set the required points (cost) for each point-gated reward in your Conversion Screen.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pointGatedMethods.map(method => (
                            <div key={method.instanceId} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', backgroundColor: '#f9f9f9' }}>
                                <strong style={{ fontSize: '1.05rem', color: '#333' }}>{method.name}</strong>
                                <div style={{...styles.configRow, alignItems: 'center', marginTop: '1rem'}}>
                                    <label style={{ flex: 1, fontWeight: 'bold', color: '#555' }}>Point Cost</label>
                                    <input
                                        type="number"
                                        value={pointCosts[method.instanceId] === 0 ? 0 : (pointCosts[method.instanceId] || '')}
                                        onChange={(e) => onPointCostChange(method.instanceId, e.target.value)}
                                        style={{...styles.input, width: '120px', flex: 'none' }}
                                    />
                                    <span style={{flex: 1, color: '#666'}}>points</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- BOTTOM HALF: POINT GENERATORS & RULES --- */}
            {flow.length > 0 && (
                <div style={{ ...styles.configSection, marginTop: pointGatedMethods.length > 0 ? 0 : undefined, paddingTop: pointGatedMethods.length > 0 ? 0 : undefined, borderTop: pointGatedMethods.length > 0 ? 'none' : undefined }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#333' }}>Event Point Values (Payouts & Deductions)</h4>
                    <p style={styles.descriptionText}>
                        Set the point values awarded or deducted for each event in the flow. These payouts are specific to this Macrogame and will not overwrite the original Microgame.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {flow.map((flowItem, index) => {
                            // Phase 3: Prioritize the Custom Variant name if it exists
                            const gameData = flowItem.customVariant || flowItem.baseGame;
                            const baseEvents = flowItem.baseGame.trackableEvents;

                            if (!baseEvents || baseEvents.length === 0) {
                                return (
                                    <div key={index} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '1rem', backgroundColor: '#fff' }}>
                                        <strong style={{ fontSize: '1.05rem', color: '#333' }}>{index + 1}. {gameData.name}</strong>
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
                                    <strong style={{ fontSize: '1.05rem', color: '#333' }}>{index + 1}. {gameData.name}</strong>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                        {baseEvents.map(event => {
                                            const currentPoints = flowItem.pointRules[event.eventId];
                                            return (
                                                <div key={event.eventId} style={{ ...styles.configRow, alignItems: 'center' }}>
                                                    <label style={{ flex: 1, color: '#555' }}>{event.label}</label>
                                                    <input
                                                        type="number"
                                                        value={currentPoints === 0 ? 0 : (currentPoints ?? event.defaultPoints ?? '')}
                                                        onChange={(e) => onPointRuleChange(index, event.eventId, e.target.value)}
                                                        style={{...styles.input, width: '120px', flex: 'none' }}
                                                    />
                                                    <span style={{flex: 1, color: '#666'}}>points</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};