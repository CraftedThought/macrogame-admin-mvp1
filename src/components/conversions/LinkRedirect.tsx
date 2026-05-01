/* src/components/conversions/LinkRedirect.tsx */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LinkRedirectMethod } from '../../types';
import { styles } from '../../App.styles';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill Styles

interface LinkRedirectProps {
  method: LinkRedirectMethod;
  onSuccess: () => void;
  isPortrait?: boolean; 
  themeMode?: 'dark' | 'light';
  isActive?: boolean;
  playClickAudio?: (buttonType?: 'primary' | 'secondary') => void;
  playScreenTransitionAudio?: () => void;
  playTimerTickAudio?: () => void;
  playTimerGoAudio?: () => void;
}

export const LinkRedirect: React.FC<LinkRedirectProps> = ({ method, onSuccess, isPortrait = false, themeMode = 'dark', isActive = true, playClickAudio, playScreenTransitionAudio, playTimerTickAudio, playTimerGoAudio }) => {
  const m = method as any;
  const t = m.transition || {};
  
  const type = t.type || 'interact';
  const isAuto = type === 'auto';
  const interactionMethod = t.interactionMethod || 'click';
  const clickFormat = t.clickFormat || 'disclaimer';
  const isButton = !isAuto && interactionMethod === 'click' && clickFormat === 'button';
  const isDisclaimer = !isAuto && !isButton;
  
  const [timeLeft, setTimeLeft] = useState(t.autoDuration ?? 5);
  const hasTriggeredRef = useRef(false);
  const methodRef = useRef<HTMLDivElement>(null); // Reference to this component in the DOM

  const activeStyle = themeMode === 'light' ? { ...m.style, ...(m.lightStyle || {}) } : m.style;

  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const textSpacing = safeVal(activeStyle?.textSpacing, 10);
  const methodSpacing = safeVal(activeStyle?.methodSpacing, 20);
  
  const widthPercent = typeof activeStyle?.size === 'number' ? activeStyle.size : 50;
  const finalWidth = isPortrait ? '100%' : `${widthPercent}%`;
  
  const btnConfig = t.buttonConfig || {};
  const btnTheme = themeMode === 'light' && t.lightButtonStyle ? t.lightButtonStyle : (t.buttonStyle || {});
  
  const btnBg = btnTheme.backgroundColor || '#1532c1';
  const btnText = btnTheme.textColor || '#ffffff';
  const btnStrokeStyle = btnTheme.strokeStyle || 'none';
  const btnStrokeWidth = btnConfig.strokeWidth || 0;
  const btnStrokeColor = btnTheme.strokeColor || btnBg;
  const btnRadius = btnConfig.borderRadius ?? 6;
  const btnPadV = btnConfig.paddingVertical ?? 12;
  const btnPadH = btnConfig.paddingHorizontal ?? 32;
  const btnWidthMode = btnConfig.widthMode || 'max';
  const btnCustomWidth = btnConfig.customWidth ?? 50;
  const hoverAnim = btnConfig.enableHoverAnimation !== false;

  let finalBtnWidth = '100%';
  if (btnWidthMode === 'wrap') finalBtnWidth = 'auto';
  else if (btnWidthMode === 'custom') finalBtnWidth = `${btnCustomWidth}%`;

  const countdownColor = themeMode === 'light' ? '#333333' : '#ffffff';

  // --- UTM Logic & Redirect Execution ---
  const getUrlWithUtm = useCallback(() => {
      if (!method.url) return '#';
      try {
          // Prepend https:// if missing so new URL() doesn't fail on raw domains (e.g., 'amazon.com')
          let safeUrl = method.url;
          if (!/^https?:\/\//i.test(safeUrl)) {
              safeUrl = 'https://' + safeUrl;
          }
          
          const url = new URL(safeUrl);
          if (method.utmEnabled) {
              url.searchParams.set('utm_source', 'macrogame_platform');
              url.searchParams.set('utm_medium', 'conversion_screen');
              url.searchParams.set('utm_campaign', 'MACROGAME_ID_123'); 
              url.searchParams.set('utm_content', 'SCREEN_ID_456');
          }
          return url.toString();
      } catch (error) {
          // Ultimate fallback: return sanitized string even if URL parsing completely fails
          let safeUrl = method.url;
          if (!/^https?:\/\//i.test(safeUrl)) {
              safeUrl = 'https://' + safeUrl;
          }
          return safeUrl;
      }
  }, [method.url, method.utmEnabled]);

  const isFullAreaClickable = isDisclaimer || interactionMethod === 'any_interaction';

  const triggerRedirect = useCallback((interactionType: 'button' | 'disclaimer' | 'auto') => {
      if (interactionType === 'button' && playClickAudio) playClickAudio('primary');
      if (interactionType === 'disclaimer' && playScreenTransitionAudio) playScreenTransitionAudio();
      if (interactionType === 'auto' && playTimerGoAudio) playTimerGoAudio();

      const url = getUrlWithUtm();
      // Fire the native redirect behavior programmatically
      if (url && url !== '#') {
          window.open(url, m.openInNewTab ? "_blank" : "_self");
      }
      onSuccess();
  }, [getUrlWithUtm, m.openInNewTab, onSuccess, playClickAudio, playScreenTransitionAudio, playTimerGoAudio]);

  // Keep a ref to the latest trigger function to use inside effects without dependency loops
  const triggerRef = useRef(triggerRedirect);
  useEffect(() => { triggerRef.current = triggerRedirect; }, [triggerRedirect]);

  const handleManualClick = (e: React.MouseEvent) => {
      e.preventDefault(); 
      triggerRedirect('button');
  };

  const initialDuration = t.autoDuration ?? 5;
  
  useEffect(() => {
      setTimeLeft(initialDuration);
      hasTriggeredRef.current = false; 
  }, [initialDuration]);

  useEffect(() => {
      if (!isAuto || !isActive) return; // Halt countdown in inspection mode OR paused preview
      if (timeLeft > 0) {
          const timer = setInterval(() => {
              setTimeLeft((prev: number) => {
                  const next = Math.max(0, prev - 1);
                  if (next > 0 && playTimerTickAudio) playTimerTickAudio();
                  return next;
              });
          }, 1000);
          return () => clearInterval(timer);
      } else if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true; 
          triggerRef.current('auto'); // Only fires once, stops at 0
      }
  }, [isAuto, isActive, timeLeft, playTimerTickAudio]);

  // --- Unified Global Interaction Listener (Boundary Safe) ---
  useEffect(() => {
      if (!isFullAreaClickable) return;

      const handleGlobalAction = (e: MouseEvent | KeyboardEvent) => {
          // 1. Ignore if the user is typing in a form field (e.g., stacked below an Email Capture)
          if (e.target instanceof Element && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
          
          // 2. Ignore if clicking a native hyperlink inside your rich text editors
          if (e.target instanceof Element && e.target.closest('a')) return;

          // 3. BOUNDARY CHECK: If it's a mouse click, ensure it happened INSIDE the Macrogame screen
          if (e.type === 'click' && methodRef.current) {
              // Find the outermost container of the conversion screen
              const myScreen = methodRef.current.closest('.macrogame-conversion-screen');
              
              // If the screen exists, but they clicked outside of it, DO NOTHING.
              if (myScreen && e.target instanceof Node && !myScreen.contains(e.target)) {
                  return; 
              }
          }

          e.preventDefault();
          triggerRef.current('disclaimer');
      };

      // Attach to window so it catches clicks on the empty space of the screen container
      window.addEventListener('click', handleGlobalAction);
      
      if (interactionMethod === 'any_interaction') {
          window.addEventListener('keydown', handleGlobalAction);
      }

      return () => {
          window.removeEventListener('click', handleGlobalAction);
          window.removeEventListener('keydown', handleGlobalAction);
      };
  }, [isFullAreaClickable, interactionMethod]);

  const cssBlock = `
    /* Force reset padding and margins for Quill editor */
    .link-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
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
    .link-content-wrapper.ql-editor ul, .link-content-wrapper.ql-editor ol { padding-left: 0 !important; margin-left: 0 !important; list-style-position: inside !important; }
    .link-content-wrapper.ql-editor li { padding: 0 !important; margin: 0 !important; }
  `;

  // --- UNIFIED RENDER ---
  const containerStyle: React.CSSProperties = {
    textAlign: 'left', 
    width: finalWidth,
    maxWidth: '100%', 
    margin: '0 auto',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    gap: `${methodSpacing}px`, 
    alignItems: 'center' 
  };

  // Pulse Animation Keyframes (Injected safely)
  const pulseCss = `
    @keyframes linkRedirectPulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
  `;

  // Calculate invisible padding to ensure disclaimers take the exact same height footprint as buttons
  const invisibleVerticalPadding = btnPadV + btnStrokeWidth;

  return (
    <div ref={methodRef} style={containerStyle}>
      <style>{cssBlock}</style>
      <style>{pulseCss}</style>

      {/* Dynamically force the cursor to be a pointer if hovering ANYWHERE inside the macrogame screen */}
      {isFullAreaClickable && (
          <style>{`.macrogame-conversion-screen { cursor: pointer; } .macrogame-conversion-screen button, .macrogame-conversion-screen input, .macrogame-conversion-screen textarea, .macrogame-conversion-screen a { cursor: default; }`}</style>
      )}

      {/* 1. Text Wrapper (Moved to TOP) */}
      {(method.headline || method.subheadline) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${textSpacing}px`, width: '100%' }}>
              {method.headline && (
                <div className="link-content-wrapper ql-editor" style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: method.headline }} />
              )}
              {method.subheadline && (
                <div className="link-content-wrapper ql-editor" style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: method.subheadline }} />
              )}
          </div>
      )}

      {/* 2. Transition Slot (Moved to BOTTOM) */}
      
      {/* A. Auto-Countdown */}
      {isAuto && t.showCountdown !== false && (
         <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
             <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  color: countdownColor,
                  textAlign: 'center',
                  padding: `${invisibleVerticalPadding}px 0`
             }}>
                {(t.countdownText || 'Redirecting in {{time}}').replace(/\{\{time\}\}/g, String(timeLeft))}
             </div>
         </div>
      )}

      {/* B. Manual Button */}
      {isButton && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <a
                href={getUrlWithUtm()}
                target={m.openInNewTab ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={handleManualClick}
                style={{ 
                    display: 'block', 
                    textDecoration: 'none', 
                    textAlign: 'center',
                    width: finalBtnWidth,
                    padding: `${btnPadV}px ${btnPadH}px`, 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    backgroundColor: btnBg, 
                    color: btnText, 
                    border: btnStrokeStyle !== 'none' ? `${btnStrokeWidth}px ${btnStrokeStyle} ${btnStrokeColor}` : 'none', 
                    borderRadius: `${btnRadius}px`,
                    cursor: 'pointer', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                    transition: hoverAnim ? 'transform 0.1s' : 'none',
                    boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseLeave={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1)' }}
              >
                {btnConfig.text || 'Continue'}
              </a>
          </div>
      )}

      {/* C. Disclaimer / Click Anywhere */}
      {isDisclaimer && (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <a
                href={getUrlWithUtm()}
                target={m.openInNewTab ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={handleManualClick}
                style={{ 
                    display: 'block', 
                    textDecoration: 'none', 
                    textAlign: 'center',
                    color: countdownColor,
                    fontSize: '1.2rem', 
                    fontWeight: 'bold',
                    padding: `${invisibleVerticalPadding}px 0`,
                    animation: t.pulseAnimation !== false ? 'linkRedirectPulse 2s infinite' : 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                }}
              >
                {t.disclaimerText || (interactionMethod === 'any_interaction' ? 'Click or press any key to continue' : 'Click anywhere to continue')}
              </a>
          </div>
      )}
    </div>
  );
};