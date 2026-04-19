/* src/components/builders/microgame/sections/BasicInfoSection.tsx */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { styles } from '../../../../App.styles';
import { Microgame } from '../../../../types';
import { SECTORS, SECTOR_CATEGORIES, CATEGORY_SUBCATEGORIES, SEASONALITY_OPTIONS, TARGET_AUDIENCE_OPTIONS, PROMOTION_COMPATIBILITY_OPTIONS } from '../../../../constants/taxonomy';

interface BasicInfoSectionProps {
    baseGame: Microgame;
    isGuidedMode: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ baseGame, isGuidedMode }) => {
    const { register, watch, setValue, formState: { errors } } = useFormContext();
    
    const watchSectors = watch('sectors') || [];
    const watchCategories = watch('categories') || [];
    const watchSubcategories = watch('subcategories') || [];
    const watchSeasonality = watch('seasonality') || [];
    const watchAudience = watch('targetAudience') || [];
    const watchPromo = watch('promotionCompatibility') || [];

    // --- CASCADING PRUNING LOGIC ---
    const toggleMultiSelect = (currentArray: string[], value: string): string[] => {
        if (value === 'All') return ['All'];
        const newArray = currentArray.filter(item => item !== 'All');
        if (newArray.includes(value)) {
            return newArray.filter(item => item !== value); // Allows returning [] so validation catches it
        }
        return [...newArray, value];
    };

    const handleSectorToggle = (sector: string) => {
        const newSectors = toggleMultiSelect(watchSectors, sector);
        setValue('sectors', newSectors);

        // Prune orphaned categories down the tree
        const validCats = newSectors.flatMap((s: string) => SECTOR_CATEGORIES[s] || []);
        const newCats = watchCategories.filter((c: string) => validCats.includes(c) || c === 'All');
        setValue('categories', newCats);

        // Prune orphaned subcategories down the tree
        const validSubs = newCats.flatMap((c: string) => CATEGORY_SUBCATEGORIES[c] || []);
        const newSubs = watchSubcategories.filter((s: string) => validSubs.includes(s) || s === 'All');
        setValue('subcategories', newSubs);
    };

    const handleCategoryToggle = (category: string) => {
        const newCats = toggleMultiSelect(watchCategories, category);
        setValue('categories', newCats);

        // Prune orphaned subcategories down the tree
        const validSubs = newCats.flatMap((c: string) => CATEGORY_SUBCATEGORIES[c] || []);
        const newSubs = watchSubcategories.filter((s: string) => validSubs.includes(s) || s === 'All');
        setValue('subcategories', newSubs);
    };

    const handleSubcategoryToggle = (sub: string) => {
        setValue('subcategories', toggleMultiSelect(watchSubcategories, sub));
    };

    const handleSeasonalityToggle = (season: string) => {
        setValue('seasonality', toggleMultiSelect(watchSeasonality, season));
    };

    const handleAudienceToggle = (audience: string) => {
        setValue('targetAudience', toggleMultiSelect(watchAudience, audience));
    };

    const handlePromoToggle = (promo: string) => {
        setValue('promotionCompatibility', toggleMultiSelect(watchPromo, promo));
    };

    // Reusable Pill Component for clean multi-selects
    const Pill: React.FC<{ label: string; isSelected: boolean; onClick: () => void }> = ({ label, isSelected, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: '4px 12px',
                borderRadius: '16px',
                border: `1px solid ${isSelected ? '#0866ff' : '#ccc'}`,
                backgroundColor: isSelected ? '#eaf5fc' : '#fff',
                color: isSelected ? '#0866ff' : '#555',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 1px 2px rgba(8, 102, 255, 0.1)' : 'none'
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h4 style={styles.h4}>Basic Information</h4>
            
            <div style={styles.configItem}>
                <label>Variant Name</label>
                <input 
                    type="text" 
                    {...register("name", { required: "Name is required" })} 
                    style={styles.input} 
                />
                {errors.name && <span style={{ color: 'red', fontSize: '0.8rem' }}>{String(errors.name.message)}</span>}
            </div>

            {/* --- TAGS & METADATA SECTION --- */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#333' }}>Tags & Recommendations (Optional)</h5>
                    <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.4', margin: 0 }}>
                        Use tags to add metadata to your custom Microgame. This allows our system to recommend this game for specific Conversion Goals.
                    </p>
                </div>

                {/* GROUP 1: Hierarchical Sectors & Categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* 1. Sectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ ...styles.label, marginBottom: 0 }}>Business Sector</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {SECTORS.map(sector => (
                                <Pill key={sector} label={sector} isSelected={watchSectors.includes(sector)} onClick={() => handleSectorToggle(sector)} />
                            ))}
                        </div>
                    </div>

                    {/* 2. Categories */}
                    {watchSectors.length > 0 && !watchSectors.includes('All') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #0866ff' }}>
                            <label style={{ ...styles.label, marginBottom: 0 }}>Product Categories</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <Pill label="All" isSelected={watchCategories.includes('All')} onClick={() => handleCategoryToggle('All')} />
                                {watchSectors.flatMap((s: string) => SECTOR_CATEGORIES[s] || []).map((cat: string) => (
                                    <Pill key={cat} label={cat} isSelected={watchCategories.includes(cat)} onClick={() => handleCategoryToggle(cat)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Subcategories */}
                    {watchCategories.length > 0 && !watchCategories.includes('All') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2rem', borderLeft: '2px solid #00d2d3' }}>
                            <label style={{ ...styles.label, marginBottom: 0 }}>Subcategories</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <Pill label="All" isSelected={watchSubcategories.includes('All')} onClick={() => handleSubcategoryToggle('All')} />
                                {watchCategories.flatMap((c: string) => CATEGORY_SUBCATEGORIES[c] || []).map((sub: string) => (
                                    <Pill key={sub} label={sub} isSelected={watchSubcategories.includes(sub)} onClick={() => handleSubcategoryToggle(sub)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Seasonality */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={styles.label}>Seasonality</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" isSelected={watchSeasonality.includes('All')} onClick={() => handleSeasonalityToggle('All')} />
                        {SEASONALITY_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} isSelected={watchSeasonality.includes(opt.id)} onClick={() => handleSeasonalityToggle(opt.id)} />
                        ))}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '2rem 0' }} />

                {/* GROUP 2: Strategic Metadata */}
                
                {/* Target Audience */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={styles.label}>Target Audience</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" isSelected={watchAudience.includes('All')} onClick={() => handleAudienceToggle('All')} />
                        {TARGET_AUDIENCE_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} isSelected={watchAudience.includes(opt.id)} onClick={() => handleAudienceToggle(opt.id)} />
                        ))}
                    </div>
                    {watchAudience.length > 0 && !watchAudience.includes('All') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {watchAudience.map(id => {
                                const audience = TARGET_AUDIENCE_OPTIONS.find(opt => opt.id === id);
                                if (!audience) return null;
                                return (
                                    <div key={id} style={{ fontSize: '0.8rem', color: '#555', padding: '0.75rem', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '4px', lineHeight: '1.4' }}>
                                        <strong>Persona ({audience.label}):</strong> {audience.persona}
                                        <div style={{ marginTop: '0.4rem' }}>
                                            <strong>Motivators:</strong> {audience.motivators.join(', ')}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Promotion Compatibility */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={styles.label}>Promotion Compatibility</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" isSelected={watchPromo.includes('All')} onClick={() => handlePromoToggle('All')} />
                        {PROMOTION_COMPATIBILITY_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} isSelected={watchPromo.includes(opt.id)} onClick={() => handlePromoToggle(opt.id)} />
                        ))}
                    </div>
                    {watchPromo.length > 0 && !watchPromo.includes('All') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {watchPromo.map(id => {
                                const promo = PROMOTION_COMPATIBILITY_OPTIONS.find(opt => opt.id === id);
                                if (!promo) return null;
                                return (
                                    <div key={id} style={{ fontSize: '0.8rem', color: '#555', padding: '0.75rem', backgroundColor: '#fff', border: '1px dashed #ccc', borderRadius: '4px', lineHeight: '1.4' }}>
                                        <strong>{promo.label}:</strong> {promo.description}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Game Description */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0e0' }}>
                    <label style={{ ...styles.label, marginBottom: '0.5rem', display: 'block' }}>Game Description (Optional)</label>
                    <textarea 
                        {...register("description", { maxLength: 250 })} 
                        placeholder="e.g. A competitive game for unlocking rare shoe drop raffles."
                        style={{ ...styles.input, minHeight: '80px', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
                            Internal notes about the purpose of this variant.
                        </p>
                        <span style={{ fontSize: '0.75rem', color: (watch('description')?.length || 0) > 250 ? '#e74c3c' : '#999', fontVariantNumeric: 'tabular-nums' }}>
                            {(watch('description')?.length || 0)} / 250
                        </span>
                    </div>
                </div>

            </div>

            {/* STRATEGY DASHBOARD (New Visualization) */}
            {isGuidedMode && baseGame.conversionMetadata && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                    
                    {/* PRO TIP BANNER */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '6px', borderLeft: '4px solid #0866ff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <span style={{ fontSize: '1.2rem' }}>💡</span>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0866ff', textTransform: 'uppercase' }}>Pro Tip</label>
                            <p style={{ fontSize: '0.85rem', color: '#555', margin: '0.25rem 0 0 0', fontStyle: 'italic', lineHeight: '1.4' }}>
                                {baseGame.conversionMetadata.bestForTip}
                            </p>
                        </div>
                    </div>

                    {/* METRICS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        
                        {/* LEFT: CONVERSION PILLARS */}
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                                Conversion Fit
                            </label>
                            {Object.entries((baseGame.conversionMetadata as any).pillars || {})
                                .sort(([, a], [, b]) => (b as any).score - (a as any).score)
                                .map(([key, data]: [string, any]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', width: '110px', color: '#333', fontWeight: 500 }}>
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <div style={{ flex: 1, height: '6px', backgroundColor: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${data.score * 10}%`,
                                            height: '100%',
                                            backgroundColor: data.score >= 8 ? '#2ecc71' : data.score >= 5 ? '#3498db' : '#bdc3c7',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', marginLeft: '0.75rem', width: '25px', textAlign: 'right', fontWeight: 'bold', color: data.score >= 8 ? '#2ecc71' : '#666' }}>
                                        {data.score}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* RIGHT: TRIGGERS & AUDIENCE */}
                        <div>
                            {(baseGame.conversionMetadata as any).triggers && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                                        Logic Triggers
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(baseGame.conversionMetadata as any).triggers.map((t: any) => (
                                            <div key={t.id} style={{
                                                fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px',
                                                backgroundColor: '#e3f2fd', color: '#1565c0', border: '1px solid #bbdefb',
                                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help'
                                            }} title={t.description}>
                                                <span>⚡</span> {t.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(baseGame.conversionMetadata as any).audienceVibe && (
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                                        Audience Vibe
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {(baseGame.conversionMetadata as any).audienceVibe.map((v: string) => (
                                            <span key={v} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f0f2f5', border: '1px solid #ccc', color: '#555' }}>
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};