/* src/components/previews/StaticConversionPreview.tsx */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ConversionScreen, ConversionMethod } from '../../types';
import { ConversionScreenHost } from '../conversions/ConversionScreenHost';
import { CouponDisplay, EmailCapture, FormSubmit, LinkRedirect, SocialFollow } from '../conversions';
import { UnifiedGameChrome } from '../ui/UnifiedGameChrome'; 
import { MethodContainer } from '../conversions/MethodContainer';
import { getMaskConfig } from '../../utils/maskUtils';
import { SmartNumberInput } from '../ui/inputs/SmartNumberInput';

const ORIENTATIONS = {
    landscape: { label: 'Landscape (16:9)', width: 960, height: 540 }, 
    portrait: { label: 'Portrait (9:16)', width: 360, height: 640 }    
};

const methodCssBlock = `
    .link-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.5;
        color: inherit;
        text-align: left;
        font-size: 1.25rem;
    }
    .link-content-wrapper.ql-editor > * { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }
    .link-content-wrapper.ql-editor h1, .link-content-wrapper.ql-editor h2, .link-content-wrapper.ql-editor h3, .link-content-wrapper.ql-editor h4, .link-content-wrapper.ql-editor p { margin: 0; padding: 0; }
    .link-content-wrapper.ql-editor h1, .link-content-wrapper.ql-editor h2, .link-content-wrapper.ql-editor h3 { line-height: 1.1; }
    .link-content-wrapper.ql-editor h4 { font-size: 0.75em; font-weight: normal; }
    .link-content-wrapper.ql-editor ul, .link-content-wrapper.ql-editor ol { padding-left: 0 !important; margin-left: 0 !important; list-style-position: inside !important; text-align: left; display: inline-block; width: 100%; }
    .link-content-wrapper.ql-editor li { padding: 0 !important; margin: 0 !important; }
    .link-content-wrapper.ql-editor a { color: inherit; text-decoration: underline; }
`;

interface StaticConversionPreviewProps {
    screen?: ConversionScreen | null;
    method?: ConversionMethod | null;
    refreshKey?: number;
    onRefresh?: () => void;
    themeMode?: 'dark' | 'light'; 
    onThemeChange?: (mode: 'dark' | 'light') => void;
    orientation?: 'landscape' | 'portrait';
    onOrientationChange?: (mode: 'landscape' | 'portrait') => void;
    previewWidth?: number;
    onPreviewWidthChange?: (width: number) => void;
    previewTotalScore?: number;
    previewPointCosts?: { [key: string]: number };
    previewIsPlaying?: boolean;
    // --- Lifted State ---
    previewGateState?: 'locked' | 'unlocked';
    onPreviewGateStateChange?: (state: 'locked' | 'unlocked') => void;
    revealResetTrigger?: { instanceId?: string; timestamp: number };
}

export const StaticConversionPreview: React.FC<StaticConversionPreviewProps> = ({ 
    screen, 
    method, 
    refreshKey = 0,
    onRefresh,
    themeMode = 'dark',
    onThemeChange,
    orientation = 'landscape',
    onOrientationChange,
    previewWidth,
    onPreviewWidthChange,
    previewTotalScore,
    previewPointCosts,
    previewIsPlaying = false,
    previewGateState = 'locked',
    onPreviewGateStateChange,
    revealResetTrigger
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [showChrome, setShowChrome] = useState(false); 
    const [scale, setScale] = useState(1);
    
    // --- Local State for Interactive Preview ---
    const [isPreviewRevealed, setIsPreviewRevealed] = useState(false);
    
    // Fallback state for when a parent (like the Saved Screens Library) doesn't control the gates
    const [localGateState, setLocalGateState] = useState<'locked' | 'unlocked'>('locked');
    const [localScore, setLocalScore] = useState(0); // Fallback slider state
    const activeGateState = onPreviewGateStateChange ? previewGateState : localGateState;

    const handleGateStateChange = (state: 'locked' | 'unlocked') => {
        if (onPreviewGateStateChange) {
            onPreviewGateStateChange(state); // Use Parent (Builder)
        } else {
            setLocalGateState(state); // Use Local (Library Preview)
        }
    };

    // --- Smart Fallbacks for Standalone Modals ---
    const activeScore = previewTotalScore !== undefined ? previewTotalScore : localScore;
    
    const activePointCosts = useMemo(() => {
        if (previewPointCosts && Object.keys(previewPointCosts).length > 0) return previewPointCosts;
        
        // If no costs are passed (Standalone Modal), inject a default of 1000 for visual testing
        const mockCosts: { [key: string]: number } = {};
        screen?.methods?.forEach(m => {
            if (m.gate?.type === 'point_threshold' || m.gate?.type === 'point_purchase') {
                mockCosts[m.instanceId] = 1000;
            }
        });
        return mockCosts;
    }, [previewPointCosts, screen]);

    const hasPointGates = useMemo(() => {
        return screen?.methods?.some(m => m.gate?.type === 'point_threshold' || m.gate?.type === 'point_purchase');
    }, [screen]);

    // Reset local standalone reveal state
    useEffect(() => {
        if (revealResetTrigger?.timestamp) {
            setIsPreviewRevealed(false);
        }
    }, [revealResetTrigger]);

    useEffect(() => {
        // Reset reveal state when method changes or refresh button is clicked
        setIsPreviewRevealed(false);
    }, [method, refreshKey]);

    // Determine width:
    // 1. If Portrait, FORCE 100% (Visual override for both Screen and Method modes)
    // 2. If Screen exists, use its style
    // 3. Fallback to previewWidth (Method Builder slider)
    const activeWidth = orientation === 'portrait' 
        ? 100 
        : (screen ? (screen.style?.width || 50) : (previewWidth || 60));

    const currentSize = ORIENTATIONS[orientation];

    const gameAreaBackground = themeMode === 'dark' ? '#080817' : '#ffffff';
    const gameAreaBorder = themeMode === 'dark' ? 'none' : '1px solid #ccc';

    const barebonesStyle = {
        container: {
            backgroundColor: '#1c1e21',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            boxSizing: 'border-box' as const,
        },
        gameArea: {
            flex: 1,
            backgroundColor: gameAreaBackground, 
            color: themeMode === 'dark' ? '#ffffff' : '#000000',
            border: gameAreaBorder,
            borderRadius: '6px',
            position: 'relative' as const,
            width: '100%',
            height: '100%',
            overflow: 'hidden' as const, // Strict outer shell
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',       
            justifyContent: 'center' // Vertically centers the simulated 95% Macrogame wrapper
        }
    };

    const calculateLayout = useCallback(() => {
        if (wrapperRef.current) {
            const padding = 20; 
            const availableWidth = wrapperRef.current.offsetWidth - padding;
            const availableHeight = wrapperRef.current.offsetHeight - padding;

            const scaleX = availableWidth / currentSize.width;
            const scaleY = availableHeight / currentSize.height;
            
            const newScale = Math.min(scaleX, scaleY);
            setScale(newScale);
        }
    }, [currentSize]);

    useEffect(() => {
        const observer = new ResizeObserver(calculateLayout);
        if (wrapperRef.current) observer.observe(wrapperRef.current);
        calculateLayout();
        return () => observer.disconnect();
    }, [calculateLayout]);

    // --- Render Content Logic ---
    const renderContent = () => {
        let content = null;

        if (screen) {
            // Inject fake score and stub function for preview interactivity
            content = (
                <ConversionScreenHost 
                    key={refreshKey} // Applies reset seamlessly without breaking the outer chrome
                    screen={screen} 
                    totalScore={activeScore}
                    pointCosts={activePointCosts}
                    redeemPoints={(amount) => {
                        console.log(`Points redeemed in preview: ${amount}`);
                        // Optional: Deduct from local slider if they click purchase in the modal
                        if (previewTotalScore === undefined) setLocalScore(prev => Math.max(0, prev - amount));
                    }}
                    themeMode={themeMode}
                    contentHeight={95} // Simulate the Macrogame's default 95% safe area
                    overrideWidth={activeWidth}
                    isActive={previewIsPlaying}
                    // --- Pass our new global force unlock prop ---
                    previewGateStateOverride={activeGateState}
                    revealResetTrigger={revealResetTrigger}
                />
            );
        } else if (method) {
            const activeMethod = { ...method };
            if (activeMethod.style) {
                activeMethod.style = { ...activeMethod.style, size: 100 };
            }

            if (themeMode === 'light' && method.lightStyle) {
                activeMethod.style = { ...method.style, ...method.lightStyle };
                activeMethod.style.size = 100; 
            }

            const wrapperPadding = orientation === 'portrait' ? '1rem' : '2rem';
            const isPortrait = orientation === 'portrait';

            // --- Calculate Mask State for Standalone Preview ---
            // This logic mirrors what the Host does, but uses the method's own properties
            let maskConfig = undefined;
            let isCovered = false;
            let isCodeCovered = false;

            if (method.type === 'coupon_display' && (method as any).clickToReveal) {
                const revealScope = (method as any).revealScope;
                
                // Always create the config for visual check
                const rawMask = getMaskConfig(
                    (method as any).maskConfig,
                    (method as any).revealText || "Click to Reveal the Coupon Code", // <--- UPDATED
                    ""
                );

                if (revealScope === 'code_only') {
                    // Inner Mask: Only cover if NOT revealed locally
                    isCodeCovered = !isPreviewRevealed; 
                    maskConfig = rawMask;
                } else {
                    // Outer Mask: Only cover if NOT revealed locally
                    isCovered = !isPreviewRevealed;
                    maskConfig = rawMask;
                }
            }

            content = (
                <div style={{
                    width: '100%', 
                    height: '100%', 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                }}>
                    <style>{methodCssBlock}</style>
                    <div style={{ 
                        width: `${activeWidth}%`, 
                        // Update: Switch to Column + AlignItems Center to handle horizontal overflow centering
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center', // Centering horizontally
                        justifyContent: screen ? 'flex-start' : 'center', // Centering vertically (if not screen mode)
                        // --------------------------------------------------------------------------------------
                        padding: wrapperPadding,
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        transition: 'width 0.2s ease',
                        minHeight: '100%' 
                    }}>
                       {/* Update: width: 'auto' + minWidth: '100%' allows content to fill space BUT expand if compressed */}
                       <div style={{ width: 'auto', minWidth: '100%', display: 'flex', justifyContent: 'center' }}>
                            {/* WRAPPER: Use MethodContainer for OUTER masking */}
                            <MethodContainer
                                isCovered={isCovered}
                                maskConfig={isCovered ? maskConfig : undefined}
                                onInteraction={() => setIsPreviewRevealed(true)}
                                themeMode={themeMode}
                                parentStyle={activeMethod.style} 
                            >
                                {method.type === 'coupon_display' && (
                                    <CouponDisplay 
                                        key={`${themeMode}-${orientation}-${showChrome ? 'chrome' : 'no-chrome'}-${refreshKey}`}
                                        method={activeMethod} 
                                        onSuccess={() => {}} 
                                        isPortrait={isPortrait}
                                        // Pass Inner Mask Props
                                        isCodeCovered={isCodeCovered}
                                        maskConfig={isCodeCovered ? maskConfig : undefined}
                                        onCodeInteraction={() => setIsPreviewRevealed(true)}
                                        themeMode={themeMode} // <--- Pass theme
                                    />
                                )}
                                {method.type === 'email_capture' && <EmailCapture key={`${themeMode}-${orientation}-${showChrome ? 'chrome' : 'no-chrome'}-${refreshKey}`} method={activeMethod} onSuccess={() => {}} isPortrait={isPortrait} />}
                                {method.type === 'form_submit' && <FormSubmit key={`${themeMode}-${orientation}-${showChrome ? 'chrome' : 'no-chrome'}-${refreshKey}`} method={activeMethod} onSuccess={() => {}} isPortrait={isPortrait} />}
                                {method.type === 'link_redirect' && <LinkRedirect key={`${themeMode}-${orientation}-${showChrome ? 'chrome' : 'no-chrome'}-${refreshKey}`} method={activeMethod} onSuccess={() => {}} isPortrait={isPortrait} isActive={previewIsPlaying} />}
                                {method.type === 'social_follow' && <SocialFollow key={`${themeMode}-${orientation}-${showChrome ? 'chrome' : 'no-chrome'}-${refreshKey}`} method={activeMethod} onSuccess={() => {}} isPortrait={isPortrait} />}
                            </MethodContainer>
                        </div>
                    </div>
                </div>
            );
        } else {
             content = <div style={{ color: '#666', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Select an item to preview</div>;
        }
        
        if (showChrome) {
            return (
                <UnifiedGameChrome 
                    view="end"
                    theme={themeMode}
                    macroConfig={{ showPoints: true, showProgress: true }}
                    totalScore={150} 
                    progressText="Reward"
                >
                    {content}
                </UnifiedGameChrome>
            );
        }

        return content;
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        padding: '0.5rem 1rem', 
        backgroundColor: '#f8f9fa', 
        borderBottom: '1px solid #eee',
        marginBottom: '0.5rem',
        flexWrap: 'wrap',
    };

    const labelStyle: React.CSSProperties = {
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem', 
        fontSize: '0.85rem', 
        cursor: 'pointer', 
        color: '#555',
        fontWeight: 500
    };

    const selectStyle: React.CSSProperties = {
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        borderColor: '#ccc',
        fontSize: '0.85rem',
        cursor: 'pointer',
        backgroundColor: '#fff'
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ 
                padding: '0.75rem 1rem', 
                borderBottom: '1px solid #eee',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#ffffff' // Clean backing for the new button
            }}>
                <h5 style={{ margin: 0, color: '#333', fontSize: '1rem' }}>Conversion Screen Preview</h5>
                
                {onRefresh && (
                    <button 
                        onClick={onRefresh}
                        title="Reset Preview to test animations and gating logic"
                        style={{
                            background: '#fff',
                            border: '1px solid #ddd',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            color: '#555',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#0866ff';
                            e.currentTarget.style.borderColor = '#0866ff';
                            e.currentTarget.style.backgroundColor = '#f0f5ff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#555';
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.backgroundColor = '#fff';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 21h5v-5" />
                        </svg>
                        Reset Preview
                    </button>
                )}
            </div>

            <div style={toolbarStyle}>
                <label style={labelStyle}>
                    <input 
                        type="checkbox" 
                        checked={showChrome} 
                        onChange={(e) => setShowChrome(e.target.checked)} 
                    />
                    Macrogame Chrome
                </label>

                {screen && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #ddd', paddingLeft: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Gates:</span>
                        <select 
                            value={activeGateState}
                            onChange={(e) => handleGateStateChange(e.target.value as 'locked' | 'unlocked')}
                            style={selectStyle}
                        >
                            <option value="locked">Evaluate Locks (Default)</option>
                            <option value="unlocked">Force Unlock All</option>
                        </select>

                        {/* Standalone Point Slider (Only shows if parent doesn't provide a score AND there are point gates) */}
                        {previewTotalScore === undefined && hasPointGates && activeGateState === 'locked' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #ddd', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', width: '55px' }}>Pts: {localScore}</span>
                                <input 
                                    type="range" 
                                    min="0" max="1500" step="50" 
                                    value={localScore} 
                                    onChange={(e) => setLocalScore(Number(e.target.value))} 
                                    style={{ width: '200px', cursor: 'pointer' }} 
                                />
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: screen ? '1px solid #ddd' : 'none', paddingLeft: screen ? '1rem' : 0 }}>
                    <span style={{ fontSize: '0.85rem', color: '#666' }}>Mode:</span>
                    <select 
                        value={themeMode}
                        onChange={(e) => onThemeChange && onThemeChange(e.target.value as 'dark' | 'light')}
                        style={selectStyle}
                    >
                        <option value="dark">Dark (Default)</option>
                        <option value="light">Light</option>
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    {/* FUTURE MOBILE MACROGAME FEATURE (V2) 
                    <select 
                        value={orientation}
                        onChange={(e) => onOrientationChange && onOrientationChange(e.target.value as 'landscape' | 'portrait')}
                        style={selectStyle}
                    >
                        <option value="landscape">Landscape (16:9)</option>
                        <option value="portrait">Portrait (9:16)</option>
                    </select>
                    */}
                </div>

                {!screen && onPreviewWidthChange && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem', borderLeft: '1px solid #ddd', paddingLeft: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>
                            Width: {orientation === 'portrait' ? '(Locked)' : ''}
                        </span>
                        <input 
                            type="range" 
                            min="20" 
                            max="100" 
                            step="5"
                            // Force 100 if portrait
                            value={orientation === 'portrait' ? 100 : (previewWidth || 50)}
                            onChange={(e) => onPreviewWidthChange(Number(e.target.value))}
                            disabled={orientation === 'portrait'}
                            style={{ 
                                width: '100px', 
                                cursor: orientation === 'portrait' ? 'not-allowed' : 'pointer',
                                margin: 0, 
                                verticalAlign: 'middle',
                                opacity: orientation === 'portrait' ? 0.5 : 1
                            }}
                        />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <SmartNumberInput
                                min={0}
                                max={100}
                                fallbackValue={60}
                                value={previewWidth || 60}
                                onChange={(val) => {
                                    let num = val;
                                    if (num > 100) num = 100; // Snap to max
                                    if (num < 0) num = 0; // Snap to min
                                    onPreviewWidthChange(num);
                                }}
                                onBlur={() => {
                                    // Enforce visual floor on blur only
                                    if (previewWidth !== undefined && previewWidth < 20 && previewWidth !== 0) {
                                        onPreviewWidthChange(20);
                                    }
                                }}
                                style={{
                                    width: '100px',
                                    padding: '2px 4px',
                                    paddingRight: '2.5rem', 
                                    fontSize: '0.85rem',
                                    textAlign: 'left',      
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    backgroundColor: '#fff'
                                }}
                            />
                            <span style={{ 
                                position: 'absolute',
                                right: '25px', 
                                fontSize: '0.8rem', 
                                color: '#666', 
                                pointerEvents: 'none'
                            }}>%</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div ref={wrapperRef} style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                backgroundColor: '#e9ecef', 
                borderRadius: '8px', 
                overflow: 'hidden',
                position: 'relative',
                minHeight: '400px'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: currentSize.width,
                    height: currentSize.height,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    transformOrigin: 'center center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'width 0.3s ease, height 0.3s ease, transform 0.3s ease'
                }}>
                    <div style={barebonesStyle.container}>
                        <div style={barebonesStyle.gameArea}>
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};