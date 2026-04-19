/* src/components/builders/microgame/sections/RulesSection.tsx */

import React from 'react';
import { styles } from '../../../../App.styles';
import { Microgame } from '../../../../types';
import { SmartNumberInput } from '../../../ui/inputs/SmartNumberInput';
import { SmartSlider } from '../../../ui/inputs/SmartSlider';

interface RulesSectionProps {
    baseGame: Microgame;
    isGuidedMode: boolean;
    builder: any;
    setPreviewKey: React.Dispatch<React.SetStateAction<number>>;
}

export const RulesSection: React.FC<RulesSectionProps> = ({
    baseGame,
    isGuidedMode,
    builder,
    setPreviewKey
}) => {
    const {
        gameDefinition,
        mechanicsValues,
        setMechanicsValues,
        rulesValues,
        setRulesValues,
        skinnableElements,
        activeStrategy,
        getSliderProps,
        expandedItems
    } = builder;

    const isProgressionMechanic = (key: string) => key.startsWith('progression_');

    // --- Calculate Smart Limits ---
    
    // 1. Resolve Duration (Safe Number parsing with defaults)
    const valDuration = mechanicsValues['duration'] ?? gameDefinition?.mechanics?.duration?.defaultValue ?? 30;
    const currentDuration = Number(valDuration);

    // 2. Resolve Global Delay (Safe Number parsing with defaults)
    const valGlobal = mechanicsValues['progression_global_delay'] ?? gameDefinition?.mechanics?.['progression_global_delay']?.defaultValue ?? 0;
    const currentGlobalDelay = Number(valGlobal);

    const PROGRESSION_HARD_CAP = 15;

    // 3. Calculate Global Cap: Global Delay can never exceed 15s OR (Duration - 1)
    const maxGlobalDelay = Math.max(0, Math.min(PROGRESSION_HARD_CAP, currentDuration - 1));

    // 4. Calculate Rule Cap (The "Room Left")
    // Total Delay (Global + Rule) must be <= 15s
    const remainingHardCap = Math.max(0, PROGRESSION_HARD_CAP - currentGlobalDelay);
    
    // Total Delay (Global + Rule) must be <= (Duration - 1)
    const remainingDurationCap = Math.max(0, (currentDuration - 1) - currentGlobalDelay);

    // The Rule Delay limit is the stricter (minimum) of the two constraints
    const maxRuleDelay = Math.min(remainingHardCap, remainingDurationCap);

    // 5. Interval Cap (Hard Cap 15s OR Duration-1)
    const maxRuleInterval = Math.max(1, Math.min(PROGRESSION_HARD_CAP, currentDuration - 1));

    // --- Helper to Update a Specific Rule ---
    const updateRule = (channelId: string, index: number, field: string, value: any) => {
        const rulesKey = `progression_${channelId}_rules`;
        const currentRules = [...(mechanicsValues[rulesKey] || [])];
        
        if (currentRules[index]) {
            currentRules[index] = { ...currentRules[index], [field]: value };
            setMechanicsValues((prev: any) => ({ ...prev, [rulesKey]: currentRules }));
        }
    };

    const addRule = (channelId: string, hasTarget: boolean) => {
        const rulesKey = `progression_${channelId}_rules`;
        const currentRules = mechanicsValues[rulesKey] || [];
        const newRule = { 
            id: Date.now().toString(), 
            rate: 10, 
            interval: 5, 
            delay: 0, 
            targets: hasTarget ? [] : null 
        };
        setMechanicsValues((prev: any) => ({ ...prev, [rulesKey]: [...currentRules, newRule] }));
    };

    const removeRule = (channelId: string, index: number) => {
        const rulesKey = `progression_${channelId}_rules`;
        const currentRules = [...(mechanicsValues[rulesKey] || [])];
        currentRules.splice(index, 1);
        setMechanicsValues((prev: any) => ({ ...prev, [rulesKey]: currentRules }));
    };

    // --- Data-Driven Dependency Checker ---
    const checkDependency = (dep: any) => {
        if (!dep) return { isDisabled: false, warning: '' };
        
        let currentValue;
        if (dep.mechanicId) currentValue = mechanicsValues[dep.mechanicId];
        else if (dep.ruleId) currentValue = rulesValues[dep.ruleId];
        else return { isDisabled: false, warning: '' };

        if (currentValue === undefined) currentValue = 0; 

        let matches = false;
        switch(dep.condition) {
            case 'eq': matches = currentValue === dep.value; break;
            case 'neq': matches = currentValue !== dep.value; break;
            case 'gt': matches = currentValue > dep.value; break;
            case 'lt': matches = currentValue < dep.value; break;
        }

        if (matches) return { isDisabled: true, warning: dep.warning };
        return { isDisabled: false, warning: '' };
    };

    return (
        <div style={{ marginBottom: '2rem', marginTop: '2rem', borderTop: '2px solid #eee', paddingTop: '1.5rem' }}>
            <h4 style={styles.h4}>Game Rules</h4>
            
            {/* A. GENERAL SETTINGS */}
            <div style={{ marginBottom: '2rem' }}>
                <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '1rem', color: '#444', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                    General Settings
                </h5>
                
                {gameDefinition?.mechanics && Object.entries(gameDefinition?.mechanics).map(([key, def]: [string, any]) => {
                    const isAssociated = skinnableElements.some((el: any) => 
                        el.quantityDrivenBy === key || el.associatedMechanics?.includes(key)
                    );
                    
                    // --- 1. GLOBAL FILTER ---
                    if (
                        isAssociated || 
                        isProgressionMechanic(key) || 
                        key === 'survivalPointInterval' || 
                        key.startsWith('survivalAudio') ||
                        def.type === 'hidden'
                    ) return null;

                    // --- SMART LOGIC: Spawn Rate & Limits ---
                    const currentCount = mechanicsValues['obstacleCount'] ?? gameDefinition.mechanics['obstacleCount']?.defaultValue ?? 4;
                    const countMin = gameDefinition.mechanics['obstacleCount']?.min ?? 1;
                    const countMax = gameDefinition.mechanics['obstacleCount']?.max ?? 20; 
                    
                    let rawGenRate = mechanicsValues['generationRate'] ?? 0;
                    if (currentCount <= countMin) rawGenRate = Math.max(0, rawGenRate);
                    if (currentCount >= countMax) rawGenRate = Math.min(0, rawGenRate);
                    const effectiveGenRate = rawGenRate;

                    // 1. Generation Rate Slider
                    if (key === 'generationRate') {
                        let dynamicMin = def.min;
                        let dynamicMax = def.max;
                        if (currentCount <= countMin) dynamicMin = 0;
                        if (currentCount >= countMax) dynamicMax = 0;

                        return (
                            <div key={key} style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                                <SmartSlider
                                    label={def.label}
                                    min={dynamicMin} max={dynamicMax} step={def.step}
                                    value={effectiveGenRate}
                                    onChange={(val) => setMechanicsValues((prev: any) => ({ ...prev, [key]: val }))}
                                    {...getSliderProps(key)}
                                    description={def.description}
                                />
                            </div>
                        );
                    }

                    // 2. Max Obstacles (Only show if adding)
                    if (key === 'maxObstacles') {
                        if (effectiveGenRate <= 0) return null; 
                        const dynamicMin = currentCount + 1;
                        const dynamicMax = countMax;
                        if (dynamicMin > dynamicMax) return null;

                        return (
                            <div key={key} style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                                <SmartSlider
                                    label={def.label}
                                    min={dynamicMin} max={dynamicMax} step={def.step}
                                    value={Math.max(dynamicMin, Math.min(dynamicMax, mechanicsValues[key] ?? def.defaultValue))}
                                    onChange={(val) => setMechanicsValues((prev: any) => ({ ...prev, [key]: val }))}
                                    {...getSliderProps(key)}
                                    description={def.description}
                                />
                            </div>
                        );
                    }

                    // 3. Min Obstacles (Only show if removing)
                    if (key === 'minObstacles') {
                        if (effectiveGenRate >= 0) return null;
                        const dynamicMin = countMin;
                        const dynamicMax = Math.max(countMin, currentCount - 1);
                        if (dynamicMin > dynamicMax) return null;

                        return (
                            <div key={key} style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                                <SmartSlider
                                    label={def.label}
                                    min={dynamicMin} max={dynamicMax} step={def.step}
                                    value={Math.max(dynamicMin, Math.min(dynamicMax, mechanicsValues[key] ?? def.defaultValue))}
                                    onChange={(val) => setMechanicsValues((prev: any) => ({ ...prev, [key]: val }))}
                                    {...getSliderProps(key)}
                                    description={def.description}
                                />
                            </div>
                        );
                    }

                    // --- GENERIC FALLBACK ---
                    const isControlledByStrategy = isGuidedMode && activeStrategy && (baseGame.conversionMetadata as any)?.presets?.[activeStrategy]?.mechanicOverrides?.[key] !== undefined;

                    return (
                        <div key={key} style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
                            {isControlledByStrategy && (
                                <div style={{ marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.7rem', backgroundColor: '#e3f2fd', color: '#0866ff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        Auto-Set Strategy
                                    </span>
                                </div>
                            )}
                            
                            {def.type === 'slider' ? (
                                <SmartSlider
                                    label={def.label}
                                    min={def.min} max={def.max} step={def.step}
                                    value={mechanicsValues[key] ?? def.defaultValue}
                                    onChange={(val) => setMechanicsValues((prev: any) => ({ ...prev, [key]: val }))}
                                    {...getSliderProps(key)}
                                    description={def.description}
                                />
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input 
                                            type="checkbox"
                                            checked={!!(mechanicsValues[key] ?? def.defaultValue)}
                                            onChange={(e) => {
                                                setMechanicsValues((prev: any) => ({ ...prev, [key]: e.target.checked }));
                                                setPreviewKey(k => k + 1);
                                            }}
                                            style={{ width: '18px', height: '18px', marginRight: '0.5rem' }}
                                        />
                                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>{def.label}</label>
                                    </div>
                                    {def.description && (
                                        <p style={{ fontSize: '0.75rem', color: '#888', margin: '4px 0 0 26px' }}>{def.description}</p>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* B. DYNAMIC PROGRESSION */}
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📈</span> Dynamic Progression
                </h5>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                    Configure how the game evolves over time. Add rules to increase difficulty or rewards.
                </p>

                {gameDefinition?.mechanics?.['progression_global_delay'] && (
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
                        <SmartSlider
                            label={gameDefinition.mechanics['progression_global_delay'].label}
                            min={gameDefinition.mechanics['progression_global_delay'].min}
                            max={maxGlobalDelay}
                            step={gameDefinition.mechanics['progression_global_delay'].step}
                            // FIX: Use currentGlobalDelay (with defaults) so slider doesn't snap to 0 when pruned
                            value={Math.min(currentGlobalDelay, maxGlobalDelay)}
                            onChange={(val) => setMechanicsValues((prev: any) => ({ ...prev, 'progression_global_delay': val }))}
                            {...getSliderProps('progression_global_delay')}
                            suffix="s"
                            description={gameDefinition.mechanics['progression_global_delay'].description}
                        />
                    </div>
                )}

                {gameDefinition?.progression?.channels?.map((channel: any) => {
                    const activeKey = `progression_${channel.id}_active`;
                    const rulesKey = `progression_${channel.id}_rules`;

                    if (!channel.enabled) return null;

                    const { isDisabled, warning } = checkDependency(channel.dependency);
                    const isActive = mechanicsValues[activeKey] ?? false;
                    const rules = mechanicsValues[rulesKey] ?? (gameDefinition.mechanics?.[rulesKey]?.defaultValue || []);

                    return (
                        <div key={channel.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: isDisabled ? '#f9f9f9' : '#fff', overflow: 'hidden', opacity: isDisabled ? 0.7 : 1 }}>
                            <div 
                                style={{ padding: '0.75rem', backgroundColor: isActive && !isDisabled ? '#e3f2fd' : '#f5f5f5', cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={() => { if (!isDisabled) setMechanicsValues((prev: any) => ({ ...prev, [activeKey]: !isActive })); }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isActive && !isDisabled ? '#0866ff' : '#333', cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
                                        {channel.label}
                                    </label>
                                    {isDisabled && <span style={{ fontSize: '0.7rem', color: '#e74c3c', marginTop: '2px', fontStyle: 'italic' }}>{warning}</span>}
                                </div>
                                <input type="checkbox" checked={isActive && !isDisabled} readOnly disabled={isDisabled} style={{ pointerEvents: 'none' }} />
                            </div>

                            {isActive && !isDisabled && (
                                <div style={{ padding: '1rem', backgroundColor: '#fff' }}>
                                    
                                    {/* 1. PRE-CALCULATE VALID TARGETS FOR THIS CHANNEL */}
                                    {(() => {
                                        // A. Define what items are valid candidates for this channel
                                        let validCandidates: any[] = [];
                                        
                                        if (!channel.hasTarget) {
                                            // Global mechanics (Spawn Rate, etc) count as 1 abstract target
                                            validCandidates = ['GLOBAL_TARGET'];
                                        } else {
                                            // Targeted mechanics (Speed, Size, Score)
                                            validCandidates = expandedItems.filter((i: any) => {
                                                // 1. NON-SCORE CHANNELS
                                                if (channel.id !== 'score') {
                                                    if (i.id === 'survive_interval') return false;
                                                    return skinnableElements.some((el: any) => el.id === i.id || i.id.startsWith(el.id + '_'));
                                                }
                                                // 2. SCORE CHANNEL
                                                if (i.id === 'player' || i.id === 'background') return false;
                                                const relatedEvents = Object.entries(gameDefinition.events).filter(([evtId, def]: [string, any]) => 
                                                    def.relatedAssets?.includes(i.id) || evtId === i.id
                                                );
                                                if (relatedEvents.length === 0) return false;
                                                // Check for non-zero points (using defaults if missing)
                                                return relatedEvents.some(([evtId]) => (rulesValues.scores[evtId] ?? (gameDefinition.events[evtId] as any).defaultPoints ?? 0) !== 0);
                                            });
                                        }

                                        // B. Calculate Limit
                                        const maxRulesAllowed = validCandidates.length;
                                        const showAddButton = rules.length < maxRulesAllowed;

                                        return (
                                            <>
                                                {rules.map((rule: any, index: number) => (
                                                    <div key={rule.id || index} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: index < rules.length - 1 ? '1px solid #eee' : 'none' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Rule #{index + 1}</span>
                                                            {rules.length > 1 && <button type="button" onClick={() => removeRule(channel.id, index)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Remove</button>}
                                                        </div>

                                                        {/* Sliders Row */}
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <SmartSlider label="Rate" min={-100} max={100} step={5} value={rule.rate} onChange={(val) => updateRule(channel.id, index, 'rate', val)} onPointerDown={() => builder.handleSliderStart(`progression_${channel.id}_${index}_rate`, false)} onPointerUp={builder.handleSliderEnd} suffix="%" />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <SmartSlider label="Interval" min={1} max={maxRuleInterval} step={1} value={Math.min(rule.interval, maxRuleInterval)} onChange={(val) => updateRule(channel.id, index, 'interval', val)} onPointerDown={() => builder.handleSliderStart(`progression_${channel.id}_${index}_interval`, false)} onPointerUp={builder.handleSliderEnd} suffix="s" />
                                                            </div>
                                                        </div>
                                                        <div style={{ marginBottom: '0.5rem' }}>
                                                            <SmartSlider label="Start Delay" min={0} max={maxRuleDelay} step={1} value={Math.min(rule.delay || 0, maxRuleDelay)} onChange={(val) => updateRule(channel.id, index, 'delay', val)} onPointerDown={() => builder.handleSliderStart(`progression_${channel.id}_${index}_delay`, false)} onPointerUp={builder.handleSliderEnd} suffix="s" />
                                                        </div>

                                                        {/* Target Selection UI */}
                                                        {channel.hasTarget && (
                                                            <div style={{ marginTop: '0.5rem', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px' }}>
                                                                {(() => {
                                                                    // Filter items claimed by sibling rules
                                                                    const otherRules = rules.filter((_: any, rIdx: number) => rIdx !== index);
                                                                    const claimedTargets = new Set(otherRules.flatMap((r: any) => 
                                                                        r.targets === true ? expandedItems.map((i: any) => i.id) : (Array.isArray(r.targets) ? r.targets : [])
                                                                    ));
                                                                    
                                                                    // Reuse the pre-calculated valid candidates!
                                                                    const filteredItems = validCandidates; 

                                                                    const currentList = Array.isArray(rule.targets) ? rule.targets : (rule.targets === true ? expandedItems.map((i: any) => i.id) : []);
                                                                    const availableItems = filteredItems.filter((i: any) => !claimedTargets.has(i.id));
                                                                    const allSelected = availableItems.length > 0 && availableItems.every((item: any) => currentList.includes(item.id));

                                                                    // Warning if Score channel has 0 targets
                                                                    if (channel.id === 'score' && filteredItems.length === 0) {
                                                                        return <div style={{ fontSize: '0.75rem', color: '#e67e22', fontStyle: 'italic', padding: '0.25rem' }}>You must set the earned points to non-zero values in the <strong>Point System</strong> section below to be able to apply Point Value Progression.</div>;
                                                                    }

                                                                    return (
                                                                        <>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>Apply To:</label>
                                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: availableItems.length > 0 ? 'pointer' : 'not-allowed', opacity: availableItems.length > 0 ? 1 : 0.5 }}>
                                                                                    <input type="checkbox" checked={allSelected} disabled={availableItems.length === 0} onChange={(e) => {
                                                                                        let newList: string[] = [];
                                                                                        if (e.target.checked) {
                                                                                            filteredItems.forEach((item: any) => { 
                                                                                                if (!claimedTargets.has(item.id)) { 
                                                                                                    newList.push(item.id); 
                                                                                                    if (item.followers) newList.push(...item.followers); 
                                                                                                } 
                                                                                            });
                                                                                        }
                                                                                        updateRule(channel.id, index, 'targets', newList);
                                                                                    }} style={{ width: '14px', height: '14px', cursor: availableItems.length > 0 ? 'pointer' : 'not-allowed' }} />
                                                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#555' }}>Select All</span>
                                                                                </label>
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                                {filteredItems.map((item: any) => {
                                                                                    const isChecked = currentList.includes(item.id);
                                                                                    const isClaimed = claimedTargets.has(item.id);
                                                                                    return (
                                                                                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '2px 8px', backgroundColor: isChecked ? '#fff3cd' : (isClaimed ? '#f0f0f0' : '#fff'), border: isChecked ? '1px solid #ffc107' : '1px solid #ddd', borderRadius: '4px', cursor: isClaimed ? 'not-allowed' : 'pointer', opacity: isClaimed ? 0.6 : 1 }} title={isClaimed ? "This item is already used in another rule" : ""}>
                                                                                            <input type="checkbox" checked={isChecked} disabled={isClaimed} onChange={(e) => { const checked = e.target.checked; const idsToToggle = [item.id, ...(item.followers || [])]; const newList = checked ? Array.from(new Set([...currentList, ...idsToToggle])) : currentList.filter((id: string) => !idsToToggle.includes(id)); updateRule(channel.id, index, 'targets', newList); }} />
                                                                                            {item.label}
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* DYNAMIC ADD BUTTON */}
                                                {showAddButton && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => addRule(channel.id, channel.hasTarget)} 
                                                        style={{ 
                                                            width: '100%', padding: '0.5rem', marginTop: '0.5rem', 
                                                            backgroundColor: '#fff', border: '1px dashed #ccc', 
                                                            borderRadius: '4px', color: '#0866ff', fontWeight: 600, 
                                                            fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' 
                                                        }} 
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'} 
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                                                    >
                                                        + Add Rule
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* C. POINT SYSTEM */}
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: rulesValues.enablePoints ? '1rem' : 0 }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Point System</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" checked={rulesValues.enablePoints ?? false} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, enablePoints: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer', marginRight: '0.5rem' }} />
                        <span style={{ fontSize: '0.9rem', color: rulesValues.enablePoints ? '#2ecc71' : '#666' }}>{rulesValues.enablePoints ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>

                {rulesValues.enablePoints && (
                    <>
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ddd' }}>
                            <input type="checkbox" checked={rulesValues.showScore ?? false} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, showScore: e.target.checked }))} />
                            <span style={{ fontSize: '0.9rem', color: '#555' }}>Show score to player (HUD)</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            {gameDefinition?.events && Object.entries(gameDefinition.events).map(([eventId, def]: [string, any]) => {
                                if (!(def as any).canScore) return null;
                                
                                const isSurvival = def.type === 'interval'; 
                                const survivalIntervalDef = gameDefinition.mechanics['survivalPointInterval'];

                                return (
                                    <div key={eventId} style={{ marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', display: 'block', marginBottom: '4px' }}>{def.label}</label>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <SmartNumberInput value={rulesValues.scores[eventId] ?? 0} onChange={(val) => setRulesValues((prev: any) => ({ ...prev, scores: { ...prev.scores, [eventId]: val } }))} allowNegative={true} style={{ ...styles.input, width: '100%' }} />
                                                <span style={{ fontSize: '0.8rem', color: '#999' }}>pts</span>
                                            </div>
                                            {isSurvival && survivalIntervalDef && (() => {
                                                const val = mechanicsValues['survivalPointInterval'] ?? survivalIntervalDef.defaultValue;
                                                const clampedVal = Math.min(val, currentDuration);
                                                
                                                return (
                                                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>Every</span>
                                                            <SmartSlider 
                                                                min={survivalIntervalDef.min} 
                                                                max={currentDuration} 
                                                                step={survivalIntervalDef.step} 
                                                                value={clampedVal} 
                                                                onChange={(newVal) => setMechanicsValues((prev: any) => ({ ...prev, 'survivalPointInterval': newVal }))} 
                                                                {...getSliderProps('survivalPointInterval')} 
                                                                showInput={false} 
                                                            />
                                                            <span style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', minWidth: '30px' }}>
                                                                {clampedVal}s
                                                            </span>
                                                        </div>
                                                        {clampedVal >= currentDuration && (
                                                            <div style={{ fontSize: '0.7rem', color: '#e67e22', marginTop: '2px', lineHeight: 1.2 }}>
                                                                (You are setting this to the full game duration. For a better player experience, try setting a Point Threshold Win condition and awarding points on a Game Win only.)
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* D. WIN CONDITION */}
            <div style={{ marginBottom: '2rem' }}>
                <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#444' }}>Win Condition</h5>
                <select 
                    style={{ ...styles.select, marginBottom: '1rem' }} 
                    value={rulesValues.winCondition.type} 
                    onChange={(e) => {
                        const newType = e.target.value;
                        setRulesValues((prev: any) => {
                            const updates: any = { type: newType };
                            
                            // 1. Initialize Event (for Quota type)
                            if (newType === 'quota' && !prev.winCondition.quotaEvent) {
                                const firstEvent = gameDefinition?.events && Object.entries(gameDefinition.events).find(([_, def]: any) => def.canWinQuota)?.[0];
                                if (firstEvent) updates.quotaEvent = firstEvent;
                            }

                            // 2. Initialize Amount (Ensure we save a valid number, not null/undefined)
                            if (newType === 'score') {
                                updates.quotaAmount = 100; // Default Score Target
                            } else if (newType === 'quota') {
                                updates.quotaAmount = 10;  // Default Item Count
                            } else {
                                updates.quotaAmount = null; // Time/Survival (No target)
                            }

                            return { ...prev, winCondition: { ...prev.winCondition, ...updates } };
                        });
                    }}
                >
                    <option value="time">Time Limit (Survive)</option>
                    {gameDefinition?.features?.enableQuotaWin && <option value="quota">Quota (Event Count)</option>}
                    {gameDefinition?.features?.enableScoreWin && rulesValues.enablePoints && <option value="score">Score Threshold</option>}
                </select>

                {rulesValues.winCondition.type === 'quota' && (
                    <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #cce5ff' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Event to Track</label>
                            <select style={styles.select} value={rulesValues.winCondition.quotaEvent || ''} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, quotaEvent: e.target.value } }))}>
                                {gameDefinition?.events && Object.entries(gameDefinition.events).map(([id, def]: [string, any]) => ((def as any).canWinQuota && <option key={id} value={id}>{def.label}</option>))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Target Amount</label>
                                <SmartNumberInput min={1} value={rulesValues.winCondition.quotaAmount ?? 5} onChange={(val) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, quotaAmount: val } }))} style={styles.input} />
                            </div>
                            <div style={{ flex: 1, paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <input type="checkbox" checked={rulesValues.winCondition.endImmediately ?? true} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, endImmediately: e.target.checked } }))} style={{ marginRight: '0.5rem' }} />
                                    <span style={{ fontSize: '0.8rem' }}>End Immediately?</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" checked={rulesValues.winCondition.showProgress ?? true} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, showProgress: e.target.checked } }))} style={{ marginRight: '0.5rem' }} />
                                    <span style={{ fontSize: '0.8rem' }}>Show Progress Bar?</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {rulesValues.winCondition.type === 'score' && (
                    <div style={{ padding: '1rem', backgroundColor: '#fff8e1', borderRadius: '6px', border: '1px solid #ffe0b2' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Target Score</label>
                                <SmartNumberInput value={rulesValues.winCondition.quotaAmount ?? 100} onChange={(val) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, quotaAmount: val } }))} style={styles.input} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                                <input type="checkbox" checked={rulesValues.winCondition.endImmediately ?? true} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, winCondition: { ...prev.winCondition, endImmediately: e.target.checked } }))} style={{ marginRight: '0.5rem' }} />
                                <span style={{ fontSize: '0.8rem' }}>End Immediately?</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* E. LOSS CONDITION */}
            <div style={{ marginBottom: '1rem' }}>
                <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#444' }}>Loss Condition</h5>
                <select 
                    style={{ ...styles.select, marginBottom: '1rem' }} 
                    value={rulesValues.lossCondition.type} 
                    onChange={(e) => {
                        const newType = e.target.value;
                        setRulesValues((prev: any) => {
                            const updates: any = { type: newType };
                            if (newType === 'quota' && !prev.lossCondition.quotaEvent) {
                                const firstEvent = gameDefinition?.events && Object.entries(gameDefinition.events).find(([_, def]: any) => def.canLossQuota)?.[0];
                                if (firstEvent) updates.quotaEvent = firstEvent;
                            }
                            return { ...prev, lossCondition: { ...prev.lossCondition, ...updates } };
                        });
                    }}
                >
                    <option value="none">None (Time Based)</option>
                    <option value="quota">Limit (Event Count)</option>
                    {gameDefinition?.features?.enableFailureLoss && rulesValues.winCondition.type !== 'time' && <option value="failure">Did not meet Win Condition</option>}
                </select>

                {rulesValues.lossCondition.type === 'quota' && (
                    <div style={{ padding: '1rem', backgroundColor: '#fff5f5', borderRadius: '6px', border: '1px solid #fed7d7' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Event Limit</label>
                            <select style={styles.select} value={rulesValues.lossCondition.quotaEvent || ''} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, lossCondition: { ...prev.lossCondition, quotaEvent: e.target.value } }))}>
                                {gameDefinition?.events && Object.entries(gameDefinition.events).map(([id, def]: [string, any]) => ((def as any).canLossQuota && <option key={id} value={id}>{def.label}</option>))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Lose on Count (e.g. 3rd hit)</label>
                                <SmartNumberInput min={1} value={rulesValues.lossCondition.quotaAmount ?? 3} onChange={(val) => setRulesValues((prev: any) => ({ ...prev, lossCondition: { ...prev.lossCondition, quotaAmount: val } }))} style={styles.input} />
                            </div>
                            <div style={{ flex: 1, paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <input type="checkbox" checked={rulesValues.lossCondition.endImmediately ?? true} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, lossCondition: { ...prev.lossCondition, endImmediately: e.target.checked } }))} style={{ marginRight: '0.5rem' }} />
                                    <span style={{ fontSize: '0.8rem' }}>End Immediately?</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" checked={rulesValues.lossCondition.showLives ?? true} onChange={(e) => setRulesValues((prev: any) => ({ ...prev, lossCondition: { ...prev.lossCondition, showLives: e.target.checked } }))} style={{ marginRight: '0.5rem' }} />
                                    <span style={{ fontSize: '0.8rem' }}>Show Lives?</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};