/* src/components/conversions/EmailCapture.tsx */

import React from 'react';
import { EmailCaptureMethod } from '../../types';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill Styles

interface EmailCaptureProps {
  method: EmailCaptureMethod;
  onSuccess: () => void;
  onError?: () => void;
  isPortrait?: boolean;
  themeMode?: 'dark' | 'light';
}

export const EmailCapture: React.FC<EmailCaptureProps> = ({ method, onSuccess, onError, isPortrait = false, themeMode = 'dark' }) => {
  
  const m = method as any;
  const activeStyle = themeMode === 'light' ? { ...m.style, ...(m.lightStyle || {}) } : m.style;

  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const textSpacing = safeVal(activeStyle?.textSpacing, 10);
  const methodSpacing = safeVal(activeStyle?.methodSpacing, safeVal(activeStyle?.spacing, 20));
  const buttonSpacing = safeVal(activeStyle?.buttonSpacing, 15); 
  const fieldRadius = safeVal(activeStyle?.fieldBorderRadius, 6);
  
  const widthPercent = typeof activeStyle?.size === 'number' ? activeStyle.size : 50;
  const finalWidth = isPortrait ? '100%' : `${widthPercent}%`;
  
  const btnConfig = m.buttonConfig || {};
  const btnTheme = themeMode === 'light' && m.lightButtonStyle ? m.lightButtonStyle : (m.buttonStyle || {});
  
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
  const placeholderText = m.emailPlaceholderText || 'Enter your email...';

  const containerStyle: React.CSSProperties = {
    textAlign: 'left', 
    width: finalWidth,
    maxWidth: '100%', 
    margin: '0 auto',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    gap: `${methodSpacing}px`, 
  };

  const formStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: `${buttonSpacing}px`
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the input value directly from the form event
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector('input[type="email"]') as HTMLInputElement;
    const email = input.value;

    // Strict Email Regex (Requires @ and a dot)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        notifications.error('Please enter a valid email address (e.g. user@domain.com)');
        if (onError) onError();
        return;
    }

    notifications.success('Submission captured');
    onSuccess();
  }

  const cssBlock = `
    .email-capture-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }
    .email-capture-content-wrapper.ql-editor p,
    .email-capture-content-wrapper.ql-editor h1,
    .email-capture-content-wrapper.ql-editor h2,
    .email-capture-content-wrapper.ql-editor h3,
    .email-capture-content-wrapper.ql-editor h4 { 
        margin: 0; 
        padding: 0;
        margin-bottom: 0 !important;
    }
    .email-capture-content-wrapper.ql-editor h1,
    .email-capture-content-wrapper.ql-editor h2,
    .email-capture-content-wrapper.ql-editor h3,
    .email-capture-content-wrapper.ql-editor h4 { 
        line-height: 1.1; 
    }
    .email-capture-content-wrapper.ql-editor h4 { 
        font-size: 0.75em; 
        font-weight: normal; 
    }
    .email-capture-content-wrapper.ql-editor ul,
    .email-capture-content-wrapper.ql-editor ol {
        padding-left: 0 !important;
        margin-left: 0 !important;
        list-style-position: inside !important; 
    }
    .email-capture-content-wrapper.ql-editor li {
        padding: 0 !important;
        margin: 0 !important;
    }
    .email-capture-content-wrapper.ql-editor .ql-size-4px { font-size: 4px; }
    .email-capture-content-wrapper.ql-editor .ql-size-6px { font-size: 6px; }
    .email-capture-content-wrapper.ql-editor .ql-size-8px { font-size: 8px; }
    .email-capture-content-wrapper.ql-editor .ql-size-10px { font-size: 10px; }
    .email-capture-content-wrapper.ql-editor .ql-size-12px { font-size: 12px; }
    .email-capture-content-wrapper.ql-editor .ql-size-14px { font-size: 14px; }
    .email-capture-content-wrapper.ql-editor .ql-size-16px { font-size: 16px; }
    .email-capture-content-wrapper.ql-editor .ql-size-18px { font-size: 18px; }
    .email-capture-content-wrapper.ql-editor .ql-size-24px { font-size: 24px; }
    .email-capture-content-wrapper.ql-editor .ql-size-32px { font-size: 32px; }
    .email-capture-content-wrapper.ql-editor .ql-size-48px { font-size: 48px; }
  `;

  return (
    <div style={containerStyle}>
      <style>{cssBlock}</style>
      
      {(method.headline || method.subheadline) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${textSpacing}px`, width: '100%' }}>
              {method.headline && (
                <div className="email-capture-content-wrapper ql-editor" style={{ width: '100%' }}>
                    <div dangerouslySetInnerHTML={{ __html: method.headline }} />
                </div>
              )}
              {method.subheadline && (
                <div className="email-capture-content-wrapper ql-editor" style={{ width: '100%' }}>
                    <div dangerouslySetInnerHTML={{ __html: method.subheadline }} />
                </div>
              )}
          </div>
      )}

      <form style={formStyle} onSubmit={handleSubmit} onInvalid={() => { if (onError) onError(); }}>
        <input
          type="email"
          required
          placeholder={placeholderText}
          style={{ 
              ...styles.input, 
              width: '100%', 
              color: '#333', 
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: `${fieldRadius}px`
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button 
                type="submit" 
                style={{ 
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
                    textAlign: 'center'
                }}
                onMouseEnter={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseLeave={(e) => { if (hoverAnim) e.currentTarget.style.transform = 'scale(1)' }}
            >
              {btnConfig.text || 'Submit'}
            </button>
        </div>
      </form>
    </div>
  );
};