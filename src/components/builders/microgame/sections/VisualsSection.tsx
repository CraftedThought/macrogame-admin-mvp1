/* src/components/builders/microgame/sections/VisualsSection.tsx */

import React from 'react';
import { styles } from '../../../../App.styles';
import { Microgame } from '../../../../types';
import { SmartNumberInput } from '../../../ui/inputs/SmartNumberInput';
import { SmartSlider } from '../../../ui/inputs/SmartSlider';

interface VisualsSectionProps {
    baseGame: Microgame;
    initialVariant: any;
    builder: any; // Receives the full hook return object
    handleSliderStart: (id?: string, shouldPreview?: boolean) => void;
}

export const VisualsSection: React.FC<VisualsSectionProps> = ({
    baseGame,
    initialVariant,
    builder
}) => {
    // Destructure everything we need from the builder object
    const {
        skinnableElements,
        gameDefinition,
        mechanicsValues,
        setMechanicsValues,
        slotGroupCounts,
        setSlotGroupCounts,
        skinPreviews,
        skinFiles,
        skinColors,
        itemNames,
        setItemNames,
        hitboxScales,
        setHitboxScales,
        handleQuantityChange,
        handleSliderStart,
        handleSliderEnd,
        getSliderProps, // Used directly from hook
        handleToggleGroupAll,
        handleDistributeChance,
        handleFileChange,
        handleRemoveFile,
        handleColorChange
    } = builder;
    
    // Filter out Audio
    const visualElements = skinnableElements.filter((el: any) => el.type !== 'audio');

    const handleGroupCountChange = (subId: string, newCount: number) => {
        setSlotGroupCounts((prev: any) => ({ ...prev, [subId]: newCount }));
    };

    if (visualElements.length === 0) {
        return (
            <div style={{ marginBottom: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                <h4 style={styles.h4}>Skinnable Elements</h4>
                <p style={{ color: '#666', fontStyle: 'italic' }}>This microgame has no customizable visual assets.</p>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <h4 style={styles.h4}>Skinnable Elements</h4>
            <p style={{...styles.descriptionText, marginBottom: '1.5rem'}}>
                Upload an image to reskin an element that is in the Microgame you are customizing.
            </p>
            
            {visualElements.map((element: any) => {
                // 1. Determine Quantity
                let quantity = 1;
                if (element.quantityDrivenBy) {
                    const val = mechanicsValues[element.quantityDrivenBy];
                    const defaultVal = gameDefinition?.mechanics?.[element.quantityDrivenBy]?.defaultValue;
                    quantity = typeof val === 'number' ? val : (defaultVal as number || 1);
                }

                const isMulti = quantity > 1;
                const isVariety = element.quantityDrivenBy?.toLowerCase().includes('variety');

                // 2. Build Render List based on Groups
                const slotsToRender = [];
                let currentIndex = 0;

                while (currentIndex < quantity) {
                    const subId = isMulti ? `${element.id}_${currentIndex}` : element.id;
                    
                    let groupCount = slotGroupCounts[subId] || 1;
                    const maxAllowed = quantity - currentIndex;
                    if (groupCount > maxAllowed) groupCount = maxAllowed;

                    slotsToRender.push({
                        subId: subId,
                        label: isMulti ? `${element.name} ${currentIndex + 1}` : element.name,
                        index: currentIndex,
                        groupCount: groupCount,
                        maxCount: maxAllowed,
                        isBase: !isMulti
                    });

                    currentIndex += groupCount;
                }

                return (
                    <div key={element.id} style={{ marginBottom: '1.5rem', border: '1px solid #eee', padding: '1rem', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <label style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>{element.name}</label>
                                    {element.recommendation && <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>{element.recommendation}</p>}
                                </div>
                            </div>

                            {/* CONFIGURATION BAR */}
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f0f2f5', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                
                                {/* A. QUANTITY SLIDER */}
                                {element.quantityDrivenBy && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <SmartSlider
                                                label={`${gameDefinition?.mechanics?.[element.quantityDrivenBy]?.label}`}
                                                value={mechanicsValues[element.quantityDrivenBy] ?? gameDefinition?.mechanics?.[element.quantityDrivenBy]?.defaultValue}
                                                min={gameDefinition?.mechanics?.[element.quantityDrivenBy]?.min}
                                                max={gameDefinition?.mechanics?.[element.quantityDrivenBy]?.max}
                                                step={gameDefinition?.mechanics?.[element.quantityDrivenBy]?.step}
                                                onChange={(val) => handleQuantityChange(element.id, val)}
                                                // Pass the preview hooks!
                                                onPointerDown={() => handleSliderStart(element.quantityDrivenBy, false)} // Pass false
                                                onPointerUp={handleSliderEnd}
                                            />
                                        </div>

                                        {/* Group All Checkbox */}
                                        {quantity > 1 && !isVariety && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', borderLeft: '1px solid #ddd', paddingLeft: '1rem', marginTop: '12px' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={slotGroupCounts[`${element.id}_0`] === quantity}
                                                    onChange={(e) => handleToggleGroupAll(element.id, quantity, e.target.checked)}
                                                />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>Group All</span>
                                            </label>
                                        )}
                                    </div>
                                )}

                                {/* B. SPAWN CHANCE */}
                                {(element.id === 'goodItem' || element.id === 'badItem') && (
                                    <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                        <SmartSlider
                                            label="Spawn Chance"
                                            suffix="%"
                                            min={0} max={100} step={5}
                                            value={element.id === 'goodItem' 
                                                ? Math.round((1 - (mechanicsValues['badItemChance'] ?? 0.3)) * 100)
                                                : Math.round((mechanicsValues['badItemChance'] ?? 0.3) * 100)
                                            }
                                            onChange={(val) => {
                                                const newBadChance = element.id === 'goodItem' ? (1 - (val / 100)) : (val / 100);
                                                const clamped = Math.max(0, Math.min(1, newBadChance));
                                                setMechanicsValues((prev: any) => ({ ...prev, 'badItemChance': Number(clamped.toFixed(2)) }));
                                            }}
                                            onPointerDown={() => handleSliderStart('badItemChance', false)} // Pass false
                                            onPointerUp={handleSliderEnd}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {slotsToRender.map((slot) => {
                                // Use Nullish Coalescing (??) so an empty string "" (removed state) overrides the saved URL
                                const currentPreview = skinPreviews[slot.subId] ?? initialVariant?.skinData[slot.subId]?.url;
                                const hasConstraints = !!element.constraints;
                                
                                // Resolve Filename (New File -> Saved File -> Fallback)
                                // Check if explicit removal (empty string preview) happened
                                const isRemoved = skinPreviews[slot.subId] === "";
                                const savedFileName = initialVariant?.skinData[slot.subId]?.fileName;
                                const displayFileName = isRemoved 
                                    ? "No file chosen" 
                                    : (skinFiles[slot.subId]?.name || savedFileName || "No file chosen");

                                return (
                                    <div key={slot.subId} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: slot.isBase ? 0 : '1rem', backgroundColor: slot.isBase ? 'transparent' : '#f9f9f9', borderRadius: '6px', border: slot.isBase ? 'none' : '1px solid #eee' }}>
                                        
                                        {/* LEFT: Preview */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ 
                                                width: '80px', height: '80px', 
                                                backgroundColor: !currentPreview ? (skinColors[slot.subId] || '#e9ecef') : '#e9ecef', 
                                                borderRadius: '4px', overflow: 'hidden',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px dashed #ccc', flexShrink: 0,
                                            }}>
                                                {currentPreview ? (
                                                    <img src={currentPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', color: '#999', mixBlendMode: 'difference' }}>Default</span>
                                                )}
                                            </div>

                                            {!currentPreview && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                                    <label style={{ fontSize: '0.7rem', color: '#666', marginBottom: '2px' }}>Color</label>
                                                    <input 
                                                        type="color"
                                                        value={skinColors[slot.subId] || element.defaultColor || '#ffffff'}
                                                        onChange={(e) => handleColorChange(slot.subId, e.target.value)}
                                                        style={{ width: '100%', height: '25px', padding: 0, border: 'none', cursor: 'pointer' }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT: Inputs */}
                                        <div style={{ flex: 1 }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <input 
                                                    type="text" placeholder={slot.label} 
                                                    value={itemNames[slot.subId] || ''}
                                                    onChange={(e) => setItemNames((prev: any) => ({ ...prev, [slot.subId]: e.target.value }))}
                                                    style={{ 
                                                        fontSize: '0.9rem', fontWeight: 'bold', 
                                                        border: '1px solid #ccc', borderRadius: '4px',
                                                        padding: '4px 8px', flex: 1
                                                    }}
                                                />

                                                {isMulti && !isVariety && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: '#eef', padding: '2px 6px', borderRadius: '4px', border: '1px solid #dde' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600 }}>Count:</span>
                                                        <SmartNumberInput 
                                                            min={1} 
                                                            max={quantity - slot.index}
                                                            value={slot.groupCount}
                                                            onChange={(val) => handleGroupCountChange(slot.subId, val)}
                                                            style={{ 
                                                                width: '40px', fontSize: '0.8rem', fontWeight: 'bold', 
                                                                textAlign: 'center', border: 'none', background: 'transparent'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Variant Chance Slider */}
                                            {isMulti && isVariety && (
                                                <SmartSlider
                                                    label="Type Probability"
                                                    suffix="%"
                                                    min={0} max={100} step={1}
                                                    value={mechanicsValues[`${element.id}_${slot.index}_chance`] ?? Math.floor(100/quantity)}
                                                    onChange={(val) => handleDistributeChance(element.id, slot.index, val, quantity)}
                                                    onPointerDown={() => handleSliderStart(`${element.id}_${slot.index}_chance`, false)} // Pass false
                                                    onPointerUp={handleSliderEnd}
                                                    description={`Chance that a spawned "${element.name}" is this type.`}
                                                />
                                            )}

                                            {/* Associated Mechanics */}
                                            {element.associatedMechanics && (
                                                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px dashed #eee' }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
                                                        Properties
                                                    </label>
                                                    {element.associatedMechanics.map((mechKey: string) => {
                                                        if (mechKey === 'badItemChance') return null; // Handled globally
                                                        const def = gameDefinition?.mechanics?.[mechKey];
                                                        if (!def) return null;
                                                        
                                                        const specificKey = `${slot.subId}_${mechKey}`;
                                                        const bindingKey = specificKey; 
                                                        const val = mechanicsValues[bindingKey] ?? mechanicsValues[mechKey] ?? def.defaultValue;

                                                        return (
                                                            <div key={bindingKey} style={{ marginBottom: '0.5rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                    <label style={{ fontSize: '0.75rem' }}>{def.label}</label>
                                                                    <span style={{ fontSize: '0.75rem', color: '#666' }}>{val}</span>
                                                                </div>
                                                                {def.type === 'slider' ? (
                                                                    <SmartSlider
                                                                        label={def.label} // Pass label directly to slider
                                                                        min={def.min} max={def.max} step={def.step}
                                                                        value={val}
                                                                        onChange={(newVal) => setMechanicsValues((prev: any) => ({ ...prev, [bindingKey]: newVal }))}
                                                                        // SPREAD the preview props from the hook!
                                                                        {...getSliderProps(specificKey)}
                                                                    />
                                                                ) : (
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={!!val}
                                                                            onChange={(e) => setMechanicsValues((prev: any) => ({ ...prev, [bindingKey]: e.target.checked }))}
                                                                            style={{ marginRight: '0.5rem' }}
                                                                        />
                                                                        <span style={{ fontSize: '0.8rem' }}>{val ? 'On' : 'Off'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* File Upload */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <label style={{ 
                                                        backgroundColor: '#f0f2f5', border: '1px solid #ccc', borderRadius: '4px',
                                                        padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer',
                                                        fontWeight: 600, color: '#333', whiteSpace: 'nowrap'
                                                    }}>
                                                        Choose File
                                                        <input 
                                                            key={currentPreview ? 'has-file' : 'no-file'}
                                                            type="file" accept="image/png, image/jpeg, image/svg+xml"
                                                            onChange={(e) => handleFileChange(slot.subId, e.target.files?.[0] || null)}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>

                                                    <span style={{ fontSize: '0.8rem', color: (skinFiles[slot.subId] || savedFileName) ? '#333' : '#999', fontStyle: (skinFiles[slot.subId] || savedFileName) ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                                        {displayFileName}
                                                    </span>
                                                    
                                                    {currentPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile(slot.subId)}
                                                            style={{
                                                                backgroundColor: '#fff', border: '1px solid #e74c3c', color: '#e74c3c',
                                                                borderRadius: '4px', padding: '0.4rem 0.8rem', fontSize: '0.8rem',
                                                                cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 'auto'
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Hitbox Slider */}
                                            {hasConstraints && currentPreview && element.physics && (
                                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f1f3f5', borderRadius: '6px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Hitbox (Collision)</label>
                                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>{Math.round((hitboxScales[slot.subId] || 1) * 100)}%</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0.25" max="1.0" step="0.05"
                                                            value={hitboxScales[slot.subId] || 1}
                                                            onChange={(e) => setHitboxScales((prev: any) => ({ ...prev, [slot.subId]: Number(e.target.value) }))}
                                                            // Force 'true' to trigger Freeze Frame + Hitbox Visualization
                                                            onPointerDown={() => handleSliderStart(slot.subId, true)}
                                                            onPointerUp={handleSliderEnd}
                                                            style={{ width: '100%', cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};