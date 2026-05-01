/* src/components/conversions/ConversionScreenHost.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import { ConversionScreen, ConversionMethod, MaskConfig } from '../../types';
import { useData } from '../../hooks/useData';
import { CouponDisplay, EmailCapture, FormSubmit, LinkRedirect, SocialFollow } from './index';
import { styles } from '../../App.styles';
import 'react-quill-new/dist/quill.snow.css'; // 1. Import Quill Styles
import { MethodContainer } from './MethodContainer';
import { getMaskConfig } from '../../utils/maskUtils';
import { TransitionRenderer } from '../builders/macrogame/TransitionRenderer';

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
  triggerResolutionReplay?: (keepPoints: boolean, targetIndex: number) => void;
  hotSwapConversionScreen?: (fallbackScreenId: string) => void;
  previewGateStateOverride?: 'locked' | 'unlocked';
  revealResetTrigger?: { instanceId?: string; timestamp: number };
}

export const ConversionScreenHost: React.FC<ConversionScreenHostProps> = ({ screen, totalScore = 0, pointCosts = {}, redeemPoints, themeMode = 'dark', overrideWidth, contentHeight, showLayoutGuides = false, hasProgressTracker = false, hasProgressLabels = false, isActive = true, playEventAudio, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio, triggerResolutionReplay, hotSwapConversionScreen, previewGateStateOverride, revealResetTrigger }) => {
  const { allConversionMethods } = useData();
  const [completedMethodIds, setCompletedMethodIds] = useState<Set<string>>(new Set());

  // --- Listen for selective Reveal Resets from the Builder ---
  useEffect(() => {
      if (revealResetTrigger?.timestamp) {
          if (revealResetTrigger.instanceId) {
              setCompletedMethodIds(prev => {
                  const next = new Set(prev);
                  next.delete(revealResetTrigger.instanceId!); // Relock only this specific method
                  return next;
              });
          } else {
              // Global reset from the Macrogame header
              setCompletedMethodIds(new Set()); 
          }
      }
  }, [revealResetTrigger]);

  const handleMethodSuccess = (instanceId: string) => {
    setCompletedMethodIds(prev => new Set(prev).add(instanceId));
  };

  // --- Global Override Injection (Memoized to prevent infinite renders) ---
  // If the preview tool forces an unlock, we simulate that ALL methods are completed.
  const effectiveCompletedIds = useMemo(() => {
      return previewGateStateOverride === 'unlocked' 
          ? new Set((screen.methods || []).map(m => m.instanceId)) 
          : completedMethodIds;
  }, [previewGateStateOverride, completedMethodIds, screen.methods]);

  const processedMethods = useMemo(() => {
    return (screen.methods || [])
      .map(screenMethod => {
        const methodData = (screenMethod as any).data || allConversionMethods.find(m => m.id === screenMethod.methodId);
        if (!methodData) return null; 

        const gate = screenMethod.gate;
        let isLocked = false;
        let pointCost: number | undefined = undefined;

        // Force unlock globally if preview tool requires it
        if (previewGateStateOverride === 'unlocked') {
            isLocked = false;
        } else if (!effectiveCompletedIds.has(screenMethod.instanceId)) {
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
  // Added effectiveCompletedIds and previewGateStateOverride to dependencies
  }, [screen.methods, allConversionMethods, effectiveCompletedIds, totalScore, pointCosts, previewGateStateOverride]);

  // --- Helper to render Resolution Routing Buttons ---
  const renderResolutionButtons = (resolutionConfig: any) => {
      if (!resolutionConfig) return null;
      const { isPlayAgainEnabled, isContinueEnabled, playAgainBehavior, playAgainTargetIndex, routeTargetId, transition, secondaryButtonConfig, secondaryButtonStyle, lightSecondaryButtonStyle } = resolutionConfig;

      if (!isPlayAgainEnabled && !isContinueEnabled) return null;

      let slot1Action: () => void;
      let slot1Text: string;
      let slot2Action: (() => void) | undefined = undefined;
      let slot2Text: string | undefined = undefined;
      let slot2Struct = secondaryButtonConfig || {};
      let slot2Style = themeMode === 'light' ? (lightSecondaryButtonStyle || {}) : (secondaryButtonStyle || {});

      // Logic: Dynamically assign Primary/Secondary based on toggles
      if (isPlayAgainEnabled) {
          slot1Action = () => triggerResolutionReplay?.(playAgainBehavior === 'keep_points', playAgainTargetIndex || 0);
          slot1Text = transition?.buttonConfig?.text || 'Play Again';

          if (isContinueEnabled) {
              slot2Action = () => { if (routeTargetId) hotSwapConversionScreen?.(routeTargetId); };
              slot2Text = secondaryButtonConfig?.text || 'Continue';
          }
      } else if (isContinueEnabled) {
          slot1Action = () => { if (routeTargetId) hotSwapConversionScreen?.(routeTargetId); };
          slot1Text = transition?.buttonConfig?.text || 'Continue';
      } else {
          return null; // Safety catch
      }

      const sBorder = (slot2Struct.strokeStyle && slot2Struct.strokeStyle !== 'none') 
          ? `${slot2Struct.strokeWidth === '' ? 0 : (slot2Struct.strokeWidth ?? 2)}px ${slot2Struct.strokeStyle} ${slot2Style.strokeColor || '#ffffff'}` 
          : 'none';

      return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1.25rem', alignItems: 'center' }}>
              <TransitionRenderer 
                  transition={transition} 
                  onAdvance={slot1Action!} 
                  isActive={isActive} 
                  showLayoutGuides={showLayoutGuides} 
                  theme={themeMode}
                  defaultButtonText={slot1Text!}
              />
              {slot2Action && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); slot2Action!(); }}
                      style={{
                          width: slot2Struct.widthMode === 'max' ? '100%' : (slot2Struct.widthMode === 'custom' ? `${slot2Struct.customWidth === '' ? 0 : (slot2Struct.customWidth ?? 100)}%` : 'auto'),
                          padding: `${slot2Struct.paddingVertical === '' ? 0 : (slot2Struct.paddingVertical ?? 12)}px ${slot2Struct.paddingHorizontal === '' ? 0 : (slot2Struct.paddingHorizontal ?? 32)}px`, 
                          fontSize: '1rem', fontWeight: 'bold',
                          backgroundColor: slot2Style.backgroundColor || 'transparent', 
                          color: slot2Style.textColor || '#ffffff', 
                          border: sBorder, 
                          borderRadius: `${slot2Struct.borderRadius === '' ? 0 : (slot2Struct.borderRadius ?? 6)}px`,
                          cursor: 'pointer',
                          transition: (slot2Struct.enableHoverAnimation !== false) ? 'transform 0.1s' : 'none'
                      }}
                      onMouseEnter={(e) => { if (slot2Struct.enableHoverAnimation !== false) e.currentTarget.style.transform = 'scale(1.05)' }}
                      onMouseLeave={(e) => { if (slot2Struct.enableHoverAnimation !== false) e.currentTarget.style.transform = 'scale(1)' }}
                  >
                      {slot2Text}
                  </button>
              )}
          </div>
      );
  };

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
        padding-left: 1.5em !important; 
        margin-left: 0 !important; 
        list-style-position: outside !important; 
        text-align: left; 
        display: inline-block; 
        width: 100%;
        box-sizing: border-box;
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
  const replacedMethodIds = new Set<string>();
  
  processedMethods.forEach(m => {
      // Securely parse the boolean intent to prevent string truthiness bugs ('"false"' == true)
      const isReplace = m.gate?.replacePrerequisite === true || String(m.gate?.replacePrerequisite) === 'true';
      
      if (m.gate?.type === 'on_success' && isReplace && m.gate.methodInstanceId) {
          // Check if the prerequisite is actually complete
          if (effectiveCompletedIds.has(m.gate.methodInstanceId)) {
              replacedMethodIds.add(m.gate.methodInstanceId);
          }
      }
  });

  // --- Smart Spacers to prevent Flexbox "center" from pushing content off the top ---
  const progressBuffer = hasProgressTracker ? (hasProgressLabels ? 72 : 48) : 0;
  const topSpacer = (vAlign === 'center' || vAlign === 'bottom') ? <div style={{ flex: '1 1 auto', minHeight: progressBuffer }}></div> : null;
  const bottomSpacer = (vAlign === 'center' || vAlign === 'top') ? <div style={{ flex: '1 1 auto', minHeight: 0 }}></div> : null;

  return (
    <div className="macrogame-conversion-screen" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
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
          {/* SAFE AREA (Width constraints) */}
          <div style={{ 
              width: `${safeWidth}%`, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              boxSizing: 'border-box',
              ...globalGuideStyle 
          }}>
              
              {/* SCROLLABLE INNER CONTAINER */}
              {/* Note: We explicitly DO NOT use justifyContent here. Spacers handle the centering. */}
              <div className="custom-scrollbar" style={{
                  width: '100%',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  minHeight: 0 // CRITICAL for nested Flexbox scrolling
              }}>
                  {topSpacer}

                  {/* CONTENT WRAPPER */}
                  <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      width: '100%', 
                      alignItems: 'center', 
                      flex: '0 0 auto', // Allows content to dictate height 
                      padding: '2px 0',
                      ...contentGuideStyle
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
                                          
                                          // 1. Resolve Dynamic Content based on Affordability
                                          const rawMaskHeadline = canAfford ? method.gate.maskConfig?.headline : (method.gate.maskConfig?.unaffordableHeadline || "LOCKED");
                                          const rawMaskBody = canAfford ? method.gate.maskConfig?.body : (method.gate.maskConfig?.unaffordableBody || "");
                                          const rawMaskIcon = canAfford ? method.gate.maskConfig?.showIcon : (method.gate.maskConfig?.unaffordableShowIcon ?? true);

                                          // 2. Clone the mask config and overwrite the visual text dynamically
                                          const dynamicMaskConfig = {
                                              ...method.gate.maskConfig,
                                              headline: rawMaskHeadline,
                                              body: rawMaskBody,
                                              showIcon: rawMaskIcon
                                          };

                                          maskConfig = getMaskConfig(
                                              dynamicMaskConfig as any,
                                              canAfford ? "Use your points to purchase this reward!" : "Keep Playing!",
                                              canAfford ? `Spend ${cost} points.` : "You don't have enough points yet."
                                          );
                                          isCovered = true;

                                          if (canAfford) {
                                              const customBtnText = method.gate.maskConfig?.purchaseButtonText || "Buy for {{cost}} Points";
                                              const buttonLabel = cost > 0 ? customBtnText.replace(/\{\{cost\}\}/g, String(cost)) : `Purchase (Test)`;
                                              const activeMaskStyle = (themeMode === 'light' && maskConfig?.lightStyle) ? maskConfig.lightStyle : maskConfig?.style;
                                              const btnBg = activeMaskStyle?.buttonColor || '#2ecc71';
                                              const btnText = activeMaskStyle?.buttonTextColor || 'white';
                                              const labelColor = activeMaskStyle?.pointLabelColor || (themeMode === 'light' ? '#000000' : '#ffffff');

                                              actionSlot = (
                                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                                      {method.gate.maskConfig?.showPointLabel && (
                                                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: labelColor, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                                                              {totalScore} / {cost} Points
                                                          </div>
                                                      )}
                                                      <button 
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              redeemPoints?.(cost);
                                                              handleMethodSuccess(method.instanceId);
                                                              const played = playEventAudio ? playEventAudio('pointPurchaseSuccess') : false;
                                                              if (!played && playClickAudio) playClickAudio('primary');
                                                          }}
                                                          style={{
                                                              padding: '0.6rem 1.2rem',
                                                              backgroundColor: btnBg, 
                                                              color: btnText,         
                                                              border: 'none',
                                                              borderRadius: '6px',
                                                              cursor: 'pointer',
                                                              fontWeight: 'bold',
                                                              marginTop: 0
                                                          }}
                                                      >
                                                          {buttonLabel}
                                                      </button>
                                                  </div>
                                              );
                                          } else {
                                              // Insufficient points: Try to render Resolution Routing Buttons
                                              const routingButtons = renderResolutionButtons(method.gate.resolutionConfig);
                                              const activeMaskStyle = (themeMode === 'light' && maskConfig?.lightStyle) ? maskConfig.lightStyle : maskConfig?.style;
                                              const labelColor = activeMaskStyle?.pointLabelColor || (themeMode === 'light' ? '#000000' : '#ffffff');

                                              actionSlot = (
                                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                                      {method.gate.maskConfig?.showPointLabel && (
                                                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: labelColor, marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                                                              {totalScore} / {cost} Points
                                                          </div>
                                                      )}
                                                      {routingButtons || (
                                                          <button 
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  const played = playEventAudio ? playEventAudio('pointPurchaseFailure') : false;
                                                                  if (!played && playClickAudio) playClickAudio('primary');
                                                              }}
                                                              style={{
                                                                  padding: '0.6rem 1.2rem',
                                                                  backgroundColor: activeMaskStyle?.buttonColor || '#555', 
                                                                  color: activeMaskStyle?.buttonTextColor || 'white',         
                                                                  border: 'none',
                                                                  borderRadius: '6px',
                                                                  cursor: 'pointer',
                                                                  fontWeight: 'bold',
                                                                  marginTop: 0,
                                                                  opacity: 0.7
                                                              }}
                                                          >
                                                              Need {cost - totalScore} more
                                                          </button>
                                                      )}
                                                  </div>
                                              );
                                          }
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

                                          // Fetch our newly separated Point Label color
                                          const labelColor = activeMaskStyle?.pointLabelColor || (themeMode === 'light' ? '#000000' : '#ffffff');

                                          actionSlot = (
                                              <div style={{ width: '100%', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                  <div style={{ width: '100%', height: '8px', backgroundColor: barBg, borderRadius: '4px', overflow: 'hidden' }}>
                                                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barFill, transition: 'width 0.5s ease' }} />
                                                  </div>
                                                  {showLabel && (
                                                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: labelColor, letterSpacing: '0.5px' }}>
                                                          {totalScore} / {req} Points
                                                      </span>
                                                  )}
                                                  {/* INJECT RESOLUTION ROUTING BUTTONS */}
                                                  {renderResolutionButtons(method.gate.resolutionConfig)}
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
                                      // CRITICAL FIX: Use 'completedMethodIds' strictly instead of 'effectiveCompletedIds'
                                      // so "Force Unlock All" does not bypass the visual coupon reveal interaction.
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

                                  const activeStyle = themeMode === 'light' 
                                      ? { ...(method.data.style || {}), ...(method.data.lightStyle || {}) } 
                                      : (method.data.style || {});

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
                  </div>

                  {bottomSpacer}

              </div>
          </div>
      </div>
    </div>
  );
};