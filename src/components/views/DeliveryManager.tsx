/* src/components/views/DeliveryManager.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationToast } from '../ui/ConfirmationToast';
import { notifications } from '../../utils/notifications';
import { useLocation } from 'react-router-dom';
import { styles } from '../../App.styles';
import {
    DeliveryContainer,
    SkinConfig,
    // SkinContentBlock is no longer needed here as PopupSkinForm handles it
} from '../../types';
import { useData } from '../../hooks/useData';
import { DeliveryMethodManagerTab } from './DeliveryMethodManagerTab';
import { StarIcon } from '../ui/StarIcon';
import { hasMacrogameIssues, generateUUID } from '../../utils/helpers';
import { UI_SKINS, YES_NO_ALL_OPTIONS } from '../../constants';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { PopupSkinForm } from '../forms/PopupSkinForm';
import { StaticSkinPreview } from '../previews/StaticSkinPreview';

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

type DeliveryTab = 'Unconfigured' | 'Popup' | 'OnPageSection' | 'NewWebpage';

interface DeliveryManagerProps {
    handleEditContainer: (container: DeliveryContainer) => void;
}

// --- NEW: Local List Component ---
const LocalContainerList = ({
    tab,
    filters,
    handleEditContainer,
    duplicateDeliveryContainer,
    toggleDeliveryContainerFavorite,
    deleteDeliveryContainer,
    deleteMultipleDeliveryContainers,
    macrogames,
    allMicrogames,
}: {
    tab: 'Unconfigured' | 'Popup';
    filters: { [key: string]: string | string[] };
    handleEditContainer: (container: DeliveryContainer) => void;
    duplicateDeliveryContainer: (containerToDuplicate: DeliveryContainer) => Promise<DeliveryContainer | undefined>;
    toggleDeliveryContainerFavorite: (containerId: string, isFavorite: boolean) => Promise<void>;
    deleteDeliveryContainer: (id: string) => Promise<boolean>;
    deleteMultipleDeliveryContainers: (ids: string[]) => Promise<void>;
    macrogames: any[];
    allMicrogames: any[];
}) => {
    const { deliveryContainers } = useData();

    // --- Client-Side Filtering ---
    const filteredContainers = useMemo(() => {
        return deliveryContainers.filter(container => {
            // 1. Tab Logic (Status & Method)
            if (tab === 'Unconfigured') {
                if (container.status.code !== 'error') return false;
            } else {
                if (container.status.code !== 'ok') return false;
                if (container.deliveryMethod !== 'popup_modal') return false;
            }

            // 2. Macrogame Filter
            if (filters.macrogameFilter && filters.macrogameFilter !== 'All') {
                // We compare names because that's what the filter stores
                if (container.macrogameName !== filters.macrogameFilter) return false;
            }

            // 3. Skin Filter
            if (filters.skinFilter && filters.skinFilter !== 'All') {
                const skinId = UI_SKINS.find(s => s.name === filters.skinFilter)?.id;
                if (skinId && container.skinId !== skinId) return false;
            }

            // 4. Campaign Filter
            if (filters.campaignFilter && filters.campaignFilter !== 'All') {
                const isLinked = !!container.campaignId;
                if (filters.campaignFilter === 'Yes' && !isLinked) return false;
                if (filters.campaignFilter === 'No' && isLinked) return false;
            }

            return true;
        });
    }, [deliveryContainers, tab, filters]);

    // Reuse the alert helper
    const getClientSideContainerAlert = (container: DeliveryContainer) => {
        if (!container.deliveryMethod) return { message: 'Configuration Needed: Select a delivery container type.' };
        if (!container.skinId) return { message: 'Configuration Needed: Select a UI skin.' };
        if (!container.macrogameId) return { message: 'Configuration Needed: Select a Macrogame.' };
        const macrogame = macrogames.find(m => m.id === container.macrogameId);
        if (!macrogame) return { message: 'Needs Attention: The linked macrogame was deleted.' };
        if (hasMacrogameIssues(macrogame, allMicrogames)) {
            return { message: 'Needs Attention: Contains an archived microgame.' };
        }
        return null;
    };

    const handlePreview = (container: DeliveryContainer) => {
        if (!container.skinId || !container.macrogameId) {
            notifications.error("This container needs a Macrogame and a UI skin configured before it can be previewed.");
            return;
        }
        const previewConfig = { 
            macrogameId: container.macrogameId,
            skinId: container.skinId,
            container: container,
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };

    const renderContainerItem = (container: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => {
        const isUnconfigured = tab === 'Unconfigured';
        const alert = getClientSideContainerAlert(container);
        
        return (
            <li key={container.id} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{container.name}</strong>
                    {alert && <span style={styles.warningTag}>{alert.message}</span>}
                    <div style={styles.rewardAnalytics}>
                        <span>Macrogame: {container.macrogameName || 'N/A'}</span>
                        <span>Skin: {UI_SKINS.find(s => s.id === container.skinId)?.name || 'N/A'}</span>
                    </div>
                </div>
                <div style={styles.rewardActions}>
                    {!isUnconfigured && (
                        <button onClick={() => handlePreview(container)} style={styles.previewButton} disabled={!container.skinId || !container.macrogameId}>Preview</button>
                    )}
                    <button onClick={() => duplicateDeliveryContainer(container)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditContainer(container)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deleteDeliveryContainer(container.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => toggleDeliveryContainerFavorite(container.id, !container.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!container.isFavorite} />
                    </button>
                </div>
            </li>
        );
    };

    const favoriteItems = filteredContainers.filter(p => p.isFavorite);
    
    return (
        <DeliveryMethodManagerTab
            items={filteredContainers}
            favoriteItems={favoriteItems}
            renderItem={renderContainerItem}
            onDeleteMultiple={deleteMultipleDeliveryContainers}
            itemTypeName={tab === 'Unconfigured' ? 'Unconfigured Items' : 'Popup Containers'}
            isLoading={false}
        />
    );
};

// --- Local Toggle Component ---
const ToggleSwitch: React.FC<{ isChecked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ isChecked, onChange, label }) => {
    return (
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ color: '#aaa', fontSize: '0.9rem', marginRight: '0.5rem' }}>{label}</span>
            <div style={{ position: 'relative', width: '40px', height: '20px', backgroundColor: isChecked ? '#4CAF50' : '#ccc', borderRadius: '10px', transition: 'background-color 0.2s' }}>
                <input type="checkbox" checked={isChecked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    left: isChecked ? '22px' : '2px', 
                    width: '16px', 
                    height: '16px', 
                    backgroundColor: 'white', 
                    borderRadius: '50%', 
                    transition: '0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                }} />
            </div>
        </label>
    );
};

// --- Inner Component for List Rendering ---
const AlgoliaContainerList = ({
    tab,
    filters,
    searchTerm,
    handleEditContainer,
    duplicateDeliveryContainer,
    toggleDeliveryContainerFavorite,
    deleteDeliveryContainer,
    deleteMultipleDeliveryContainers,
    macrogames,
    allMicrogames,
    forceRefresh,
}: {
    tab: 'Unconfigured' | 'Popup';
    filters: { [key: string]: string | string[] };
    searchTerm: string;
    handleEditContainer: (container: DeliveryContainer) => void;
    duplicateDeliveryContainer: (containerToDuplicate: DeliveryContainer) => Promise<DeliveryContainer | undefined>;
    toggleDeliveryContainerFavorite: (containerId: string, isFavorite: boolean) => Promise<void>;
    deleteDeliveryContainer: (id: string) => Promise<boolean>;
    deleteMultipleDeliveryContainers: (ids: string[]) => Promise<void>;
    macrogames: any[];
    allMicrogames: any[];
    forceRefresh: () => void;
}) => {
    
    useConfigure({
        hitsPerPage: 1000, 
        filters: useMemo(() => {
            const algoliaFilters = [];

            if (tab === 'Unconfigured') {
                algoliaFilters.push('status.code:"error"');
            } else {
                algoliaFilters.push('status.code:"ok"');
                algoliaFilters.push('deliveryMethod:"popup_modal"');
            }

            if (filters.macrogameFilter && filters.macrogameFilter !== 'All') {
                algoliaFilters.push(`macrogameName:"${filters.macrogameFilter}"`);
            }
            if (filters.skinFilter && filters.skinFilter !== 'All') {
                const skinId = UI_SKINS.find(s => s.name === filters.skinFilter)?.id;
                if (skinId) {
                    algoliaFilters.push(`skinId:"${skinId}"`);
                }
            }
            if (filters.campaignFilter && filters.campaignFilter !== 'All') {
                const hasCampaign = filters.campaignFilter === 'Yes';
                algoliaFilters.push(`isCampaignLinked:${hasCampaign}`);
            }
            
            return algoliaFilters.join(' AND ');
        }, [tab, filters.macrogameFilter, filters.skinFilter, filters.campaignFilter]),
    });

    const { hits } = useHits();
    const { refresh } = useInstantSearch();
    
    useEffect(() => {
        refresh();
    }, [refresh]);
    
    const [localHits, setLocalHits] = useState(hits);

    useEffect(() => {
        setLocalHits(hits);
    }, [hits]);

    const getClientSideContainerAlert = (container: DeliveryContainer) => {
        if (!container.deliveryMethod) return { message: 'Configuration Needed: Select a delivery container type.' };
        if (!container.skinId) return { message: 'Configuration Needed: Select a UI skin.' };
        if (!container.macrogameId) return { message: 'Configuration Needed: Select a Macrogame.' };
        const macrogame = macrogames.find(m => m.id === container.macrogameId);
        if (!macrogame) return { message: 'Needs Attention: The linked macrogame was deleted.' };
        if (hasMacrogameIssues(macrogame, allMicrogames)) {
            return { message: 'Needs Attention: Contains an archived microgame.' };
        }
        return null;
    };
    
    const handlePreview = (container: DeliveryContainer) => {
        if (!container.skinId || !container.macrogameId) {
            notifications.error("This container needs a Macrogame and a UI skin configured before it can be previewed.");
            return;
        }
        const previewConfig = { 
            macrogameId: container.macrogameId,
            skinId: container.skinId,
            container: container,
            isPreviewMode: 'full_macrogame'
        };
        localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
        window.open('/preview.html', '_blank');
    };
    
    const handleDeleteContainer = async (containerId: string) => {
        const isSearching = searchTerm.trim().length > 0;

        const wasDeleted = await deleteDeliveryContainer(containerId);

        if (wasDeleted) {
            if (isSearching) {
                const loadingToast = notifications.loading('Deleting container...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                notifications.success('Container deleted');
                forceRefresh();
            } else {
                notifications.success('Container deleted');
            }
        }
    };

    const handleEditClick = (container: DeliveryContainer) => {
        // 1. Resolve ID
        const targetId = container.id || (container as any).objectID;
        
        // 2. Find the "Clean" object from the store
        const cleanContainer = deliveryContainers.find(c => c.id === targetId);

        if (cleanContainer) {
            handleEditContainer(cleanContainer);
        } else {
            // Fallback: If not found in store (rare), use the passed object but warn
            console.warn("Editing non-cached container:", container);
            handleEditContainer({ ...container, id: targetId });
        }
    };
    
    const handleDuplicateClick = async (container: DeliveryContainer) => {
        const isSearching = searchTerm.trim().length > 0;
        const loadingToast = isSearching ? notifications.loading('Duplicating container...') : undefined;

        try {
            await duplicateDeliveryContainer(container);

            if (isSearching && loadingToast) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                forceRefresh();
                notifications.dismiss(loadingToast);
            }

            notifications.success('Container duplicated');
        } catch (error) {
            if (loadingToast) notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate container.');
            console.error("Duplicate failed:", error);
        }
    };

    const handleToggleFavoriteClick = (containerId: string, isFavorite: boolean) => {
        toggleDeliveryContainerFavorite(containerId, isFavorite);
        setLocalHits(currentHits =>
            currentHits.map(hit =>
                (hit as any).objectID === containerId
                    ? { ...hit, isFavorite: isFavorite }
                    : hit
            )
        );
    };

    const renderContainerItem = (container: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => {
        const isUnconfigured = tab === 'Unconfigured';
        const alert = getClientSideContainerAlert(container);
        
        return (
            <li key={(container as any).objectID} style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{...styles.rewardInfo, flex: 1}}>
                    <strong>{container.name}</strong>
                    {alert && <span style={styles.warningTag}>{alert.message}</span>}
                    <div style={styles.rewardAnalytics}>
                        <span>Macrogame: {container.macrogameName || 'N/A'}</span>
                        <span>Skin: {UI_SKINS.find(s => s.id === container.skinId)?.name || 'N/A'}</span>
                    </div>
                </div>
                <div style={styles.rewardActions}>
                    {!isUnconfigured && (
                        <button onClick={() => handlePreview(container)} style={styles.previewButton} disabled={!container.skinId || !container.macrogameId}>Preview</button>
                    )}
                    <button onClick={() => handleDuplicateClick(container)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditContainer(container)} style={styles.editButton}>Edit</button>
                    <button onClick={() => handleDeleteContainer(container.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => handleToggleFavoriteClick((container as any).objectID, !container.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!container.isFavorite} />
                    </button>
                </div>
            </li>
        );
    };

    const allItems = localHits as DeliveryContainer[];
    const favoriteItems = allItems.filter(p => p.isFavorite);
    
    return (
        <DeliveryMethodManagerTab
            items={allItems}
            favoriteItems={favoriteItems}
            renderItem={renderContainerItem}
            onDeleteMultiple={deleteMultipleDeliveryContainers}
            itemTypeName={tab === 'Unconfigured' ? 'Unconfigured Items' : 'Popup Containers'}
            isLoading={false}
        />
    );
};

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
    if (searchTerm === '') {
      refine('');
    }
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search</label>
        <input
            type="text" placeholder="Search by name..." value={searchTerm}
            onChange={handleChange} style={styles.input}
        />
    </div>
  );
};

const initialFilterState = {
    macrogameFilter: 'All',
    skinFilter: 'All',
    campaignFilter: 'All',
};

// Helper for form sections
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={styles.configSection}>
        <h4 style={{ ...styles.h4, marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            {title}
        </h4>
        {children}
    </div>
);

// --- UPDATED DEFAULTS (Now matches DeliveryContainerEditorModal) ---
const defaultSkinConfig: SkinConfig = {
    showMuteButton: true,
    showExitButton: true,
    muteButtonPosition: 'left',
    header: {
        title: 'Popup Title',
        textColor: '#FFFFFF',
        paddingTop: 0,
        paddingBottom: 10,
        paddingX: 0
    },
    contentBlocks: [],
    styling: {
        backgroundColor: '#292929',
        popupWidth: 'medium',
        borderRadius: 8,
        boxShadowStrength: 50,
        padding: 10,
    }
};

export const DeliveryManager: React.FC<DeliveryManagerProps> = ({ handleEditContainer }) => {
    const { 
      createDeliveryContainer, 
      deleteDeliveryContainer, 
      duplicateDeliveryContainer, 
      toggleDeliveryContainerFavorite, 
      deleteMultipleDeliveryContainers, 
      macrogames, 
      allMicrogames 
    } = useData();
    
    const location = useLocation();
    
    const [activeTab, setActiveTab] = useState<DeliveryTab>(location.state?.defaultTab || 'Unconfigured');

    useEffect(() => {
        if (location.state?.defaultTab) {
            setActiveTab(location.state.defaultTab);
            setSearchKey(Date.now());
        }
    }, [location.state]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState<{ [key: string]: string | string[] }>(initialFilterState);
    const [searchKey, setSearchKey] = useState(Date.now());
    
    // Create Form State
    const [newName, setNewName] = useState('');
    const [newDeliveryMethod, setNewDeliveryMethod] = useState('popup_modal');
    const [newMacrogameId, setNewMacrogameId] = useState('');
    const [newSkinId, setNewSkinId] = useState('');
    const [newSkinConfig, setNewSkinConfig] = useState<SkinConfig>(defaultSkinConfig);
    const [showPreview, setShowPreview] = useState(false);

    const handleFilterChange = (key: string, value: string | string[]) => {
        setFilterValues(prev => ({ ...prev, [key]: value }));
    };
    const handleResetFilters = () => {
        setFilterValues(initialFilterState);
        setSearchTerm('');
        setSearchKey(Date.now());
    };

    const forceRefresh = () => setSearchKey(Date.now());

    // --- RESTORED WRAPPER FUNCTIONS (NOW IN CORRECT SCOPE) ---

    const handleDeleteContainer = async (containerId: string) => {
        const isSearching = searchTerm.trim().length > 0;
        
        const wasDeleted = await deleteDeliveryContainer(containerId);
        
        if (wasDeleted) {
            if (isSearching) {
                const loadingToast = notifications.loading('Deleting container...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                notifications.success('Container deleted');
                forceRefresh();
            } else {
                notifications.success('Container deleted');
            }
        }
    };

    const handleDuplicateClick = async (container: DeliveryContainer) => {
        const isSearching = searchTerm.trim().length > 0;
        const loadingToast = isSearching ? notifications.loading('Duplicating container...') : undefined;

        try {
            await duplicateDeliveryContainer(container);
            
            if (isSearching && loadingToast) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                forceRefresh();
                notifications.dismiss(loadingToast);
            }
            
            notifications.success('Container duplicated');
        } catch (error) {
            if (loadingToast) notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate container.');
            console.error("Duplicate failed:", error);
        }
    };

    const handleDeleteMultiple = async (ids: string[]) => {
        const isSearching = searchTerm.trim().length > 0;

        const wasDeleted = await deleteMultipleDeliveryContainers(ids);
        
        if (wasDeleted) {
            if (isSearching) {
                const loadingToast = notifications.loading(`Deleting ${ids.length} containers...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                notifications.success(`${ids.length} containers deleted`);
                forceRefresh();
            } else {
                notifications.success(`${ids.length} containers deleted`);
            }
        }
    };

    const handleEditClick = (container: DeliveryContainer) => {
        // 1. Resolve ID
        const targetId = container.id || (container as any).objectID;
        
        // 2. Find the "Clean" object from the store
        const cleanContainer = deliveryContainers.find(c => c.id === targetId);

        if (cleanContainer) {
            handleEditContainer(cleanContainer);
        } else {
            // Fallback: If not found in store (rare), use the passed object but warn
            console.warn("Editing non-cached container:", container);
            handleEditContainer({ ...container, id: targetId });
        }
    };

    const handleSaveDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newDeliveryMethod || !newMacrogameId || !newSkinId) {
            notifications.error('Please provide a name and select a container type, Macrogame, and UI.');
            return;
        }
        const selectedGame = macrogames.find(g => g.id === newMacrogameId);
        if (!selectedGame) {
            notifications.error('Selected macrogame not found.');
            return;
        }

        // --- Sanitize Config for Firestore ---
        // Firestore throws an error if it receives 'undefined'. We must convert to null.
        let finalSkinConfig = newSkinId === 'configurable-popup' ? newSkinConfig : null;
        
        if (finalSkinConfig) {
            // Deep clone to avoid mutating the form state
            finalSkinConfig = JSON.parse(JSON.stringify(finalSkinConfig));
            
            // Explicitly ensure gameSection values are valid (undefined -> null)
            if (finalSkinConfig?.styling?.gameSection) {
                const gs = finalSkinConfig.styling.gameSection;
                // If keys were missing (undefined), force them to null
                if (gs.desktopHeightLimit === undefined) gs.desktopHeightLimit = null;
                if (gs.leftContent === undefined) gs.leftContent = null;
                if (gs.rightContent === undefined) gs.rightContent = null;
            }
        }

        const newContainer: Omit<DeliveryContainer, 'id'> = {
            name: newName,
            deliveryMethod: newDeliveryMethod as 'popup_modal',
            macrogameId: selectedGame.id,
            macrogameName: selectedGame.name,
            skinId: newSkinId,
            skinConfig: finalSkinConfig, 
            status: { code: 'ok', message: '' }, 
            campaignId: null,
            views: 0,
            engagements: 0,
            createdAt: new Date().toISOString(),
        };
        
        const loadingToast = notifications.loading('Creating container...');
        try {
            await createDeliveryContainer(newContainer);
            await new Promise(resolve => setTimeout(resolve, 4000));
            forceRefresh(); 
            
            // Reset Form
            setNewName('');
            setNewMacrogameId('');
            setNewSkinId('');
            setNewSkinConfig(defaultSkinConfig);
            setShowPreview(false); // Close preview on success
            
            notifications.dismiss(loadingToast);
            notifications.success('Container created');
        } catch (error) {
            notifications.dismiss(loadingToast);
            notifications.error('Failed to create container.');
            console.error("Creation Error:", error);
        }
    };
    
    const getCreateButtonText = () => {
        switch (newDeliveryMethod) {
            case 'popup_modal': return 'Create Popup Container';
            default: return 'Create';
        }
    };
    
    const containerFilterConfig: FilterConfig[] = useMemo(() => ([
        { type: 'select', label: 'Macrogame', options: ['All', ...new Set(macrogames.map(m => m.name))], stateKey: 'macrogameFilter' },
        { type: 'select', label: 'UI Skin', options: ['All', ...UI_SKINS.map(s => s.name)], stateKey: 'skinFilter' },
        { type: 'select', label: 'In Campaign', options: YES_NO_ALL_OPTIONS, stateKey: 'campaignFilter' },
    ]), [macrogames]);
    
    return (
        <div style={styles.creatorSection}>
            <h2 style={styles.h2}>Delivery Manager</h2>

            <form onSubmit={handleSaveDelivery}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: '2rem' }}>
                    <h3 style={{ ...styles.h3, borderBottom: 'none', margin: 0, padding: 0 }}>Create New Delivery Container</h3>
                    {newSkinId === 'configurable-popup' && (
                        <ToggleSwitch isChecked={showPreview} onChange={setShowPreview} label="Live Preview" />
                    )}
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                    {/* LEFT COLUMN: The Form */}
                    <div style={{ flex: showPreview ? '1 1 45%' : '1 1 100%', minWidth: 0, transition: 'all 0.3s ease' }}>
                        <FormSection title="General Settings">
                            <div style={styles.configRow}>
                                <div style={styles.configItem}>
                                    <label>Container Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Summer Sale Popup" 
                                        value={newName} 
                                        onChange={e => setNewName(e.target.value)} 
                                        style={styles.input} 
                                    />
                                </div>
                                <div style={styles.configItem}>
                                    <label>Select Container Type</label>
                                    <select 
                                        value={newDeliveryMethod} 
                                        onChange={e => setNewDeliveryMethod(e.target.value)} 
                                        style={styles.input}
                                    >
                                        <option value="popup_modal">Popup Modal</option>
                                        <option value="new_webpage" disabled>New Webpage (Coming Soon)</option>
                                        <option value="on_page_section" disabled>On-Page Section (Coming Soon)</option>
                                    </select>
                                </div>
                            </div>

                            {newDeliveryMethod === 'popup_modal' && (
                                <>
                                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                                        <label>Select Macrogame</label>
                                        <select value={newMacrogameId} onChange={e => setNewMacrogameId(e.target.value)} style={styles.input}>
                                            <option value="">Select a macrogame...</option>
                                            {macrogames.map(game => {
                                                const hasIssues = hasMacrogameIssues(game, allMicrogames);
                                                return (
                                                    <option key={game.id} value={game.id} disabled={hasIssues} style={{ color: hasIssues ? '#999' : 'inherit' }}>
                                                        {hasIssues ? '⚠️ ' : ''}{game.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div style={{...styles.configItem, marginTop: '1rem'}}>
                                        <label>UI Skin</label>
                                        <select 
                                            value={newSkinId} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setNewSkinId(val);
                                                // Auto-trigger preview when Configurable Popup is selected
                                                if (val === 'configurable-popup') {
                                                    setShowPreview(true);
                                                } else {
                                                    setShowPreview(false);
                                                }
                                            }} 
                                            style={styles.input}
                                        >
                                            <option value="">Select a UI Skin...</option>
                                            {UI_SKINS.filter(s => s.id !== 'barebones').map(skin => <option key={skin.id} value={skin.id}>{skin.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </FormSection>
                        
                        {/* --- 2. POPUP CUSTOMIZATION (Refactored) --- */}
                        {newSkinId === 'configurable-popup' && (
                            <PopupSkinForm 
                                skinConfig={newSkinConfig}
                                setSkinConfig={setNewSkinConfig}
                            />
                        )}
                        
                        <button type="submit" style={{...styles.createButton, marginTop: '1.5rem'}}>{getCreateButtonText()}</button>
                    </div>

                    {/* RIGHT COLUMN: The Preview */}
                    {showPreview && newSkinId === 'configurable-popup' && (
                        <div style={{ flex: '1 1 55%', position: 'sticky', top: '1rem', height: '650px', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '0.5rem', border: '1px solid #eee' }}>
                             <StaticSkinPreview skinId={newSkinId} skinConfig={newSkinConfig} />
                        </div>
                    )}
                </div>
            </form>

            <div style={{...styles.tabContainer, marginTop: '3rem'}}>
                <button onClick={() => setActiveTab('Unconfigured')} style={activeTab === 'Unconfigured' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Unconfigured</button>
                <button onClick={() => setActiveTab('Popup')} style={activeTab === 'Popup' ? {...styles.tabButton, ...styles.tabButtonActive} : styles.tabButton}>Popup</button>
                <button disabled style={styles.tabButton}>On-Page Section</button>
                <button disabled style={styles.tabButton}>New Webpage</button>
            </div>
            
            <InstantSearch key={searchKey} searchClient={searchClient} indexName="deliveryContainers">
                <div style={styles.filterContainer}>
                    <ConnectedSearchBox 
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                    <FilterBar
                        filters={containerFilterConfig}
                        filterValues={filterValues}
                        onFilterChange={handleFilterChange}
                        onResetFilters={handleResetFilters}
                    />
                </div>

                {/* HYBRID LOGIC: Applied to whatever the active tab is */}
                {searchTerm.trim().length > 0 ? (
                    <AlgoliaContainerList
                        tab={activeTab as 'Unconfigured' | 'Popup'} // Pass current tab
                        filters={filterValues}
                        searchTerm={searchTerm}
                        handleEditContainer={handleEditClick} // Use safe wrapper
                        duplicateDeliveryContainer={duplicateDeliveryContainer} // Use Algolia version (or main handler if refactored)
                        toggleDeliveryContainerFavorite={toggleDeliveryContainerFavorite}
                        deleteDeliveryContainer={deleteDeliveryContainer}
                        deleteMultipleDeliveryContainers={handleDeleteMultiple} // Use main handler
                        macrogames={macrogames}
                        allMicrogames={allMicrogames}
                        forceRefresh={forceRefresh}
                    />
                ) : (
                    <LocalContainerList
                        tab={activeTab as 'Unconfigured' | 'Popup'}
                        filters={filterValues}
                        handleEditContainer={handleEditClick} // Use safe wrapper
                        duplicateDeliveryContainer={handleDuplicateClick} // Use main handler
                        toggleDeliveryContainerFavorite={toggleDeliveryContainerFavorite}
                        deleteDeliveryContainer={handleDeleteContainer}   // Use main handler
                        deleteMultipleDeliveryContainers={handleDeleteMultiple}
                        macrogames={macrogames}
                        allMicrogames={allMicrogames}
                    />
                )}
            </InstantSearch>
        </div>
    );
};