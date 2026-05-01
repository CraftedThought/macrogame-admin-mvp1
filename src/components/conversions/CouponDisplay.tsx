/* src/components/conversions/CouponDisplay.tsx */

import React from 'react';
import { CouponDisplayMethod, MaskConfig } from '../../types';
import { MethodMask } from './MethodMask';
import 'react-quill-new/dist/quill.snow.css';

interface CouponDisplayProps {
  method: CouponDisplayMethod;
  onSuccess: () => void;
  isPortrait?: boolean;
  // --- New Props for Code-Only Masking ---
  isCodeCovered?: boolean;
  maskConfig?: MaskConfig;
  onCodeInteraction?: () => void;
  themeMode?: 'dark' | 'light';
}

export const CouponDisplay: React.FC<CouponDisplayProps> = ({ 
    method, 
    isCodeCovered, 
    maskConfig, 
    onCodeInteraction,
    themeMode = 'dark'
}) => {
  // --- Styles ---
  const activeStyle = themeMode === 'light' ? { ...method.style, ...(method.lightStyle || {}) } : method.style;

  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const containerStyle: React.CSSProperties = {
    textAlign: 'center', 
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  };

  const codeBoxStyle: React.CSSProperties = {
    borderStyle: activeStyle?.strokeStyle || 'dashed',
    borderWidth: `${safeVal(activeStyle?.strokeWidth, 0)}px`,
    borderColor: activeStyle?.strokeColor || '#cfc33a',
    backgroundColor: activeStyle?.backgroundColor || (themeMode === 'light' ? '#f8f9fa' : '#1a1a1a'),
    boxShadow: `0 10px 25px rgba(0,0,0,${safeVal(activeStyle?.boxShadowOpacity, 0) / 100})`,
    
    paddingTop: `${safeVal(activeStyle?.paddingTop, 0)}px`,
    paddingBottom: `${safeVal(activeStyle?.paddingBottom, 0)}px`,
    paddingLeft: `${safeVal(activeStyle?.paddingX, 0)}px`,
    paddingRight: `${safeVal(activeStyle?.paddingX, 0)}px`,

    borderRadius: '8px',
    color: 'inherit',
    position: 'relative', 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${safeVal(activeStyle?.methodSpacing, 15)}px`,
  };

  const textSpacing = safeVal(activeStyle?.textSpacing, 10);

  // Wrapper for the code to handle relative positioning for the mask
  const codeWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      borderRadius: '4px',
  };

  const couponCodeStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.5)',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    display: 'inline-block',
    letterSpacing: '2px',
    fontWeight: 'bold',
    color: '#fff',
    fontSize: '1.2em',
    minWidth: '100px', // Ensure it has shape even if empty
  };

  // Styles for Quill
  const cssBlock = `
    .coupon-content-wrapper.ql-editor { height: auto !important; padding: 0 !important; overflow: visible !important; line-height: 1.25; }
    .coupon-content-wrapper.ql-editor p, .coupon-content-wrapper.ql-editor h1, .coupon-content-wrapper.ql-editor h2, .coupon-content-wrapper.ql-editor h3, .coupon-content-wrapper.ql-editor h4 { margin: 0; padding: 0; margin-bottom: 0 !important; }
    .coupon-content-wrapper.ql-editor h4 { font-size: 0.75em; font-weight: normal; }
  `;

  return (
    <div style={containerStyle}>
      <div style={codeBoxStyle}>
        {(method.headline || method.subheadline) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${textSpacing}px`, width: '100%' }}>
                {method.headline && (
                    <div className="coupon-content-wrapper ql-editor" style={{ color: activeStyle?.textColor || 'inherit', textAlign: 'left', width: '100%' }}>
                        <style>{cssBlock}</style>
                        <div dangerouslySetInnerHTML={{ __html: method.headline }} />
                    </div>
                )}
                {method.subheadline && (
                    <div className="coupon-content-wrapper ql-editor" style={{ color: activeStyle?.textColor || 'inherit', textAlign: 'left', width: '100%' }}>
                        <style>{cssBlock}</style>
                        <div dangerouslySetInnerHTML={{ __html: method.subheadline }} />
                    </div>
                )}
            </div>
        )}
        
        {/* Code Container with Optional Mask */}
        <div style={codeWrapperStyle}>
            <div style={couponCodeStyle}>
              {method.staticCode || 'CODE'}
            </div>
            
            {/* Internal Mask for Code Only Scope */}
            {isCodeCovered && maskConfig && (
                <MethodMask 
                    config={{
                        ...maskConfig,
                        // Override padding/spacing for the tight code area
                        paddingTop: 0, paddingBottom: 0, paddingX: 0, spacing: 5,
                        // Force specific content for the small code-only mask using the new separated field
                        headline: ((maskConfig as any).codeHeadline || 'REVEAL').toUpperCase(), 
                        showIcon: false,
                        body: '' 
                    }}
                    isRevealed={false}
                    onInteraction={(e) => {
                        e.stopPropagation();
                        onCodeInteraction?.();
                    }}
                    mode="overlay"
                    themeMode={themeMode} // <--- Pass theme prop
                />
            )}
        </div>
      </div>
    </div>
  );
};