/* src/components/builders/macrogame/FlowRuleOverrides.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { Microgame, CustomMicrogame } from '../../../types';
import { MICROGAME_DEFINITIONS } from '../../../microgames/definitions/index';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export interface RuleOverrideFlowItem {
    baseGame: Microgame;
    customVariant?: CustomMicrogame;
    winCondition?: any;
    lossCondition?: any;
}

interface FlowRuleOverridesProps {
    flow: RuleOverrideFlowItem[];
    showPoints: boolean;
    onConditionUpdate: (flowIndex: number, conditionType: 'winCondition' | 'lossCondition', newConditionObj: any) => void;
    onFocusGame: (index: number) => void;
}

export const FlowRuleOverrides: React.FC<FlowRuleOverridesProps> = ({
    flow,
    showPoints,
    onConditionUpdate,
    onFocusGame
}) => {
    if (flow.length === 0) return null;

    return (
        <div style={{ ...styles.configSection, marginTop: '2rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#333' }}>Microgame Win & Loss Conditions</h4>
            <p style={styles.descriptionText}>
                Define exactly what constitutes a win or a loss for each game in this flow. These settings override the base game and variant defaults.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {flow.map((flowItem, index) => {
                    const gameData = flowItem.customVariant || flowItem.baseGame;
                    
                    // Safely resolve the exact game definition to get allowed events and features
                    let definition = MICROGAME_DEFINITIONS[flowItem.baseGame.id];
                    if (!definition) {
                        const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === flowItem.baseGame.id.toLowerCase());
                        if (key) definition = MICROGAME_DEFINITIONS[key];
                    }

                    const winCond = flowItem.winCondition || {};
                    const lossCond = flowItem.lossCondition || {};

                    return (
                        <div 
                            key={index} 
                            onClick={() => onFocusGame(index)} 
                            style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s', backgroundColor: '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0866ff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ccc'}
                        >
                            <strong style={{ fontSize: '1.1rem', color: '#333', display: 'block', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                {index + 1}. {gameData.name}
                            </strong>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* --- WIN CONDITION --- */}
                                <div>
                                    <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#444' }}>Win Condition</h5>
                                    <select 
                                        style={{ ...styles.select, marginBottom: '1rem', width: '100%' }} 
                                        value={winCond.type || 'time'} 
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            const updates: any = { ...winCond, type: newType };
                                            
                                            // Initialize Event for Quota
                                            if (newType === 'quota' && !updates.quotaEvent) {
                                                const firstEvent = definition?.events && Object.entries(definition.events).find(([_, def]: any) => def.canWinQuota)?.[0];
                                                if (firstEvent) updates.quotaEvent = firstEvent;
                                            }
                                            // Initialize Amount
                                            if (newType === 'score') updates.quotaAmount = 100;
                                            else if (newType === 'quota') updates.quotaAmount = 10;
                                            else updates.quotaAmount = null;

                                            onConditionUpdate(index, 'winCondition', updates);
                                        }}
                                    >
                                        <option value="time">Time Limit (Survive)</option>
                                        {definition?.features?.enableQuotaWin && <option value="quota">Quota (Event Count)</option>}
                                        {definition?.features?.enableScoreWin && showPoints && <option value="score">Score Threshold</option>}
                                    </select>

                                    {winCond.type === 'quota' && (
                                        <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #cce5ff' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Event to Track</label>
                                                <select style={{...styles.select, width: '100%'}} value={winCond.quotaEvent || ''} onChange={(e) => onConditionUpdate(index, 'winCondition', { ...winCond, quotaEvent: e.target.value })}>
                                                    {definition?.events && Object.entries(definition.events).map(([id, def]: [string, any]) => ((def as any).canWinQuota && <option key={id} value={id}>{def.label}</option>))}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Target Amount</label>
                                                    <SmartNumberInput min={1} value={winCond.quotaAmount ?? 5} onChange={(val) => onConditionUpdate(index, 'winCondition', { ...winCond, quotaAmount: val })} style={{...styles.input, width: '100%'}} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={winCond.endImmediately ?? true} onChange={(e) => onConditionUpdate(index, 'winCondition', { ...winCond, endImmediately: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                                                    End Immediately on Win?
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={winCond.showProgress ?? true} onChange={(e) => onConditionUpdate(index, 'winCondition', { ...winCond, showProgress: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                                                    Show HUD Progress Bar?
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {winCond.type === 'score' && (
                                        <div style={{ padding: '1rem', backgroundColor: '#fff8e1', borderRadius: '6px', border: '1px solid #ffe0b2' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Target Score</label>
                                                <SmartNumberInput value={winCond.quotaAmount ?? 100} onChange={(val) => onConditionUpdate(index, 'winCondition', { ...winCond, quotaAmount: val })} style={{...styles.input, width: '100%'}} />
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={winCond.endImmediately ?? true} onChange={(e) => onConditionUpdate(index, 'winCondition', { ...winCond, endImmediately: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                                                End Immediately on Win?
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* --- LOSS CONDITION --- */}
                                <div>
                                    <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#444' }}>Loss Condition</h5>
                                    <select 
                                        style={{ ...styles.select, marginBottom: '1rem', width: '100%' }} 
                                        value={lossCond.type || 'none'} 
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            const updates: any = { ...lossCond, type: newType };
                                            if (newType === 'quota' && !updates.quotaEvent) {
                                                const firstEvent = definition?.events && Object.entries(definition.events).find(([_, def]: any) => def.canLossQuota)?.[0];
                                                if (firstEvent) updates.quotaEvent = firstEvent;
                                            }
                                            onConditionUpdate(index, 'lossCondition', updates);
                                        }}
                                    >
                                        <option value="none">None (Time Based)</option>
                                        <option value="quota">Limit (Event Count / Lives)</option>
                                        {definition?.features?.enableFailureLoss && winCond.type !== 'time' && <option value="failure">Did not meet Win Condition</option>}
                                    </select>

                                    {lossCond.type === 'quota' && (
                                        <div style={{ padding: '1rem', backgroundColor: '#fff5f5', borderRadius: '6px', border: '1px solid #fed7d7' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Event Limit</label>
                                                <select style={{...styles.select, width: '100%'}} value={lossCond.quotaEvent || ''} onChange={(e) => onConditionUpdate(index, 'lossCondition', { ...lossCond, quotaEvent: e.target.value })}>
                                                    {definition?.events && Object.entries(definition.events).map(([id, def]: [string, any]) => ((def as any).canLossQuota && <option key={id} value={id}>{def.label}</option>))}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Lose on Count (e.g. 3rd hit)</label>
                                                    <SmartNumberInput min={1} value={lossCond.quotaAmount ?? 3} onChange={(val) => onConditionUpdate(index, 'lossCondition', { ...lossCond, quotaAmount: val })} style={{...styles.input, width: '100%'}} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={lossCond.endImmediately ?? true} onChange={(e) => onConditionUpdate(index, 'lossCondition', { ...lossCond, endImmediately: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                                                    End Immediately on Loss?
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={lossCond.showLives ?? true} onChange={(e) => onConditionUpdate(index, 'lossCondition', { ...lossCond, showLives: e.target.checked })} style={{ marginRight: '0.5rem' }} />
                                                    Show HUD Lives?
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};