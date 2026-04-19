/* src/components/forms/PopupSkinForm.tsx */

import React, { useState } from 'react';
import { styles } from '../../App.styles';
import { SkinConfig, SkinContentBlock } from '../../types';
import { generateUUID } from '../../utils/helpers';
import { ContentBlockEditor } from './ContentBlockEditor';
import { SimpleTextEditor } from './SimpleTextEditor';

interface PopupSkinFormProps {
    skinConfig: SkinConfig;
    setSkinConfig: (config: SkinConfig) => void;
}

const POPUP_WIDTH_MAP: { [key: string]: number } = {
    'small': 450,
    'medium': 650, 
    'large': 800,
};

// Helper component for color picker
const ColorPicker: React.FC<{ label?: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {label && <label>{label}</label>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', padding: '0.25rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="#292929"
            />
        </div>
    </div>
);

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={styles.configSection}>
        <h4 style={{ ...styles.h4, marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            {title}
        </h4>
        {children}
    </div>
);

// Styled Subsection Header
const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>
        <h5 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#555', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
        </h5>
        {children}
    </div>
);

const FONT_OPTIONS = [
    { label: 'System Default (San Francisco / Segoe UI)', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { label: 'Serif (Times New Roman / Georgia)', value: "Georgia, 'Times New Roman', Times, serif" },
    { label: 'Monospace (Courier New)', value: "'Courier New', Courier, monospace" },
    { label: 'Modern Sans (Verdana / Geneva)', value: "Verdana, Geneva, Tahoma, sans-serif" },
    { label: 'Classic Sans (Arial / Helvetica)', value: "Arial, Helvetica, sans-serif" }
];

const WEIGHT_OPTIONS = [
    { label: 'Normal (400)', value: 'normal' },
    { label: 'Bold (700)', value: 'bold' },
    { label: 'Extra Bold (800)', value: '800' },
];

export const PopupSkinForm: React.FC<PopupSkinFormProps> = ({ skinConfig, setSkinConfig }) => {

    // --- State for Color Memory (Session Persistence) ---
    // We initialize with the current config value (if editing) or a default dark gray.
    const [lastHeaderBg, setLastHeaderBg] = useState<string>(skinConfig.styling?.headerBackground || '#292929');
    const [lastContentBg, setLastContentBg] = useState<string>(skinConfig.styling?.contentBackground || '#292929');

    // --- Determine Contextual Background Colors ---
    // 1. Global Popup BG
    const globalBg = skinConfig.styling?.backgroundColor || '#292929';
    // 2. Content Block BG (uses override if set, otherwise global)
    const contentBlockBg = skinConfig.styling?.contentBackground || globalBg;

    const handleConfigChange = <K extends keyof SkinConfig>(key: K, value: SkinConfig[K]) => {
        setSkinConfig({ ...skinConfig, [key]: value });
    };

    const handleHeaderChange = <K extends keyof NonNullable<SkinConfig['header']>>(key: K, value: NonNullable<SkinConfig['header']>[K]) => {
        setSkinConfig({
            ...skinConfig,
            header: { ...skinConfig.header, [key]: value }
        });
    };

    const handleStylingChange = <K extends keyof NonNullable<SkinConfig['styling']>>(key: K, value: NonNullable<SkinConfig['styling']>[K]) => {
        setSkinConfig({
            ...skinConfig,
            styling: { ...skinConfig.styling, [key]: value }
        });
    };

    // Numeric/String handler for styling
    const handleUnitChange = <K extends keyof NonNullable<SkinConfig['styling']>>(key: K, value: string | number) => {
        setSkinConfig({
            ...skinConfig,
            styling: { ...skinConfig.styling, [key]: value }
        });
    };

    // Handler for nested gameSection object
    const handleGameSectionChange = <K extends keyof NonNullable<SkinConfig['styling']>['gameSection']>(key: K, value: any) => {
        const currentSection = skinConfig.styling?.gameSection || { 
            orientation: 'landscape', 
            alignment: 'center', 
            desktopHeightLimit: undefined,
            borderRadius: 4, // Default to 4px
            paddingTop: 0,
            paddingBottom: 0,
            paddingX: 0,
            leftContent: null,
            rightContent: null
        };

        // Create the updated object first
        const updatedSection = { ...currentSection, [key]: value };

        // --- Smart Content Swapping & Cleanup Logic ---
        // If changing ALIGNMENT, we must manage the slots.
        if (key === 'alignment') {
            const newAlign = value as 'left' | 'center' | 'right';
            const oldLeft = currentSection.leftContent;
            const oldRight = currentSection.rightContent;

            // Scenario 1: Switched TO Left Align
            // The "Left Slot" is structurally removed (Game takes Col 1).
            if (newAlign === 'left') {
                // If Left had content, try to save it to Right
                if (oldLeft && !oldRight) {
                    updatedSection.rightContent = oldLeft;
                }
                // CRITICAL FIX: Always clear the Left Slot because it no longer exists layout-wise
                updatedSection.leftContent = null;
            }

            // Scenario 2: Switched TO Right Align
            // The "Right Slot" is structurally removed (Game takes Col 2 or 3).
            else if (newAlign === 'right') {
                // If Right had content, try to save it to Left
                if (oldRight && !oldLeft) {
                    updatedSection.leftContent = oldRight;
                }
                // CRITICAL FIX: Always clear the Right Slot because it no longer exists layout-wise
                updatedSection.rightContent = null;
            }
        }
        
        setSkinConfig({
            ...skinConfig,
            styling: {
                ...skinConfig.styling,
                gameSection: updatedSection
            }
        });
    };

    // Content Block Helpers
    const addContentBlock = (position: 'above' | 'below') => {
        const newBlock: SkinContentBlock = {
            id: generateUUID(),
            position,
            content: '', // Initialize empty HTML string
        };
        handleConfigChange('contentBlocks', [...(skinConfig.contentBlocks || []), newBlock]);
    };

    const updateContentBlock = (id: string, field: keyof Omit<SkinContentBlock, 'id' | 'position'>, value: string) => {
        const newBlocks = (skinConfig.contentBlocks || []).map(block =>
            block.id === id ? { ...block, [field]: value } : block
        );
        handleConfigChange('contentBlocks', newBlocks);
    };

    const removeContentBlock = (id: string) => {
        const newBlocks = (skinConfig.contentBlocks || []).filter(block => block.id !== id);
        handleConfigChange('contentBlocks', newBlocks);
    };

    // Logic for Header Background Override
    const isHeaderBgOverridden = skinConfig.styling?.headerBackground !== undefined;
    
    const toggleHeaderBgOverride = (checked: boolean) => {
        if (checked) {
            // Restore the last used color from memory
            handleStylingChange('headerBackground', lastHeaderBg);
        } else {
            // Before clearing, save the current color to memory
            if (skinConfig.styling?.headerBackground) {
                setLastHeaderBg(skinConfig.styling.headerBackground);
            }
            handleStylingChange('headerBackground', undefined);
        }
    };

    // Logic for Content Background Override
    const isContentBgOverridden = skinConfig.styling?.contentBackground !== undefined;

    const toggleContentBgOverride = (checked: boolean) => {
        if (checked) {
            // Restore the last used color from memory
            handleStylingChange('contentBackground', lastContentBg);
        } else {
            // Before clearing, save the current color to memory
            if (skinConfig.styling?.contentBackground) {
                setLastContentBg(skinConfig.styling.contentBackground);
            }
            handleStylingChange('contentBackground', undefined);
        }
    };

    return (
        <>
            {/* --- SECTION 1: POPUP HEADER --- */}
            <FormSection title="Popup Header">
                
                {/* 1A. POPUP TITLE */}
                <SubSection title="Popup Title">
                    <div style={styles.configItem}>
                        <label>Title</label>
                        <input
                            type="text"
                            maxLength={25}
                            value={skinConfig.header?.title || ''}
                            onChange={e => handleHeaderChange('title', e.target.value)}
                            style={styles.input}
                            placeholder="e.g., Special Offer!"
                        />
                        <p style={styles.descriptionText}>Max 25 characters.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <ColorPicker
                            label="Title Text Color"
                            value={skinConfig.header?.textColor || '#FFFFFF'}
                            onChange={value => handleHeaderChange('textColor', value)}
                        />
                        
                        <div style={{ ...styles.configItem, flex: 1 }}>
                            <label>Title Font Weight</label>
                            <select
                                value={skinConfig.header?.fontWeight || 'bold'}
                                onChange={e => handleHeaderChange('fontWeight', e.target.value as 'normal' | 'bold' | '800')}
                                style={styles.input}
                            >
                                {WEIGHT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </SubSection>

                {/* 1B. HEADER STYLES (Moved from Styling Section) */}
                <SubSection title="Header Styles">
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ ...styles.configItem, flex: 1 }}>
                            <label>Padding Top (px)</label>
                            <input 
                                type="number" min="0" max="120"
                                value={skinConfig.header?.paddingTop ?? 0}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 120) return;
                                    handleHeaderChange('paddingTop', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ ...styles.configItem, flex: 1 }}>
                            <label>Padding Bottom (px)</label>
                            <input 
                                type="number" min="0" max="120"
                                value={skinConfig.header?.paddingBottom ?? 0}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 120) return;
                                    handleHeaderChange('paddingBottom', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>
                        <div style={{ ...styles.configItem, flex: 1 }}>
                            <label>Padding Sides (px)</label>
                            <input 
                                type="number" min="0" max="120"
                                value={skinConfig.header?.paddingX ?? 0}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 120) return;
                                    handleHeaderChange('paddingX', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>
                    </div>

                    {/* Header Background Override */}
                    <div style={{ ...styles.configItem, backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: isHeaderBgOverridden ? '1rem' : 0 }}>
                            <input
                                type="checkbox"
                                checked={isHeaderBgOverridden}
                                onChange={e => toggleHeaderBgOverride(e.target.checked)}
                            />
                            <strong>Change Header Background Color</strong>
                        </label>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1.5rem', marginTop: '0.25rem', display: isHeaderBgOverridden ? 'none' : 'block' }}>
                            By changing the color of just the header, you will be overriding the selected global background color.
                        </p>

                        {isHeaderBgOverridden && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <ColorPicker
                                    label="Header Background"
                                    value={skinConfig.styling?.headerBackground || '#292929'}
                                    onChange={value => handleStylingChange('headerBackground', value)}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={skinConfig.styling?.headerBgSpanEdges || false}
                                        onChange={e => handleStylingChange('headerBgSpanEdges', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.9rem' }}>Span to Left, Right, & Top Edges</span>
                                </label>
                            </div>
                        )}
                    </div>
                </SubSection>

                {/* 1C. POPUP CONTROLS */}
                <SubSection title="Popup Controls">
                    {/* Button Style Selector */}
                    <div style={{ ...styles.configItem, marginBottom: '1rem' }}>
                        <label>Button Style</label>
                        <select 
                            value={skinConfig.buttonStyle || 'circle'}
                            onChange={e => handleConfigChange('buttonStyle', e.target.value as 'circle' | 'minimal')}
                            style={styles.input}
                        >
                            <option value="circle">Circle Background (Default)</option>
                            <option value="minimal">Minimal (Icon Only)</option>
                        </select>
                    </div>

                    {/* Exit Button Config */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={skinConfig.showExitButton !== false} // Default true
                                onChange={e => handleConfigChange('showExitButton', e.target.checked)}
                            />
                            <strong>Show Exit Button</strong>
                        </label>
                        {skinConfig.showExitButton !== false && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem' }}>Position:</span>
                                <select 
                                    value={skinConfig.exitButtonPosition || 'right'}
                                    onChange={e => handleConfigChange('exitButtonPosition', e.target.value as 'left' | 'right')}
                                    style={{ ...styles.input, padding: '0.25rem', fontSize: '0.9rem' }}
                                >
                                    <option value="right">Right</option>
                                    <option value="left">Left</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Mute Button Config */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={skinConfig.showMuteButton !== false} // Default true
                                onChange={e => handleConfigChange('showMuteButton', e.target.checked)}
                            />
                            <strong>Show Mute Button</strong>
                        </label>
                        {skinConfig.showMuteButton !== false && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem' }}>Position:</span>
                                <select 
                                    value={skinConfig.muteButtonPosition || 'left'}
                                    onChange={e => handleConfigChange('muteButtonPosition', e.target.value as 'left' | 'right')}
                                    style={{ ...styles.input, padding: '0.25rem', fontSize: '0.9rem' }}
                                >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                        )}
                    </div>
                </SubSection>

            </FormSection>
            
            {/* --- SECTION 2: CONTENT BLOCKS --- */}
            <FormSection title="Popup Content Blocks">
                <p style={styles.descriptionText}>Add rich text blocks above or below the game area.</p>
                {(skinConfig.contentBlocks || []).filter(b => b.position === 'above').map(block => (
                    <ContentBlockEditor 
                        key={block.id} 
                        block={block} 
                        updateBlock={updateContentBlock} 
                        removeBlock={removeContentBlock} 
                        backgroundColor={contentBlockBg} 
                    />
                ))}
                <button type="button" onClick={() => addContentBlock('above')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                    + Add Block (Above Game)
                </button>
                
                <div style={{...styles.configItem, textAlign: 'center', margin: '1rem 0', color: '#888', fontWeight: 'bold'}}>
                    --- 16:9 Game Area ---
                </div>
                
                {(skinConfig.contentBlocks || []).filter(b => b.position === 'below').map(block => (
                    <ContentBlockEditor 
                        key={block.id} 
                        block={block} 
                        updateBlock={updateContentBlock} 
                        removeBlock={removeContentBlock} 
                        backgroundColor={contentBlockBg}
                    />
                ))}
                <button type="button" onClick={() => addContentBlock('below')} style={{...styles.secondaryButton, marginTop: '0.5rem'}}>
                    + Add Block (Below Game)
                </button>

                {/* --- Content Block Styling Controls (Only shown if blocks exist) --- */}
                {(skinConfig.contentBlocks || []).length > 0 && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #eee', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Top (px)</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.contentPaddingTop ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleStylingChange('contentPaddingTop', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Bottom (px)</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.contentPaddingBottom ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleStylingChange('contentPaddingBottom', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Sides (px)</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.contentPaddingX ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleStylingChange('contentPaddingX', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        {/* Content Background Override */}
                        <div style={{ ...styles.configItem, backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: isContentBgOverridden ? '1rem' : 0 }}>
                                <input
                                    type="checkbox"
                                    checked={isContentBgOverridden}
                                    onChange={e => toggleContentBgOverride(e.target.checked)}
                                />
                                <strong>Change Content Block Background Color</strong>
                            </label>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginLeft: '1.5rem', marginTop: '0.25rem', display: isContentBgOverridden ? 'none' : 'block' }}>
                                By changing the color of just the content blocks, you will be overriding the selected global background color.
                            </p>

                            {isContentBgOverridden && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <ColorPicker
                                        label="Content Block Background"
                                        value={skinConfig.styling?.contentBackground || '#292929'}
                                        onChange={value => handleStylingChange('contentBackground', value)}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={skinConfig.styling?.contentBgSpanEdges || false}
                                            onChange={e => handleStylingChange('contentBgSpanEdges', e.target.checked)}
                                        />
                                        <span style={{ fontSize: '0.9rem' }}>Span to Left, Right, & Bottom Edges</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </FormSection>
            
            {/* --- SECTION 3: POPUP STYLING --- */}
            <FormSection title="Popup Styling">
                
                {/* 3A. GLOBAL STYLES */}
                <SubSection title="Global Styles">
                    <div style={{ ...styles.configItem, marginBottom: '1rem' }}>
                        <label>Font Family</label>
                        <select 
                            value={skinConfig.styling?.fontFamily || FONT_OPTIONS[0].value}
                            onChange={e => handleStylingChange('fontFamily', e.target.value)} 
                            style={styles.input}
                        >
                            {FONT_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Popup Width</label>
                            <select 
                                value={skinConfig.styling?.popupWidth || 'medium'}
                                onChange={e => handleUnitChange('popupWidth', e.target.value)} 
                                style={styles.input}
                            >
                                <option value="small">Small (450px)</option>
                                <option value="medium">Medium (650px)</option>
                                <option value="large">Large (800px)</option>
                            </select>
                        </div>
                        
                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Internal Padding (px)</label>
                            <input 
                                type="number" min="0" max="120"
                                value={skinConfig.styling?.padding ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 120) return;
                                    handleUnitChange('padding', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>
                    
                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Border Radius (px)</label>
                            <input 
                                type="number" min="0" max="60"
                                value={skinConfig.styling?.borderRadius ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 60) return;
                                    handleUnitChange('borderRadius', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>

                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Box Shadow Opacity (%)</label>
                            <input 
                                type="number" min="0" max="100"
                                value={skinConfig.styling?.boxShadowStrength ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 100) return;
                                    handleUnitChange('boxShadowStrength', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '1rem' }}>
                        <ColorPicker
                            label="Background Color"
                            value={skinConfig.styling?.backgroundColor || '#292929'}
                            onChange={value => handleStylingChange('backgroundColor', value)}
                        />
                    </div>
                </SubSection>
                {/* 3C. GAME SECTION LAYOUT */}
                <SubSection title="Game Section Layout">
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        
                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Orientation</label>
                            <select 
                                value={skinConfig.styling?.gameSection?.orientation || 'landscape'}
                                onChange={e => handleGameSectionChange('orientation', e.target.value)} 
                                style={styles.input}
                            >
                                <option value="landscape">Landscape (16:9)</option>
                                <option value="portrait">Portrait (9:16)</option>
                            </select>
                        </div>

                        {/* Only show Alignment & Height Limit if Portrait (Mobile Mode) */}
                        {skinConfig.styling?.gameSection?.orientation === 'portrait' && (
                            <>
                                <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                    <label>Alignment</label>
                                    <select 
                                        value={skinConfig.styling?.gameSection?.alignment || 'center'}
                                        onChange={e => handleGameSectionChange('alignment', e.target.value)} 
                                        style={styles.input}
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>

                                <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                    <label>Maximum Popup Height (px)</label>
                                    <input 
                                        type="number" 
                                        min="200" 
                                        max="600" // Updated Guardrail: Matches ~75vh on standard laptops
                                        value={skinConfig.styling?.gameSection?.desktopHeightLimit ?? ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val !== '' && Number(val) > 600) return; // Strict Max Check
                                            const intVal = parseInt(val, 10);
                                            handleGameSectionChange('desktopHeightLimit', isNaN(intVal) ? undefined : intVal);
                                        }}
                                        style={styles.input}
                                        placeholder="Auto"
                                    />
                                    <p style={styles.descriptionText}>Overrides the default max height. Leave empty for auto (75vh).</p>
                                </div>
                            </>
                        )}
                        
                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                            <label>Game Radius (px)</label>
                            <input 
                                type="number" min="0" max="60"
                                value={skinConfig.styling?.gameSection?.borderRadius ?? 4}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val !== '' && Number(val) > 60) return;
                                    handleGameSectionChange('borderRadius', val === '' ? '' : Number(val));
                                }}
                                style={styles.input}
                            />
                        </div>

                        {/* --- Game Section Padding Controls (Global) --- */}
                        <div style={{ flex: '1 1 100%', display: 'flex', gap: '1rem', marginTop: '0.5rem', backgroundColor: '#f5f5f5', padding: '0.75rem', borderRadius: '6px' }}>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Top</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.gameSection?.paddingTop ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleGameSectionChange('paddingTop', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Bottom</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.gameSection?.paddingBottom ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleGameSectionChange('paddingBottom', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                            <div style={{ ...styles.configItem, flex: 1 }}>
                                <label>Padding Sides</label>
                                <input 
                                    type="number" min="0" max="120"
                                    value={skinConfig.styling?.gameSection?.paddingX ?? 0}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val !== '' && Number(val) > 120) return;
                                        handleGameSectionChange('paddingX', val === '' ? '' : Number(val));
                                    }}
                                    style={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- SIDE CONTENT SLOTS (Portrait Only) --- */}
                    {skinConfig.styling?.gameSection?.orientation === 'portrait' && (
                        <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #eee', paddingTop: '1rem' }}>
                            <h5 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Side Content Slots</h5>
                            
                            {/* Slot Styling Controls - Only show if a slot is active */}
                            {(skinConfig.styling?.gameSection?.leftContent || skinConfig.styling?.gameSection?.rightContent) && (
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
                                    <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                        <label>Vertical Alignment</label>
                                        <select 
                                            value={skinConfig.styling?.gameSection?.slotVerticalAlign || 'center'}
                                            onChange={e => handleGameSectionChange('slotVerticalAlign', e.target.value)} 
                                            style={styles.input}
                                        >
                                            <option value="top">Top</option>
                                            <option value="center">Center</option>
                                            <option value="bottom">Bottom</option>
                                        </select>
                                    </div>
                                    
                                    <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                        <label>Padding Sides (px)</label>
                                        <input 
                                            type="number" min="0" max="120"
                                            value={skinConfig.styling?.gameSection?.slotPaddingX ?? 0}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val !== '' && Number(val) > 120) return;
                                                handleGameSectionChange('slotPaddingX', val === '' ? '' : Number(val));
                                            }}
                                            style={styles.input}
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Conditional Top Padding */}
                                    {skinConfig.styling?.gameSection?.slotVerticalAlign === 'top' && (
                                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                            <label>Padding Top (px)</label>
                                            <input 
                                                type="number" min="0" max="120"
                                                value={skinConfig.styling?.gameSection?.slotPaddingTop ?? 0}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val !== '' && Number(val) > 120) return;
                                                    handleGameSectionChange('slotPaddingTop', val === '' ? '' : Number(val));
                                                }}
                                                style={styles.input}
                                                placeholder="0"
                                            />
                                        </div>
                                    )}

                                    {/* Conditional Bottom Padding */}
                                    {skinConfig.styling?.gameSection?.slotVerticalAlign === 'bottom' && (
                                        <div style={{ ...styles.configItem, flex: '1 1 45%' }}>
                                            <label>Padding Bottom (px)</label>
                                            <input 
                                                type="number" min="0" max="120"
                                                value={skinConfig.styling?.gameSection?.slotPaddingBottom ?? 0}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val !== '' && Number(val) > 120) return;
                                                    handleGameSectionChange('slotPaddingBottom', val === '' ? '' : Number(val));
                                                }}
                                                style={styles.input}
                                                placeholder="0"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* LEFT SLOT: Show if Alignment is Center or Right */}
                            {(skinConfig.styling?.gameSection?.alignment === 'center' || skinConfig.styling?.gameSection?.alignment === 'right') && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Left Side Content</label>
                                    {!skinConfig.styling?.gameSection?.leftContent && skinConfig.styling?.gameSection?.leftContent !== '' ? (
                                        <button 
                                            type="button" 
                                            onClick={() => handleGameSectionChange('leftContent', '<p>Add content here...</p>')}
                                            style={styles.secondaryButton}
                                        >
                                            + Add Left Content
                                        </button>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <SimpleTextEditor 
                                                initialHtml={skinConfig.styling?.gameSection?.leftContent || ''}
                                                onChange={(html) => handleGameSectionChange('leftContent', html)}
                                                backgroundColor={globalBg}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleGameSectionChange('leftContent', null)}
                                                style={{ ...styles.deleteButton, marginTop: '0.5rem' }}
                                            >
                                                Remove Left Content
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* RIGHT SLOT: Show if Alignment is Center or Left */}
                            {(skinConfig.styling?.gameSection?.alignment === 'center' || skinConfig.styling?.gameSection?.alignment === 'left') && (
                                <div>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Right Side Content</label>
                                    {!skinConfig.styling?.gameSection?.rightContent && skinConfig.styling?.gameSection?.rightContent !== '' ? (
                                        <button 
                                            type="button" 
                                            onClick={() => handleGameSectionChange('rightContent', '<p>Add content here...</p>')}
                                            style={styles.secondaryButton}
                                        >
                                            + Add Right Content
                                        </button>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <SimpleTextEditor 
                                                initialHtml={skinConfig.styling?.gameSection?.rightContent || ''}
                                                onChange={(html) => handleGameSectionChange('rightContent', html)}
                                                backgroundColor={globalBg}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleGameSectionChange('rightContent', null)}
                                                style={{ ...styles.deleteButton, marginTop: '0.5rem' }}
                                            >
                                                Remove Right Content
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </SubSection>

            </FormSection>
        </>
    );
};