/* src/components/builders/macrogame/MicrogameLibrarySelector.tsx */

import React from 'react';
import { styles } from '../../../App.styles';
import { Microgame, CustomMicrogame } from '../../../types';
import { FilterBar, FilterConfig } from '../../ui/FilterBar';
import { MicrogameCard } from '../../ui/MicrogameCard';

export interface MicrogameLibrarySelectorProps {
    isSelectionExpanded: boolean;
    setIsSelectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    activeTab: 'base' | 'custom' | 'favorites';
    setActiveTab: React.Dispatch<React.SetStateAction<'base' | 'custom' | 'favorites'>>;
    filters: any;
    handleFilterChange: (key: string, value: any) => void;
    handleResetFilters: () => void;
    baseFilterConfig: FilterConfig[];
    variantFilterConfig: FilterConfig[];
    expandedCard: string | null;
    setExpandedCard: React.Dispatch<React.SetStateAction<string | null>>;
    favoriteBaseGames: { game: Microgame; alignment: any }[];
    favoriteCustomVariants: { variant: CustomMicrogame; alignment: any }[];
    alignedBaseGames: { game: Microgame; alignment: any }[];
    alignedCustomVariants: { variant: CustomMicrogame; alignment: any }[];
    customMicrogames: CustomMicrogame[];
    allMicrogames: Microgame[];
    handleAddToFlow: (baseGame: Microgame, customVariant?: CustomMicrogame) => void;
    handlePreviewStandalone: (baseGame: Microgame, customVariant?: CustomMicrogame) => void;
    flow: any[];
}

export const MicrogameLibrarySelector: React.FC<MicrogameLibrarySelectorProps> = ({
    isSelectionExpanded,
    setIsSelectionExpanded,
    activeTab,
    setActiveTab,
    filters,
    handleFilterChange,
    handleResetFilters,
    baseFilterConfig,
    variantFilterConfig,
    expandedCard,
    setExpandedCard,
    favoriteBaseGames,
    favoriteCustomVariants,
    alignedBaseGames,
    alignedCustomVariants,
    customMicrogames,
    allMicrogames,
    handleAddToFlow,
    handlePreviewStandalone,
    flow
}) => {
    return (
        <>
            <div style={{...styles.managerHeader, cursor: 'pointer', marginTop: '1.5rem'}} onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}>
                <h3 style={{...styles.h3, margin: 0, border: 'none'}}>Add Microgame</h3>
                <button type="button" style={styles.accordionButton}>{isSelectionExpanded ? '▲' : '▼'}</button>
            </div>
            
            {isSelectionExpanded && (
                <div style={{ marginTop: '1rem' }}>
                    <p style={styles.descriptionText}>Add one or more Microgames to your Macrogame Flow.</p>
                    
                    <div style={styles.tabContainer}>
                        <button type="button" onClick={() => setActiveTab('base')} style={activeTab === 'base' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Base Microgames</button>
                        <button type="button" onClick={() => setActiveTab('custom')} style={activeTab === 'custom' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Custom Variants</button>
                        <button type="button" onClick={() => setActiveTab('favorites')} style={activeTab === 'favorites' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}>Favorites</button>
                    </div>

                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                        <input
                            type="text" placeholder="Search by name..." value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)} style={styles.input}
                        />
                    </div>

                    {activeTab === 'favorites' && (
                        <>
                            {/* --- FAVORITE BASE GAMES --- */}
                            <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Base Microgames</h4>
                            <div style={{ marginBottom: '1rem' }}>
                                <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                            </div>
                            <div style={styles.cardContainer}>
                                {favoriteBaseGames.length > 0 ? (
                                    favoriteBaseGames.map(({ game, alignment }) => (
                                        <MicrogameCard key={`fav-base-${game.id}`} game={game} matchTier={alignment.tier as any} isExpanded={expandedCard === `fav-base-${game.id}`} onExpand={() => setExpandedCard(expandedCard === `fav-base-${game.id}` ? null : `fav-base-${game.id}`)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(game)} macrogameFlow={flow as any} />
                                    ))
                                ) : (
                                    <p style={styles.descriptionText}>You have no favorited base microgames matching your filters.</p>
                                )}
                            </div>

                            {/* --- FAVORITE CUSTOM VARIANTS --- */}
                            <h4 style={{...styles.h4, marginTop: '2.5rem', marginBottom: '0.5rem'}}>Custom Variants</h4>
                            <div style={{ marginBottom: '1rem' }}>
                                <FilterBar filters={variantFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                            </div>
                            <div style={styles.cardContainer}>
                                {favoriteCustomVariants.length > 0 ? (
                                    favoriteCustomVariants.map(({ variant, alignment }) => {
                                        const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
                                        if (!baseGame) return null;
                                        return (
                                            <MicrogameCard key={`fav-var-${variant.id}`} game={baseGame} customVariant={variant} matchTier={alignment.tier as any} isExpanded={expandedCard === `fav-var-${variant.id}`} onExpand={() => setExpandedCard(expandedCard === `fav-var-${variant.id}` ? null : `fav-var-${variant.id}`)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(baseGame, variant)} macrogameFlow={flow as any} />
                                        );
                                    })
                                ) : (
                                    <p style={styles.descriptionText}>You have no favorited custom variants matching your filters.</p>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'base' && (
                        <>
                            <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Available Microgames</h4>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <FilterBar filters={baseFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                            </div>
                            <div style={{...styles.cardContainer, marginTop: '1rem'}}>
                                {alignedBaseGames.length > 0 ? (
                                    alignedBaseGames.map(({ game, alignment }) => (
                                        <MicrogameCard key={game.id} game={game} matchTier={alignment.tier as any} isExpanded={expandedCard === game.id} onExpand={() => setExpandedCard(expandedCard === game.id ? null : game.id)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(game)} macrogameFlow={flow as any} />
                                    ))
                                ) : (
                                    <p style={styles.descriptionText}>No base microgames match your filters.</p>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'custom' && (
                        <>
                            {customMicrogames.length > 0 ? (
                                <>
                                    <h4 style={{...styles.h4, marginTop: '1.5rem', marginBottom: '0.5rem'}}>Available Microgames</h4>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <FilterBar filters={variantFilterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                                    </div>
                                    <div style={{...styles.cardContainer, marginTop: '1rem'}}>
                                        {alignedCustomVariants.length > 0 ? (
                                            alignedCustomVariants.map(({ variant, alignment }) => {
                                                const baseGame = allMicrogames.find(g => g.id === variant.baseMicrogameId);
                                                if (!baseGame) return null;
                                                return (
                                                    <MicrogameCard key={variant.id} game={baseGame} customVariant={variant} matchTier={alignment.tier as any} isExpanded={expandedCard === variant.id} onExpand={() => setExpandedCard(expandedCard === variant.id ? null : variant.id)} context="creator" onSelect={handleAddToFlow} onPreview={() => handlePreviewStandalone(baseGame, variant)} macrogameFlow={flow as any} />
                                                );
                                            })
                                        ) : (
                                            <p style={styles.descriptionText}>No custom variants match your filters.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p style={{...styles.descriptionText, marginTop: '1.5rem'}}>You haven't created any custom variants yet.</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};