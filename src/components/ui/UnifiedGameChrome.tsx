/* src/components/ui/UnifiedGameChrome.tsx */

import React, { ReactNode } from 'react';
import { MicrogameOverlay } from './MicrogameOverlay';

export interface UnifiedGameChromeProps {
    // Context
    view: string;
    theme?: 'dark' | 'light';

    // Macro-Level Tracking (Outside the game)
    macroConfig?: {
        showPoints: boolean;
        showProgress: boolean;
        progressFormat?: 'text' | 'visual';
        progressShowLabels?: boolean;
        progressStyle?: any;
        lightProgressStyle?: any;
        hasIntro?: boolean;
        hasPromo?: boolean;
        hudLayout?: 'viewport' | 'safe_area';
        hudPaddingY?: number;
        hudPaddingX?: number;
    };
    totalScore: number;
    targetScore?: number;          // --- Upstream Visibility ---
    targetRewardName?: string;     // --- Upstream Visibility ---
    progressText: string;
    currentStep?: number;
    totalSteps?: number;
    isOverlayVisible?: boolean;

    // Micro-Level Tracking (Inside the game)
    microConfig?: {
        showPoints: boolean;
        lifeIconType?: 'heart' | 'shield' | 'circle';
    };
    lives?: number | null;
    maxLives?: number | null;
    timerProgress?: number;
    goalCurrent?: number | null;
    goalTarget?: number | null;
    goalLabel?: string;

    // Overlay Configuration
    isOverlayVisible?: boolean;
    previewGateStateOverride?: 'locked' | 'unlocked';
    onStart?: () => void;
    overlayTitle?: string;
    overlayControls?: string;
    preGameConfig?: any;
    contentWidth?: number;
    contentHeight?: number;
    showLayoutGuides?: boolean;
    isActive?: boolean;

    children: ReactNode;
}

// --- Production Quality Inline SVGs ---
const HeartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff4757" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);

const ShieldIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3498db" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
);

const CircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2ecc71" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
        <circle cx="12" cy="12" r="10"></circle>
    </svg>
);

export const UnifiedGameChrome: React.FC<UnifiedGameChromeProps> = ({
    view,
    theme = 'dark',
    macroConfig = { showPoints: false, showProgress: false },
    totalScore,
    targetScore,
    targetRewardName,
    progressText,
    currentStep,
    totalSteps,
    microConfig = { showPoints: false, lifeIconType: 'heart' },
    lives,
    maxLives,
    timerProgress = 0,
    goalCurrent,
    goalTarget,
    goalLabel,
    isOverlayVisible = false,
    previewGateStateOverride,
    onStart,
    overlayTitle,
    overlayControls,
    preGameConfig,
    contentWidth = 100,
    contentHeight = 100,
    showLayoutGuides = false,
    isActive = true,
    children
}) => {
    const isGameView = view === 'game';
    const isGameActive = isGameView && !isOverlayVisible;

    // --- Render Lives (Micro View Only) ---
    const renderLives = () => {
        if (lives === null || maxLives === null || maxLives === undefined) return null;
        
        if (maxLives > 5) {
            return (
                <div style={styles.microHudItem}>
                    <div style={{ marginRight: '0.25rem', display: 'flex' }}>
                        {microConfig.lifeIconType === 'shield' ? <ShieldIcon /> : microConfig.lifeIconType === 'heart' ? <HeartIcon /> : <CircleIcon />}
                    </div>
                    <span style={styles.microHudText}>{lives}</span>
                </div>
            );
        }

        const icons = [];
        for (let i = 0; i < maxLives; i++) {
            const isActive = i < lives;
            icons.push(
                <div key={i} style={{ opacity: isActive ? 1 : 0.3, transform: isActive ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.2s' }}>
                    {microConfig.lifeIconType === 'shield' ? <ShieldIcon /> : microConfig.lifeIconType === 'heart' ? <HeartIcon /> : <CircleIcon />}
                </div>
            );
        }
        return <div style={{ ...styles.microHudItem, gap: '0.25rem' }}>{icons}</div>;
    };

    // --- Render Goal Progress (Micro View Only) ---
    const renderGoalProgress = () => {
        if (goalCurrent === null || goalTarget === null || goalTarget === undefined || goalCurrent === undefined) return null;
        const pct = Math.min(100, Math.max(0, (goalCurrent / goalTarget) * 100));
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '200px' }}>
                <div style={{ 
                    width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.5)', 
                    borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)',
                    position: 'relative'
                }}>
                    <div style={{ 
                        width: `${pct}%`, height: '100%', 
                        backgroundColor: '#00d2d3', 
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 8px rgba(0, 210, 211, 0.6)'
                    }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {goalCurrent} / {goalTarget} {goalLabel && <span style={{ opacity: 0.8, fontWeight: 600 }}>{goalLabel}</span>}
                </span>
            </div>
        );
    };

    // --- Render Visual Reward Path ---
    const renderVisualProgress = () => {
        if (totalSteps === undefined || currentStep === undefined) return null;

        const isLight = theme === 'light';
        const pStyle = isLight ? (macroConfig.lightProgressStyle || {}) : (macroConfig.progressStyle || {});

        const inactiveBg = pStyle.inactiveColor || (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)');
        const activeBg = pStyle.activeColor || (isLight ? '#0866ff' : '#00d2d3');
        const rewardBg = pStyle.rewardColor || '#f1c40f';
        const activeTextColor = pStyle.activeTextColor || (isLight ? '#333333' : '#ffffff');
        const inactiveTextColor = pStyle.inactiveTextColor || (isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)');

        const hasIntro = macroConfig.hasIntro ?? false;
        const hasPromo = macroConfig.hasPromo ?? false;
        const showLabels = macroConfig.progressShowLabels ?? false;

        // 1. Build the logical sequence of the Macrogame
        const flowOrder: string[] = [];
        if (hasIntro) flowOrder.push('intro');
        for (let i = 0; i < totalSteps; i++) flowOrder.push(`game-${i}`);
        if (hasPromo) flowOrder.push('promo');
        flowOrder.push('end');

        // 2. Identify exactly where the player is with strict mathematical clamping
        let activeGameIdx = currentStep;
        if (view === 'result') {
            activeGameIdx = Math.max(0, activeGameIdx - 1);
        }
        // Force the index to stay within the actual bounds of the game array
        activeGameIdx = Math.min(activeGameIdx, Math.max(0, totalSteps - 1));

        let currentStageId = 'end';
        if (view === 'intro') currentStageId = 'intro';
        else if (['title', 'controls', 'combined', 'game', 'result'].includes(view)) currentStageId = `game-${activeGameIdx}`;
        else if (view === 'promo') currentStageId = 'promo';

        const currentStateIndex = flowOrder.indexOf(currentStageId);
        const nodes = [];

        // 3. Render the dynamic path
        for (let i = 0; i < flowOrder.length; i++) {
            const stageId = flowOrder[i];
            const isActive = i === currentStateIndex;
            const isCompleted = i < currentStateIndex;
            const isReward = stageId === 'end';

            let label = '';
            if (stageId === 'intro') label = 'Intro';
            else if (stageId.startsWith('game-')) label = `Game ${parseInt(stageId.split('-')[1]) + 1}`;
            else if (stageId === 'promo') label = 'Promo';
            else if (stageId === 'end') label = 'Reward';

            // Connecting Line (except for the first node)
            if (i > 0) {
                const isLineActive = isCompleted || isActive;
                nodes.push(
                    <div key={`line-${i}`} style={{ 
                        height: '4px', 
                        width: '32px', // Slightly wider to give text room to breathe
                        flexShrink: 0,
                        backgroundColor: isLineActive ? activeBg : inactiveBg, 
                        transition: 'background-color 0.4s ease',
                        borderRadius: '2px',
                        marginTop: '19px' // Perfectly centers the line with the 42px circle container
                    }} />
                );
            }

            // 1.5x sized node for the final reward
            const finalNodeSize = isReward ? (isActive ? '42px' : '34px') : (isActive ? '16px' : '12px');

            // Intelligently drop the lock icon if the user forces "Unlock All" in the previewer
            const isPointLocked = previewGateStateOverride === 'unlocked' ? false : (targetScore && targetScore > 0 && totalScore < targetScore);

            const nodeContent = isReward ? (
                isPointLocked ? (
                    <svg width={isActive ? "20" : "16"} height={isActive ? "20" : "16"} viewBox="0 0 24 24" fill="none" stroke={isActive ? "#fff" : (isLight ? "#666" : "rgba(255,255,255,0.7)")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                ) : (
                    <svg width={isActive ? "24" : "20"} height={isActive ? "24" : "20"} viewBox="0 0 24 24" fill="none" stroke={isActive ? "#fff" : (isLight ? "#666" : "rgba(255,255,255,0.7)")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
                        <polyline points="20 12 20 22 4 22 4 12"></polyline>
                        <rect x="2" y="7" width="20" height="5"></rect>
                        <line x1="12" y1="22" x2="12" y2="7"></line>
                        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                    </svg>
                )
            ) : null;

            nodes.push(
                <div key={`node-wrapper-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Fixed height container ensures circles align perfectly and text starts at the exact same Y-axis */}
                    <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            width: finalNodeSize,
                            height: finalNodeSize,
                            borderRadius: '50%',
                            // Reward node stays inactive (hollow look) until you actually land on it
                            backgroundColor: isReward ? (isActive ? rewardBg : inactiveBg) : (isCompleted || isActive ? activeBg : inactiveBg),
                            boxShadow: isReward ? (isActive ? `0 0 20px ${rewardBg}` : 'none') : (isActive ? `0 0 10px ${activeBg}` : 'none'),
                            border: isActive || (isReward && isActive) ? `2px solid #fff` : 'none',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            transition: 'all 0.3s ease',
                            boxSizing: 'border-box'
                        }}>
                            {nodeContent}
                        </div>
                    </div>
                    {/* Absolutely positioned text prevents layout shifting in the parent flex container */}
                    {showLabels && (
                        <div style={{
                            position: 'absolute',
                            top: '42px',
                            marginTop: '4px',
                            fontSize: '0.7rem',
                            fontFamily: 'inherit',
                            fontWeight: isActive ? 'bold' : 'normal',
                            color: isActive ? activeTextColor : inactiveTextColor,
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            textShadow: isLight ? 'none' : '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                            {label}
                        </div>
                    )}
                </div>
            );
        }

        return <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4px' }}>{nodes}</div>;
    };

    // --- Render Macro HUD (Outside Game) ---
    const renderMacroHud = () => {
        if (!macroConfig.showPoints && !macroConfig.showProgress) return null;

        const textColor = theme === 'light' ? '#000000' : '#ffffff';
        const textShadow = theme === 'light' ? 'none' : '1px 1px 3px rgba(0,0,0,0.7)';

        // Hide during active gameplay, BUT keep it visible if the Pre-Game Overlay is currently up!
        const shouldShowProgress = macroConfig.showProgress && (view !== 'game' || isOverlayVisible);

        const layout = macroConfig.hudLayout || 'viewport';
        const padY = macroConfig.hudPaddingY ?? 16;
        const padX = macroConfig.hudPaddingX ?? 16;
        
        // Intelligent Layout Logic
        const layoutStyles: React.CSSProperties = layout === 'safe_area' 
            ? { width: `${contentWidth}%`, left: '50%', transform: 'translateX(-50%)', padding: `${padY}px ${padX}px` }
            : { width: '100%', left: 0, padding: `${padY}px ${padX}px` };

        return (
            <div style={{
                ...styles.macroTopBar,
                ...layoutStyles,
                boxSizing: 'border-box',
                zIndex: 1000 // Boosted to pierce through Pre-Game backgrounds
            }}>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: textColor, textShadow, flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                    {macroConfig.showPoints ? (targetScore && targetScore > 0 ? `Points: ${totalScore} / ${targetScore}` : `Points: ${totalScore}`) : ''}
                </div>
                
                {/* Enforce flex-start so adding text below the nodes pushes down, not up */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    {shouldShowProgress && (
                        macroConfig.progressFormat === 'visual' ? renderVisualProgress() : (
                            <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: textColor, textShadow }}>
                                {progressText ? `Progress: ${progressText}` : ''}
                            </span>
                        )
                    )}
                </div>
                <div style={{ flex: 1 }}>{/* Spacer to keep center balanced */}</div>
            </div>
        );
    };

    // --- Render Micro HUD (Inside Game) ---
    const renderMicroHud = () => {
        const layout = macroConfig.hudLayout || 'viewport';
        const padY = macroConfig.hudPaddingY ?? 16;
        const padX = macroConfig.hudPaddingX ?? 16;

        // Intelligent Layout Logic
        const layoutStyles: React.CSSProperties = layout === 'safe_area' 
            ? { width: `${contentWidth}%`, left: '50%', transform: 'translateX(-50%)', padding: `${padY}px ${padX}px` }
            : { width: '100%', left: 0, padding: `${padY}px ${padX}px` };

        return (
            <div style={{ ...styles.microTopBar, ...layoutStyles, boxSizing: 'border-box' }}>
                {/* Left: Score */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                    {microConfig.showPoints && (
                        <div style={styles.microHudItem}>
                            <span style={styles.microHudLabel}>PTS</span>
                            <span style={styles.microHudText}>{totalScore}</span>
                        </div>
                    )}
                </div>

                {/* Center: Goal Progress */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    {renderGoalProgress()}
                </div>

                {/* Right: Lives */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    {renderLives()}
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            
            {/* HUD LAYER */}
            {isGameActive ? renderMicroHud() : renderMacroHud()}

            {/* CONTENT LAYER */}
            <div style={styles.contentLayer}>
                {children}
            </div>
            
            {/* TIMER LAYER (Micro View Only) */}
            {isGameActive && timerProgress > 0 && (
                <div style={styles.bottomTimerContainer}>
                    <div style={{ 
                        ...styles.timerBar, 
                        width: `${timerProgress}%`,
                        backgroundColor: timerProgress < 20 ? '#ff4757' : timerProgress < 50 ? '#f1c40f' : '#2ecc71'
                    }} />
                </div>
            )}

            {/* OVERLAY LAYER */}
            {isGameView && isOverlayVisible && onStart && (
                <MicrogameOverlay 
                    name={overlayTitle || "Ready?"} 
                    controls={overlayControls || "Interact to Start"} 
                    onStart={onStart}
                    preGameConfig={preGameConfig}
                    theme={theme}
                    contentWidth={contentWidth}
                    contentHeight={contentHeight}
                    showLayoutGuides={showLayoutGuides}
                    isActive={isActive}
                    hasProgressTracker={macroConfig.showProgress}
                    hasProgressLabels={macroConfig.progressShowLabels}
                    targetScore={targetScore}
                    targetRewardName={targetRewardName}
                />
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        fontFamily: 'inherit', userSelect: 'none'
    },
    // --- MACRO STYLES ---
    macroTopBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 20, pointerEvents: 'none'
    },
    // --- MICRO STYLES ---
    microTopBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 20, pointerEvents: 'none'
    },
    microHudItem: {
        display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '0.4rem 0.8rem', borderRadius: '20px', color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)'
    },
    microHudLabel: {
        fontSize: '0.7rem', fontWeight: 700, opacity: 0.8, marginRight: '0.4rem', letterSpacing: '0.5px'
    },
    microHudText: {
        fontSize: '1.1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums'
    },
    contentLayer: {
        width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1
    },
    bottomTimerContainer: {
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '8px', 
        backgroundColor: 'rgba(100,100,100,1.0)', zIndex: 15
    },
    timerBar: {
        height: '100%', transition: 'width 0.1s linear, background-color 0.5s ease', willChange: 'width'
    }
};