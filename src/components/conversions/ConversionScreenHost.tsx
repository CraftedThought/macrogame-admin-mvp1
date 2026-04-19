/* src/components/conversions/ConversionScreenHost.tsx */

import React, { useState, useMemo } from 'react';
import { ConversionScreen, ConversionMethod, MaskConfig } from '../../types';
import { useData } from '../../hooks/useData';
import { CouponDisplay, EmailCapture, FormSubmit, LinkRedirect, SocialFollow } from './index';
import { styles } from '../../App.styles';
import 'react-quill-new/dist/quill.snow.css'; // 1. Import Quill Styles
import { MethodContainer } from './MethodContainer';
import { getMaskConfig } from '../../utils/maskUtils';

interface ConversionScreenHostProps {
  screen: ConversionScreen;
  totalScore?: number;
  pointCosts?: { [methodInstanceId: string]: number };
  redeemPoints?: (amount: number) => void; 
  themeMode?: 'dark' | 'light';
  overrideWidth?: number;
  contentHeight?: number;
  showLayoutGuides?: boolean;
  hasProgressTracker?: boolean;
  hasProgressLabels?: boolean;
  isActive?: boolean;
  playEventAudio?: (eventName: string) => boolean;
  playClickAudio?: (buttonType?: 'primary' | 'secondary') => void;
  playScreenTransitionAudio?: () => void;
  playTimerTickAudio?: () => void;
  playTimerGoAudio?: () => void;
}

export const ConversionScreenHost: React.FC<ConversionScreenHostProps> = ({ screen, totalScore = 0, pointCosts = {}, redeemPoints, themeMode = 'dark', overrideWidth, contentHeight, showLayoutGuides = false, hasProgressTracker = false, hasProgressLabels = false, isActive = true, playEventAudio, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio }) => {
  const { allConversionMethods } = useData();
  const [completedMethodIds, setCompletedMethodIds] = useState<Set<string>>(new Set());

  const handleMethodSuccess = (instanceId: string) => {
    setCompletedMethodIds(prev => new Set(prev).add(instanceId));
  };

  const processedMethods = useMemo(() => {
    return (screen.methods || [])
      .map(screenMethod => {
        const methodData = (screenMethod as any).data || allConversionMethods.find(m => m.id === screenMethod.methodId);
        if (!methodData) return null; 

        const gate = screenMethod.gate;
        let isLocked = false;
        let pointCost: number | undefined = undefined;

        if (!completedMethodIds.has(screenMethod.instanceId)) {
            if (gate) {
                // 1. Success Gate
                if (gate.type === 'on_success') {
                    // If no prerequisite is selected yet (empty string), default to LOCKED (true)
                    // Otherwise, check if the prerequisite is completed.
                    isLocked = gate.methodInstanceId 
                        ? !completedMethodIds.has(gate.methodInstanceId)
                        : true; 
                } 
                // 2. Point Gates
                      else if (gate.type === 'point_purchase') {
                          pointCost = pointCosts[screenMethod.instanceId] || 0;
                          // A purchase gate is ALWAYS locked until the user explicitly buys it.
                          // (Once purchased, it gets added to completedMethodIds and bypasses this block entirely).
                          isLocked = true;
                      }
                      else if (gate.type === 'point_threshold') {
                          pointCost = pointCosts[screenMethod.instanceId] || 0;
                          // A threshold gate automatically unlocks once the score is met.
                          // If cost is 0 (Builder default), force lock for preview to show the mask.
                          isLocked = pointCost > 0 ? totalScore < pointCost : true;
                      }
            }
        }
        
        return { ...screenMethod, data: methodData, isLocked, pointCost };
      })
      .filter((method): method is NonNullable<typeof method> => !!method); 
  }, [screen.methods, allConversionMethods, completedMethodIds, totalScore, pointCosts]);

  const spacing = screen.style?.spacing !== undefined ? screen.style.spacing : 20;

  // 2. CSS Block from LinkRedirect (Handles lists, padding resets, font sizes)
  const cssBlock = `
    /* Force reset padding and margins for Quill editor */
    .link-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.5;
        color: inherit;
        text-align: left; /* Default to left to match editor; specific alignment classes will override */
        font-size: 1.25rem; /* Match the global builder 20px default */
    }
    
    /* Target all children to ensure no margins leak */
    .link-content-wrapper.ql-editor > * {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }

    /* Standard Quill Resets */
    .link-content-wrapper.ql-editor h1,
    .link-content-wrapper.ql-editor h2,
    .link-content-wrapper.ql-editor h3,
    .link-content-wrapper.ql-editor h4,
    .link-content-wrapper.ql-editor p { 
        margin: 0; 
        padding: 0; 
    }
    .link-content-wrapper.ql-editor h1, .link-content-wrapper.ql-editor h2, .link-content-wrapper.ql-editor h3 { line-height: 1.1; }
    .link-content-wrapper.ql-editor h4 { font-size: 0.75em; font-weight: normal; }
    
    /* List Handling - Critical for Live Preview */
    .link-content-wrapper.ql-editor ul, .link-content-wrapper.ql-editor ol { 
        padding-left: 0 !important; 
        margin-left: 0 !important; 
        list-style-position: inside !important;
        text-align: left; /* Lists usually look best left-aligned even on centered screens */
        display: inline-block; /* Allows list to sit inside centered container nicely */
        width: 100%;
    }
    .link-content-wrapper.ql-editor li { padding: 0 !important; margin: 0 !important; }
    
    /* Font Sizes */
    .link-content-wrapper.ql-editor .ql-size-10px { font-size: 10px; }
    .link-content-wrapper.ql-editor .ql-size-12px { font-size: 12px; }
    .link-content-wrapper.ql-editor .ql-size-14px { font-size: 14px; }
    .link-content-wrapper.ql-editor .ql-size-16px { font-size: 16px; }
    .link-content-wrapper.ql-editor .ql-size-18px { font-size: 18px; }
    .link-content-wrapper.ql-editor .ql-size-24px { font-size: 24px; }
    .link-content-wrapper.ql-editor .ql-size-32px { font-size: 32px; }
    .link-content-wrapper.ql-editor .ql-size-48px { font-size: 48px; }
    
    /* Links */
    .link-content-wrapper.ql-editor a { color: inherit; text-decoration: underline; }
  `;

  // --- Helper: Safe Width Calculation ---
  let safeWidth = 60; // Default fallback
  
  if (overrideWidth !== undefined) {
      safeWidth = overrideWidth;
  } else if (screen.style?.width !== undefined && screen.style?.width !== '') {
      safeWidth = Number(screen.style.width);
  }
  
  // Apply Visual Floor: If user types < 20, visual stays at 20 to prevent breakage
  // (Unless it's 0 because they want to hide it, but usually 20 is a safe min for layout)
  if (safeWidth < 20) safeWidth = 20;

  // --- Helper: Safe Spacing Calculation ---
  const safeSpacing = screen.style?.spacing !== undefined 
      ? (screen.style.spacing === '' ? 0 : Number(screen.style.spacing)) 
      : 20;
  const screenTextSpacing = screen.style?.textSpacing !== undefined ? Number(screen.style.textSpacing) : 10;
  const screenMethodSpacing = screen.style?.methodSpacing !== undefined ? Number(screen.style.methodSpacing) : 20;
      
  const vAlign = screen.style?.verticalAlign || 'center';

  const globalGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px solid rgba(255, 0, 0, 0.8)', outlineOffset: '-2px' } : {};
  const structGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dashed rgba(255, 0, 0, 0.5)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 0, 0, 0.05)', boxSizing: 'border-box' } : {};
  const contentGuideStyle: React.CSSProperties = showLayoutGuides ? { outline: '2px dotted rgba(255, 193, 7, 0.9)', outlineOffset: '-2px', backgroundColor: 'rgba(255, 193, 7, 0.15)', boxSizing: 'border-box' } : {};

  // --- Logic: Identify methods that should be hidden because they were "replaced" ---
  // A method is hidden if:
  // 1. It is a prerequisite for another method (Method B)
  // 2. Method B has 'replacePrerequisite' = true
  // 3. Method A (the prerequisite) is COMPLETE (otherwise we still need to see it to do it)
  // 4. Method B is NOT complete yet (optional: usually we keep B visible and A hidden once swap happens)
  
  const replacedMethodIds = new Set<string>();
  
  processedMethods.forEach(m => {
      if (m.gate?.type === 'on_success' && m.gate.replacePrerequisite && m.gate.methodInstanceId) {
          // Check if the prerequisite is actually complete
          if (completedMethodIds.has(m.gate.methodInstanceId)) {
              replacedMethodIds.add(m.gate.methodInstanceId);
          }
      }
  });

  return (
    <div className="macrogame-conversion-screen" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center', // <--- This perfectly centers the 95% safe area
      boxSizing: 'border-box',
      textAlign: 'center',
      // --- THEME OVERRIDES ---
      color: themeMode === 'light' ? '#333333' : '#ffffff',
      backgroundColor: themeMode === 'light' ? '#ffffff' : 'transparent',
      ...(screen.backgroundImageUrl && { backgroundImage: `url(${screen.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }),
    }}>
      {/* Inject Styles */}
      <style>{cssBlock}</style>

      {/* STRICT HEIGHT WRAPPER */}
      <div style={{ 
          width: '100%', 
          height: contentHeight ? `${contentHeight}%` : '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          boxSizing: 'border-box'
      }}>
          {/* SAFE AREA (Red Box) */}
          <div style={{ 
              width: `${safeWidth}%`, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              boxSizing: 'border-box',
              ...globalGuideStyle 
          }}>
              {/* INNER WRAPPER (Padding removed to inherit Macrogame Global Layout) */}
              <div style={{
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                  minHeight: 0
              }}>
                  {/* CONTENT CENTERING WRAPPER */}
                  <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '100%',
                      minHeight: 0,
                      ...contentGuideStyle
                  }}>
                      
                      {/* Top Spacer / Progress Buffer Logic */}
                      {(vAlign === 'center' || vAlign === 'bottom') ? (
                          <div style={{ flex: '1 1 auto', minHeight: hasProgressTracker ? (hasProgressLabels ? 72 : 48) : 0 }}></div>
                      ) : (
                          <div style={{ flex: '0 0 auto', height: hasProgressTracker ? (hasProgressLabels ? 72 : 48) : 0 }}></div>
                      )}

                      {/* TOP LAYER (TEXT) */}
                      <div className="custom-scrollbar" style={{
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          width: '100%', 
                          flex: '0 1 auto', 
                          overflowY: 'auto', 
                          overflowX: 'hidden', 
                          minHeight: 0,
                          paddingRight: '4px'
                      }}>
                          {(screen.headline || screen.bodyText) && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${screenTextSpacing}px`, width: '100%', flexShrink: 0 }}>
                                  {screen.headline && (
                                      <div className="link-content-wrapper ql-editor" style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: screen.headline }} />
                                  )}
                                  {screen.bodyText && (
                                      <div className="link-content-wrapper ql-editor" style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: screen.bodyText }} />
                                  )}
                              </div>
                          )}
                      </div>

                      {/* Gap between text group and methods list */}
                      <div style={{ flexShrink: 0, height: `${screenMethodSpacing}px` }} />

                      {/* BOTTOM LAYER (METHODS) */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${safeSpacing}px`, flexShrink: 0, ...structGuideStyle }}>
                          {processedMethods.map((method, index) => {
                                  const key = method.instanceId || index;

                                  // --- 0. Hide if Replaced ---
                                  if (replacedMethodIds.has(method.instanceId)) {
                                      return null;
                                  }

                                  // --- 1. DETERMINE MASK STATE ---
                                  let isCovered = false;
                                  let isCodeCovered = false; 
                                  let maskConfig: MaskConfig | undefined = undefined;
                                  let onInteraction: (() => void) | undefined = undefined;
                                  let actionSlot: React.ReactNode = undefined;

                                  // Case A: Locked by Gate
                                  if (method.isLocked) {
                                      // Point Purchase
                                      if (method.gate?.type === 'point_purchase') {
                                          const cost = method.pointCost || 0;
                                          const canAfford = cost > 0 ? totalScore >= cost : true;
                                          
                                          maskConfig = getMaskConfig(
                                              method.gate.maskConfig,
                                              "Use your points to purchase this reward!",
                                              `Spend ${cost} points.`
                                          );
                                          isCovered = true;

                                          const buttonLabel = cost > 0 
                                              ? (canAfford ? `Buy for ${cost} Points` : `Need ${cost - totalScore} more`) 
                                              : `Purchase (Test)`;
                                          
                                          const activeMaskStyle = (themeMode === 'light' && maskConfig?.lightStyle) ? maskConfig.lightStyle : maskConfig?.style;
                                          const btnBg = activeMaskStyle?.buttonColor || (canAfford ? '#2ecc71' : '#555');
                                          const btnText = activeMaskStyle?.buttonTextColor || 'white';

                                          actionSlot = (
                                              <button 
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      if (canAfford) {
                                                          redeemPoints?.(cost);
                                                          handleMethodSuccess(method.instanceId);
                                                          const played = playEventAudio ? playEventAudio('pointPurchaseSuccess') : false;
                                                          if (!played && playClickAudio) playClickAudio('primary');
                                                      } else {
                                                          const played = playEventAudio ? playEventAudio('pointPurchaseFailure') : false;
                                                          if (!played && playClickAudio) playClickAudio('primary');
                                                      }
                                                  }}
                                                  // We intentionally do not 'disable' the button so it can still be clicked to trigger the Failure sound
                                                  style={{
                                                      padding: '0.6rem 1.2rem',
                                                      backgroundColor: btnBg, 
                                                      color: btnText,         
                                                      border: 'none',
                                                      borderRadius: '6px',
                                                      cursor: canAfford ? 'pointer' : 'pointer',
                                                      fontWeight: 'bold',
                                                      marginTop: '0.5rem',
                                                      opacity: canAfford ? 1 : 0.7
                                                  }}
                                              >
                                                  {buttonLabel}
                                              </button>
                                          );
                                      }
                                      // Point Threshold
                                      else if (method.gate?.type === 'point_threshold') {
                                          const req = method.pointCost || 0;
                                          maskConfig = getMaskConfig(
                                              method.gate.maskConfig,
                                              "Earn enough points to unlock this reward!",
                                              `Earn ${Math.max(0, req - totalScore)} more points!`
                                          );
                                          isCovered = true;

                                          const progress = Math.min(100, Math.max(0, (totalScore / req) * 100));
                                          const activeMaskStyle = (themeMode === 'light' && maskConfig?.lightStyle) ? maskConfig.lightStyle : maskConfig?.style;
                                          const barBg = activeMaskStyle?.progressBackgroundColor || 'rgba(255,255,255,0.2)';
                                          const barFill = activeMaskStyle?.progressBarColor || '#f1c40f';
                                          const showLabel = (maskConfig as any)?.showPointLabel;

                                          actionSlot = (
                                              <div style={{ width: '100%', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                  <div style={{ width: '100%', height: '8px', backgroundColor: barBg, borderRadius: '4px', overflow: 'hidden' }}>
                                                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barFill, transition: 'width 0.5s ease' }} />
                                                  </div>
                                                  {showLabel && (
                                                      <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                                          {totalScore} / {req} Points
                                                      </span>
                                                  )}
                                              </div>
                                          );
                                      }
                                      // On Success (Prerequisite)
                                      else if (method.gate?.type === 'on_success') {
                                          const visibility = (method.gate as any).visibility || 'hidden';
                                          if (visibility === 'locked_mask') {
                                              maskConfig = getMaskConfig(
                                                  method.gate.maskConfig,
                                                  "LOCKED", 
                                                  "Complete the prior steps to unlock this reward!"
                                              );
                                              isCovered = true;
                                          } else {
                                              return null;
                                          }
                                      }
                                  } 
                                  // Case B: Coupon Click to Reveal
                                  else if (method.data.type === 'coupon_display' && (method.data as any).clickToReveal) {
                                      const isRevealed = completedMethodIds.has(method.instanceId);
                                      if (!isRevealed) {
                                          const revealScope = (method.data as any).revealScope;
                                          const rawMask = getMaskConfig(
                                              (method.data as any).maskConfig,
                                              (method.data as any).revealText || "Click to Reveal the Coupon Code",
                                              ""
                                          );

                                          if (revealScope === 'code_only') {
                                              isCodeCovered = true;
                                              maskConfig = rawMask;
                                          } else {
                                              isCovered = true;
                                              maskConfig = rawMask;
                                              onInteraction = () => {
                                                  handleMethodSuccess(method.instanceId);
                                                  const played = playEventAudio ? playEventAudio('couponReveal') : false;
                                                  if (!played && playClickAudio) playClickAudio('primary');
                                              };
                                          }
                                      }
                                  }

                                  // --- 2. RENDER CONTENT ---
                                  const methodProps: any = {
                                      ...method.data,
                                      style: { ...method.data.style, size: 100 }
                                  };

                                  const maskThemeMode = themeMode;
                                  let contentComponent = null;
                                  const handleSuccess = () => handleMethodSuccess(method.instanceId);

                                  switch (method.data.type) {
                                      case 'coupon_display': 
                                          contentComponent = (
                                              <CouponDisplay 
                                                  method={methodProps} 
                                                  onSuccess={handleSuccess} 
                                                  isCodeCovered={isCodeCovered}
                                                  maskConfig={isCodeCovered ? maskConfig : undefined} 
                                                  onCodeInteraction={() => {
                                                      handleSuccess();
                                                      const played = playEventAudio ? playEventAudio('couponReveal') : false;
                                                      if (!played && playClickAudio) playClickAudio('primary');
                                                  }}
                                                  themeMode={maskThemeMode}
                                              />
                                          ); 
                                          break;
                                      case 'email_capture': 
                                          contentComponent = <EmailCapture 
                                              method={methodProps} 
                                              onSuccess={() => { 
                                                  handleSuccess(); 
                                                  const played = playEventAudio ? playEventAudio('formSuccess') : false;
                                                  if (!played && playClickAudio) playClickAudio('primary');
                                              }} 
                                              onError={() => { 
                                                  const played = playEventAudio ? playEventAudio('formError') : false;
                                                  if (!played && playClickAudio) playClickAudio('primary');
                                              }}
                                              themeMode={maskThemeMode} 
                                          />; 
                                          break;
                                      case 'form_submit': 
                                          contentComponent = <FormSubmit 
                                              method={methodProps} 
                                              onSuccess={() => { 
                                                  handleSuccess(); 
                                                  const played = playEventAudio ? playEventAudio('formSuccess') : false;
                                                  if (!played && playClickAudio) playClickAudio('primary');
                                              }} 
                                              onError={() => { 
                                                  const played = playEventAudio ? playEventAudio('formError') : false;
                                                  if (!played && playClickAudio) playClickAudio('primary');
                                              }}
                                              themeMode={maskThemeMode} 
                                          />; 
                                          break;
                                      case 'link_redirect': 
                                          contentComponent = <LinkRedirect 
                                              method={methodProps} 
                                              onSuccess={handleSuccess} 
                                              themeMode={maskThemeMode} 
                                              isActive={isActive}
                                              playClickAudio={playClickAudio}
                                              playScreenTransitionAudio={playScreenTransitionAudio}
                                              playTimerTickAudio={playTimerTickAudio}
                                              playTimerGoAudio={playTimerGoAudio}
                                          />; 
                                          break;
                                      case 'social_follow': 
                                          contentComponent = <SocialFollow 
                                              method={methodProps} 
                                              onSuccess={() => { 
                                                  handleSuccess(); 
                                                  if (playClickAudio) playClickAudio('primary');
                                              }} 
                                              themeMode={maskThemeMode} 
                                          />; 
                                          break;
                                      default: contentComponent = null;
                                  }

                                  if (!contentComponent) return null;

                                  const contentAbove = method.contentAbove ? (
                                      <div className="link-content-wrapper ql-editor" style={{ marginBottom: '1rem', width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: method.contentAbove }} />
                                  ) : null;

                                  const contentBelow = method.contentBelow ? (
                                      <div className="link-content-wrapper ql-editor" style={{ marginTop: '1rem', width: '100%', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: method.contentBelow }} />
                                  ) : null;

                                  const activeStyle = (themeMode === 'light' && method.data.lightStyle) ? method.data.lightStyle : (method.data.style || {});

                                  return (
                                      <div key={key} style={{ width: '100%', flexShrink: 0 }}>
                                          {contentAbove}
                                          <MethodContainer
                                              isCovered={isCovered}
                                              maskConfig={isCovered ? maskConfig : undefined} 
                                              onInteraction={onInteraction}
                                              actionSlot={actionSlot}
                                              themeMode={themeMode}
                                              parentStyle={activeStyle}
                                          >
                                              {contentComponent}
                                          </MethodContainer>
                                          {contentBelow}
                                      </div>
                                  );
                              })}
                          </div>

                      {/* Bottom Spacer */}
                      {(vAlign === 'center' || vAlign === 'top') && (
                          <div style={{ flex: '1 1 auto', minHeight: 0 }}></div>
                      )}

                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};