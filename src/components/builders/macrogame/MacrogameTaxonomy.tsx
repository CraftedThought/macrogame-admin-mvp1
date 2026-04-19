/* src/components/builders/macrogame/MacrogameTaxonomy.tsx */

import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../../App.styles';
import { SECTORS, SECTOR_CATEGORIES, CATEGORY_SUBCATEGORIES, SEASONALITY_OPTIONS, TARGET_AUDIENCE_OPTIONS, PROMOTION_COMPATIBILITY_OPTIONS } from '../../../constants/taxonomy';
import { MICROGAME_DEFINITIONS } from '../../../microgames/definitions/index';
import { notifications } from '../../../utils/notifications';

interface MacrogameTaxonomyProps {
    sectors: string[];
    categories: string[];
    subcategories: string[];
    seasonality: string[];
    targetAudience: string[];
    promotionCompatibility: string[];
    flow: any[]; 
    onChange: (key: string, value: any) => void;
    onRemoveConflictingGames: (indicesToRemove: number[]) => void;
    onHardConflictChange?: (hasConflict: boolean) => void; // NEW: Tell parent to disable Save button
}

export const MacrogameTaxonomy: React.FC<MacrogameTaxonomyProps> = ({
    sectors = [],
    categories = [],
    subcategories = [],
    seasonality,
    targetAudience,
    promotionCompatibility,
    flow,
    onChange,
    onRemoveConflictingGames,
    onHardConflictChange
}) => {
    const isInitialMount = useRef(true);
    const prevFlowLength = useRef(flow.length);
    const [dismissedOverlapAlert, setDismissedOverlapAlert] = useState(false);
    const [dismissedSoftTags, setDismissedSoftTags] = useState<{
        categories: string[]; subcategories: string[]; seasonality: string[]; targetAudience: string[]; promotionCompatibility: string[];
    }>({ categories: [], subcategories: [], seasonality: [], targetAudience: [], promotionCompatibility: [] });
    const [pendingMultiSector, setPendingMultiSector] = useState<{
        options: string[];
        cats: string[];
        subs: string[];
        season: string[];
        audience: string[];
        promo: string[];
    } | null>(null);

    const getBaseDefinition = (baseId?: string) => {
        if (!baseId) return null;
        let def = MICROGAME_DEFINITIONS[baseId];
        if (!def) {
            const key = Object.keys(MICROGAME_DEFINITIONS).find(k => k.toLowerCase() === baseId.toLowerCase());
            if (key) def = MICROGAME_DEFINITIONS[key];
        }
        return def;
    };

    // --- SMART INHERITANCE ---
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            prevFlowLength.current = flow.length;
            return;
        }

        if (flow.length > prevFlowLength.current) {
            // Reset dismissals so alerts correctly appear for new games
            setDismissedOverlapAlert(false);
            setDismissedSoftTags({ categories: [], subcategories: [], seasonality: [], targetAudience: [], promotionCompatibility: [] });
        }

        const justAddedFirstGame = prevFlowLength.current === 0 && flow.length === 1;
        prevFlowLength.current = flow.length;

        if (justAddedFirstGame) {
            const variant = flow[0].customVariant;
            const baseDef = getBaseDefinition(flow[0].baseGame?.id) || flow[0].baseGame;

            let didFill = false;

            // Safely fallback to the normalized base game definitions
            const incSectors = variant?.sectors?.length ? variant.sectors : (baseDef?.sectors || []);
            const incCats = variant?.categories?.length ? variant.categories : (baseDef?.compatibleProductCategories || []);
            const incSubs = variant?.subcategories || [];
            const incSeason = variant?.seasonality?.length ? variant.seasonality : (baseDef?.seasonality || []);
            const incAudience = variant?.targetAudience?.length ? variant.targetAudience : (baseDef?.compatibleCustomerTypes || []);
            const incPromo = variant?.promotionCompatibility?.length ? variant.promotionCompatibility : (baseDef?.promotionCompatibility || []);

            const cleanCats = incCats.filter((c: string) => c !== 'All');

            // Handle multi-sector inheritance gracefully
            if (sectors.length === 0 && incSectors.length > 1) {
                setPendingMultiSector({
                    options: incSectors,
                    cats: cleanCats.length > 0 ? cleanCats : (incCats.includes('All') ? ['All'] : []),
                    subs: incSubs,
                    season: incSeason || [],
                    audience: incAudience || [],
                    promo: incPromo || []
                });
                return; // Stop here, wait for user selection
            }

            // Enforce single-sector rule on inheritance
            if (sectors.length === 0 && incSectors.length === 1) { onChange('sectors', [incSectors[0]]); didFill = true; }
            
            if (categories.length === 0) {
                if (cleanCats.length > 0) { onChange('categories', cleanCats); didFill = true; }
                else if (incCats.includes('All')) { onChange('categories', ['All']); didFill = true; } // Safely inherit 'All' to pass validation
            }
            
            if (subcategories.length === 0 && incSubs.length > 0) { onChange('subcategories', incSubs); didFill = true; }
            if (seasonality.length === 0 && incSeason && incSeason.length > 0) { onChange('seasonality', incSeason); didFill = true; }
            if (targetAudience.length === 0 && incAudience && incAudience.length > 0) { onChange('targetAudience', incAudience); didFill = true; }
            if (promotionCompatibility.length === 0 && incPromo && incPromo.length > 0) { onChange('promotionCompatibility', incPromo); didFill = true; }
            
            if (didFill) {
                notifications.success("Empty tags were auto-filled from your newly added microgame.");
            }
        }
    }, [flow, sectors, categories, subcategories, seasonality, targetAudience, promotionCompatibility, onChange]);

    // --- CASCADING PRUNING LOGIC ---
    const toggleMultiSelect = (currentArray: string[], value: string): string[] => {
        if (value === 'All') return ['All'];
        const newArray = currentArray.filter(item => item !== 'All');
        if (newArray.includes(value)) {
            const filtered = newArray.filter(item => item !== value);
            return filtered.length === 0 ? ['All'] : filtered;
        }
        return [...newArray, value];
    };

    const handleSectorToggle = (sector: string) => {
        const newSectors = sectors.includes(sector) && sector !== 'All' ? ['All'] : [sector]; // Single-Select Enforcement with 'All' fallback
        onChange('sectors', newSectors);

        const validCats = newSectors.flatMap((s: string) => SECTOR_CATEGORIES[s] || []);
        const newCats = categories.filter((c: string) => validCats.includes(c) || c === 'All');
        onChange('categories', newCats.length > 0 ? newCats : ['All']);

        const validSubs = newCats.flatMap((c: string) => CATEGORY_SUBCATEGORIES[c] || []);
        const newSubs = subcategories.filter((s: string) => validSubs.includes(s) || s === 'All');
        onChange('subcategories', newSubs.length > 0 ? newSubs : ['All']);
    };

    const handleCategoryToggle = (category: string) => {
        const newCats = toggleMultiSelect(categories, category);
        onChange('categories', newCats);

        const validSubs = newCats.flatMap((c: string) => CATEGORY_SUBCATEGORIES[c] || []);
        const newSubs = subcategories.filter((s: string) => validSubs.includes(s) || s === 'All');
        onChange('subcategories', newSubs.length > 0 ? newSubs : ['All']);
    };

    const handleSubcategoryToggle = (sub: string) => {
        onChange('subcategories', toggleMultiSelect(subcategories, sub));
    };

    const handleSeasonalityToggle = (season: string) => {
        onChange('seasonality', toggleMultiSelect(seasonality, season));
    };

    const handleAudienceToggle = (audience: string) => {
        onChange('targetAudience', toggleMultiSelect(targetAudience, audience));
    };

    const handlePromoToggle = (promo: string) => {
        onChange('promotionCompatibility', toggleMultiSelect(promotionCompatibility, promo));
    };

    const getPillState = (value: string, selectedList: string[], pendingList: string[]) => {
        if (selectedList.includes(value)) return 'selected';
        if (pendingList.includes(value)) return 'pending';
        return 'default';
    };

    const Pill: React.FC<{ label: string; state: 'selected' | 'pending' | 'default'; onClick: () => void }> = ({ label, state, onClick }) => {
        const isSelected = state === 'selected';
        const isPending = state === 'pending';
        
        let bg = '#fff';
        let border = '#ccc';
        let color = '#555';
        let shadow = 'none';

        if (isSelected) {
            bg = '#eaf5fc'; border = '#0866ff'; color = '#0866ff'; shadow = '0 1px 2px rgba(8, 102, 255, 0.1)';
        } else if (isPending) {
            bg = '#fffce6'; border = '#ffc107'; color = '#d39e00'; shadow = '0 1px 2px rgba(255, 193, 7, 0.1)';
        }

        return (
            <button
                type="button"
                onClick={onClick}
                style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    border: `1px solid ${border}`,
                    backgroundColor: bg,
                    color: color,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: (isSelected || isPending) ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                    boxShadow: shadow
                }}
            >
                {label}
            </button>
        );
    };

    // --- CONFLICT DETECTION LOGIC ---
    interface FlowDetail {
        index: number;
        gameName: string;
        itemSectors: string[];
        itemCategories: string[];
        itemSubcategories: string[];
        itemSeasonality: string[];
        itemAudience: string[];
        itemPromo: string[];
    }

    const flowDetails: FlowDetail[] = flow.map((f, index) => {
        const itemSectors = f.customVariant?.sectors || [];
        // Strictly use explicitly set custom variant tags to prevent Base Game tag bloat in the Soft Conflicts UI
        const itemCategories = f.customVariant?.categories || [];
        const itemSubcategories = f.customVariant?.subcategories || [];
        const itemSeasonality = f.customVariant?.seasonality || [];
        const itemAudience = f.customVariant?.targetAudience || [];
        const itemPromo = f.customVariant?.promotionCompatibility || [];
        const gameName = f.customVariant?.name || f.baseGame?.name || 'Unknown Game';
        
        return { index, gameName, itemSectors, itemCategories, itemSubcategories, itemSeasonality, itemAudience, itemPromo };
    });

    const currentSector = sectors.length > 0 ? sectors[0] : null;
    const hasSpecificMacroSector = currentSector && currentSector !== 'All';

    // 1. HARD CONFLICTS
    const hardConflictingGames = flowDetails.filter(f => {
        if (!hasSpecificMacroSector) return false;
        if (f.itemSectors.length === 0 || f.itemSectors.includes('All')) return false;
        return !f.itemSectors.includes(currentSector);
    });
    const hasHardConflict = hardConflictingGames.length > 0;

    useEffect(() => {
        if (onHardConflictChange) {
            onHardConflictChange(hasHardConflict);
        }
    }, [hasHardConflict, onHardConflictChange]);

    // Gather all unique sectors present in the flow (for Pivots)
    const allFlowSectors = new Set<string>();
    flowDetails.forEach(f => {
        f.itemSectors.forEach(s => {
            if (s !== 'All') allFlowSectors.add(s);
        });
    });

    // 2. MULTI-SECTOR PIVOT (Optimization)
    const availablePivots = Array.from(allFlowSectors).filter(s => s !== currentSector);
    const hasMultiSectorOverlap = !hasHardConflict && hasSpecificMacroSector && availablePivots.length > 0;

    // 3. SOFT CONFLICTS (Pending Tags)
    const flowCats = Array.from(new Set(flowDetails.flatMap(f => f.itemCategories))).filter(t => t !== 'All');
    const flowSubs = Array.from(new Set(flowDetails.flatMap(f => f.itemSubcategories))).filter(t => t !== 'All');
    const flowSeason = Array.from(new Set(flowDetails.flatMap(f => f.itemSeasonality))).filter(t => t !== 'All');
    const flowAudience = Array.from(new Set(flowDetails.flatMap(f => f.itemAudience))).filter(t => t !== 'All');
    const flowPromo = Array.from(new Set(flowDetails.flatMap(f => f.itemPromo))).filter(t => t !== 'All');

    // Filter valid categories/subs based on current sector to prevent "Ghost" tags from conflicting games
    const validSectorCats = currentSector && currentSector !== 'All' ? (SECTOR_CATEGORIES[currentSector] || []) : flowCats;
    const validSectorSubs = categories.length > 0 && !categories.includes('All') 
        ? categories.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []) 
        : flowSubs;

    // Only calculate pending tags if there is NO hard conflict present
    const pendingCats = hasHardConflict ? [] : flowCats.filter(c => !categories.includes(c) && !dismissedSoftTags.categories.includes(c) && validSectorCats.includes(c));
    const pendingSubs = hasHardConflict ? [] : flowSubs.filter(s => !subcategories.includes(s) && !dismissedSoftTags.subcategories.includes(s) && validSectorSubs.includes(s));
    const pendingSeason = hasHardConflict ? [] : flowSeason.filter(s => !seasonality.includes(s) && !dismissedSoftTags.seasonality.includes(s));
    const pendingAudience = hasHardConflict ? [] : flowAudience.filter(s => !targetAudience.includes(s) && !dismissedSoftTags.targetAudience.includes(s));
    const pendingPromo = hasHardConflict ? [] : flowPromo.filter(s => !promotionCompatibility.includes(s) && !dismissedSoftTags.promotionCompatibility.includes(s));

    const hasPendingTags = pendingCats.length > 0 || pendingSubs.length > 0 || pendingSeason.length > 0 || pendingAudience.length > 0 || pendingPromo.length > 0;

    const visibleCats = Array.from(new Set([...sectors.flatMap(s => SECTOR_CATEGORIES[s] || []), ...pendingCats]));
    const visibleSubs = Array.from(new Set([...categories.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []), ...pendingSubs]));

    // --- SHARED UI HELPERS ---
    const formatGameName = (index: number, name: string) => (
        <span key={`fmt-${index}`}><strong>Game {index + 1}:</strong> <em>{name}</em></span>
    );

    const getFormattedNames = (games: FlowDetail[]) => {
        if (games.length === 0) return null;
        if (games.length === 1) return formatGameName(games[0].index, games[0].gameName);
        if (games.length === 2) return <>{formatGameName(games[0].index, games[0].gameName)} and {formatGameName(games[1].index, games[1].gameName)}</>;
        return (
            <>
                {games.slice(0, -1).map((g, i) => <span key={`fmt-list-${i}`}>{formatGameName(g.index, g.gameName)}, </span>)}
                and {formatGameName(games[games.length - 1].index, games[games.length - 1].gameName)}
            </>
        );
    };

    const handlePivotToSector = (targetSector: string) => {
        const gamesToRemove = flowDetails.filter(g => {
            const isGSpecific = g.itemSectors.length > 0 && !g.itemSectors.includes('All');
            if (!isGSpecific) return false;
            return !g.itemSectors.includes(targetSector);
        });

        const survivingGames = flowDetails.filter(g => !gamesToRemove.includes(g));

        const unionCats = new Set<string>();
        const unionSubs = new Set<string>();
        const unionSeason = new Set<string>();
        const unionAudience = new Set<string>();
        const unionPromo = new Set<string>();
        
        survivingGames.forEach(g => {
            g.itemCategories.forEach(c => unionCats.add(c));
            g.itemSubcategories.forEach(s => unionSubs.add(s));
            g.itemSeasonality.forEach(s => unionSeason.add(s));
            g.itemAudience.forEach(s => unionAudience.add(s));
            g.itemPromo.forEach(s => unionPromo.add(s));
        });

        onChange('sectors', [targetSector]);
        
        const validCats = SECTOR_CATEGORIES[targetSector] || [];
        const finalCats = Array.from(unionCats).filter(c => c !== 'All' && validCats.includes(c));
        onChange('categories', finalCats.length > 0 ? finalCats : ['All']);
        
        const validSubs = finalCats.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []);
        const finalSubs = Array.from(unionSubs).filter(s => s !== 'All' && validSubs.includes(s));
        onChange('subcategories', finalSubs.length > 0 ? finalSubs : ['All']);
        
        const finalSeason = Array.from(unionSeason).filter(t => t !== 'All');
        onChange('seasonality', finalSeason.length > 0 ? finalSeason : ['All']);
        
        const finalAudience = Array.from(unionAudience).filter(t => t !== 'All');
        onChange('targetAudience', finalAudience.length > 0 ? finalAudience : ['All']);
        
        const finalPromo = Array.from(unionPromo).filter(t => t !== 'All');
        onChange('promotionCompatibility', finalPromo.length > 0 ? finalPromo : ['All']);

        // Clear any previous dismissals so the Soft Conflict engine has a clean slate
        setDismissedSoftTags({ categories: [], subcategories: [], seasonality: [], targetAudience: [], promotionCompatibility: [] });

        if (gamesToRemove.length > 0) {
            onRemoveConflictingGames(gamesToRemove.map(g => g.index));
        } else {
            notifications.success(`Macrogame pivoted to "${targetSector}".`);
        }
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '0.5rem' }}>
                <h3 style={{ ...styles.h3, margin: 0 }}>Macrogame Tags</h3>
                <button 
                    type="button" 
                    onClick={() => {
                        onChange('sectors', ['All']);
                        onChange('categories', ['All']);
                        onChange('subcategories', ['All']);
                        onChange('seasonality', ['All']);
                        onChange('targetAudience', ['All']);
                        onChange('promotionCompatibility', ['All']);
                        notifications.success("Macrogame tags have been reset to 'All'.");
                    }}
                    style={{ ...styles.secondaryButton, fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                    Reset Tags
                </button>
            </div>
            <p style={{...styles.descriptionText, marginBottom: '1.5rem'}}>
                Tagging your Macrogame helps our system understand its purpose, making it easier to filter in your library and powering future intelligence features. 
            </p>

            <div style={styles.configContainer}>
                
                {/* --- PENDING MULTI-SECTOR SELECTION (HELPER) --- */}
                {pendingMultiSector && (
                    <div style={{ padding: '1.25rem', backgroundColor: '#f0f7ff', border: '1px solid #cce4ff', borderRadius: '8px', color: '#0056b3', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>💡</span>
                            <div>
                                <strong style={{ fontSize: '1rem' }}>Action Required: Clarify Macrogame Sector</strong>
                                <div style={{ marginTop: '0.25rem', color: '#004085', lineHeight: '1.4' }}>
                                    The microgame you just added is versatile and designed for multiple sectors. Because a Macrogame should be highly targeted, please select the primary Business Sector for this specific campaign to continue:
                                </div>
                            </div>
                        </div>
                        <div style={{ marginLeft: '2.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {pendingMultiSector.options.map(option => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        onChange('sectors', [option]);
                                        
                                        const validCats = SECTOR_CATEGORIES[option] || [];
                                        const finalCats = pendingMultiSector.cats.filter(c => validCats.includes(c));
                                        if (finalCats.length > 0) onChange('categories', finalCats);
                                        
                                        const validSubs = finalCats.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []);
                                        const finalSubs = pendingMultiSector.subs.filter(s => validSubs.includes(s));
                                        if (finalSubs.length > 0) onChange('subcategories', finalSubs);
                                        
                                        if (pendingMultiSector.season.length > 0) onChange('seasonality', pendingMultiSector.season);
                                        if (pendingMultiSector.audience.length > 0) onChange('targetAudience', pendingMultiSector.audience);
                                        if (pendingMultiSector.promo.length > 0) onChange('promotionCompatibility', pendingMultiSector.promo);
                                        
                                        setPendingMultiSector(null);
                                        notifications.success("Macrogame tags have been applied based on your selection.");
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #0056b3', color: '#0056b3', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                >
                                    Set to "{option}"
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingMultiSector(null);
                                }}
                                style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'underline' }}
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>
                )}
                
                {/* --- HARD CONFLICT UI (BLOCKER) --- */}
                {hasHardConflict && (() => {
                    const formattedNames = getFormattedNames(hardConflictingGames);
                    const indicesToRemove = hardConflictingGames.map(g => g.index);
                    
                    let warningText = (
                        <>
                            Your Macrogame has a Business Sector set to <strong>"{sectors.join(', ')}"</strong>, 
                            but {formattedNames} {hardConflictingGames.length === 1 ? 'is' : 'are'} not tagged with this sector.
                        </>
                    );

                    // Build Dynamic Resolution Buttons
                    const resolutionButtons: React.ReactNode[] = [];

                    // 1. "Keep Current & Remove"
                    if (hardConflictingGames.length > 0 && sectors.length > 0 && !sectors.includes('All')) {
                        resolutionButtons.push(
                            <button 
                                key="keep-current"
                                type="button" 
                                onClick={() => onRemoveConflictingGames(indicesToRemove)}
                                style={{ textAlign: 'left', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ffe69c', color: '#856404', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            >
                                Keep Current Macrogame Tags & Remove {formattedNames}
                            </button>
                        );
                    }

                    // 2. Sector Pivot Buttons
                    availablePivots.forEach(targetSector => {
                        const gamesToRemove = flowDetails.filter(g => {
                            const isGSpecific = g.itemSectors.length > 0 && !g.itemSectors.includes('All') && !g.itemSectors.includes('All');
                            if (!isGSpecific) return false;
                            return !g.itemSectors.includes(targetSector);
                        });

                        const survivingGames = flowDetails.filter(g => !gamesToRemove.includes(g) && g.itemSectors.includes(targetSector));
                        if (survivingGames.length === 0) return;

                        const btnLabel = gamesToRemove.length === 0 
                            ? <>Pivot to "{targetSector}" & Keep All Games</>
                            : <>Pivot to "{targetSector}" & Remove {getFormattedNames(gamesToRemove)}</>;

                        resolutionButtons.push(
                            <button 
                                key={`pivot-${targetSector}`}
                                type="button" 
                                onClick={() => {
                                    const unionCats = new Set<string>();
                                    const unionSubs = new Set<string>();
                                    const unionSeason = new Set<string>();
                                    const unionAudience = new Set<string>();
                                    const unionPromo = new Set<string>();
                                    
                                    survivingGames.forEach(g => {
                                        g.itemCategories.forEach(c => unionCats.add(c));
                                        g.itemSubcategories.forEach(s => unionSubs.add(s));
                                        g.itemSeasonality.forEach(s => unionSeason.add(s));
                                        g.itemAudience.forEach(s => unionAudience.add(s));
                                        g.itemPromo.forEach(s => unionPromo.add(s));
                                    });

                                    onChange('sectors', [targetSector]);
                                    
                                    const validCats = SECTOR_CATEGORIES[targetSector] || [];
                                    const finalCats = Array.from(unionCats).filter(c => c !== 'All' && validCats.includes(c));
                                    onChange('categories', finalCats.length > 0 ? finalCats : ['All']);
                                    
                                    const validSubs = finalCats.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []);
                                    const finalSubs = Array.from(unionSubs).filter(s => s !== 'All' && validSubs.includes(s));
                                    onChange('subcategories', finalSubs.length > 0 ? finalSubs : ['All']);
                                    
                                    const finalSeason = Array.from(unionSeason).filter(t => t !== 'All');
                                    onChange('seasonality', finalSeason.length > 0 ? finalSeason : ['All']);
                                    
                                    const finalAudience = Array.from(unionAudience).filter(t => t !== 'All');
                                    onChange('targetAudience', finalAudience.length > 0 ? finalAudience : ['All']);
                                    
                                    const finalPromo = Array.from(unionPromo).filter(t => t !== 'All');
                                    onChange('promotionCompatibility', finalPromo.length > 0 ? finalPromo : ['All']);

                                    // Clear any previous dismissals so the Soft Conflict engine has a clean slate
                                    setDismissedSoftTags({ categories: [], subcategories: [], seasonality: [], targetAudience: [], promotionCompatibility: [] });

                                    if (gamesToRemove.length > 0) {
                                        onRemoveConflictingGames(gamesToRemove.map(g => g.index));
                                    } else {
                                        notifications.success(`Macrogame pivoted to "${targetSector}".`);
                                    }
                                }}
                                style={{ textAlign: 'left', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ffe69c', color: '#856404', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            >
                                {btnLabel}
                            </button>
                        );
                    });

                    return (
                        <div style={{ padding: '1.25rem', backgroundColor: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '8px', color: '#664d03', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>⚠️</span>
                                <div>
                                    <strong style={{ fontSize: '1rem' }}>Sector Mismatch Detected</strong>
                                    <div style={{ marginTop: '0.25rem', color: '#555', lineHeight: '1.4' }}>
                                        {warningText}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginLeft: '2.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {hardConflictingGames.map(f => (
                                    <div key={f.index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', padding: '0.5rem 0.8rem', borderRadius: '4px', border: '1px solid #f8e5b4' }}>
                                        <span style={{ color: '#333', flexShrink: 0 }}><strong>Game {f.index + 1}:</strong> <em>{f.gameName}</em></span>
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}></span>
                                        <span style={{ fontWeight: 'bold', color: '#d35400' }}>
                                            Business Sector: {f.itemSectors.length > 0 ? f.itemSectors.join(', ') : 'None'} ❌
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginLeft: '2.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', color: '#856404', marginBottom: '0.25rem' }}>
                                    Please take one of the following actions to resolve this conflict.
                                </div>
                                
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        onChange('sectors', ['All']);
                                        onChange('categories', ['All']);
                                        onChange('subcategories', ['All']);
                                    }}
                                    style={{ textAlign: 'left', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ffe69c', color: '#856404', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                >
                                    Change the Macrogame Business Sector to "All"
                                </button>
                                
                                {resolutionButtons}
                            </div>
                        </div>
                    );
                })()}

                {/* --- MULTI-SECTOR OVERLAP UI --- */}
                {hasMultiSectorOverlap && !hasHardConflict && !dismissedOverlapAlert && (() => {
                    const multiSectorOverlapGames = flowDetails.filter(f => {
                        if (sectors.length === 1 && sectors[0] !== 'All' && f.itemSectors.length > 1) {
                            const hasOverlap = f.itemSectors.includes(sectors[0]);
                            const hasOther = f.itemSectors.some(s => s !== sectors[0] && s !== 'All');
                            return hasOverlap && hasOther;
                        }
                        return false;
                    });

                    const formatGameName = (index: number, name: string) => (
                        <span key={`fmt-overlap-${index}`}><strong>Game {index + 1}:</strong> <em>{name}</em></span>
                    );

                    const getFormattedNames = (games: any[]) => {
                        if (games.length === 1) return formatGameName(games[0].index, games[0].gameName);
                        if (games.length === 2) return <>{formatGameName(games[0].index, games[0].gameName)} and {formatGameName(games[1].index, games[1].gameName)}</>;
                        return (
                            <>
                                {games.slice(0, -1).map((g, i) => <span key={`fmt-overlap-list-${i}`}>{formatGameName(g.index, g.gameName)}, </span>)}
                                and {formatGameName(games[games.length - 1].index, games[games.length - 1].gameName)}
                            </>
                        );
                    };

                    return (
                        <div style={{ padding: '1.25rem', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', color: '#333', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>🔄</span>
                                <div>
                                    <strong style={{ fontSize: '1rem' }}>Multi-Sector Microgame Detected</strong>
                                    <div style={{ marginTop: '0.25rem', color: '#555', lineHeight: '1.4' }}>
                                        One or more of your microgames is versatile and supports multiple Business Sectors. They are currently aligning with your Macrogame's <strong>"{sectors[0]}"</strong> setting. If you meant to build a campaign around their <em>other</em> sectors, you can pivot the Macrogame below.
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginLeft: '2.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                {multiSectorOverlapGames.map(f => {
                                    const otherSectors = f.itemSectors.filter((s: string) => s !== sectors[0] && s !== 'All');
                                    
                                    return otherSectors.map((targetSector: string) => {
                                        const gamesToRemove = flowDetails.filter(g => {
                                            const isGSpecific = g.itemSectors.length > 0 && !g.itemSectors.includes('All');
                                            if (!isGSpecific) return false;
                                            return !g.itemSectors.includes(targetSector);
                                        });

                                        const removeText = gamesToRemove.length > 0 
                                            ? <> &amp; Remove {getFormattedNames(gamesToRemove)}</> 
                                            : '';

                                        return (
                                            <button 
                                                key={`pivot-${f.index}-${targetSector}`}
                                                type="button" 
                                                onClick={() => {
                                                    const survivingGames = flowDetails.filter(g => !gamesToRemove.includes(g));

                                                    const unionCats = new Set<string>();
                                                    const unionSubs = new Set<string>();
                                                    const unionSeason = new Set<string>();
                                                    const unionAudience = new Set<string>();
                                                    const unionPromo = new Set<string>();
                                                    
                                                    survivingGames.forEach(g => {
                                                        g.itemCategories.forEach(c => unionCats.add(c));
                                                        g.itemSubcategories.forEach(s => unionSubs.add(s));
                                                        g.itemSeasonality.forEach(s => unionSeason.add(s));
                                                        g.itemAudience.forEach(s => unionAudience.add(s));
                                                        g.itemPromo.forEach(s => unionPromo.add(s));
                                                    });

                                                    onChange('sectors', [targetSector]);
                                                    
                                                    const validCats = SECTOR_CATEGORIES[targetSector] || [];
                                                    const finalCats = Array.from(unionCats).filter(c => c !== 'All' && validCats.includes(c));
                                                    onChange('categories', finalCats.length > 0 ? finalCats : ['All']);
                                                    
                                                    const validSubs = finalCats.flatMap(c => CATEGORY_SUBCATEGORIES[c] || []);
                                                    const finalSubs = Array.from(unionSubs).filter(s => s !== 'All' && validSubs.includes(s));
                                                    onChange('subcategories', finalSubs.length > 0 ? finalSubs : ['All']);
                                                    
                                                    const finalSeason = Array.from(unionSeason).filter(t => t !== 'All');
                                                    onChange('seasonality', finalSeason.length > 0 ? finalSeason : ['All']);
                                                    
                                                    const finalAudience = Array.from(unionAudience).filter(t => t !== 'All');
                                                    onChange('targetAudience', finalAudience.length > 0 ? finalAudience : ['All']);
                                                    
                                                    const finalPromo = Array.from(unionPromo).filter(t => t !== 'All');
                                                    onChange('promotionCompatibility', finalPromo.length > 0 ? finalPromo : ['All']);

                                                    // Clear any previous dismissals
                                                    setDismissedSoftTags({ categories: [], subcategories: [], seasonality: [], targetAudience: [], promotionCompatibility: [] });
                                                    
                                                    if (gamesToRemove.length > 0) {
                                                        onRemoveConflictingGames(gamesToRemove.map(g => g.index));
                                                    } else {
                                                        notifications.success(`Macrogame pivoted to "${targetSector}".`);
                                                    }
                                                }}
                                                style={{ textAlign: 'left', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ccc', color: '#333', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            >
                                                Pivot to "{targetSector}" (via Game {f.index + 1}: {f.gameName}){removeText}
                                            </button>
                                        );
                                    });
                                })}
                                
                                <button 
                                    type="button" 
                                    onClick={() => setDismissedOverlapAlert(true)}
                                    style={{ textAlign: 'left', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: 'transparent', border: '1px solid transparent', color: '#666', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'underline', marginTop: '0.25rem' }}
                                >
                                    Dismiss Alert
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* --- PENDING TAGS UI (SOFT CONFLICTS) --- */}
                {hasPendingTags && (() => {
                    const macroParts = [];
                    if (pendingCats.length > 0 && categories.length > 0 && !categories.includes('All')) {
                        macroParts.push(`a Product Category set to "${categories.join(', ')}"`);
                    }
                    if (pendingSubs.length > 0 && subcategories.length > 0 && !subcategories.includes('All')) {
                        macroParts.push(`a Subcategory set to "${subcategories.join(', ')}"`);
                    }
                    if (pendingSeason.length > 0 && seasonality.length > 0 && !seasonality.includes('All')) {
                        const labels = seasonality.map(id => SEASONALITY_OPTIONS.find(opt => opt.id === id)?.label || id);
                        macroParts.push(`a Seasonality set to "${labels.join(', ')}"`);
                    }
                    if (pendingAudience.length > 0 && targetAudience.length > 0 && !targetAudience.includes('All')) {
                        const labels = targetAudience.map(id => TARGET_AUDIENCE_OPTIONS.find(opt => opt.id === id)?.label || id);
                        macroParts.push(`a Target Audience set to "${labels.join(', ')}"`);
                    }
                    if (pendingPromo.length > 0 && promotionCompatibility.length > 0 && !promotionCompatibility.includes('All')) {
                        const labels = promotionCompatibility.map(id => PROMOTION_COMPATIBILITY_OPTIONS.find(opt => opt.id === id)?.label || id);
                        macroParts.push(`a Promo Compatibility set to "${labels.join(', ')}"`);
                    }

                    const macroString = macroParts.length > 0 ? `Your Macrogame has ${macroParts.join(', ')}.` : `Your Macrogame has no specific tags set.`;

                    const differentlyTaggedGames = flowDetails.filter(f => {
                        const hasPendingCat = f.itemCategories.some(c => pendingCats.includes(c));
                        const hasPendingSub = f.itemSubcategories.some(s => pendingSubs.includes(s));
                        const hasPendingSeason = f.itemSeasonality.some(s => pendingSeason.includes(s));
                        const hasPendingAud = f.itemAudience.some(s => pendingAudience.includes(s));
                        const hasPendingPromo = f.itemPromo.some(s => pendingPromo.includes(s));
                        return hasPendingCat || hasPendingSub || hasPendingSeason || hasPendingAud || hasPendingPromo;
                    });

                    return (
                        <div style={{ padding: '1.25rem', backgroundColor: '#fff9e6', border: '1px solid #ffeeba', borderRadius: '8px', color: '#856404', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>💡</span>
                                <div>
                                    <strong style={{ fontSize: '1rem' }}>Pending Tags Detected</strong>
                                    <div style={{ marginTop: '0.25rem', color: '#856404', lineHeight: '1.4' }}>
                                        {macroString} {getFormattedNames(differentlyTaggedGames)} {differentlyTaggedGames.length === 1 ? 'is' : 'are'} tagged differently. Please review and confirm if the Macrogame should inherit the "Pending" tags in yellow.
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginLeft: '2.2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (pendingCats.length > 0) onChange('categories', Array.from(new Set([...categories.filter(c => c !== 'All'), ...pendingCats])));
                                        if (pendingSubs.length > 0) onChange('subcategories', Array.from(new Set([...subcategories.filter(c => c !== 'All'), ...pendingSubs])));
                                        if (pendingSeason.length > 0) onChange('seasonality', Array.from(new Set([...seasonality.filter(c => c !== 'All'), ...pendingSeason])));
                                        if (pendingAudience.length > 0) onChange('targetAudience', Array.from(new Set([...targetAudience.filter(c => c !== 'All'), ...pendingAudience])));
                                        if (pendingPromo.length > 0) onChange('promotionCompatibility', Array.from(new Set([...promotionCompatibility.filter(c => c !== 'All'), ...pendingPromo])));
                                        notifications.success("All pending tags adopted.");
                                    }}
                                    style={{ textAlign: 'center', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #ffe69c', color: '#856404', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                >
                                    Add Pending Tags
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDismissedSoftTags(prev => ({
                                            categories: [...prev.categories, ...pendingCats],
                                            subcategories: [...prev.subcategories, ...pendingSubs],
                                            seasonality: [...prev.seasonality, ...pendingSeason],
                                            targetAudience: [...prev.targetAudience, ...pendingAudience],
                                            promotionCompatibility: [...prev.promotionCompatibility, ...pendingPromo]
                                        }));
                                    }}
                                    style={{ textAlign: 'center', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', backgroundColor: 'transparent', border: '1px solid transparent', color: '#856404', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'underline' }}
                                >
                                    Dismiss Pending Tags
                                </button>
                            </div>
                        </div>
                    );
                })()}


                {/* GROUP 1: Hierarchical Sectors & Categories */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                    
                    {/* Sectors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ ...styles.label, marginBottom: 0 }}>Business Sector</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {SECTORS.map(sector => (
                                <Pill key={sector} label={sector} state={sectors.includes(sector) ? 'selected' : 'default'} onClick={() => handleSectorToggle(sector)} />
                            ))}
                        </div>
                    </div>

                    {sectors.length > 0 && sectors[0] !== 'All' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #0866ff' }}>
                            <label style={{ ...styles.label, marginBottom: 0 }}>Product Category</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <Pill label="All" state={categories.includes('All') ? 'selected' : 'default'} onClick={() => handleCategoryToggle('All')} />
                                {visibleCats.map((cat: string) => (
                                    <Pill key={cat} label={cat} state={getPillState(cat, categories, pendingCats)} onClick={() => handleCategoryToggle(cat)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {categories.length > 0 && !categories.includes('All') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2rem', borderLeft: '2px solid #00d2d3' }}>
                            <label style={{ ...styles.label, marginBottom: 0 }}>Subcategory</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <Pill label="All" state={subcategories.includes('All') ? 'selected' : 'default'} onClick={() => handleSubcategoryToggle('All')} />
                                {visibleSubs.map((sub: string) => (
                                    <Pill key={sub} label={sub} state={getPillState(sub, subcategories, pendingSubs)} onClick={() => handleSubcategoryToggle(sub)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '2rem 0', marginBottom: '1.5rem' }} />

                {/* Seasonality */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>Seasonality</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" state={seasonality.includes('All') ? 'selected' : 'default'} onClick={() => handleSeasonalityToggle('All')} />
                        {SEASONALITY_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} state={getPillState(opt.id, seasonality, pendingSeason)} onClick={() => handleSeasonalityToggle(opt.id)} />
                        ))}
                    </div>
                </div>

                {/* Target Audience */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>Target Audience</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" state={targetAudience.includes('All') ? 'selected' : 'default'} onClick={() => handleAudienceToggle('All')} />
                        {TARGET_AUDIENCE_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} state={getPillState(opt.id, targetAudience, pendingAudience)} onClick={() => handleAudienceToggle(opt.id)} />
                        ))}
                    </div>
                </div>

                {/* Promotion Compatibility */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>Promo Compatibility</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <Pill label="All" state={promotionCompatibility.includes('All') ? 'selected' : 'default'} onClick={() => handlePromoToggle('All')} />
                        {PROMOTION_COMPATIBILITY_OPTIONS.map(opt => (
                            <Pill key={opt.id} label={opt.label} state={getPillState(opt.id, promotionCompatibility, pendingPromo)} onClick={() => handlePromoToggle(opt.id)} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};