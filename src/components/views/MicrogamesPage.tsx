/* src/components/views/MicrogamesPage.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { notifications } from '../../utils/notifications';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { MicrogameCard } from '../ui/MicrogameCard';
import { TEMPO_OPTIONS, LENGTH_OPTIONS, LENGTH_DEFINITIONS, UI_SKINS, CONVERSION_GOALS } from '../../constants';
import { SECTORS, SECTOR_CATEGORIES, CATEGORY_SUBCATEGORIES, SEASONALITY_OPTIONS, TARGET_AUDIENCE_OPTIONS, PROMOTION_COMPATIBILITY_OPTIONS } from '../../constants/taxonomy';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { createSingleGamePreviewConfig, launchPreview } from '../../utils/helpers';
import { MICROGAME_CATALOG } from '../../microgames/catalog';
import { MicrogameCatalogItem } from '../../types';
import { Modal } from '../ui/Modal';
import { MicrogameBuilder } from '../builders/microgame/MicrogameBuilder';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox,
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);

interface MicrogamesPageProps {
    onCustomize: (data: { baseGame: Microgame, variant?: CustomMicrogame }) => void;
}

// --- Helper: Grouped Custom Games Component ---
const GroupedCustomGames: React.FC<{
    groupName: string;
    variants: CustomMicrogame[];
    selectedVariants: Set<string>;
    onToggleVariant: (id: string) => void;
    onEdit: (variant: CustomMicrogame) => void;
    onPreview: (variant: CustomMicrogame) => void;
    onDuplicate: (variant: CustomMicrogame) => void;
    onDelete: (variantId: string) => void;
}> = ({ groupName, variants, selectedVariants, onToggleVariant, onEdit, onPreview, onDuplicate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div onClick={() => setIsExpanded(!isExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '1rem 1.25rem', backgroundColor: '#fff', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdfdfd'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                <strong style={{ fontSize: '1.05rem', color: '#333' }}>{groupName} <span style={{ fontWeight: 'normal', color: '#777', fontSize: '0.9rem', marginLeft: '0.5rem' }}>({variants.length} {variants.length === 1 ? 'Variant' : 'Variants'})</span></strong>
                <button type="button" style={{ background: 'none', border: 'none', fontSize: '1rem', color: '#666', cursor: 'pointer' }}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            {isExpanded && (
                <div style={{ backgroundColor: '#f4f6f8', padding: '1rem 1.25rem', borderTop: '1px solid #eee' }}>
                    {variants.map(variant => (
                        <div key={variant.id} style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <input 
                                type="checkbox" 
                                checked={selectedVariants.has(variant.id)}
                                onChange={() => onToggleVariant(variant.id)}
                                style={{ marginRight: '1rem', cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            <div style={{ flex: 1, fontWeight: '500', color: '#333' }}>{variant.name}</div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => onPreview(variant)} style={styles.previewButton}>Preview</button>
                                <button onClick={() => onDuplicate(variant)} style={styles.editButton}>Duplicate</button>
                                <button onClick={() => onEdit(variant)} style={styles.editButton}>Edit</button>
                                <button onClick={() => onDelete(variant.id)} style={styles.deleteButton}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- NEW: Local View Component ---
const LocalMicrogamesView = ({
    activeTab,
    filters,
    allMicrogames, // This contains ONLY installed games (Library)
    customMicrogames,
    toggleMicrogameFavorite,
    deleteCustomMicrogame,
    deleteMultipleCustomMicrogames,
    handleDuplicateCustom,
    handlePreview,
    handlePreviewVariant,
    handleEditCustom,
    onCustomize,
    installMicrogame, 
    uninstallMicrogame,
    baseFilterConfig,
    variantFilterConfig,   
    onFilterChange,        
    onResetFilters         
}: any) => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ field: 'name' | 'count' | 'date', direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });

    const toggleVariantSelection = (id: string) => {
        const newSet = new Set(selectedVariants);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedVariants(newSet);
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedVariants);
        const success = await deleteMultipleCustomMicrogames(ids);
        if (success) {
            setSelectedVariants(new Set()); // Clear selection upon success
        }
    };

    // Filter Logic for Base Games
    const gameMatchesFilters = (game: any, skipSearchCheck: boolean = false) => {
        if (filters.tempoFilter !== 'All' && game.tempo !== filters.tempoFilter) return false;
        
        if (filters.typeFilter !== 'All') {
            let type = '';
            if (filters.typeFilter === 'Chance-Based') type = 'chance';
            else if (filters.typeFilter === 'Knowledge-Based') type = 'knowledge';
            else if (filters.typeFilter === 'Skill-Based') type = 'skill';
            
            if (game.mechanicType !== type) return false;
        }
        
        // Basic name search (skip if checking a variant, since variant has its own name)
        if (!skipSearchCheck && filters.searchTerm && !game.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;

        return true;
    };

    // Filter Logic for Custom Variants
    const variantMatchesFilters = (variant: CustomMicrogame, baseGame: Microgame) => {
        // 0. Base Game Explicit Selection Filter
        if (filters.baseGameFilter && filters.baseGameFilter.length > 0) {
            if (!filters.baseGameFilter.includes(variant.baseMicrogameId)) return false;
        }

        // 1. Check Variant Type/Tempo against the Base Game properties independently
        if (filters.variantTempoFilter !== 'All' && baseGame.tempo !== filters.variantTempoFilter) return false;
        
        if (filters.variantTypeFilter !== 'All') {
            let type = '';
            if (filters.variantTypeFilter === 'Chance-Based') type = 'chance';
            else if (filters.variantTypeFilter === 'Knowledge-Based') type = 'knowledge';
            else if (filters.variantTypeFilter === 'Skill-Based') type = 'skill';
            
            if (baseGame.mechanicType !== type) return false;
        }

        // 2. Must match Variant Taxonomy Tags (Handling 'None' for empty arrays)
        if (filters.sectorFilter !== 'All') {
            const hasSectors = variant.sectors && variant.sectors.length > 0;
            if (filters.sectorFilter === 'None' && hasSectors) return false;
            if (filters.sectorFilter !== 'None' && !(variant.sectors || []).includes(filters.sectorFilter)) return false;
        }
        if (filters.categoryFilter !== 'All') {
            const hasCats = variant.categories && variant.categories.length > 0;
            if (filters.categoryFilter === 'None' && hasCats) return false;
            if (filters.categoryFilter !== 'None' && !(variant.categories || []).includes(filters.categoryFilter)) return false;
        }
        if (filters.subcategoryFilter !== 'All') {
            const hasSubs = variant.subcategories && variant.subcategories.length > 0;
            if (filters.subcategoryFilter === 'None' && hasSubs) return false;
            if (filters.subcategoryFilter !== 'None' && !(variant.subcategories || []).includes(filters.subcategoryFilter)) return false;
        }
        if (filters.seasonalityFilter !== 'All') {
            const hasSeason = variant.seasonality && variant.seasonality.length > 0;
            if (filters.seasonalityFilter === 'None' && hasSeason) return false;
            if (filters.seasonalityFilter !== 'None' && !(variant.seasonality || []).includes(filters.seasonalityFilter)) return false;
        }
        if (filters.audienceFilter !== 'All') {
            const hasAudience = variant.targetAudience && variant.targetAudience.length > 0;
            if (filters.audienceFilter === 'None' && hasAudience) return false;
            if (filters.audienceFilter !== 'None' && !(variant.targetAudience || []).includes(filters.audienceFilter)) return false;
        }
        if (filters.promoFilter !== 'All') {
            const hasPromo = variant.promotionCompatibility && variant.promotionCompatibility.length > 0;
            if (filters.promoFilter === 'None' && hasPromo) return false;
            if (filters.promoFilter !== 'None' && !(variant.promotionCompatibility || []).includes(filters.promoFilter)) return false;
        }
        if (filters.descriptionFilter !== 'All') {
            const hasDesc = !!variant.description && variant.description.trim().length > 0;
            if (filters.descriptionFilter === 'Yes' && !hasDesc) return false;
            if (filters.descriptionFilter === 'No' && hasDesc) return false;
        }

        // 3. Asset & Skin Filters
        const checkSkin = (keyMatches: string[]) => Object.entries(variant.skinData || {}).some(([k, v]: [string, any]) => 
            keyMatches.some(term => k.toLowerCase().includes(term)) && v.url && v.fileName !== 'preset'
        );

        if (filters.skinnedFilter.length > 0) {
            const hasAnyVisualSkin = Object.entries(variant.skinData || {}).some(([k, v]: [string, any]) => 
                v.url && v.fileName !== 'preset' && !k.toLowerCase().startsWith('sfx') && !k.toLowerCase().startsWith('bgmusic')
            );
            
            const match = filters.skinnedFilter.some(f => {
                if (f === 'None') return !hasAnyVisualSkin;
                if (f === 'Player') return checkSkin(['player', 'catcher', 'claw']);
                if (f === 'Objects') return checkSkin(['item', 'obstacle', 'prize', 'enemy']);
                if (f === 'Background') return checkSkin(['background', 'bg']);
                return false;
            });
            if (!match) return false;
        }

        if (filters.audioFilter.length > 0) {
            const hasAnyAudioSkin = Object.entries(variant.skinData || {}).some(([k, v]: [string, any]) => 
                v.url && v.fileName !== 'preset' && (k.toLowerCase().startsWith('sfx') || k.toLowerCase().startsWith('bgmusic'))
            );
            const hasGameSfx = Object.entries(variant.skinData || {}).some(([k, v]: [string, any]) => 
                k.toLowerCase().startsWith('sfx') && !k.toLowerCase().includes('win') && !k.toLowerCase().includes('loss') && v.url && v.fileName !== 'preset'
            );
            
            const match = filters.audioFilter.some(f => {
                if (f === 'None') return !hasAnyAudioSkin;
                if (f === 'Background Music') return checkSkin(['bgmusic']);
                if (f === 'Win/Loss SFX') return checkSkin(['sfxwin', 'sfxloss']);
                if (f === 'Gameplay SFX') return hasGameSfx;
                return false;
            });
            if (!match) return false;
        }

        // 4. Mechanics & Progression Filters
        if (filters.progressionFilter.length > 0) {
            const hasAnyProgression = Object.keys(variant.mechanics || {}).some(k => 
                k.startsWith('progression_') && k.endsWith('_active') && variant.mechanics[k] === true
            );
            
            const match = filters.progressionFilter.some(f => {
                if (f === 'None') return !hasAnyProgression;
                return variant.mechanics?.[`progression_${f}_active`] === true;
            });
            if (!match) return false;
        }

        if (filters.winLossFilter.length > 0) {
            const wType = variant.rules?.winCondition?.type || baseGame.defaultRules?.winCondition?.type;
            const lType = variant.rules?.lossCondition?.type || baseGame.defaultRules?.lossCondition?.type;
            const match = filters.winLossFilter.some(f => {
                if (f === 'win_score') return wType === 'score';
                if (f === 'win_quota') return wType === 'quota';
                if (f === 'win_time') return wType === 'time';
                if (f === 'loss_quota') return lType === 'quota';
                if (f === 'loss_time') return lType === 'time';
                return false;
            });
            if (!match) return false;
        }

        // 5. Variant Name Search
        if (filters.searchTerm && !variant.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;

        return true;
    };

    // 1. Marketplace List (Iterates over Catalog)
    const marketplaceGames = useMemo(() => {
        return Object.values(MICROGAME_CATALOG).filter(gameMatchesFilters);
    }, [filters]);

    // 2. Library List (Iterates over Installed Games)
    const libraryGames = useMemo(() => {
        return allMicrogames.filter(gameMatchesFilters);
    }, [allMicrogames, filters]);

    // 3. Favorite Library Games
    const favoriteGames = useMemo(() => {
        return libraryGames.filter((game: Microgame) => game.isFavorite);
    }, [libraryGames]);

    // Custom Variants Grouping & Sorting
    const { validGroups, orphanedVariants } = useMemo(() => {
        const result = customMicrogames.reduce((acc: any, variant: CustomMicrogame) => {
            const baseGame = allMicrogames.find((g: Microgame) => g.id === variant.baseMicrogameId);
            if (!baseGame) {
                acc.orphaned.push(variant);
                return acc;
            }

            // --- Apply our new Variant Filters! ---
            if (!variantMatchesFilters(variant, baseGame)) {
                return acc; // Skip this variant if it doesn't match
            }

            const baseId = variant.baseMicrogameId;
            if (!acc.valid[baseId]) {
                acc.valid[baseId] = { baseName: variant.baseMicrogameName, variants: [] };
            }
            acc.valid[baseId].variants.push(variant);
            return acc;
        }, { valid: {}, orphaned: [] });

        let groups = Object.values(result.valid) as any[];

        // 1. Sort the variants inside each group based on user selection
        groups.forEach(group => {
            group.variants.sort((a: CustomMicrogame, b: CustomMicrogame) => {
                let comparison = 0;
                if (sortConfig.field === 'name') {
                    comparison = a.name.localeCompare(b.name);
                } else {
                    // For 'date' (or 'count', which doesn't apply to individuals), sort by date
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    comparison = dateA - dateB;
                }
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
            
            // Assign the absolute newest date to the group for parent-level sorting.
            // We use reduce so we find the newest date regardless of how the array is currently sorted!
            const latestDate = group.variants.reduce((latest: number, v: CustomMicrogame) => {
                const vDate = new Date(v.createdAt || 0).getTime();
                return vDate > latest ? vDate : latest;
            }, 0);
            group.latestDate = latestDate;
        });

        // 2. Sort the parent groups based on user selection
        groups.sort((a, b) => {
            let comparison = 0;
            if (sortConfig.field === 'name') {
                comparison = a.baseName.localeCompare(b.baseName);
            } else if (sortConfig.field === 'count') {
                comparison = a.variants.length - b.variants.length;
            } else if (sortConfig.field === 'date') {
                comparison = a.latestDate - b.latestDate;
            }
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return { validGroups: groups, orphanedVariants: result.orphaned };
    }, [customMicrogames, allMicrogames, filters, sortConfig]); // Added sortConfig to dependencies

    // The parent list (PaginatedList) no longer manages selection, so we ignore its arguments
    const renderCustomGroup = (group: any) => (
        <li key={group.id} style={{ display: 'block', margin: 0, padding: 0 }}>
            <GroupedCustomGames 
                groupName={group.baseName} 
                variants={group.variants} 
                selectedVariants={selectedVariants}
                onToggleVariant={toggleVariantSelection}
                onEdit={handleEditCustom} 
                onPreview={handlePreviewVariant} 
                onDuplicate={handleDuplicateCustom}
                onDelete={deleteCustomMicrogame} 
            />
        </li>
    );

    return (
        <>
            {/* --- TAB 1: MARKETPLACE CONTENT --- */}
            {activeTab === 'marketplace' && (
                <>
                    <h3 style={styles.h3}>Available Microgames</h3>
                    <p style={styles.descriptionText}>Browse the market to find microgames to add to your library.</p>
                    <div style={styles.cardContainer}>
                        {marketplaceGames.length > 0 ? (
                            marketplaceGames.map((catalogItem: MicrogameCatalogItem) => {
                                // Check if user already owns this game
                                const installedGame = allMicrogames.find((g: Microgame) => g.id === catalogItem.id);
                                const isInstalled = !!installedGame;
                                
                                // Pass installed object if available (for favorites status), else raw catalog item
                                const gameData = installedGame || { ...catalogItem, isActive: true, isFavorite: false };

                                return (
                                     <MicrogameCard 
                                        key={catalogItem.id} 
                                        game={gameData as Microgame} 
                                        isExpanded={expandedCard === catalogItem.id} 
                                        onExpand={() => setExpandedCard(expandedCard === catalogItem.id ? null : catalogItem.id)} 
                                        
                                        context="marketplace" 
                                        isInstalled={isInstalled}
                                        onInstall={() => installMicrogame(catalogItem.id)}

                                        onPreview={() => handlePreview(gameData as Microgame)} 
                                        // Only show customize if installed
                                        onCustomize={isInstalled ? () => onCustomize({ baseGame: gameData as Microgame }) : undefined}
                                    />
                                );
                            })
                        ) : (<p>No microgames found matching your filters.</p>)}
                    </div>
                </>
            )}

            {/* --- TAB 2: LIBRARY CONTENT --- */}
            {activeTab === 'library' && (
                <>
                    {/* --- FAVORITES SECTION (Restored) --- */}
                    {favoriteGames.length > 0 && (
                        <>
                            <h3 style={styles.h3}>Favorite Microgames</h3>
                            <div style={styles.cardContainer}>
                                {favoriteGames.map((game: Microgame) => (
                                    <MicrogameCard 
                                        key={game.id} 
                                        game={game} 
                                        isExpanded={expandedCard === game.id} 
                                        onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} 
                                        
                                        context="library"
                                        isInstalled={true}
                                        onUninstall={() => uninstallMicrogame(game.id)}

                                        onToggleFavorite={() => toggleMicrogameFavorite(game.id, !game.isFavorite)} 
                                        onPreview={() => handlePreview(game)} 
                                        onCustomize={() => onCustomize({ baseGame: game })}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    <h3 style={styles.h3}>Base Microgames</h3>
                    <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                        <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={onFilterChange} onResetFilters={onResetFilters} />
                    </div>
                    {libraryGames.length > 0 ? (
                        <div style={styles.cardContainer}>
                            {libraryGames.map((game: Microgame) => (
                                <MicrogameCard 
                                    key={game.id} 
                                    game={game} 
                                    isExpanded={expandedCard === game.id} 
                                    onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} 
                                    
                                    context="library"
                                    isInstalled={true}
                                    onUninstall={() => uninstallMicrogame(game.id)}

                                    onToggleFavorite={() => toggleMicrogameFavorite(game.id, !game.isFavorite)} 
                                    onPreview={() => handlePreview(game)} 
                                    onCustomize={() => onCustomize({ baseGame: game })}
                                />
                            ))}
                        </div>
                    ) : (
                        <p style={{...styles.descriptionText, fontStyle: 'italic', color: '#999'}}>
                            You haven't added any base Microgames to your personal library yet.
                        </p>
                    )}
                    
                    <div style={{ marginBottom: '3rem' }}></div>

                    <h3 style={styles.h3}>Custom Variants</h3>
                    <p style={styles.descriptionText}>These are custom Microgame variants that you have created.</p>
                    
                    {/* Render the Variant Filter Bar only if they have created custom games */}
                    {customMicrogames.length > 0 && (
                        <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                            <FilterBar 
                                filters={variantFilterConfig} 
                                filterValues={filters} 
                                onFilterChange={onFilterChange} 
                                onResetFilters={onResetFilters} 
                            />
                        </div>
                    )}

                    {/* Bulk Action Bar for Selected Variants */}
                    {selectedVariants.size > 0 && (
                        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ddd' }}>
                            <strong>{selectedVariants.size} variant(s) selected</strong>
                            <button onClick={handleBulkDelete} style={styles.deleteButton}>Delete Selected</button>
                        </div>
                    )}

                    {/* Sorting Controls */}
                    {customMicrogames.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'bold' }}>Sort Groups By:</span>
                            <select 
                                value={sortConfig.field} 
                                onChange={(e) => setSortConfig({ ...sortConfig, field: e.target.value as 'name' | 'count' | 'date' })}
                                style={{ ...styles.input, padding: '0.3rem 0.5rem', width: 'auto', marginBottom: 0 }}
                            >
                                <option value="name">Base Game Name</option>
                                <option value="count">Number of Variants</option>
                                <option value="date">Recently Updated</option>
                            </select>
                            <button 
                                type="button"
                                onClick={() => setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                style={{ ...styles.secondaryButton, padding: '0.4rem 0.6rem', marginBottom: 0 }}
                                title={sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                            >
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    )}

                    {validGroups.length > 0 ? (
                        <PaginatedList
                            items={validGroups.map((g: any) => ({...g, id: g.baseName}))}
                            renderItem={renderCustomGroup}
                            itemsPerPage={5}
                            listContainerComponent="ul"
                            listContainerStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', padding: 0, margin: 0, listStyle: 'none' }}
                        />
                    ) : customMicrogames.length === 0 ? (
                        <p>You haven't created any custom Microgames yet.</p>
                    ) : null}

                    {orphanedVariants.length > 0 && (
                        <>
                            <h4 style={{...styles.h4, marginTop: '2rem', color: '#e74c3c'}}>Orphaned Variants</h4>
                            <ul style={styles.rewardsListFull}>
                                {orphanedVariants.map((variant: CustomMicrogame) => (
                                    <li key={variant.id} style={{ ...styles.rewardListItem, backgroundColor: '#fff2f2' }}>
                                        <div style={{opacity: 0.6}}>
                                            <strong>{variant.name}</strong>
                                            <div style={styles.rewardAnalytics}>
                                                <span>Base Game: {variant.baseMicrogameName} (Missing)</span>
                                            </div>
                                        </div>
                                        <div style={styles.managerActions}>
                                            <button onClick={() => deleteCustomMicrogame(variant.id)} style={styles.deleteButton}>Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    
                    {/* SPACER: Ensures absolute-positioned filter dropdowns don't get cut off when the list is empty */}
                    <div style={{ minHeight: '100px' }}></div>
                </>
            )}
        </>
    );
};

// --- Algolia View Component ---
const AlgoliaMicrogamesView = ({
    activeTab, 
    filters,
    handlePreview,
    onCustomize,
    toggleMicrogameFavorite
}: any) => {
    
    useConfigure({
        hitsPerPage: 1000,
        filters: useMemo(() => {
            const algoliaFilters = [];
            algoliaFilters.push('isActive != 0'); 

            if (filters.tempoFilter !== 'All') algoliaFilters.push(`tempo:"${filters.tempoFilter}"`);
            
            if (filters.typeFilter !== 'All') {
                let type = '';
                if (filters.typeFilter === 'Chance-Based') type = 'chance';
                else if (filters.typeFilter === 'Knowledge-Based') type = 'knowledge';
                else if (filters.typeFilter === 'Skill-Based') type = 'skill';
                
                algoliaFilters.push(`mechanicType:"${type}"`);
            }

            return algoliaFilters.join(' AND ');
        }, [filters]),
    });

    const { hits } = useHits();
    const { refresh } = useInstantSearch();
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => { refresh(); }, [refresh]);

    const [localHits, setLocalHits] = useState(hits);
    useEffect(() => { setLocalHits(hits); }, [hits]);

    const handleToggleFavorite = (id: string, currentStatus: boolean) => {
        toggleMicrogameFavorite(id, !currentStatus);
        setLocalHits(prev => prev.map(h => h.objectID === id ? { ...h, isFavorite: !currentStatus } : h));
    };

    // NOTE: Algolia currently only indexes BASE microgames.
    // If we are in "Library" tab, we should probably hide these results or show a message.
    // For now, if searching, we show results assuming "Marketplace" context.
    
    if (activeTab === 'library') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <p>Search is currently only available for the Marketplace (Base Microgames).</p>
                <p>Please switch to the <strong>Marketplace</strong> tab to search.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 style={styles.h3}>Search Results</h3>
            <div style={styles.cardContainer}>
                {localHits.length > 0 ? (
                    localHits.map((hit: any) => {
                        const gameData = { ...hit, id: hit.objectID } as Microgame;
                        return (
                            <MicrogameCard 
                                key={gameData.id} 
                                game={gameData} 
                                isExpanded={expandedCard === gameData.id} 
                                onExpand={() => setExpandedCard(expandedCard === gameData.id ? null : gameData.id)} 
                                context="library"
                                onToggleFavorite={() => handleToggleFavorite(gameData.id, !!gameData.isFavorite)} 
                                onPreview={() => handlePreview(gameData)} 
                                onCustomize={() => onCustomize({ baseGame: gameData })}
                            />
                        );
                    })
                ) : (
                    <p>No Microgames found.</p>
                )}
            </div>
        </div>
    );
};

// --- Connected Search Box ---
const ConnectedSearchBox = ({ 
  searchTerm, 
  setSearchTerm
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}) => {
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    refine(value);
  };

  useEffect(() => {
    if (searchTerm === '') refine('');
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search Microgames</label>
        <input
            type="text" placeholder="Search by name..." value={searchTerm}
            onChange={handleChange} style={styles.input}
        />
    </div>
  );
};

export const MicrogamesPage: React.FC<MicrogamePageProps> = ({ onCustomize }) => {
    const { allMicrogames, customMicrogames, toggleMicrogameFavorite, deleteCustomMicrogame, deleteMultipleCustomMicrogames, duplicateCustomMicrogame, installMicrogame, uninstallMicrogame } = useData();
    const [searchKey, setSearchKey] = useState(Date.now());
    const [activeTab, setActiveTab] = useState<'marketplace' | 'library'>('marketplace');

    // --- Builder State ---
    const [builderData, setBuilderData] = useState<{ baseGame: Microgame; variant?: CustomMicrogame } | null>(null);
    
    // --- Picker Modal State ---
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [selectedBaseGameId, setSelectedBaseGameId] = useState<string | null>(null); // Track selection

    const [filters, setFilters] = useState({
        searchTerm: '', typeFilter: 'All', tempoFilter: 'All',
        variantTypeFilter: 'All', variantTempoFilter: 'All',
        sectorFilter: 'All', categoryFilter: 'All', subcategoryFilter: 'All', seasonalityFilter: 'All', audienceFilter: 'All', promoFilter: 'All', descriptionFilter: 'All',
        skinnedFilter: [] as string[], audioFilter: [] as string[], progressionFilter: [] as string[], winLossFilter: [] as string[],
        baseGameFilter: [] as string[]
    });

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            if (key === 'sectorFilter') {
                newFilters.categoryFilter = 'All';
                newFilters.subcategoryFilter = 'All';
            }
            if (key === 'categoryFilter') {
                newFilters.subcategoryFilter = 'All';
            }
            return newFilters;
        });
    };

    const handleResetFilters = () => {
        setFilters({ 
            searchTerm: '', typeFilter: 'All', tempoFilter: 'All',
            variantTypeFilter: 'All', variantTempoFilter: 'All',
            sectorFilter: 'All', categoryFilter: 'All', subcategoryFilter: 'All', seasonalityFilter: 'All', audienceFilter: 'All', promoFilter: 'All', descriptionFilter: 'All',
            skinnedFilter: [], audioFilter: [], progressionFilter: [], winLossFilter: [], baseGameFilter: []
        });
    };

    const handlePreview = (game: Microgame) => {
        const previewConfig = createSingleGamePreviewConfig(game);
        launchPreview(previewConfig);
    };

    const handlePreviewVariant = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            const previewConfig = createSingleGamePreviewConfig(baseGame, variant);
            launchPreview(previewConfig);
        } else {
            notifications.error('Could not find the base Microgame for this variant.');
        }
    };

    const handleEditVariant = (variant: CustomMicrogame) => {
        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
        if (baseGame) {
            handleLaunchBuilder({ baseGame, variant });
        } else {
            notifications.error(`Base game "${variant.baseMicrogameName}" not found in library.`);
        }
    };

    const handleLaunchBuilder = (data: { baseGame: Microgame; variant?: CustomMicrogame }) => {
        setBuilderData(data);
    };

    const handleDuplicateCustom = async (variant: CustomMicrogame) => {
        try {
            await duplicateCustomMicrogame(variant);
            notifications.success('Variant duplicated');
        } catch (error) {
            notifications.error('Failed to duplicate variant.');
        }
    };

    const handleDeleteCustom = async (variantId: string) => {
        // Because Firestore is real-time, the UI will instantly remove the item 
        // without needing artificial delays or force-remounts!
        await deleteCustomMicrogame(variantId);
    };
    
    const goalOptions = [
        { value: 'All', label: 'All' },
        ...Object.entries(CONVERSION_GOALS).map(([groupLabel, options]) => ({
            group: groupLabel,
            options: options.map(opt => ({ value: opt, label: opt }))
        }))
    ];

    // Base Game Filter Config (Marketplace & Base Library Games)
    const baseFilterConfig: FilterConfig[] = [
        { type: 'select', label: 'Type', options: ['All', 'Chance-Based', 'Knowledge-Based', 'Skill-Based'], stateKey: 'typeFilter' },
        { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'tempoFilter' }
    ];

    // Extract dynamic list of base games that currently have variants
    const availableBaseGames = Array.from(
        new Map(customMicrogames.map(v => [v.baseMicrogameId, v.baseMicrogameName])).entries()
    ).map(([id, name]) => ({ value: id, label: name as string }));

    // Variant-Only Filter Config (Type, Tempo, and Taxonomy Tags)
    const variantFilterConfig: FilterConfig[] = [];
    if (activeTab === 'library') {
        variantFilterConfig.push(
            { type: 'multiselect', label: 'Base Game', options: availableBaseGames, stateKey: 'baseGameFilter' },
            { type: 'select', label: 'Type', options: ['All', 'Chance-Based', 'Knowledge-Based', 'Skill-Based'], stateKey: 'variantTypeFilter' },
            { type: 'select', label: 'Tempo', options: TEMPO_OPTIONS, stateKey: 'variantTempoFilter' },
            
            // Deep Customization Filters
            { type: 'multiselect', label: 'Skinned Elements', options: [{value: 'None', label: 'None (Default)'}, {value: 'Player', label: 'Player'}, {value: 'Objects', label: 'Objects'}, {value: 'Background', label: 'Background'}], stateKey: 'skinnedFilter' },
            { type: 'multiselect', label: 'Custom Audio', options: [{value: 'None', label: 'None (Default)'}, {value: 'Background Music', label: 'Background Music'}, {value: 'Gameplay SFX', label: 'Gameplay SFX'}, {value: 'Win/Loss SFX', label: 'Win/Loss SFX'}], stateKey: 'audioFilter' },
            { type: 'multiselect', label: 'Dynamic Progression', options: [{value: 'None', label: 'None (Default)'}, {value: 'speed', label: 'Speed'}, {value: 'score', label: 'Point Value'}, {value: 'spawn', label: 'Spawn Rate'}, {value: 'distribution', label: 'Bad Item Ratio'}, {value: 'size', label: 'Size'}], stateKey: 'progressionFilter' },
            { type: 'multiselect', label: 'Win/Loss Conditions', options: [{value: 'win_score', label: 'Win: Score Target'}, {value: 'win_quota', label: 'Win: Item Quota'}, {value: 'win_time', label: 'Win: Survival'}, {value: 'loss_quota', label: 'Loss: Hit Hazards'}, {value: 'loss_time', label: 'Loss: Time Up'}], stateKey: 'winLossFilter' },

            // Taxonomy Filters
            { type: 'select', label: 'Sector', options: ['All', 'None', ...SECTORS], stateKey: 'sectorFilter' }
        );
        
        if (filters.sectorFilter !== 'All' && filters.sectorFilter !== 'None') {
            variantFilterConfig.push({ type: 'select', label: 'Category', options: ['All', 'None', ...(SECTOR_CATEGORIES[filters.sectorFilter] || [])], stateKey: 'categoryFilter' });
        }
        if (filters.categoryFilter !== 'All' && filters.categoryFilter !== 'None') {
            variantFilterConfig.push({ type: 'select', label: 'Subcategory', options: ['All', 'None', ...(CATEGORY_SUBCATEGORIES[filters.categoryFilter] || [])], stateKey: 'subcategoryFilter' });
        }

        variantFilterConfig.push(
            { type: 'select', label: 'Seasonality', options: ['All', 'None', ...SEASONALITY_OPTIONS.map(s => ({ value: s.id, label: s.label }))], stateKey: 'seasonalityFilter' },
            { type: 'select', label: 'Target Audience', options: ['All', 'None', ...TARGET_AUDIENCE_OPTIONS.map(a => ({ value: a.id, label: a.label }))], stateKey: 'audienceFilter' },
            { type: 'select', label: 'Promo Compatibility', options: ['All', 'None', ...PROMOTION_COMPATIBILITY_OPTIONS.map(p => ({ value: p.id, label: p.label }))], stateKey: 'promoFilter' },
            { type: 'select', label: 'Has Description?', options: ['All', 'Yes', 'No'], stateKey: 'descriptionFilter' }
        );
    }

    // --- RENDER BUILDER IF OPEN ---
    if (builderData) {
        return (
            <div style={styles.creatorSection}>
                <MicrogameBuilder 
                    baseGame={builderData.baseGame} 
                    initialVariant={builderData.variant}
                    onSave={() => setBuilderData(null)}
                    onCancel={() => setBuilderData(null)}
                />
            </div>
        );
    }

    // --- RENDER MANAGER IF BUILDER CLOSED ---
    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}><h2 style={styles.h2}>Microgame Manager</h2></div>
            
            <button 
                onClick={() => {
                    if (allMicrogames.length === 0) {
                        notifications.error("You need to add games to your Library first!");
                        setActiveTab('marketplace');
                    } else {
                        setSelectedBaseGameId(null); // Reset selection
                        setIsPickerOpen(true);
                    }
                }}
                style={{ 
                    ...styles.createButton, 
                    marginBottom: '1rem', 
                    width: '100%', 
                    maxWidth: '300px' 
                }}
            >
                Create Custom Microgame
            </button>

            <div style={styles.tabContainer}>
                <button onClick={() => setActiveTab('marketplace')} style={activeTab === 'marketplace' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Marketplace</button>
                <button onClick={() => setActiveTab('library')} style={activeTab === 'library' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Library</button>
            </div>

            <InstantSearch key={searchKey} searchClient={searchClient} indexName="microgames">
                <div style={{...styles.filterContainer, marginBottom: '1rem'}}>
                    <ConnectedSearchBox searchTerm={filters.searchTerm} setSearchTerm={(val) => handleFilterChange('searchTerm', val)} />
                </div>

                {/* Marketplace uses the top filter bar. Library renders it internally. */}
                {activeTab === 'marketplace' && (
                    <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                )}
                
                {filters.searchTerm.trim().length > 0 ? (
                    <AlgoliaMicrogamesView 
                        activeTab={activeTab}
                        filters={filters}
                        handlePreview={handlePreview}
                        onCustomize={handleLaunchBuilder}
                        toggleMicrogameFavorite={toggleMicrogameFavorite}
                    />
                ) : (
                    <LocalMicrogamesView 
                        activeTab={activeTab}
                        filters={filters}
                        allMicrogames={allMicrogames}
                        customMicrogames={customMicrogames}
                        toggleMicrogameFavorite={toggleMicrogameFavorite}
                        deleteCustomMicrogame={handleDeleteCustom}
                        deleteMultipleCustomMicrogames={deleteMultipleCustomMicrogames}
                        handleDuplicateCustom={handleDuplicateCustom}
                        handlePreview={handlePreview}
                        handlePreviewVariant={handlePreviewVariant}
                        handleEditCustom={handleEditVariant}
                        onCustomize={handleLaunchBuilder}
                        installMicrogame={installMicrogame}
                        uninstallMicrogame={uninstallMicrogame}
                        baseFilterConfig={baseFilterConfig}
                        variantFilterConfig={variantFilterConfig}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                    />
                )}
            </InstantSearch>

            {/* --- UPDATED BASE GAME PICKER MODAL --- */}
            <Modal 
                isOpen={isPickerOpen} 
                onClose={() => setIsPickerOpen(false)} 
                title="Select Base Microgame"
                size="large"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', width: '100%' }}>
                        <button 
                            onClick={() => setIsPickerOpen(false)} 
                            style={styles.secondaryButton}
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!selectedBaseGameId}
                            style={!selectedBaseGameId ? { ...styles.saveButton, opacity: 0.5, cursor: 'not-allowed' } : styles.saveButton}
                            onClick={() => {
                                if (selectedBaseGameId) {
                                    const game = allMicrogames.find(g => g.id === selectedBaseGameId);
                                    if (game) {
                                        setBuilderData({ baseGame: game });
                                        setIsPickerOpen(false);
                                    }
                                }
                            }}
                        >
                            Continue
                        </button>
                    </div>
                }
            >
                <div>
                    <p style={styles.descriptionText}>
                        Choose a base game from your library to customize.
                    </p>
                    <div style={styles.cardContainer}>
                        {allMicrogames.map(game => {
                            const isSelected = selectedBaseGameId === game.id;
                            
                            return (
                                <div 
                                    key={game.id} 
                                    onClick={() => setSelectedBaseGameId(game.id)}
                                    style={{
                                        ...styles.card,
                                        cursor: 'pointer',
                                        border: isSelected ? '2px solid #0866ff' : '1px solid #ddd',
                                        boxShadow: isSelected ? '0 0 0 4px rgba(8, 102, 255, 0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isSelected ? '#f0f7ff' : 'white'
                                    }}
                                >
                                    <div style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{game.name}</span>
                                            {isSelected && <span style={{ color: '#0866ff', fontSize: '1.2rem' }}>✓</span>}
                                        </div>
                                        
                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                            <p style={{ margin: '0 0 0.25rem 0' }}><strong>Mechanic:</strong> {game.baseType}</p>
                                            <p style={{ margin: 0 }}><strong>Length:</strong> {game.length}s</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </div>
    );
};