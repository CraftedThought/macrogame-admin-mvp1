/* src/components/builders/macrogame/EconomySettingsEditor.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export interface EconomySettingsEditorProps {
    showPoints: boolean;
    setShowPoints: React.Dispatch<React.SetStateAction<boolean>>;
    isPointsForced: boolean;
    hasGamesWithPoints: boolean;
    hasGamesWithoutPoints: boolean;
    pointGatedChains: { instanceId: string; chainLabel: string }[];
    pointCosts: { [key: string]: number };
    onPointCostChange: (instanceId: string, value: string) => void;
    conversionScreenId: string | null;
    targetRewardOptions: { instanceId: string; name: string }[];
    conversionScreenConfig: any;
    setConversionScreenConfig: React.Dispatch<React.SetStateAction<any>>;
    resolvedTargetId: string | undefined;
    injectTargets: { intro: boolean; preGame: boolean; promo: boolean };
    setInjectTargets: React.Dispatch<React.SetStateAction<{ intro: boolean; preGame: boolean; promo: boolean }>>;
    onInjectTags: () => void;
    pointDisplayMode: 'none' | 'simple' | 'detailed';
    setPointDisplayMode: React.Dispatch<React.SetStateAction<'none' | 'simple' | 'detailed'>>;
    showLineItemDetails: boolean;
    setShowLineItemDetails: React.Dispatch<React.SetStateAction<boolean>>;
    enableTallyAnimation: boolean;
    setEnableTallyAnimation: React.Dispatch<React.SetStateAction<boolean>>;
    enablePointsOverride: boolean;
    setEnablePointsOverride: React.Dispatch<React.SetStateAction<boolean>>;
    previewOverridePoints: number;
    setPreviewOverridePoints: React.Dispatch<React.SetStateAction<number>>;
    children?: React.ReactNode;
}

export const EconomySettingsEditor: React.FC<EconomySettingsEditorProps> = ({
    showPoints,
    setShowPoints,
    isPointsForced,
    hasGamesWithPoints,
    hasGamesWithoutPoints,
    pointGatedChains,
    pointCosts,
    onPointCostChange,
    conversionScreenId,
    targetRewardOptions,
    conversionScreenConfig,
    setConversionScreenConfig,
    resolvedTargetId,
    injectTargets,
    setInjectTargets,
    onInjectTags,
    pointDisplayMode,
    setPointDisplayMode,
    showLineItemDetails,
    setShowLineItemDetails,
    enableTallyAnimation,
    setEnableTallyAnimation,
    enablePointsOverride,
    setEnablePointsOverride,
    previewOverridePoints,
    setPreviewOverridePoints,
    children
}) => {
    return (
        <div style={{...styles.configItem, border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
            <label 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isPointsForced ? 0.6 : 1, cursor: isPointsForced ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.05rem' }} 
                title={isPointsForced ? "Points are required because your attached Conversion Screen contains point-locked rewards." : ""}
            >
                <input type="checkbox" checked={showPoints || isPointsForced} disabled={isPointsForced} onChange={e => setShowPoints(e.target.checked)} style={{ cursor: isPointsForced ? 'not-allowed' : 'pointer', width: '18px', height: '18px' }} />
                Enable Economy (Point System)
            </label>
            
            <p style={{...styles.descriptionText, marginTop: '0.5rem', fontSize: '0.85rem', marginBottom: 0}}>
                {isPointsForced ? (
                    <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>Points are forced ON because your attached Conversion Screen contains point-locked rewards.</span>
                ) : (hasGamesWithPoints && showPoints) ? (
                    <span style={{ color: '#0866ff', fontWeight: 'bold' }}>Points are enabled because one or more microgames in your flow use a point system.</span>
                ) : (
                    "If enabled, a points total will be displayed in the UI."
                )}
            </p>

            {showPoints && hasGamesWithPoints && hasGamesWithoutPoints && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '4px', color: '#664d03', fontSize: '0.85rem' }}>
                    <strong>⚠️ Mixed Economy:</strong> One or more microgames in the flow do not have an underlying point system enabled. Consider aligning your games.
                </div>
            )}
            
            {showPoints && hasGamesWithPoints && !isPointsForced && conversionScreenId && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '4px', color: '#664d03', fontSize: '0.85rem' }}>
                    <strong>⚠️ Missing Rewards:</strong> Your games award points, but your conversion screen does not use them. Consider adding point-locked rewards to your conversion screen.
                </div>
            )}

            {/* --- COST OF REWARDS (CHAINS) --- */}
            {showPoints && pointGatedChains.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                    <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Cost of Rewards</h5>
                    <p style={{...styles.descriptionText, fontSize: '0.85rem', marginBottom: '1rem'}}>
                        Set the required points (cost) to unlock each reward chain on your Conversion Screen.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {pointGatedChains.map(chain => (
                            <div key={chain.instanceId} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                                <strong style={{ fontSize: '0.9rem', color: '#444' }}>{chain.chainLabel}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>Unlock Cost:</span>
                                    <SmartNumberInput
                                        min={0}
                                        max={999999}
                                        value={pointCosts[chain.instanceId] === '' ? 0 : (pointCosts[chain.instanceId] || 0)}
                                        fallbackValue={0}
                                        onChange={(val) => onPointCostChange(chain.instanceId, String(val))}
                                        style={{...styles.input, width: '100px', padding: '0.4rem', textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>pts</span>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- PREVIEW POINTS OVERRIDE --- */}
                {showPoints && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Preview Points</h5>
                        <p style={{...styles.descriptionText, fontSize: '0.85rem', marginBottom: '1rem'}}>
                            Temporarily override your earned points in the Live Preview to test your Conversion Screen point gates.
                        </p>
                        <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: enablePointsOverride ? '1rem' : 0 }}>
                                <input type="checkbox" checked={enablePointsOverride} onChange={e => setEnablePointsOverride(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                                Enable Preview Point Override
                            </label>
                            
                            {enablePointsOverride && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input 
                                        type="range" min="0" max="1500" step="10"
                                        value={previewOverridePoints}
                                        onChange={e => setPreviewOverridePoints(Number(e.target.value))}
                                        style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                                    />
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <SmartNumberInput 
                                            min={0} max={9999}
                                            fallbackValue={0}
                                            value={previewOverridePoints}
                                            onChange={val => setPreviewOverridePoints(Math.max(0, val))}
                                            style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                        />
                                        <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>pts</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- GOAL VISIBILITY --- */}
            {showPoints && conversionScreenId && targetRewardOptions.length > 0 && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                    <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Goal Visibility (Upstream)</h5>
                    <p style={{...styles.descriptionText, fontSize: '0.8rem', marginBottom: '1rem'}}>
                        This sets the final goal for the game HUD and unlocks smart merge tags like <code>{`{{target_points}}`}</code> and <code>{`{{target_reward}}`}</code> for your Intro and Pre-Game screens. Our system automatically selects the ultimate reward of your highest point chain, but you can override it below.
                    </p>
                    <div style={styles.configItem}>
                        <label>Featured Reward</label>
                        <select
                            value={conversionScreenConfig?.targetRewardInstanceId || resolvedTargetId || 'none'}
                            onChange={e => setConversionScreenConfig((p: any) => ({ ...p, targetRewardInstanceId: e.target.value }))}
                            style={styles.input}
                        >
                            <option value="none">None (Hidden)</option>
                            {targetRewardOptions.map(opt => (
                                <option key={opt.instanceId} value={opt.instanceId}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ ...styles.configItem, marginTop: '1rem' }}>
                        <label>Custom Reward Name (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="e.g., Free Burger" 
                            value={conversionScreenConfig?.targetRewardNameOverride || ''} 
                            onChange={e => setConversionScreenConfig((p: any) => ({ ...p, targetRewardNameOverride: e.target.value }))} 
                            style={styles.input} 
                        />
                        <p style={{...styles.descriptionText, marginTop: '0.25rem', fontSize: '0.8rem'}}>
                            Overrides the internal name. The <code>{`{{target_reward}}`}</code> merge tag will display this text instead.
                        </p>
                    </div>

                    {/* AUTO INJECTOR */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f7ff', border: '1px solid #cce4ff', borderRadius: '6px' }}>
                        <h6 style={{ margin: '0 0 0.5rem 0', color: '#0056b3', fontSize: '0.9rem' }}>Auto-Inject Merge Tags</h6>
                        <p style={{ fontSize: '0.8rem', color: '#004085', marginBottom: '1rem' }}>
                            Select which screens should automatically receive the goal text containing your merge tags. This will be appended to the bottom of the body text.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: '#004085' }}>
                                <input type="checkbox" checked={injectTargets.intro} onChange={e => setInjectTargets(p => ({...p, intro: e.target.checked}))} /> Intro Screen
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: '#004085' }}>
                                <input type="checkbox" checked={injectTargets.preGame} onChange={e => setInjectTargets(p => ({...p, preGame: e.target.checked}))} /> Pre-Game Screens
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', color: '#004085' }}>
                                <input type="checkbox" checked={injectTargets.promo} onChange={e => setInjectTargets(p => ({...p, promo: e.target.checked}))} /> Promo Screen
                            </label>
                        </div>
                        <button 
                            type="button"
                            onClick={onInjectTags}
                            disabled={!injectTargets.intro && !injectTargets.preGame && !injectTargets.promo}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: '#0866ff', color: 'white', border: 'none', borderRadius: '4px', cursor: (!injectTargets.intro && !injectTargets.preGame && !injectTargets.promo) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (!injectTargets.intro && !injectTargets.preGame && !injectTargets.promo) ? 0.5 : 1 }}
                        >
                            Inject Tags Now
                        </button>
                    </div>
                </div>
            )}

            {/* --- POINT DISPLAY SETTINGS (RECEIPT) --- */}
            {showPoints && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                    <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Point Display</h5>
                    <p style={{...styles.descriptionText, fontSize: '0.8rem', marginBottom: '1rem'}}>
                        The Point Display always shows on the top left and can additionally be shown on the Game Result Screens.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={styles.configItem}>
                            <label>Game Result Screen Point Display</label>
                            <select 
                                value={pointDisplayMode} 
                                onChange={e => setPointDisplayMode(e.target.value as any)}
                                style={styles.input}
                            >
                                <option value="none">None (Hidden)</option>
                                <option value="simple">Simple (Final Score Only)</option>
                                <option value="detailed">Detailed (Itemized Receipt)</option>
                            </select>
                        </div>
                        
                        {pointDisplayMode !== 'none' && (
                            <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid #ccc', paddingLeft: '1rem' }}>
                                {pointDisplayMode === 'detailed' && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={showLineItemDetails} 
                                            onChange={e => setShowLineItemDetails(e.target.checked)} 
                                        />
                                        Show Line-Item Details for Current Game (e.g. "Survival: 30 pts")
                                    </label>
                                )}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={enableTallyAnimation} 
                                        onChange={e => setEnableTallyAnimation(e.target.checked)} 
                                    />
                                    Enable Tally Animation (Numbers count up rapidly)
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Render the Game Scoring Rules (EconomyBalancer) seamlessly inside the same card */}
            {children}
        </div>
    );
};