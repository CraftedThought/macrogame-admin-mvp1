/* src/components/builders/macrogame/ProgressTrackerSettings.tsx */

import React from 'react';
import { styles } from '../../../App.styles';

export interface ProgressTrackerSettingsProps {
    showProgress: boolean;
    setShowProgress: React.Dispatch<React.SetStateAction<boolean>>;
    progressFormat: 'text' | 'visual';
    setProgressFormat: React.Dispatch<React.SetStateAction<'text' | 'visual'>>;
    progressShowLabels: boolean;
    setProgressShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
    progressStyle: any;
    setProgressStyle: React.Dispatch<React.SetStateAction<any>>;
    lightProgressStyle: any;
    setLightProgressStyle: React.Dispatch<React.SetStateAction<any>>;
}

export const ProgressTrackerSettings: React.FC<ProgressTrackerSettingsProps> = ({
    showProgress,
    setShowProgress,
    progressFormat,
    setProgressFormat,
    progressShowLabels,
    setProgressShowLabels,
    progressStyle,
    setProgressStyle,
    lightProgressStyle,
    setLightProgressStyle
}) => {
    return (
        <div style={{...styles.configItem, border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f9f9f9'}}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.05rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={showProgress} onChange={e => setShowProgress(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                Enable Progress Tracker
            </label>
            <p style={{...styles.descriptionText, marginTop: '0.5rem', fontSize: '0.85rem', marginBottom: showProgress ? '1.5rem' : 0}}>
                Show users how close they are to the final reward while playing.
            </p>
            
            {showProgress && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#555' }}>Tracker Style</label>
                        <select value={progressFormat} onChange={e => setProgressFormat(e.target.value as 'text' | 'visual')} style={{...styles.input, maxWidth: '300px'}}>
                            <option value="visual">Reward Path (Visual Nodes)</option>
                            <option value="text">Standard Text (e.g., "Game 1 of 3")</option>
                        </select>
                    </div>
                    
                    {progressFormat === 'visual' && (
                        <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#333' }}>
                                <input type="checkbox" checked={progressShowLabels} onChange={e => setProgressShowLabels(e.target.checked)} />
                                Show Text Labels Below Nodes (e.g., "Intro", "Game 1", "Reward")
                            </label>

                            {/* --- COLOR PICKERS FOR TRACKER --- */}
                            {['dark', 'light'].map((mode) => {
                                const isDark = mode === 'dark';
                                const title = isDark ? "Tracker Colors (Dark Mode)" : "Tracker Colors (Light Mode)";
                                const activeStyle = isDark ? progressStyle : lightProgressStyle;
                                const setStyle = isDark ? setProgressStyle : setLightProgressStyle;

                                return (
                                    <div key={mode} style={{ marginTop: '1.5rem', borderTop: '1px dashed #ccc', paddingTop: '1.5rem' }}>
                                        <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>{title}</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={styles.configItem}>
                                                <label style={{ fontSize: '0.8rem' }}>Active Base Color (Current/Completed Node)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input type="color" value={activeStyle?.activeColor || (isDark ? '#00d2d3' : '#0866ff')} onChange={e => setStyle((p: any) => ({ ...p, activeColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                    <input type="text" value={activeStyle?.activeColor || (isDark ? '#00d2d3' : '#0866ff')} onChange={e => setStyle((p: any) => ({ ...p, activeColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                </div>
                                            </div>
                                            <div style={styles.configItem}>
                                                <label style={{ fontSize: '0.8rem' }}>Inactive Base Color (Upcoming Nodes)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input type="color" value={(activeStyle?.inactiveColor?.startsWith('#') ? activeStyle.inactiveColor.substring(0, 7) : (isDark ? '#cccccc' : '#e0e0e0'))} onChange={e => setStyle((p: any) => ({ ...p, inactiveColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                    <input type="text" value={activeStyle?.inactiveColor || (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')} onChange={e => setStyle((p: any) => ({ ...p, inactiveColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                </div>
                                            </div>
                                            <div style={styles.configItem}>
                                                <label style={{ fontSize: '0.8rem' }}>Reward Node Color (Final Step)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input type="color" value={activeStyle?.rewardColor || '#f1c40f'} onChange={e => setStyle((p: any) => ({ ...p, rewardColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                    <input type="text" value={activeStyle?.rewardColor || '#f1c40f'} onChange={e => setStyle((p: any) => ({ ...p, rewardColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                </div>
                                            </div>
                                            
                                            {progressShowLabels && (
                                                <>
                                                    <div style={styles.configItem}>
                                                        <label style={{ fontSize: '0.8rem' }}>Active Text Color</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input type="color" value={activeStyle?.activeTextColor || (isDark ? '#ffffff' : '#333333')} onChange={e => setStyle((p: any) => ({ ...p, activeTextColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                            <input type="text" value={activeStyle?.activeTextColor || (isDark ? '#ffffff' : '#333333')} onChange={e => setStyle((p: any) => ({ ...p, activeTextColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                        </div>
                                                    </div>
                                                    <div style={styles.configItem}>
                                                        <label style={{ fontSize: '0.8rem' }}>Inactive Text Color</label>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input type="color" value={(activeStyle?.inactiveTextColor?.startsWith('#') ? activeStyle.inactiveTextColor.substring(0, 7) : (isDark ? '#aaaaaa' : '#666666'))} onChange={e => setStyle((p: any) => ({ ...p, inactiveTextColor: e.target.value }))} style={{ width: '40px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                                                            <input type="text" value={activeStyle?.inactiveTextColor || (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)')} onChange={e => setStyle((p: any) => ({ ...p, inactiveTextColor: e.target.value }))} style={{ ...styles.input, flex: 1 }} />
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};