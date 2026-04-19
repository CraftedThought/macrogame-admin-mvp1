/* src/components/previews/StaticSkinPreview.tsx */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigurablePopupSkin from '../../skins/ConfigurablePopupLive';
import { SkinConfig } from '../../types';

// Standard Device Definitions for the simulator (Ecommerce Power Set)
const DEVICES = [
    { 
        name: 'Default (No Device)', 
        width: 0, // 0 indicates dynamic sizing based on the popup itself
        height: 0,
        image: null 
    },
    { 
        name: 'Full HD Desktop', 
        width: 1920, 
        height: 1080,
        image: '/assets/backgrounds/full-hd-desktop.jpg' 
    },
    { 
        name: 'Modern Laptop', 
        width: 1536, 
        height: 864,
        image: '/assets/backgrounds/modern-laptop.jpg' 
    },
    { 
        name: 'Macbook Pro 14"', 
        width: 1512, 
        height: 982,
        image: '/assets/backgrounds/macbook-pro-14.jpg' 
    },
    { 
        name: 'Standard Laptop', 
        width: 1366, 
        height: 768,
        image: '/assets/backgrounds/standard-laptop.jpg' 
    },
];

// Physical pixel widths for the popup sizes
const POPUP_WIDTH_MAP: { [key: string]: number } = {
    'small': 450,
    'medium': 650, 
    'large': 800,
};

interface StaticSkinPreviewProps {
    skinId: string;
    skinConfig: SkinConfig;
}

export const StaticSkinPreview: React.FC<StaticSkinPreviewProps> = ({ skinId, skinConfig }) => {
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null); // New ref to measure actual popup content
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
    
    // Track the actual measured height of the popup content
    const [contentHeight, setContentHeight] = useState(600);

    const [layout, setLayout] = useState({ 
        scale: 1, 
        visualWidth: 0, 
        visualHeight: 0,
        isDefault: false 
    });

    const { styling } = skinConfig;
    const configuredWidth = styling?.popupWidth || 'medium';

    const calculateLayout = useCallback(() => {
        if (wrapperRef.current) {
            // 1. Get available space in the preview panel
            const padding = 32;
            const availableWidth = wrapperRef.current.offsetWidth - padding;
            const availableHeight = wrapperRef.current.offsetHeight - padding;
            
            const device = DEVICES[selectedDeviceIndex];
            
            let realWidth, realHeight, scale;
            const isDefault = device.width === 0;

            // HANDLE "DEFAULT" (NO DEVICE) MODE
            if (isDefault) {
                // The "Real Device" width is fixed by config
                realWidth = POPUP_WIDTH_MAP[configuredWidth];
                // The "Real Device" height is the MEASURED content height + some buffer
                // We default to at least a reasonable aspect ratio if measurement is 0
                realHeight = contentHeight > 0 ? contentHeight : (realWidth * (9/16) + 100); 
                
                // Scale logic: Fit BOTH width and height
                const scaleX = availableWidth / realWidth;
                const scaleY = availableHeight / realHeight;
                
                // Choose the smaller scale to ensure it fits, but cap at 1.0 (don't upscale)
                scale = Math.min(scaleX, scaleY);
                if (scale > 1) scale = 1;

            } 
            // HANDLE STANDARD DEVICE MODE
            else {
                realWidth = device.width;
                realHeight = device.height;
                
                const scaleX = availableWidth / realWidth;
                const scaleY = availableHeight / realHeight;
                scale = Math.min(scaleX, scaleY);
            }

            // 4. Calculate visual size
            setLayout({
                scale: scale,
                visualWidth: realWidth * scale,
                visualHeight: realHeight * scale,
                isDefault: isDefault
            });
        }
    }, [selectedDeviceIndex, configuredWidth, contentHeight]); 

    // Observer for Container Resize (Window resize)
    useEffect(() => {
        const element = wrapperRef.current;
        if (!element) return;

        const observer = new ResizeObserver(() => {
            calculateLayout();
        });
        observer.observe(element);
        
        // Initial calc
        calculateLayout();

        return () => observer.disconnect();
    }, [calculateLayout]);

    // Observer for Content Resize (Popup grows/shrinks)
    useEffect(() => {
        const element = contentRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // When content changes size, update state, which triggers calculateLayout
                if (entry.contentRect.height > 0) {
                    setContentHeight(entry.contentRect.height);
                }
            }
        });
        observer.observe(element);

        return () => observer.disconnect();
    }, []); // Empty dep array: we just want to attach to the ref once

    if (skinId !== 'configurable-popup') {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', color: '#6c757d', borderRadius: '8px', border: '1px dashed #dee2e6', padding: '2rem', textAlign: 'center' }}>
                <p>Live preview is currently only available for the "Configurable Popup" skin.</p>
            </div>
        );
    }

    const currentDevice = DEVICES[selectedDeviceIndex];

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: '#666' }}>Live Skin Preview</h4>
                <select 
                    value={selectedDeviceIndex}
                    onChange={(e) => setSelectedDeviceIndex(Number(e.target.value))}
                    style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        borderColor: '#ccc',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                    }}
                >
                    {DEVICES.map((device, index) => (
                        <option key={index} value={index}>
                            {device.name} {device.width > 0 ? `(${device.width}x${device.height})` : ''}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* Preview Area */}
            <div ref={wrapperRef} style={{ 
                flex: 1, 
                backgroundColor: '#e9ecef', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center', 
                overflow: 'hidden', 
                position: 'relative',
                padding: '1rem' 
            }}>
                {/* THE "VISUAL" WRAPPER */}
                <div style={{
                    width: `${layout.visualWidth}px`,
                    height: `${layout.visualHeight}px`,
                    position: 'relative',
                    boxShadow: layout.isDefault ? 'none' : '0 10px 30px rgba(0,0,0,0.15)',
                    border: layout.isDefault ? 'none' : '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: layout.isDefault ? 'transparent' : '#fff',
                    transition: 'width 0.3s ease, height 0.3s ease'
                }}>
                    {/* THE "REAL" DEVICE CONTAINER */}
                    <div style={{
                        width: `${layout.isDefault ? layout.visualWidth / layout.scale : currentDevice.width}px`,
                        height: `${layout.isDefault ? layout.visualHeight / layout.scale : currentDevice.height}px`,
                        
                        transform: `scale(${layout.scale})`,
                        transformOrigin: 'top left',
                        
                        backgroundColor: layout.isDefault ? 'transparent' : '#ffffff',
                        backgroundImage: layout.isDefault || !currentDevice.image ? 'none' : `url(${currentDevice.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'top center',
                        backgroundRepeat: 'no-repeat',

                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // Center content in device
                        overflow: layout.isDefault ? 'visible' : 'hidden',
                        transition: 'transform 0.3s ease'
                    }}>
                        {/* Overlay (Hidden if Default) */}
                        {!layout.isDefault && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                zIndex: 0
                            }} />
                        )}

                        {/* CONTENT WRAPPER - This is what we measure! */}
                        {/* Use 100% width for Device mode so the popup can expand to its max-width (e.g. 650px) instead of shrink-wrapping */}
                        <div ref={contentRef} style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <ConfigurablePopupSkin
                                isMuted={false}
                                onClose={() => {}}
                                onMute={() => {}}
                                skinConfig={skinConfig}
                            >
                                {/* We remove the hardcoded aspect-ratio here.
                                    We set height: '100%' so this placeholder fills the 
                                    viewport defined by the Skin (which handles the 16:9 vs 9:16 logic).
                                */}
                                <div style={{ 
                                    width: '100%', 
                                    height: '100%', // Fill the parent viewport
                                    backgroundColor: '#000', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    color: '#333',
                                    position: 'relative',
                                }}>
                                    <span style={{ color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        {skinConfig.styling?.gameSection?.orientation === 'portrait' ? '9:16 Game Screen' : '16:9 Game Screen'}
                                    </span>
                                </div>
                            </ConfigurablePopupSkin>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};