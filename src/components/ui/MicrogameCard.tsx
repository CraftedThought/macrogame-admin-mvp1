/* src/components/ui/MicrogameCard.tsx */

import React, { useState, useMemo } from 'react';
import { styles } from '../../App.styles';
import { Microgame, CustomMicrogame } from '../../types';
import { StarIcon } from './StarIcon';

// Define the three distinct contexts
type CardContext = 'creator' | 'library' | 'marketplace';

interface MicrogameCardProps {
    game: Microgame;
    isExpanded: boolean;
    onExpand: () => void;
    context: CardContext;
    
    // Creator Props
    onSelect?: (baseGame: Microgame, customVariant?: CustomMicrogame) => void;
    customVariant?: CustomMicrogame; // Pass this if the card specifically represents a custom variant
    macrogameFlow?: { baseGame: Microgame; customVariant?: CustomMicrogame }[];
    matchTier?: 'perfect' | 'neutral' | 'partial' | 'mismatch' | 'none'; // Drives proactive conflict badging
    
    // Library Props
    onToggleFavorite?: () => void;
    onCustomize?: () => void;
    onUninstall?: () => void;

    // Marketplace Props
    isInstalled?: boolean;
    onInstall?: () => void;

    // Shared Props
    onPreview?: () => void;
    showIntelligenceData?: boolean;
}

export const MicrogameCard: React.FC<MicrogameCardProps> = (props) => {
    const { game, isExpanded, onExpand, context, macrogameFlow = [], isInstalled, matchTier } = props;
    
    // --- Creator Logic (Variant Selection) ---
    const isAdded = useMemo(() => {
        return macrogameFlow.some(flowItem => 
            flowItem.baseGame.id === game.id &&
            (props.customVariant ? flowItem.customVariant?.id === props.customVariant.id : !flowItem.customVariant)
        );
    }, [macrogameFlow, game.id, props.customVariant]);

    const handleAdd = () => {
        if (isAdded) return;
        props.onSelect?.(game, props.customVariant);
    };
    
    // --- Shared Header Content & Expanded Details ---
    const displayName = props.customVariant ? props.customVariant.name : game.name;

    const cardContent = (
        <div style={{ padding: '1rem' }}>
            {context === 'creator' && !isAdded && matchTier && matchTier !== 'none' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
                    {matchTier === 'perfect' && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', backgroundColor: '#eaf5fc', color: '#0866ff', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #cce4ff', boxShadow: '0 1px 2px rgba(8, 102, 255, 0.1)' }}>✨ Strong Match</span>
                    )}
                    {matchTier === 'neutral' && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', backgroundColor: '#f3f0ff', color: '#673ab7', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #d1c4e9', boxShadow: '0 1px 2px rgba(103, 58, 183, 0.1)' }}>🌍 Universal Fit</span>
                    )}
                    {matchTier === 'partial' && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', backgroundColor: '#fffce6', color: '#d39e00', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', border: '1px solid #ffeeba', boxShadow: '0 1px 2px rgba(211, 158, 0, 0.1)' }}>⚠️ Partial Match</span>
                    )}
                    {matchTier === 'mismatch' && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', backgroundColor: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>🚫 Sector Mismatch</span>
                    )}
                </div>
            )}
            <div style={styles.cardHeader}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '1rem' }}>{displayName}</span>
                <button style={styles.accordionButton} onClick={(e) => { e.stopPropagation(); onExpand(); }}>{isExpanded ? '▲' : '▼'}</button>
            </div>
            
            {isExpanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem', fontSize: '0.85rem', color: '#555' }}>
                    
                    {/* 1. Basic Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div><strong style={{ color: '#333' }}>Type:</strong> {game.baseType}</div>
                        <div><strong style={{ color: '#333' }}>Tempo:</strong> {game.tempo || 'Normal'}</div>
                        <div><strong style={{ color: '#333' }}>Controls:</strong> {game.controls}</div>
                        <div><strong style={{ color: '#333' }}>Avg Length:</strong> {game.length}s</div>
                    </div>

                    {/* 2. STRATEGIC METADATA (New) */}
                    {props.showIntelligenceData && game.conversionMetadata && (
                        <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '0.75rem' }}>
                            
                            {/* Pro Tip */}
                            <div style={{ marginBottom: '0.75rem', fontStyle: 'italic', borderLeft: '3px solid #0866ff', paddingLeft: '0.5rem', lineHeight: '1.4' }}>
                                "{game.conversionMetadata.bestForTip}"
                            </div>

                            {/* Top Conversion Strengths (Top 3) */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#999', marginBottom: '0.25rem' }}>Top Strengths</div>
                                {(() => {
                                    // Helper to normalize data from either 'pillars' (New) or 'suitability' (Old)
                                    const metadata = game.conversionMetadata as any;
                                    let items: { label: string, score: number }[] = [];

                                    if (metadata.pillars) {
                                        // NEW STRUCTURE
                                        items = Object.entries(metadata.pillars).map(([key, val]: [string, any]) => ({
                                            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                            score: val.score
                                        }));
                                    } else if (metadata.suitability) {
                                        // OLD STRUCTURE (Fallback)
                                        items = Object.entries(metadata.suitability).map(([key, score]: [string, any]) => ({
                                            label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                                            score: score
                                        }));
                                    }

                                    return items
                                        .sort((a, b) => b.score - a.score)
                                        .slice(0, 3)
                                        .map((item) => (
                                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                                                <span style={{ flex: 1, fontSize: '0.75rem' }}>{item.label}</span>
                                                {/* Mini Bar Chart */}
                                                <div style={{ width: '60px', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', margin: '0 8px' }}>
                                                    <div style={{ 
                                                        width: `${item.score * 10}%`, 
                                                        height: '100%', 
                                                        backgroundColor: item.score >= 8 ? '#2ecc71' : '#3498db',
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: item.score >= 8 ? '#2ecc71' : '#666' }}>{item.score}</span>
                                            </div>
                                        ));
                                })()}
                            </div>

                            {/* Triggers & Audience Tags */}
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', color: '#999', marginBottom: '0.25rem' }}>Triggers & Audience</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {/* Triggers */}
                                    {(game.conversionMetadata as any).triggers?.slice(0, 3).map((t: any) => (
                                        <span key={t.id} style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: '#e3f2fd', color: '#1565c0', borderRadius: '3px', border: '1px solid #bbdefb' }}>
                                            ⚡ {t.label}
                                        </span>
                                    ))}
                                    
                                    {/* Audience (Support New 'audienceVibe' and Old 'audience.demographic') */}
                                    {(game.conversionMetadata as any).audienceVibe 
                                        ? (game.conversionMetadata as any).audienceVibe.map((tag: string) => (
                                            <span key={tag} style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '3px', color: '#666' }}>{tag}</span>
                                          ))
                                        : (game.conversionMetadata as any).audience?.demographic?.map((d: string) => (
                                            <span key={d} style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '3px', color: '#666' }}>{d}</span>
                                          ))
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // =========================================================
    // 1. CREATOR CONTEXT (Macrogame Builder)
    // =========================================================
    if (context === 'creator') {
        return (
            <div style={styles.card}>
                {cardContent}
                
                <div style={{...styles.cardActions, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={props.onPreview} style={styles.editButton}>Preview</button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleAdd(); }} 
                            style={{
                                ...(isAdded ? styles.cardAddButtonAdded : styles.cardAddButton),
                                flexShrink: 0, 
                                whiteSpace: 'nowrap',
                                padding: '0.25rem 0.75rem'
                            }}
                            disabled={isAdded}
                        >
                            {isAdded ? 'Added' : 'Add to Flow'}
                        </button>
                    </div>
                    {/* Read-only Star for reference - Hidden completely if not favorited */}
                    {game.isFavorite && !props.customVariant && <StarIcon isFavorite={true} isReadOnly={true} />}
                </div>
            </div>
        );
    }

    // =========================================================
    // 2. MARKETPLACE CONTEXT
    // =========================================================
    if (context === 'marketplace') {
        return (
            <div style={styles.cardWithActions}>
                {cardContent}
                <div style={{
                    ...styles.cardActions, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap', // <--- ALLOW WRAPPING
                    gap: '0.5rem'     // <--- ADD GAP
                }}>
                    <button onClick={props.onPreview} style={styles.editButton}>Preview</button>
                    
                    {/* Action: Install vs Installed */}
                    {isInstalled ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4CAF50', fontWeight: 'bold' }}>✓ Installed</span>
                        </div>
                    ) : (
                        <button 
                            onClick={props.onInstall} 
                            style={{
                                ...styles.saveButton, 
                                padding: '0.35rem 0.85rem', 
                                fontSize: '0.85rem', 
                                width: 'auto',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Add to Library
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // =========================================================
    // 3. LIBRARY CONTEXT (Default)
    // =========================================================
    return (
        <div style={styles.cardWithActions}>
            {cardContent}
            <div style={{
                ...styles.cardActions, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap', // <--- ALLOW WRAPPING
                gap: '0.5rem'
            }}>
                {/* Button Group: Wraps if needed */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={props.onPreview} style={styles.editButton}>Preview</button>
                    <button onClick={props.onCustomize} style={styles.editButton}>Customize</button>
                    {props.onUninstall && (
                        <button 
                            onClick={props.onUninstall} 
                            style={{...styles.deleteButton, padding: '0.25rem 0.5rem'}}
                            title="Remove from Library"
                        >
                            Remove
                        </button>
                    )}
                </div>
                
                {/* Favorite Star (Active) - Pushed to right, but wraps if needed */}
                <button onClick={props.onToggleFavorite} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginLeft: 'auto' }}>
                    <StarIcon isFavorite={!!game.isFavorite} />
                </button>
            </div>
        </div>
    );
};