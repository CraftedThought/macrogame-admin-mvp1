/* src/components/ui/MicrogameResultOverlay.tsx */

import React, { useEffect, useState, useRef } from 'react';
import { ResultConfig, ScoreLedgerItem } from '../../types';
import { LiveCountdown } from '../previews/StaticMacrogamePreview';
import { TransitionRenderer } from '../builders/macrogame/TransitionRenderer';

const AnimatedNumber: React.FC<{ value: number; enabled?: boolean }> = ({ value, enabled }) => {
    const [displayValue, setDisplayValue] = useState(enabled ? 0 : value);

    useEffect(() => {
        if (!enabled) {
            setDisplayValue(value);
            return;
        }
        let startTime: number | null = null;
        const duration = 1200; // 1.2 second fast tally animation

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // easeOutQuart for a fast-start, slow-finish snap
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            
            setDisplayValue(Math.floor(easeProgress * value));

            if (progress < 1) requestAnimationFrame(animate);
            else setDisplayValue(value);
        };

        const req = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(req);
    }, [value, enabled]);

    return <>{displayValue}</>;
};

export interface MicrogameResultOverlayProps {
    type: 'win' | 'loss' | 'try_again';
    score: number;
    showScore: boolean;
    onContinue: () => void;
    onRetry?: () => void;
    config?: Partial<ResultConfig>;
    macroConfig?: any;
    theme?: 'dark' | 'light';
    contentWidth?: number;
    contentHeight?: number;
    showLayoutGuides?: boolean;
    isStandAlone?: boolean;
    isActive?: boolean;
    scoreLedger?: ScoreLedgerItem[];
    currentGameIndex?: number;
    playScoreTallyAudio?: () => void;
    targetScore?: number;          // --- Upstream Visibility ---
    targetRewardName?: string;     // --- Upstream Visibility ---
}

export const MicrogameResultOverlay: React.FC<MicrogameResultOverlayProps> = ({
    type, 
    score, 
    showScore, 
    onContinue, 
    onRetry,
    config = {},
    macroConfig = {},
    theme = 'dark',
    contentWidth = 100,
    contentHeight = 100,
    showLayoutGuides = false,
    isStandAlone = false,
    isActive = true,
    scoreLedger = [],
    currentGameIndex = 0,
    playScoreTallyAudio,
    targetScore,
    targetRewardName
}) => {
    
    const hasPlayedTally = useRef(false);
    useEffect(() => {
        // Only play if tally animation is enabled, the score is above 0, and we haven't played it yet
        if (!hasPlayedTally.current && macroConfig?.enableTallyAnimation && score > 0 && playScoreTallyAudio) {
            playScoreTallyAudio();
            hasPlayedTally.current = true;
        }
    }, [macroConfig?.enableTallyAnimation, score, playScoreTallyAudio]);

    // --- 1. Resolve Text by State ---
    const headline = type === 'win' ? config.winText : type === 'loss' ? config.lossText : config.tryAgainText;
    const bodyText = type === 'win' ? config.winBodyText : type === 'loss' ? config.lossBodyText : config.tryAgainBodyText;

    // --- 2. Resolve Transition Config ---
    const transition = config.transition || {};
    const isAuto = type !== 'try_again' && (transition.type || 'interact') === 'auto';
    
    // For Try Again, if the global transition is Auto, we force it to a Button to preserve choice.
    const forceTryAgainButton = type === 'try_again' && transition.type === 'auto';
    const interactionMethod = forceTryAgainButton ? 'click' : (transition.interactionMethod || 'click');
    const clickFormat = forceTryAgainButton ? 'button' : (transition.clickFormat || 'disclaimer');
    const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
    const canClickAnywhere = !isAuto && !isButton;

    const primaryAction = (type === 'try_again' && onRetry) ? onRetry : onContinue;

    useEffect(() => {
        if (!isAuto && interactionMethod === 'any_interaction') {
            const handleKeyDown = (e: KeyboardEvent) => {
                const target = e.target as HTMLElement;
                // Prevent restarting the game if the user is typing in a builder input field
                if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
                primaryAction();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isAuto, interactionMethod, primaryAction]);
    
    const pStruct = transition.buttonConfig || {};
    const pStyle = theme === 'light' ? (transition.lightButtonStyle || {}) : (transition.buttonStyle || {});
    
    let pWidth = 'auto';
    if (pStruct.widthMode === 'max') pWidth = '100%';
    else if (pStruct.widthMode === 'custom') pWidth = `${pStruct.customWidth ?? 100}%`;

    const pBorder = (pStruct.strokeStyle && pStruct.strokeStyle !== 'none') 
        ? `${pStruct.strokeWidth ?? 2}px ${pStruct.strokeStyle} ${pStyle.strokeColor || '#ffffff'}` 
        : 'none';

    // --- 3. Resolve Secondary Button (Play Again) ---
    const sStruct = config.secondaryButtonConfig || {};
    const sStyle = theme === 'light' ? (config.lightSecondaryButtonStyle || {}) : (config.secondaryButtonStyle || {});
    
    let sWidth = 'auto';
    if (sStruct.widthMode === 'max') sWidth = '100%';
    else if (sStruct.widthMode === 'custom') sWidth = `${sStruct.customWidth === '' ? 0 : (sStruct.customWidth ?? 100)}%`;

    const sBorder = (sStruct.strokeStyle && sStruct.strokeStyle !== 'none') 
        ? `${sStruct.strokeWidth === '' ? 0 : (sStruct.strokeWidth ?? 2)}px ${sStruct.strokeStyle} ${sStyle.strokeColor || '#ffffff'}` 
        : 'none';
        
    const sHoverAnim = sStruct.enableHoverAnimation !== false;

    const globalGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px solid rgba(255, 0, 0, 0.8)', outlineOffset: '-2px' } : {};
    const structGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dashed rgba(255, 0, 0, 0.5)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 0, 0, 0.05)', boxSizing: 'border-box' } : {};
    const contentGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dotted rgba(255, 193, 7, 0.9)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 193, 7, 0.15)', boxSizing: 'border-box' } : {};

    return (
        <>
            <style>
                {`
                    .result-overlay-wrapper .ql-editor {
                        height: auto !important;
                        min-height: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        text-align: center;
                        line-height: 1.5;
                        font-size: 1.25rem;
                    }
                    .result-overlay-wrapper .ql-editor > * {
                        margin-top: 0 !important;
                        margin-bottom: 0 !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    .result-overlay-wrapper .ql-editor p,
                    .result-overlay-wrapper .ql-editor h1,
                    .result-overlay-wrapper .ql-editor h2,
                    .result-overlay-wrapper .ql-editor h3,
                    .result-overlay-wrapper .ql-editor h4 {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .result-overlay-wrapper .ql-editor h1,
                    .result-overlay-wrapper .ql-editor h2,
                    .result-overlay-wrapper .ql-editor h3 {
                        line-height: 1.1 !important;
                    }
                    .result-overlay-wrapper .ql-editor h4 {
                        font-size: 0.75em !important; 
                        font-weight: normal !important;
                    }
                `}
            </style>
            <div 
                onClick={canClickAnywhere ? (e) => { e.stopPropagation(); primaryAction(); } : undefined}
                style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'transparent', // Move all background logic to Layer 2 so they don't compound
                    color: theme === 'light' ? '#333333' : '#ffffff', zIndex: 100,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    fontFamily: 'inherit',
                    cursor: canClickAnywhere ? 'pointer' : 'default'
                }}
            >
                {/* LAYER 2: Viewport Glass */}
                <div className="result-overlay-wrapper" style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: isStandAlone 
                        ? (theme === 'light' ? '#ffffff' : '#1a1a2e') 
                        : (theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(26,26,46,0.95)'),
                    zIndex: 10,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', // Centers the Red Box
                    color: theme === 'light' ? '#333333' : '#ffffff',
                    textShadow: theme === 'light' ? 'none' : '2px 2px 4px rgba(0,0,0,0.6)'
                }}>
            
            {/* LAYER 3: Global Safe Area (Red Box) - STRICT HEIGHT */}
            <div style={{
                width: `${contentWidth}%`, 
                height: `${contentHeight}%`,
                display: 'flex', 
                flexDirection: 'column',
                boxSizing: 'border-box',
                ...globalGuideStyle
            }}>
                
                {/* PADDING WRAPPER */}
                <div style={{
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    paddingTop: `${config.paddingTop === '' ? 0 : (config.paddingTop ?? 0)}px`,
                    paddingBottom: `${config.paddingBottom === '' ? 0 : (config.paddingBottom ?? 0)}px`,
                    paddingLeft: `${config.paddingLeft === '' ? 0 : (config.paddingLeft ?? 0)}px`,
                    paddingRight: `${config.paddingRight === '' ? 0 : (config.paddingRight ?? 0)}px`,
                    boxSizing: 'border-box',
                    minHeight: 0
                }}>

                    {/* CONTENT CENTERING WRAPPER (Split Layer Flexbox) */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        minHeight: 0, // CRITICAL for nested flex scrolling
                        ...contentGuideStyle
                    }}>

                        {/* Top Spacer for vertical centering when short */}
                        <div style={{ flex: '1 1 auto', minHeight: macroConfig?.showProgress ? (macroConfig?.progressShowLabels ? 72 : 48) : 0 }}></div>

                        {/* TOP LAYER (TEXT & RECEIPT) */}
                        <div className="custom-scrollbar" style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            width: '100%', 
                            gap: `${config.textSpacing === '' ? 0 : (config.textSpacing ?? 16)}px`,
                            flex: '0 1 auto', // Allow shrinking, but base size is natural
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            minHeight: 0, // Protects flexbox container
                            padding: '2px 0'
                        }}>
                            {headline && (
                                <div className="ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: headline }} />
                            )}

                            {showScore && (() => {
                                if (!macroConfig.showPoints || macroConfig.pointDisplayMode === 'none') {
                                    return null;
                                }

                                // 1. If simple (or fallback), just show the animated total
                                if (macroConfig.pointDisplayMode === 'simple' || !macroConfig.pointDisplayMode) {
                                    return (
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0 }}>
                                            Total Points: <AnimatedNumber value={score} enabled={macroConfig.enableTallyAnimation} />
                                            {targetScore && targetScore > 0 ? ` / ${targetScore}` : ''}
                                        </div>
                                    );
                                }

                                // 2. If breakdown is ON, calculate the receipt data
                                const safeLedger = scoreLedger || [];
                                const safeIndex = currentGameIndex || 0;

                                // Roll up past games into single summary lines (Filter 0s)
                                const pastGames = safeLedger.filter(item => item.gameIndex < safeIndex).reduce((acc, item) => {
                                    if (item.points === 0) return acc;
                                    if (!acc[item.gameIndex]) acc[item.gameIndex] = 0;
                                    acc[item.gameIndex] += item.points;
                                    return acc;
                                }, {} as { [key: number]: number });

                                // Get current game items, GROUP them by label, and filter 0s
                                const rawCurrentItems = safeLedger.filter(item => item.gameIndex === safeIndex && item.points !== 0);
                                
                                const groupedCurrentItems = Object.values(rawCurrentItems.reduce((acc, item) => {
                                    if (!acc[item.label]) {
                                        acc[item.label] = { label: item.label, points: 0 };
                                    }
                                    acc[item.label].points += item.points;
                                    return acc;
                                }, {} as { [label: string]: { label: string, points: number } }));

                                const currentGameTotal = groupedCurrentItems.reduce((sum, item) => sum + item.points, 0);

                                const isLight = theme === 'light';
                                const receiptBg = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
                                const receiptBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
                                const textColor = isLight ? '#333333' : '#ffffff';
                                const mutedColor = isLight ? '#666666' : '#bbbbbb';

                                return (
                                    <>
                                    <div style={{ 
                                        width: '100%', maxWidth: '400px', backgroundColor: receiptBg, 
                                        border: `1px solid ${receiptBorder}`, borderRadius: '8px',
                                        padding: '1.25rem', fontFamily: 'monospace', fontSize: '1rem',
                                        textAlign: 'left', color: textColor,
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                        display: 'flex', flexDirection: 'column',
                                        flexShrink: 1, minHeight: '150px'
                                    }}>
                                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>
                                            Point Breakdown
                                        </div>
                                        
                                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
                                            {/* A. Past Games Rollup */}
                                            {Object.keys(pastGames).map(idxStr => {
                                                const idx = Number(idxStr);
                                                return (
                                                    <div key={`past-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: mutedColor }}>
                                                        <span>Game {idx + 1} Total</span>
                                                        <span>{pastGames[idx]} pts</span>
                                                    </div>
                                                );
                                            })}

                                            {Object.keys(pastGames).length > 0 && (
                                                <div style={{ borderTop: `1px dashed ${receiptBorder}`, margin: '0.75rem 0' }} />
                                            )}

                                            {/* B. Current Game Details */}
                                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Game {safeIndex + 1}</div>
                                            
                                            {macroConfig.showLineItemDetails && groupedCurrentItems.length > 0 ? (
                                                <>
                                                    {groupedCurrentItems.map((item, i) => (
                                                        <div key={`cur-${i}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', paddingLeft: '1rem', fontSize: '0.9rem', color: mutedColor }}>
                                                            <span>↳ {item.label}</span>
                                                            <span>{item.points} pts</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontWeight: 'bold' }}>
                                                        <span>Stage Total</span>
                                                        <span>{currentGameTotal} pts</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: mutedColor }}>
                                                    <span>Stage Total</span>
                                                    <span>{currentGameTotal} pts</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ borderTop: `2px solid ${receiptBorder}`, margin: '1rem 0', flexShrink: 0 }} />

                                        {/* C. Grand Total with Optional Tally */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem', flexShrink: 0 }}>
                                            <span>TOTAL SCORE</span>
                                            <span><AnimatedNumber value={score} enabled={macroConfig.enableTallyAnimation} /> pts</span>
                                        </div>
                                    </div>
                                    
                                    {/* --- UPSTREAM VISIBILITY: PACING INDICATOR --- */}
                                    {targetScore && targetScore > 0 && targetRewardName && (
                                        <div style={{
                                            marginTop: '0.75rem',
                                            padding: '0.75rem 1.25rem',
                                            backgroundColor: score >= targetScore ? 'rgba(46, 204, 113, 0.15)' : 'rgba(241, 196, 15, 0.15)',
                                            border: `1px solid ${score >= targetScore ? '#2ecc71' : '#f1c40f'}`,
                                            borderRadius: '8px',
                                            color: theme === 'light' ? '#333333' : '#ffffff',
                                            fontSize: '0.95rem',
                                            fontWeight: '500',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            maxWidth: '400px',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}>
                                            {score >= targetScore ? (
                                                <span>🎉 You have enough points to unlock the <strong>{targetRewardName}</strong>!</span>
                                            ) : (
                                                <span>🎯 You need <strong>{targetScore - score} more points</strong> to unlock the <strong>{targetRewardName}</strong>!</span>
                                            )}
                                        </div>
                                    )}
                                    </>
                                );
                            })()}

                            {bodyText && (
                                <div className="ql-editor" style={{ width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: bodyText }} />
                            )}
                        </div>

                        {/* Gap between content and buttons */}
                        <div style={{ flexShrink: 0, height: `${config.blockSpacing === '' ? 0 : (config.blockSpacing ?? 32)}px` }} />

                        {/* BOTTOM LAYER (BUTTONS) */}
                        <div style={{ 
                            display: 'flex', flexDirection: 'column', gap: `${config.buttonSpacing === '' ? 0 : (config.buttonSpacing ?? 16)}px`, 
                            width: '100%', alignItems: 'center',
                            flexShrink: 0 // CRITICAL: NEVER SHRINK
                        }}>
                            {(() => {
                                let slot1Transition = { ...transition };
                                let slot1Action = onContinue;
                                let slot1Text = "Continue";
                                
                                let slot2Action: (() => void) | undefined = onRetry;
                                let slot2Text = sStruct.text || 'Play Again';
                                let slot2Struct = sStruct;
                                let slot2Style = sStyle;
                                let slot2Border = sBorder;

                                if (type === 'try_again') {
                                    if (onRetry) {
                                        // Top slot = Play Again (inherits secondary styling configs)
                                        slot1Transition = {
                                            ...transition,
                                            type: 'interact',
                                            ...(forceTryAgainButton ? { interactionMethod: 'click', clickFormat: 'button' } : {}),
                                            buttonConfig: { ...(transition.buttonConfig || {}), ...sStruct, text: sStruct.text || 'Play Again' },
                                            buttonStyle: config.secondaryButtonStyle || {},
                                            lightButtonStyle: config.lightSecondaryButtonStyle || {}
                                        };
                                        slot1Action = onRetry;
                                        slot1Text = sStruct.text || "Play Again";

                                        // Bottom slot = Continue (inherits primary styling configs, ONLY if enabled)
                                        if (config.showPlayAgainOnTryAgain) {
                                            slot2Action = onContinue;
                                            slot2Text = pStruct.text || 'Continue';
                                            slot2Struct = pStruct;
                                            slot2Style = pStyle;
                                            slot2Border = pBorder;
                                        } else {
                                            slot2Action = undefined; // Hides the Continue button
                                        }
                                    } else {
                                        // No retry enabled, just force Continue to respect Try Again rules
                                        slot1Transition = {
                                            ...transition,
                                            type: 'interact',
                                            ...(forceTryAgainButton ? { interactionMethod: 'click', clickFormat: 'button' } : {})
                                        };
                                        slot2Action = undefined;
                                    }
                                }

                                return (
                                    <>
                                        <TransitionRenderer 
                                            transition={slot1Transition} 
                                            onAdvance={slot1Action} 
                                            isActive={isActive} 
                                            showLayoutGuides={showLayoutGuides} 
                                            theme={theme}
                                            defaultButtonText={slot1Text}
                                        />

                                        {slot2Action && !isAuto && (
                                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', ...structGuideStyle }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); slot2Action(); }}
                                                    style={{
                                                        width: slot2Struct.widthMode === 'max' ? '100%' : (slot2Struct.widthMode === 'custom' ? `${slot2Struct.customWidth === '' ? 0 : (slot2Struct.customWidth ?? 100)}%` : 'auto'),
                                                        padding: `${slot2Struct.paddingVertical === '' ? 0 : (slot2Struct.paddingVertical ?? 12)}px ${slot2Struct.paddingHorizontal === '' ? 0 : (slot2Struct.paddingHorizontal ?? 32)}px`, 
                                                        fontSize: '1.2rem', fontWeight: 'bold',
                                                        backgroundColor: slot2Style.backgroundColor || 'transparent', 
                                                        color: slot2Style.textColor || '#ffffff', 
                                                        border: slot2Border, 
                                                        borderRadius: `${slot2Struct.borderRadius === '' ? 0 : (slot2Struct.borderRadius ?? 6)}px`,
                                                        cursor: 'pointer',
                                                        transition: (slot2Struct.enableHoverAnimation !== false) ? 'transform 0.1s' : 'none'
                                                    }}
                                                    onMouseEnter={(e) => { if (slot2Struct.enableHoverAnimation !== false) e.currentTarget.style.transform = 'scale(1.05)' }}
                                                    onMouseLeave={(e) => { if (slot2Struct.enableHoverAnimation !== false) e.currentTarget.style.transform = 'scale(1)' }}
                                                >
                                                    {slot2Text}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Bottom Spacer for vertical centering when short */}
                        <div style={{ flex: '1 1 auto', minHeight: 0 }}></div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</>
);
};