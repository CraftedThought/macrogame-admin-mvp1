/* src/components/conversions/FormSubmit.tsx */

import React, { useState } from 'react';
import { FormSubmitMethod } from '../../types';
import { styles } from '../../App.styles';
import { notifications } from '../../utils/notifications';
import 'react-quill-new/dist/quill.snow.css';

interface FormSubmitProps {
  method: FormSubmitMethod;
  onSuccess: () => void;
  onError?: () => void;
  isPortrait?: boolean; 
  themeMode?: 'dark' | 'light';
}

export const FormSubmit: React.FC<FormSubmitProps> = ({ method, onSuccess, onError, isPortrait = false, themeMode = 'dark' }) => {
  const m = method as any;

  const [values, setValues] = useState<Record<string, string>>({});

  const activeStyle = themeMode === 'light' ? { ...m.style, ...(m.lightStyle || {}) } : m.style;

  const getDefaultLabel = (type: string) => {
      switch(type) {
          case 'email': return 'Email Address';
          case 'tel': return 'Phone Number';
          case 'number': return 'Number Input';
          default: return 'First Name';
      }
  };

  const getDefaultPlaceholder = (type: string) => {
      switch(type) {
          case 'email': return 'Enter your email...';
          case 'tel': return 'Enter phone number...';
          case 'number': return 'Enter the quantity...';
          default: return 'Enter first name...';
      }
  };

  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };

  const textSpacing = safeVal(activeStyle?.textSpacing, 10);
  const methodSpacing = safeVal(activeStyle?.methodSpacing, safeVal(activeStyle?.spacing, 20)); 
  const fieldSpacing = safeVal(activeStyle?.fieldSpacing, 10);   
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
  };

  const fieldsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: `${fieldSpacing}px`, 
  };

  // Update: Input Sanitization Logic
  const handleInputChange = (name: string, type: string, rawValue: string) => {
      let nextValue = rawValue;

      if (type === 'text') {
          // Prevent numbers and symbols (Allow letters, spaces, hyphens, apostrophes)
          nextValue = rawValue.replace(/[^a-zA-Z\s\-']/g, '');
      } 
      else if (type === 'tel') {
          // Allow digits, spaces, dashes, parentheses, plus
          nextValue = rawValue.replace(/[^0-9+\-\s()]/g, '');
      }

      setValues(prev => ({ ...prev, [name]: nextValue }));
  };

  // Update: Block 'e' in number inputs
  const handleKeyDown = (e: React.KeyboardEvent, type: string) => {
      if (type === 'number' && (e.key === 'e' || e.key === 'E')) {
          e.preventDefault();
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update: Validate all fields
    for (const field of (method.fields || [])) {
        const val = values[field.name] || '';
        
        if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                notifications.error(`Invalid email format for "${field.label}"`);
                if (onError) onError();
                return;
            }
        }
        if (field.type === 'tel') {
            // Simple check: At least 7 valid characters
            if (val.replace(/\D/g, '').length < 7) {
                notifications.error(`Please enter a valid phone number for "${field.label}"`);
                if (onError) onError();
                return;
            }
        }
    }

    notifications.success('Form submitted (Simulation)');
    onSuccess();
  };

  // --- Row Grouping Logic ---
  // 1. Group fields by 'row' property
  const rows: Record<number, any[]> = {};
  // If method.fields exists, map them. If row is missing, default to index+1 (legacy support)
  (method.fields || []).forEach((field: any, index: number) => {
      const rowNum = field.row || (index + 1);
      if (!rows[rowNum]) rows[rowNum] = [];
      rows[rowNum].push(field);
  });

  // 2. Get sorted row keys
  const sortedRowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);

  // 3. Create Visual Rows (Responsive Adaptation)
  // If Portrait, we enforce a max of 2 fields per row by splitting larger rows.
  const visualRows: any[][] = [];
  
  sortedRowKeys.forEach(key => {
      const originalRow = rows[key];
      
      if (isPortrait && originalRow.length > 2) {
          // Chunk into groups of 2
          for (let i = 0; i < originalRow.length; i += 2) {
              visualRows.push(originalRow.slice(i, i + 2));
          }
      } else {
          // Keep as is
          visualRows.push(originalRow);
      }
  });

  const cssBlock = `
    .form-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }

    /* Zero margins for all block elements */
    .form-content-wrapper.ql-editor p,
    .form-content-wrapper.ql-editor h1,
    .form-content-wrapper.ql-editor h2,
    .form-content-wrapper.ql-editor h3,
    .form-content-wrapper.ql-editor h4 { 
        margin: 0; 
        padding: 0;
        margin-bottom: 0 !important;
    }

    /* Tighter line-height for headers */
    .form-content-wrapper.ql-editor h1,
    .form-content-wrapper.ql-editor h2,
    .form-content-wrapper.ql-editor h3,
    .form-content-wrapper.ql-editor h4 { 
        line-height: 1.1; 
    }

    /* H4 = Small Text */
    .form-content-wrapper.ql-editor h4 { 
        font-size: 0.75em; 
        font-weight: normal; 
    }

    /* FIX LIST OFFSETS */
    .form-content-wrapper.ql-editor ul,
    .form-content-wrapper.ql-editor ol {
        padding-left: 0 !important;
        margin-left: 0 !important;
        list-style-position: inside !important;
    }
    .form-content-wrapper.ql-editor li {
        padding: 0 !important;
        margin: 0 !important;
    }
  `;
  
  return (
    <div style={containerStyle}>
      <style>{cssBlock}</style>

      {(method.headline || method.subheadline) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${textSpacing}px`, width: '100%' }}>
              {method.headline && (
                <div className="form-content-wrapper ql-editor" style={{ width: '100%', textAlign: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: method.headline }} />
                </div>
              )}
              {method.subheadline && (
                <div className="form-content-wrapper ql-editor" style={{ width: '100%', textAlign: 'center' }}>
                    <div dangerouslySetInnerHTML={{ __html: method.subheadline }} />
                </div>
              )}
          </div>
      )}

      <form style={formStyle} onSubmit={handleSubmit} onInvalid={() => { if (onError) onError(); }}>
        
        {/* Render Visual Rows */}
        <div style={fieldsContainerStyle}>
            {visualRows.map((fieldsInRow, rowIndex) => {
                return (
                    <div key={rowIndex} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {fieldsInRow.map((field: any, index: number) => (
                            <div key={index} style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    {field.label || getDefaultLabel(field.type)}
                                    {field.required && <span style={{ color: '#e74c3c', marginLeft: '2px' }}>*</span>}
                                </label>
                                <input
                                    type={field.type}
                                    name={field.name}
                                    required={field.required}
                                    placeholder={field.placeholder || getDefaultPlaceholder(field.type)}
                                    value={values[field.name] || ''}
                                    onChange={(e) => handleInputChange(field.name, field.type, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, field.type)}
                                    style={{ 
                                        ...styles.input, 
                                        width: '100%', 
                                        color: '#333',
                                        padding: '0.6rem',
                                        boxSizing: 'border-box',
                                        borderRadius: `${fieldRadius}px`
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
        
        <div style={{ marginTop: `${safeVal(activeStyle?.buttonSpacing, 15)}px`, display: 'flex', justifyContent: 'center', width: '100%' }}>
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