/* src/components/builders/macrogame/GlobalStylingSettings.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { SmartNumberInput } from '../../ui/inputs/SmartNumberInput';

export const FONT_OPTIONS = [
    { label: 'System Default (San Francisco / Segoe UI)', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
    { label: 'Serif (Times New Roman / Georgia)', value: "Georgia, 'Times New Roman', Times, serif" },
    { label: 'Monospace (Courier New)', value: "'Courier New', Courier, monospace" },
    { label: 'Modern Sans (Verdana / Geneva)', value: "Verdana, Geneva, Tahoma, sans-serif" },
    { label: 'Classic Sans (Arial / Helvetica)', value: "Arial, Helvetica, sans-serif" }
];

export interface GlobalStylingSettingsProps {
    globalStyling: any;
    setGlobalStyling: React.Dispatch<React.SetStateAction<any>>;
    conversionScreenId: string | null;
    conversionScreenConfig: any;
    setConversionScreenConfig: React.Dispatch<React.SetStateAction<any>>;
    customFontFile: File | null;
    setCustomFontFile: React.Dispatch<React.SetStateAction<File | null>>;
    fontInputKey: number;
    setFontInputKey: React.Dispatch<React.SetStateAction<number>>;
}

export const GlobalStylingSettings: React.FC<GlobalStylingSettingsProps> = ({
    globalStyling,
    setGlobalStyling,
    conversionScreenId,
    conversionScreenConfig,
    setConversionScreenConfig,
    customFontFile,
    setCustomFontFile,
    fontInputKey,
    setFontInputKey
}) => {
    return (
        <>
            <h3 style={{...styles.h3, marginTop: '2rem'}}>Macrogame Styling</h3>
            <div style={styles.configContainer}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={styles.configItem}>
                        <label>Global Mode</label>
                        <select 
                            value={globalStyling.theme} 
                            onChange={e => setGlobalStyling((p: any) => ({ ...p, theme: e.target.value as 'dark' | 'light' }))} 
                            style={styles.input}
                        >
                            <option value="dark">Dark Mode (Default)</option>
                            <option value="light">Light Mode</option>
                        </select>
                    </div>
                    <div style={styles.configItem}>
                        <label>Font Source</label>
                        <select 
                            value={globalStyling.fontType || 'standard'} 
                            onChange={e => setGlobalStyling((p: any) => ({ ...p, fontType: e.target.value as any, fontFamily: e.target.value === 'standard' ? FONT_OPTIONS[0].value : '' }))} 
                            style={styles.input}
                        >
                            <option value="standard">Standard Web Fonts</option>
                            <option value="google">Google Fonts</option>
                            <option value="custom">Upload Custom Font</option>
                        </select>
                    </div>

                    {(!globalStyling.fontType || globalStyling.fontType === 'standard') && (
                        <div style={styles.configItem}>
                            <label>Global Font Family</label>
                            <select 
                                value={globalStyling.fontFamily} 
                                onChange={e => setGlobalStyling((p: any) => ({ ...p, fontFamily: e.target.value }))} 
                                style={styles.input}
                            >
                                {FONT_OPTIONS.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    )}

                    {globalStyling.fontType === 'google' && (
                        <>
                            <div style={styles.configItem}>
                                <label>Google Font Embed Code (or URL)</label>
                                <input 
                                    type="text" 
                                    placeholder="Paste the entire <link> block from Google Fonts here..." 
                                    value={globalStyling.googleFontUrl || ''} 
                                    onChange={e => {
                                        const rawInput = e.target.value;
                                        let finalUrl = rawInput;
                                        let inferredFamily = globalStyling.fontFamily;

                                        const hrefMatch = rawInput.match(/href=["'](https:\/\/fonts\.googleapis\.com[^"']+)["']/);
                                        if (hrefMatch && hrefMatch[1]) {
                                            finalUrl = hrefMatch[1];
                                        }

                                        const familyMatch = finalUrl.match(/family=([^&:]+)/);
                                        if (familyMatch && familyMatch[1]) {
                                            const parsedName = familyMatch[1].replace(/\+/g, ' ');
                                            inferredFamily = `'${parsedName}', sans-serif`;
                                        }

                                        setGlobalStyling((p: any) => ({ 
                                            ...p, 
                                            googleFontUrl: finalUrl,
                                            fontFamily: inferredFamily
                                        }));
                                    }} 
                                    style={styles.input} 
                                />
                                <p style={{...styles.descriptionText, marginTop: '0.25rem', fontSize: '0.8rem'}}>Just copy and paste the block Google gives you. We will extract what we need.</p>
                            </div>
                            <div style={styles.configItem}>
                                <label>CSS Font Family Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 'Roboto', sans-serif" 
                                    value={globalStyling.fontFamily || ''} 
                                    onChange={e => setGlobalStyling((p: any) => ({ ...p, fontFamily: e.target.value }))} 
                                    style={styles.input} 
                                />
                            </div>
                        </>
                    )}

                    {globalStyling.fontType === 'custom' && (
                        <>
                            <div style={styles.configItem}>
                                <label>Upload Font File (.ttf, .woff2, .otf)</label>
                                {(globalStyling.customFontUrl || customFontFile) ? (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem'}}>
                                        <p style={{fontSize: '0.8rem', margin: 0}}>Current: {customFontFile ? customFontFile.name : 'Uploaded Font'}</p>
                                        <button 
                                            type="button" 
                                            onClick={() => { 
                                                setCustomFontFile(null); 
                                                setGlobalStyling((p: any) => ({...p, customFontUrl: '', fontFamily: FONT_OPTIONS[0].value})); 
                                                setFontInputKey(k => k + 1); 
                                            }} 
                                            style={{...styles.deleteButton, padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <input 
                                        key={`font-input-${fontInputKey}`} 
                                        type="file" 
                                        accept=".ttf,.otf,.woff,.woff2" 
                                        style={styles.input} 
                                        onChange={e => { 
                                            if (e.target.files?.[0]) {
                                                const file = e.target.files[0];
                                                setCustomFontFile(file);
                                                
                                                const blobUrl = URL.createObjectURL(file);
                                                const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '');
                                                
                                                setGlobalStyling((p: any) => ({ 
                                                    ...p, 
                                                    customFontUrl: blobUrl,
                                                    fontFamily: p.fontFamily ? p.fontFamily : `'${safeName}', sans-serif` 
                                                }));
                                            } 
                                        }} 
                                    />
                                )}
                            </div>
                            <div style={styles.configItem}>
                                <label>CSS Font Family Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 'MyBrandFont', sans-serif" 
                                    value={globalStyling.fontFamily || ''} 
                                    onChange={e => setGlobalStyling((p: any) => ({ ...p, fontFamily: e.target.value }))} 
                                    style={styles.input} 
                                />
                            </div>
                        </>
                    )}
                    <div style={styles.configItem}>
                        <label>Global Border Radius (px)</label>
                        <SmartNumberInput 
                            min={0} max={60}
                            value={globalStyling.borderRadius ?? 0}
                            fallbackValue={0}
                            onChange={val => setGlobalStyling((p: any) => ({ ...p, borderRadius: Math.min(60, Math.max(0, val)) }))}
                            style={styles.input}
                        />
                    </div>
                    <div style={{ ...styles.configItem, flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', gridColumn: conversionScreenId ? '1 / -1' : 'auto' }}>
                        <label>Global Content Width (%)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input 
                                type="range" min="20" max="100" step="5"
                                value={globalStyling.width}
                                onChange={e => setGlobalStyling((p: any) => ({ ...p, width: Number(e.target.value) }))}
                                style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <SmartNumberInput 
                                    min={20} max={100}
                                    value={globalStyling.width ?? 100}
                                    fallbackValue={100}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, width: Math.min(100, Math.max(20, val)) }))}
                                    style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                />
                                <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                            </div>
                        </div>

                        {conversionScreenId && (
                            <div style={{ 
                                marginTop: '0.5rem', 
                                padding: '1.25rem', 
                                backgroundColor: '#f8f9fa', 
                                borderRadius: '0 6px 6px 0', 
                                borderTop: '1px solid #ddd',
                                borderRight: '1px solid #ddd',
                                borderBottom: '1px solid #ddd',
                                borderLeft: '4px solid #0866ff' 
                            }}>
                                <h6 style={{ margin: '0 0 0.25rem 0', color: '#333', fontSize: '0.9rem', textTransform: 'uppercase' }}>Conversion Screen Content Width</h6>
                                <p style={{...styles.descriptionText, marginBottom: '1.25rem', fontSize: '0.85rem'}}>
                                    Control how your attached Conversion Screen adapts to the Global Content Width set above.
                                </p>
                                
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: conversionScreenConfig.syncWidth ? 0 : '1.5rem', fontSize: '0.85rem' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={conversionScreenConfig.syncWidth} 
                                        onChange={e => setConversionScreenConfig((p: any) => ({ ...p, syncWidth: e.target.checked }))} 
                                    />
                                    <strong>Sync perfectly with Global Content Width</strong>
                                </label>

                                {!conversionScreenConfig.syncWidth && (
                                    <>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem' }}>Custom Conversion Screen Width (%)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <input 
                                                type="range" min="20" max="100" step="5"
                                                value={conversionScreenConfig.customWidth}
                                                onChange={e => setConversionScreenConfig((p: any) => ({ ...p, customWidth: Number(e.target.value) }))}
                                                style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                                            />
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <SmartNumberInput 
                                                    min={20} max={100}
                                                    value={conversionScreenConfig.customWidth ?? 100}
                                                    fallbackValue={100}
                                                    onChange={val => setConversionScreenConfig((p: any) => ({ ...p, customWidth: Math.min(100, Math.max(20, val)) }))}
                                                    style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                                />
                                                <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ ...styles.configItem, gridColumn: conversionScreenId ? '1 / -1' : 'auto' }}>
                        <label>Content Height (%)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input 
                                type="range" min="20" max="100" step="5"
                                value={globalStyling.height}
                                onChange={e => setGlobalStyling((p: any) => ({ ...p, height: Number(e.target.value) }))}
                                style={{ flex: 1, cursor: 'pointer', margin: 0 }}
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <SmartNumberInput 
                                    min={20} max={100}
                                    value={globalStyling.height ?? 100}
                                    fallbackValue={100}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, height: Math.min(100, Math.max(20, val)) }))}
                                    style={{ ...styles.input, width: '100px', paddingRight: '2rem' }}
                                />
                                <span style={{ position: 'absolute', right: '10px', fontSize: '0.8rem', color: '#666', pointerEvents: 'none' }}>%</span>
                            </div>
                        </div>
                    </div>

                    {/* --- HUD POSITIONING --- */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>HUD Positioning (Unified Chrome)</h5>
                        <p style={{...styles.descriptionText, marginBottom: '1rem', fontSize: '0.8rem'}}>
                            Control where the Game HUD (Points, Timer, Progress) sits relative to the device screen or the content safe area.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div style={styles.configItem}>
                                <label>HUD Layout Constraint</label>
                                <select 
                                    value={globalStyling.hudLayout || 'viewport'} 
                                    onChange={e => setGlobalStyling((p: any) => ({ ...p, hudLayout: e.target.value as 'viewport' | 'safe_area' }))} 
                                    style={styles.input}
                                >
                                    <option value="viewport">Span Full Screen (Viewport)</option>
                                    <option value="safe_area">Align to Content (Safe Area)</option>
                                </select>
                            </div>
                            <div style={styles.configItem}>
                                <label>Padding Top/Bottom (px)</label>
                                <SmartNumberInput 
                                    min={0} max={100}
                                    value={globalStyling.hudPaddingY ?? 16}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, hudPaddingY: Math.min(100, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.configItem}>
                                <label>Padding Left/Right (px)</label>
                                <SmartNumberInput 
                                    min={0} max={100}
                                    value={globalStyling.hudPaddingX ?? 16}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, hudPaddingX: Math.min(100, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- BEZEL / OUTER FRAME PADDING --- */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px dashed #ccc', marginBottom: '2rem' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1rem', fontWeight: 'bold' }}>Outer Frame (Bezel) Padding</h5>
                        <p style={{...styles.descriptionText, marginBottom: '1rem', fontSize: '0.8rem'}}>
                            This creates a physical frame around your entire macrogame. This is mostly useful if you are embedding via an iframe and want strict boundary controls.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={styles.configItem}>
                                <label>Padding Top (px)</label>
                                <SmartNumberInput 
                                    min={0} max={200}
                                    value={globalStyling.paddingTop ?? 0}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, paddingTop: Math.min(200, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.configItem}>
                                <label>Padding Bottom (px)</label>
                                <SmartNumberInput 
                                    min={0} max={200}
                                    value={globalStyling.paddingBottom ?? 0}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, paddingBottom: Math.min(200, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.configItem}>
                                <label>Padding Left (px)</label>
                                <SmartNumberInput 
                                    min={0} max={200}
                                    value={globalStyling.paddingLeft ?? 0}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, paddingLeft: Math.min(200, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.configItem}>
                                <label>Padding Right (px)</label>
                                <SmartNumberInput 
                                    min={0} max={200}
                                    value={globalStyling.paddingRight ?? 0}
                                    fallbackValue={0}
                                    onChange={val => setGlobalStyling((p: any) => ({ ...p, paddingRight: Math.min(200, Math.max(0, val)) }))}
                                    style={styles.input}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};