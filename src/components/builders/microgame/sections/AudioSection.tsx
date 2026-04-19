/* src/components/builders/microgame/sections/AudioSection.tsx */

import React from 'react';
import { styles } from '../../../../App.styles';
import { MACROGAME_MUSIC_LIBRARY, MICROGAME_SFX_LIBRARY } from '../../../../constants';

interface AudioSectionProps {
    skinnableElements: any[];
    skinPreviews: { [key: string]: string };
    skinFiles: { [key: string]: File | null };
    audioVolumes: { [key: string]: number };
    playingAudioId: string | null;
    audioTriggers: { [key: string]: string[] };
    initialVariant: any;
    expandedEvents: any[];
    
    // Handlers
    handleToggleAudio: (id: string, url: string) => void;
    handleVolumeChange: (id: string, vol: number) => void;
    handleFileChange: (id: string, file: File | null) => void;
    handleRemoveFile: (id: string) => void;
    setSkinPreviews: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    setSkinFiles: React.Dispatch<React.SetStateAction<{ [key: string]: File | null }>>;
    setAudioTriggers: React.Dispatch<React.SetStateAction<{ [key: string]: string[] }>>;
    setAudioVolumes: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
    
    // Layers
    audioLayers: { [key: string]: string[] };
    handleAddAudioLayer: (baseId: string) => void;
    handleRemoveAudioLayer: (baseId: string, layerId: string) => void;

    // Slider Handlers
    handleSliderStart: (id?: string, shouldPreview?: boolean) => void;
    handleSliderEnd: () => void;
}

// --- SUB-COMPONENT (Defined outside to prevent re-renders/janky sliders) ---
const AudioControlRow = ({ 
    id, 
    isLayer = false, 
    baseElement, 
    availableEvents,
    otherClaimedEvents,
    // Passed Data & Handlers
    skinPreviews,
    initialVariant,
    audioVolumes,
    playingAudioId,
    skinFiles,
    audioTriggers,
    handleToggleAudio,
    handleVolumeChange,
    handleFileChange,
    handleRemoveFile,
    handleRemoveAudioLayer,
    setSkinPreviews,
    setSkinFiles,
    setAudioTriggers,
    handleSliderStart,
    handleSliderEnd
}: { 
    id: string, 
    isLayer?: boolean, 
    baseElement: any, 
    availableEvents: any[],
    otherClaimedEvents: Set<string>,
    // Data Types
    skinPreviews: any,
    initialVariant: any,
    audioVolumes: any,
    playingAudioId: string | null,
    skinFiles: any,
    audioTriggers: any,
    // Handler Types
    handleToggleAudio: (id: string, url: string) => void,
    handleVolumeChange: (id: string, vol: number) => void,
    handleFileChange: (id: string, file: File | null) => void,
    handleRemoveFile: (id: string) => void,
    handleRemoveAudioLayer: (baseId: string, layerId: string) => void,
    setSkinPreviews: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>,
    setSkinFiles: React.Dispatch<React.SetStateAction<{ [key: string]: File | null }>>,
    setAudioTriggers: React.Dispatch<React.SetStateAction<{ [key: string]: string[] }>>,
    handleSliderStart: (id?: string, shouldPreview?: boolean) => void,
    handleSliderEnd: () => void
}) => {
    
    // Resolve Current URL
    const currentUrl = skinPreviews[id] || 
                       initialVariant?.skinData[id]?.url || 
                       (!isLayer ? (baseElement as any).defaultAudioUrl : undefined);
    
    const currentVolume = audioVolumes[id] ?? 1.0;
    const isPlaying = playingAudioId === id;

    const library = baseElement.id.toLowerCase().includes('music') || baseElement.id.toLowerCase().includes('bg') 
        ? MACROGAME_MUSIC_LIBRARY 
        : MICROGAME_SFX_LIBRARY;

    const currentLibraryId = currentUrl 
        ? library.find(t => t.path === currentUrl)?.id || "" 
        : "";

    return (
        <div style={{ 
            marginTop: isLayer ? '1rem' : 0, 
            padding: isLayer ? '1rem' : 0,
            borderTop: isLayer ? '1px dashed #eee' : 'none',
            position: 'relative'
        }}>
            {isLayer && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666' }}>Additional Rule</span>
                    <button type="button" onClick={() => handleRemoveAudioLayer(baseElement.id, id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Remove Rule</button>
                </div>
            )}

            {/* TITLE */}
            {!isLayer && <label style={{ fontWeight: 'bold', fontSize: '1rem', display: 'block', marginBottom: '0.75rem' }}>{baseElement.name}</label>}

            {/* MAIN CONTROLS ROW */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                
                {/* 1. SELECTOR */}
                <div style={{ flex: 1 }}>
                    <select 
                        style={{ ...styles.select, width: '100%', fontSize: '0.85rem' }}
                        value={currentLibraryId}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val || val === 'none') {
                                    setSkinPreviews(prev => { const n = { ...prev }; delete n[id]; return n; });
                                    setSkinFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
                                    if (isPlaying) handleToggleAudio(id, ""); 
                                    return;
                            }
                            const selected = library.find(t => t.id === val);
                            if (selected && selected.path) {
                                setSkinPreviews(prev => ({ ...prev, [id]: selected.path! }));
                                setSkinFiles(prev => { const n = { ...prev }; delete n[id]; return n; });
                                handleToggleAudio(id, selected.path!);
                            }
                        }}
                    >
                        <option value="">Select Default...</option>
                        {library.filter(t => t.id !== 'none').map(track => (
                            <option key={track.id} value={track.id}>{track.name}</option>
                        ))}
                    </select>
                </div>

                <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 500 }}>OR</span>

                {/* 2. UPLOAD */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ 
                        backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px',
                        padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
                        fontWeight: 600, color: '#333', whiteSpace: 'nowrap', flexShrink: 0
                    }}>
                        Upload File
                        <input 
                            type="file" accept="audio/mpeg, audio/wav, audio/mp3"
                            onChange={(e) => handleFileChange(id, e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                        />
                    </label>
                    
                    <span style={{ fontSize: '0.75rem', color: (skinFiles[id] || (skinPreviews[id] && !currentLibraryId)) ? '#333' : '#999', fontStyle: (skinFiles[id] || (skinPreviews[id] && !currentLibraryId)) ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                        {skinFiles[id]?.name || ((skinPreviews[id] && !currentLibraryId) ? "Custom File" : "No file")}
                    </span>

                    {(skinFiles[id] || (skinPreviews[id] && !currentLibraryId)) && (
                        <button 
                            type="button" 
                            onClick={() => {
                                handleRemoveFile(id);
                                if (isPlaying) handleToggleAudio(id, "");
                            }} 
                            style={{ padding: '0.2rem 0.5rem', backgroundColor: '#fff', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* PREVIEW & VOLUME (Only show if something is selected/uploaded) */}
            {currentUrl && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => handleToggleAudio(id, currentUrl)}
                        style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            border: 'none', backgroundColor: isPlaying ? '#e74c3c' : '#0866ff',
                            color: 'white', fontSize: '0.9rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>

                    <div style={{ flex: 1, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#666', display: 'block' }}>
                            Volume ({Math.round(currentVolume * 100)}%)
                        </label>
                        <input 
                            type="range" min="0" max="1" step="0.05"
                            value={currentVolume}
                            onChange={(e) => handleVolumeChange(id, Number(e.target.value))}
                            onPointerDown={() => handleSliderStart(id, false)}
                            onPointerUp={handleSliderEnd}
                            style={{ width: '100%', cursor: 'pointer', height: '6px' }}
                        />
                    </div>
                </div>
            )}

            {/* Check Block Logic for Global Sounds */}
            {currentUrl && availableEvents.length > 0 && !['bgmusic', 'sfxwin', 'sfxloss', 'sfxtryagain'].includes(baseElement.id.toLowerCase()) && (
                <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '0.4rem' }}>
                        Play On:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {availableEvents.map((evt) => {
                            const isChecked = audioTriggers[id]?.includes(evt.id);
                            const isClaimedByOther = otherClaimedEvents.has(evt.id);
                            return (
                                <label key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 6px', backgroundColor: isChecked ? '#e3f2fd' : (isClaimedByOther ? '#eee' : '#f5f5f5'), opacity: isClaimedByOther ? 0.6 : 1, borderRadius: '4px', cursor: isClaimedByOther ? 'not-allowed' : 'pointer', border: isChecked ? '1px solid #2196f3' : '1px solid #ddd' }} title={isClaimedByOther ? "Used in another rule" : ""}>
                                    <input type="checkbox" checked={!!isChecked} disabled={isClaimedByOther} onChange={(e) => { const checked = e.target.checked; setAudioTriggers(prev => { const currentList = prev[id] || []; const newList = checked ? [...currentList, evt.id] : currentList.filter(eid => eid !== evt.id); return { ...prev, [id]: newList }; }); }} />
                                    {evt.label}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
export const AudioSection: React.FC<AudioSectionProps> = ({
    skinnableElements,
    skinPreviews,
    skinFiles,
    audioVolumes,
    playingAudioId,
    audioTriggers,
    initialVariant,
    expandedEvents,
    handleToggleAudio,
    handleVolumeChange,
    handleFileChange,
    handleRemoveFile,
    setSkinPreviews,
    setSkinFiles,
    setAudioTriggers,
    audioLayers,
    handleAddAudioLayer,
    handleRemoveAudioLayer,
    handleSliderStart,
    handleSliderEnd
}) => {

    const audioElements = skinnableElements.filter(el => el.type === 'audio');
    if (audioElements.length === 0) return null;

    // Helper to filter events for a specific element
    const getAvailableEvents = (element: any) => {
        return expandedEvents.filter(evt => {
            if (evt.id === 'survive_interval') return false;
            const patterns = (element as any).allowedEventPatterns;
            if (patterns && Array.isArray(patterns) && patterns.length > 0) {
                const matches = patterns.some((p: string) => evt.id.includes(p));
                if (!matches) return false;
            }
            return true;
        });
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            <h5 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#666', marginBottom: '1rem', textTransform: 'uppercase' }}>Audio & SFX</h5>
            {audioElements.map(element => {
                const availableEvents = getAvailableEvents(element);
                const hasMultipleTargets = availableEvents.length > 1;
                const layers = audioLayers[element.id] || [];

                const baseHasAudio = !!(skinPreviews[element.id] || 
                                     initialVariant?.skinData[element.id]?.url || 
                                     (element as any).defaultAudioUrl);

                // 1. Identify Global Sounds (No Layering Allowed)
                const isGlobalAudio = ['bgmusic', 'sfxwin', 'sfxloss', 'sfxtryagain'].includes(element.id.toLowerCase());

                // 2. Calculate Claimed Sets for Mutual Exclusivity
                const baseTriggers = audioTriggers[element.id] || [];
                const allLayerTriggers = layers.flatMap(lId => audioTriggers[lId] || []);
                
                return (
                    <div key={element.id} style={{ marginBottom: '1rem', border: '1px solid #eee', padding: '1rem', borderRadius: '8px', backgroundColor: '#fff' }}>
                        
                        {/* Base Control */}
                        <AudioControlRow 
                            id={element.id} 
                            baseElement={element} 
                            availableEvents={availableEvents} 
                            otherClaimedEvents={new Set(allLayerTriggers)}
                            // Pass all props down explicitly
                            skinPreviews={skinPreviews}
                            initialVariant={initialVariant}
                            audioVolumes={audioVolumes}
                            playingAudioId={playingAudioId}
                            skinFiles={skinFiles}
                            audioTriggers={audioTriggers}
                            handleToggleAudio={handleToggleAudio}
                            handleVolumeChange={handleVolumeChange}
                            handleFileChange={handleFileChange}
                            handleRemoveFile={handleRemoveFile}
                            handleRemoveAudioLayer={handleRemoveAudioLayer}
                            setSkinPreviews={setSkinPreviews}
                            setSkinFiles={setSkinFiles}
                            setAudioTriggers={setAudioTriggers}
                            handleSliderStart={handleSliderStart}
                            handleSliderEnd={handleSliderEnd}
                        />

                        {/* Layers */}
                        {layers.map(layerId => {
                            const otherLayers = layers.filter(l => l !== layerId).flatMap(l => audioTriggers[l] || []);
                            const others = new Set([...baseTriggers, ...otherLayers]);

                            return (
                                <AudioControlRow 
                                    key={layerId}
                                    id={layerId}
                                    isLayer={true}
                                    baseElement={element}
                                    availableEvents={availableEvents}
                                    otherClaimedEvents={others}
                                    // Pass all props down explicitly
                                    skinPreviews={skinPreviews}
                                    initialVariant={initialVariant}
                                    audioVolumes={audioVolumes}
                                    playingAudioId={playingAudioId}
                                    skinFiles={skinFiles}
                                    audioTriggers={audioTriggers}
                                    handleToggleAudio={handleToggleAudio}
                                    handleVolumeChange={handleVolumeChange}
                                    handleFileChange={handleFileChange}
                                    handleRemoveFile={handleRemoveFile}
                                    handleRemoveAudioLayer={handleRemoveAudioLayer}
                                    setSkinPreviews={setSkinPreviews}
                                    setSkinFiles={setSkinFiles}
                                    setAudioTriggers={setAudioTriggers}
                                    handleSliderStart={handleSliderStart}
                                    handleSliderEnd={handleSliderEnd}
                                />
                            );
                        })}

                        {/* 3. Add Rule Button */}
                        {hasMultipleTargets && baseHasAudio && !isGlobalAudio && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                                <button 
                                    type="button"
                                    onClick={() => handleAddAudioLayer(element.id)}
                                    style={{
                                        width: '100%', padding: '0.5rem', 
                                        backgroundColor: '#fff', border: '1px dashed #ccc', 
                                        borderRadius: '4px', color: '#0866ff', fontWeight: 600, 
                                        fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    + Add Audio Rule
                                </button>
                                <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem', textAlign: 'center' }}>
                                    Create specific rules for different item types.
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};