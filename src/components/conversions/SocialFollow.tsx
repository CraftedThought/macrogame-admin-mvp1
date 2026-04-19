// src/components/conversions/SocialFollow.tsx

import React from 'react';
import { SocialFollowMethod } from '../../types';
import { SOCIAL_ICONS } from './SocialIcons';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill Styles

interface SocialFollowProps {
  method: SocialFollowMethod;
  onSuccess: () => void;
  themeMode?: 'dark' | 'light'; 
  isPortrait?: boolean; // New Prop
}

export const SocialFollow: React.FC<SocialFollowProps> = ({ method, onSuccess, themeMode = 'dark', isPortrait = false }) => {
  
  const getDestinationUrl = (baseUrl: string) => {
    if (!baseUrl) return '#'; 
    try {
      // Prepend https:// if it's missing to prevent relative pathing on localhost
      let safeUrl = baseUrl;
      if (!/^https?:\/\//i.test(safeUrl)) {
          safeUrl = 'https://' + safeUrl;
      }
      
      const currentParams = new URLSearchParams(window.location.search);
      const url = new URL(safeUrl);
      currentParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
      return url.toString();
    } catch (e) {
      // Fallback: If it still fails, just return the prepended URL
      let safeUrl = baseUrl;
      if (!/^https?:\/\//i.test(safeUrl)) {
          safeUrl = 'https://' + safeUrl;
      }
      return safeUrl;
    }
  };

  const handleClick = (e: React.MouseEvent, url: string) => {
    if (!url) {
      e.preventDefault(); 
      return;
    }
    onSuccess();
  };

  const cssBlock = `
    .social-follow-content-wrapper.ql-editor {
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        line-height: 1.25;
        color: inherit;
    }
    .social-follow-content-wrapper.ql-editor p,
    .social-follow-content-wrapper.ql-editor h1,
    .social-follow-content-wrapper.ql-editor h2,
    .social-follow-content-wrapper.ql-editor h3,
    .social-follow-content-wrapper.ql-editor h4 { 
        margin: 0; 
        padding: 0;
        margin-bottom: 0 !important;
    }
    .social-follow-content-wrapper.ql-editor h1,
    .social-follow-content-wrapper.ql-editor h2,
    .social-follow-content-wrapper.ql-editor h3,
    .social-follow-content-wrapper.ql-editor h4 { 
        line-height: 1.1; 
    }
    .social-follow-content-wrapper.ql-editor h4 { font-size: 0.75em; font-weight: normal; }
    .social-follow-content-wrapper.ql-editor ul,
    .social-follow-content-wrapper.ql-editor ol {
        padding-left: 0 !important;
        margin-left: 0 !important;
        list-style-position: inside !important;
    }
    .social-follow-content-wrapper.ql-editor li {
        padding: 0 !important;
        margin: 0 !important;
    }
    .social-follow-content-wrapper.ql-editor .ql-size-10px { font-size: 10px; }
    .social-follow-content-wrapper.ql-editor .ql-size-12px { font-size: 12px; }
    .social-follow-content-wrapper.ql-editor .ql-size-14px { font-size: 14px; }
    .social-follow-content-wrapper.ql-editor .ql-size-16px { font-size: 16px; }
    .social-follow-content-wrapper.ql-editor .ql-size-18px { font-size: 18px; }
    .social-follow-content-wrapper.ql-editor .ql-size-24px { font-size: 24px; }
    .social-follow-content-wrapper.ql-editor .ql-size-32px { font-size: 32px; }
    .social-follow-content-wrapper.ql-editor .ql-size-48px { font-size: 48px; }
  `;

  // --- Styles ---

  const safeVal = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && val !== '' && val !== null && val !== undefined ? num : fallback;
  };
  
  const activeStyle = themeMode === 'light' && method.lightStyle ? method.lightStyle : method.style;
  
  const activeIconColor = activeStyle?.iconColor || (themeMode === 'light' ? '#000000' : '#ffffff');

  const widthVal = safeVal(activeStyle?.size, 50);
  const finalWidth = isPortrait ? '100%' : `${widthVal}%`;
  
  const textSpacing = safeVal(activeStyle?.textSpacing, 10);
  const methodSpacing = safeVal(activeStyle?.methodSpacing, 20);
  const iconGap = safeVal(activeStyle?.iconSpacing, 15);

  const rawIconSize = activeStyle?.iconSize;
  // 1. Get the user's intended size (clamped to min 20)
  const userSize = Math.max(20, safeVal(rawIconSize, 20));
  
  // 2. Apply Smart Cap: If Portrait, cap at 40px. Otherwise use user size.
  const iconSizeVal = isPortrait ? Math.min(userSize, 40) : userSize;

  const containerStyle: React.CSSProperties = {
    textAlign: 'center',
    width: finalWidth, 
    // Removed minWidth so small % settings (e.g. 5%) are respected in preview
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `${methodSpacing}px`, 
  };

  const iconsContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: `${iconGap}px`,
    flexWrap: 'wrap',
    marginTop: 0,
    width: '100%' // Ensure icons take full available width of parent
  };

  const iconLinkStyle: React.CSSProperties = {
    color: activeIconColor,
    transition: 'transform 0.2s ease, opacity 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle}>
      <style>{cssBlock}</style>
      
      {/* Wrapped structure for granular spacing */}
      {(method.headline || method.subheadline) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${textSpacing}px`, width: '100%' }}>
              {method.headline && (
                 <div 
                   className="social-follow-content-wrapper ql-editor"
                   style={{ width: '100%' }}
                   dangerouslySetInnerHTML={{ __html: method.headline }} 
                 />
              )}
              {method.subheadline && (
                 <div 
                   className="social-follow-content-wrapper ql-editor"
                   style={{ width: '100%' }}
                   dangerouslySetInnerHTML={{ __html: method.subheadline }} 
                 />
              )}
          </div>
      )}

      {/* Icons Section */}
      <div style={iconsContainerStyle}>
        {method.links
          .filter(link => link.isEnabled)
          .map((link) => {
            const IconComponent = SOCIAL_ICONS[link.platform];
            if (!IconComponent) return null;

            return (
              <a
                key={link.platform}
                href={getDestinationUrl(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleClick(e, link.url)}
                style={iconLinkStyle}
                aria-label={`Follow on ${link.platform}`}
              >
                <IconComponent 
                  width={`${iconSizeVal}px`} 
                  height={`${iconSizeVal}px`} 
                />
              </a>
            );
          })}
      </div>
    </div>
  );
};