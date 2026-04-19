/* src/components/views/MacrogamesManager.tsx */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styles } from '../../App.styles';
import { Macrogame } from '../../types';
import { useData } from '../../hooks/useData';
import { MACROGAME_LENGTH_OPTIONS, NUMBER_OF_GAMES_OPTIONS, YES_NO_ALL_OPTIONS, MACROGAME_MUSIC_LIBRARY, CONVERSION_METHOD_TYPES } from '../../constants';
import { SECTORS, SECTOR_CATEGORIES, CATEGORY_SUBCATEGORIES, SEASONALITY_OPTIONS, TARGET_AUDIENCE_OPTIONS, PROMOTION_COMPATIBILITY_OPTIONS } from '../../constants/taxonomy';
import { PaginatedList } from '../ui/PaginatedList';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { StarIcon } from '../ui/StarIcon';
import { notifications } from '../../utils/notifications';

// --- Algolia & React InstantSearch Imports ---
import * as algoliasearch from 'algoliasearch';
import {
  InstantSearch,
  useHits,
  useSearchBox, // <-- THIS IS NEEDED
  useConfigure,
  useInstantSearch,
} from 'react-instantsearch';
// --- END NEW ---

// --- Initialize Algolia Search Client ---
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
const searchClient = algoliasearch.algoliasearch(appId, searchKey);
const indexPrefix = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX || '';
// --- END NEW ---

interface MacrogamesManagerProps {
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
}

// --- NEW: Local List Component ---
const LocalMacrogameList = ({
    filters,
    handleDeployMacrogame,
    handleEditMacrogame,
    duplicateMacrogame,
    deleteMacrogame,
    toggleMacrogameFavorite,
    deleteMultipleMacrogames,
    favoriteGames,
    setFavoriteGames,
}: {
    filters: any;
    handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
    handleEditMacrogame: (macrogame: Macrogame) => void;
    duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
    deleteMacrogame: (id: string) => Promise<boolean>;
    toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
    deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
    favoriteGames: Macrogame[];
    setFavoriteGames: (games: Macrogame[]) => void;
}) => {
    const { macrogames, allConversionScreens, allConversionMethods } = useData();

    // --- Client-Side Filtering ---
    const filteredGames = useMemo(() => {
        return macrogames.filter(game => {
            const gameSectors = game.sectors || [];
            if (filters.sectorFilter !== 'All' && !gameSectors.includes(filters.sectorFilter) && !gameSectors.includes('All')) return false;
            
            const gameCategories = game.categories || [];
            if (filters.categoriesFilter.length > 0 && !gameCategories.includes('All')) {
                const hasAll = filters.categoriesFilter.every((cat: string) => gameCategories.includes(cat));
                if (!hasAll) return false;
            }

            const gameSubcategories = game.subcategories || [];
            if (filters.subcategoriesFilter.length > 0 && !gameSubcategories.includes('All')) {
                const hasAll = filters.subcategoriesFilter.every((sub: string) => gameSubcategories.includes(sub));
                if (!hasAll) return false;
            }

            const gameSeasonality = game.seasonality || [];
            if (filters.seasonalityFilter.length > 0 && !gameSeasonality.includes('All')) {
                const hasAll = filters.seasonalityFilter.every((season: string) => gameSeasonality.includes(season));
                if (!hasAll) return false;
            }

            const gameAudience = game.targetAudience || [];
            if (filters.audienceFilter.length > 0 && !gameAudience.includes('All')) {
                const hasAll = filters.audienceFilter.every((aud: string) => gameAudience.includes(aud));
                if (!hasAll) return false;
            }

            const gamePromo = game.promotionCompatibility || [];
            if (filters.promoFilter.length > 0 && !gamePromo.includes('All')) {
                const hasAll = filters.promoFilter.every((promo: string) => gamePromo.includes(promo));
                if (!hasAll) return false;
            }
            
            const numGames = game.flow?.length || 0;
            if (filters.numGamesFilter !== 'All') {
                if (filters.numGamesFilter === '4+' && numGames < 4) return false;
                if (filters.numGamesFilter !== '4+' && numGames !== parseInt(filters.numGamesFilter)) return false;
            }

            if (filters.microgamesFilter.length > 0) {
                const gameIds = game.flow?.map(f => f.microgameId) || [];
                const hasAll = filters.microgamesFilter.every((id: string) => gameIds.includes(id));
                if (!hasAll) return false;
            }

            if (filters.flowComponentsFilter.length > 0) {
                const components = [];
                if (game.introScreen?.enabled) components.push('intro');
                if (game.promoScreen?.enabled) components.push('promo');
                if (game.config?.screenFlowType !== 'Skip') components.push('preGame');
                if (game.config?.resultConfig?.enabled !== false) components.push('result');

                const hasAll = filters.flowComponentsFilter.every((comp: string) => components.includes(comp));
                if (!hasAll) return false;
            }

            if (filters.conversionMethodsFilter.length > 0) {
                if (!game.conversionScreenId) return false;
                const screen = allConversionScreens.find(s => s.id === game.conversionScreenId);
                if (!screen) return false;

                const methodIds = screen.methods.map((m: any) => m.methodId);
                const methodTypes = methodIds.map(id => allConversionMethods.find(m => m.id === id)?.type).filter(Boolean);

                // Change to 'every' so it's a strict AND match (Must contain ALL selected methods)
                const hasAll = filters.conversionMethodsFilter.every((type: string) => methodTypes.includes(type));
                if (!hasAll) return false;
            }

            if (filters.conversionScreensFilter.length > 0) {
                if (!filters.conversionScreensFilter.includes(game.conversionScreenId || '')) return false;
            }

            if (filters.themeFilter !== 'All') {
                const t = game.globalStyling?.theme || 'dark';
                if (filters.themeFilter.toLowerCase() !== t) return false;
            }

            if (filters.economyFilter !== 'All') {
                const hasEcon = game.config?.showPoints === true;
                if (filters.economyFilter === 'Yes' && !hasEcon) return false;
                if (filters.economyFilter === 'No' && hasEcon) return false;
            }

            if (filters.audioFilter !== 'All') {
                const stringified = JSON.stringify(game.audioConfig || {});
                const hasAudio = stringified.includes('"url":"http') || stringified.includes('.wav') || stringified.includes('.mp3') || !!game.config?.backgroundMusicUrl;
                if (filters.audioFilter === 'Yes' && !hasAudio) return false;
                if (filters.audioFilter === 'No' && hasAudio) return false;
            }

            return true;
        });
    }, [macrogames, filters, allConversionScreens, allConversionMethods]);

    // Update favorite list based on LOCAL filtered games
    useEffect(() => {
        setFavoriteGames(filteredGames.filter(g => g.isFavorite));
    }, [filteredGames, setFavoriteGames]);

    const handlePreview = (macrogame: Macrogame) => {
      if (!macrogame) return;
      const previewConfig = { 
          macrogameId: macrogame.id, // Use real ID
          skinId: 'barebones',
          isPreviewMode: 'full_macrogame'
      };
      localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
      window.open('/preview.html', '_blank');
    };

    const renderMacrogameItem = (game: Macrogame, isSelected: boolean, onToggleSelect: () => void) => {
        const hasAlert = game.status?.code === 'error';
        const numGames = game.flow.length;
        
        return (
            <div key={game.id} style={{ ...styles.listItem, ...styles.listItemWithCheckbox }}>
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
                <div style={{flex: 1}}><strong>{game.name}</strong></div>
                <div style={styles.managerActions}>
                    {hasAlert && <span style={styles.warningTag} title={game.status?.message || "Needs Attention"}>Needs Attention</span>}
                    <span style={styles.tag}>#{game.category}</span>
                    <span>{numGames} microgames</span>
                    <button onClick={() => handlePreview(game)} style={styles.previewButton}>Preview</button>
                    <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? `Cannot deploy: ${game.status?.message}` : ""}>Deploy</button>
                    <button onClick={() => duplicateMacrogame(game)} style={styles.editButton}>Duplicate</button>
                    <button onClick={() => handleEditMacrogame(game)} style={styles.editButton}>Edit</button>
                    <button onClick={() => deleteMacrogame(game.id)} style={styles.deleteButton}>Delete</button>
                    <button onClick={() => toggleMacrogameFavorite(game.id, !game.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                        <StarIcon isFavorite={!!game.isFavorite} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {favoriteGames.length > 0 && (
                <>
                    <h3 style={styles.h3}>Favorite Macrogames</h3>
                    <PaginatedList
                        items={favoriteGames}
                        renderItem={renderMacrogameItem}
                        bulkActions={[{
                            label: 'Delete Selected',
                            onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                        }]}
                        listContainerStyle={styles.managerList}
                    />
                </>
            )}
            
            <h3 style={styles.h3}>All Macrogames</h3>
            <PaginatedList
                items={filteredGames}
                renderItem={renderMacrogameItem}
                bulkActions={[{
                    label: 'Delete Selected',
                    onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                }]}
                listContainerStyle={styles.managerList}
            />
        </>
    );
};

// --- Inner component to connect to Algolia ---
const AlgoliaMacrogameList = ({
  filters,
  handleDeployMacrogame,
  handleEditMacrogame,
  duplicateMacrogame,
  deleteMacrogame,
  toggleMacrogameFavorite,
  deleteMultipleMacrogames,
  favoriteGames,
  setFavoriteGames,
  forceRefresh, // --- 1. Receive new prop ---
}: {
  filters: any;
  handleDeployMacrogame: (macrogame: Macrogame) => Promise<void>;
  handleEditMacrogame: (macrogame: Macrogame) => void;
  duplicateMacrogame: (gameToDuplicate: Macrogame) => Promise<void>;
  deleteMacrogame: (id: string) => Promise<boolean>;
  toggleMacrogameFavorite: (macrogameId: string, isFavorite: boolean) => Promise<void>;
  deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
  favoriteGames: Macrogame[];
  setFavoriteGames: (games: Macrogame[]) => void;
  forceRefresh: () => void; // --- 1. Receive new prop ---
}) => {
  // --- THIS IS THE FIX ---
  // We REMOVE the useSearchBox({ query: ... }) from here.
  // It will be handled by its own component.

  // This hook configures all our filters for Algolia
  useConfigure({
    hitsPerPage: 1000, 
    filters: useMemo(() => {
      const algoliaFilters = [];

      if (filters.sectorFilter !== 'All') {
          algoliaFilters.push(`(sectors:"${filters.sectorFilter}" OR sectors:"All")`);
      }
      
      if (filters.categoriesFilter.length > 0) {
          filters.categoriesFilter.forEach((c: string) => {
              algoliaFilters.push(`(categories:"${c}" OR categories:"All")`);
          });
      }

      if (filters.subcategoriesFilter.length > 0) {
          filters.subcategoriesFilter.forEach((s: string) => {
              algoliaFilters.push(`(subcategories:"${s}" OR subcategories:"All")`);
          });
      }

      if (filters.seasonalityFilter.length > 0) {
          filters.seasonalityFilter.forEach((s: string) => {
              algoliaFilters.push(`(seasonality:"${s}" OR seasonality:"All")`);
          });
      }

      if (filters.audienceFilter.length > 0) {
          filters.audienceFilter.forEach((a: string) => {
              algoliaFilters.push(`(targetAudience:"${a}" OR targetAudience:"All")`);
          });
      }

      if (filters.promoFilter.length > 0) {
          filters.promoFilter.forEach((p: string) => {
              algoliaFilters.push(`(promotionCompatibility:"${p}" OR promotionCompatibility:"All")`);
          });
      }
      
      if (filters.numGamesFilter !== 'All') {
        if (filters.numGamesFilter === '4+') algoliaFilters.push('numGames >= 4');
        else algoliaFilters.push(`numGames = ${filters.numGamesFilter}`);
      }

      // Arrays (AND Logic within the array)
      if (filters.microgamesFilter.length > 0) {
          filters.microgamesFilter.forEach((id: string) => {
              algoliaFilters.push(`flowMicrogameIds:"${id}"`);
          });
      }
      
      if (filters.conversionMethodsFilter.length > 0) {
          // Push each selected method as a separate required condition (AND match)
          filters.conversionMethodsFilter.forEach((type: string) => {
              algoliaFilters.push(`conversionMethodTypes:"${type}"`);
          });
      }

      if (filters.conversionScreensFilter.length > 0) {
          algoliaFilters.push(`(${filters.conversionScreensFilter.map((id: string) => `conversionScreenId:"${id}"`).join(' OR ')})`);
      }

      // Arrays (AND Logic for Flow Components)
      if (filters.flowComponentsFilter.length > 0) {
          filters.flowComponentsFilter.forEach((comp: string) => {
              algoliaFilters.push(`flowComponents:"${comp}"`);
          });
      }

      // Booleans and Strings
      if (filters.themeFilter !== 'All') {
          algoliaFilters.push(`theme:"${filters.themeFilter.toLowerCase()}"`);
      }
      if (filters.economyFilter !== 'All') {
          algoliaFilters.push(`hasEconomy:${filters.economyFilter === 'Yes' ? 'true' : 'false'}`);
      }
      if (filters.audioFilter !== 'All') {
          algoliaFilters.push(`hasAudio:${filters.audioFilter === 'Yes' ? 'true' : 'false'}`);
      }

      return algoliaFilters.join(' AND ');
    }, [
        filters.sectorFilter,
        filters.categoriesFilter,
        filters.subcategoriesFilter,
        filters.seasonalityFilter,
        filters.audienceFilter,
        filters.promoFilter,
        filters.numGamesFilter,
        filters.microgamesFilter,
        filters.flowComponentsFilter,
        filters.conversionMethodsFilter,
        filters.conversionScreensFilter,
        filters.themeFilter,
        filters.economyFilter,
        filters.audioFilter
    ]),
  });

  const { hits } = useHits();
  // We keep useInstantSearch here to get `refresh`
  const { refresh } = useInstantSearch();
  // This useEffect is for CUD operations, not search. It is correct.
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  // This local state will "shadow" the hits from Algolia
    // and allow us to make instant, optimistic UI updates.
    const [localHits, setLocalHits] = useState(hits);

    // This effect ensures our local state is updated
    // whenever a new search or filter is applied.
    useEffect(() => {
        setLocalHits(hits);
    }, [hits]);
  const handleToggleFavoriteClick = (macrogameId: string, isFavorite: boolean) => {
    // 1. Fire-and-forget the database update.
    // We don't wait for it.
    toggleMacrogameFavorite(macrogameId, isFavorite);

    // 2. Optimistically update our local UI state *immediately*.
    setLocalHits(currentHits => 
        currentHits.map(hit => 
            hit.objectID === macrogameId 
                ? { ...hit, isFavorite: isFavorite } 
                : hit
        )
    );
  };
  
  // --- NEW: Fixed handlePreview. It now lives here and has access to hits ---
  const handlePreview = (macrogame: Macrogame) => {
      if (!macrogame) return;

      const previewConfig = { 
          // Pass the ID, not the incomplete Algolia object
          macrogameId: macrogame.objectID, 
          skinId: 'barebones',
          isPreviewMode: 'full_macrogame'
      };
      localStorage.setItem('macrogame_preview_data', JSON.stringify(previewConfig));
      window.open('/preview.html', '_blank');
  };

  // --- REFACTORED: Simpler render function ---
  const renderMacrogameItem = (game: Macrogame, isSelected: boolean, onToggleSelect: () => void) => {
    // The server now calculates the status for us!
    const hasAlert = game.status?.code === 'error';
    
    return (
        <div key={game.objectID || game.id} style={{ ...styles.listItem, ...styles.listItemWithCheckbox }}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
            <div style={{flex: 1}}><strong>{game.name}</strong></div>
            <div style={styles.managerActions}>
                {hasAlert && <span style={styles.warningTag} title={game.status?.message || "Needs Attention"}>Needs Attention</span>}
                <span style={styles.tag}>#{game.category}</span>
                <span>{game.numGames || 0} microgames</span>
                {/* --- UPDATED: Call local handlePreview with the full game object --- */}
                <button onClick={() => handlePreview(game)} style={styles.previewButton}>Preview</button>
                <button onClick={() => handleDeployMacrogame(game)} style={styles.publishButton} disabled={hasAlert} title={hasAlert ? `Cannot deploy: ${game.status?.message}` : ""}>Deploy</button>
                <button onClick={() => handleDuplicateClick(game)} style={styles.editButton}>Duplicate</button>
                <button onClick={() => handleEditMacrogame(game.objectID)} style={styles.editButton}>Edit</button>
                <button onClick={() => handleDeleteClick(game.objectID)} style={styles.deleteButton}>Delete</button>
                <button onClick={() => handleToggleFavoriteClick(game.objectID, !game.isFavorite)} style={{ background: 'none', border: 'none', padding: '0 0 0 0.5rem' }}>
                    <StarIcon isFavorite={!!game.isFavorite} />
                </button>
            </div>
        </div>
    );
  };

  // Update favorite list based on hits
  React.useEffect(() => {
    setFavoriteGames(localHits.filter((h: any) => h.isFavorite) as Macrogame[]);
  }, [localHits, setFavoriteGames]);

  return (
    <>
      {favoriteGames.length > 0 && (
          <>
              <h3 style={styles.h3}>Favorite Macrogames</h3>
              <PaginatedList
                  items={favoriteGames}
                  renderItem={renderMacrogameItem}
                  bulkActions={[{
                      label: 'Delete Selected',
                      onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
                  }]}
                  listContainerStyle={styles.managerList}
              />
          </>
      )}
      
      <h3 style={styles.h3}>All Macrogames</h3>
      <PaginatedList
          items={localHits as Macrogame[]}
          renderItem={renderMacrogameItem}
          bulkActions={[{
              label: 'Delete Selected',
              onAction: (selectedItems) => deleteMultipleMacrogames(selectedItems.map(item => item.id))
          }]}
          listContainerStyle={styles.managerList}
      />
    </>
  );
};
// --- END NEW Inner Component ---


// --- THIS IS THE FIX (Part 1) ---
// This new component lives *inside* InstantSearch and *imperatively*
// controls the search query.
const ConnectedSearchBox = ({ 
  searchTerm, 
  handleFilterChange
}: {
  searchTerm: string;
  handleFilterChange: (key: string, value: string) => void;
}) => {
  // This hook is now called *inside* <InstantSearch> and is safe
  const { refine } = useSearchBox();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 1. Update the parent's React state (to keep the input text)
    handleFilterChange('searchTerm', value);
    // 2. Imperatively update Algolia's search state
    refine(value);
  };

  // When the "Reset Filters" button is clicked, the parent
  // state `searchTerm` becomes '', and this effect syncs
  // Algolia's state.
  useEffect(() => {
    if (searchTerm === '') {
      refine('');
    }
  }, [searchTerm, refine]);

  return (
    <div style={styles.configItem}>
        <label>Search Macrogames</label>
        <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={handleChange}
            style={styles.input}
        />
    </div>
  );
};

export const MacrogamesManager: React.FC<MacrogamesManagerProps> = ({ handleDeployMacrogame, handleEditMacrogame }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Pull the extra arrays from useData to populate our filter dropdown options
    const { allMicrogames, allConversionScreens, macrogames, deleteMacrogame, duplicateMacrogame, toggleMacrogameFavorite, deleteMultipleMacrogames } = useData();
    
    // This state is the source of truth for the filter UI
    const [filters, setFilters] = useState({
        searchTerm: '',
        sectorFilter: 'All',
        categoriesFilter: [] as string[],
        subcategoriesFilter: [] as string[],
        seasonalityFilter: [] as string[],
        audienceFilter: [] as string[],
        promoFilter: [] as string[],
        microgamesFilter: [] as string[],
        numGamesFilter: 'All',
        flowComponentsFilter: [] as string[],
        conversionMethodsFilter: [] as string[],
        conversionScreensFilter: [] as string[],
        themeFilter: 'All',
        economyFilter: 'All',
        audioFilter: 'All'
    });

    // --- 2. Update handleDuplicateClick to use blocking pattern ---
    const handleDuplicateClick = async (gameToDuplicate: Macrogame) => {
        const isSearching = filters.searchTerm.trim().length > 0;
        const loadingToast = isSearching ? notifications.loading('Duplicating macrogame...') : undefined;

        try {
            await duplicateMacrogame(gameToDuplicate as any);

            if (isSearching && loadingToast) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                setSearchKey(Date.now());
                notifications.dismiss(loadingToast);
            }
            
            notifications.success('Macrogame duplicated');
        } catch (error) {
            if (loadingToast) notifications.dismiss(loadingToast);
            notifications.error('Failed to duplicate macrogame.');
            console.error("Duplicate failed:", error);
        }
    };

    // --- 3. Update handleDeleteClick to use blocking pattern ---
    const handleDeleteClick = async (gameId: string) => {
        const isSearching = filters.searchTerm.trim().length > 0;

        const wasDeleted = await deleteMacrogame(gameId);

        if (wasDeleted) {
            if (isSearching) {
                const loadingToast = notifications.loading('Updating list...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                notifications.dismiss(loadingToast);
                notifications.success('Macrogame deleted');
                setSearchKey(Date.now());
            } else {
                notifications.success('Macrogame deleted');
            }
        }
    };

    // --- SAFE ACTION WRAPPERS ---

    const handleEditClick = (idOrObj: string | any) => {
        // Resolve the ID whether it's a string ID or an object with objectID
        const id = typeof idOrObj === 'string' ? idOrObj : (idOrObj.id || idOrObj.objectID);
        if (id) {
            handleEditMacrogame(id);
        } else {
            notifications.error("Error: Cannot identify macrogame to edit.");
        }
    };

    const handleDeployClick = async (game: Macrogame) => {
        // Ensure we have a valid ID before deploying
        const realId = game.id || (game as any).objectID;
        if (!realId) {
            notifications.error("Error: Invalid macrogame data.");
            return;
        }
        // Pass a constructed object with the guaranteed ID to App.tsx
        await handleDeployMacrogame({ ...game, id: realId });
    };
    
    // --- State for favorite games, to be populated by the Hits component ---
    const [favoriteGames, setFavoriteGames] = useState<Macrogame[]>([]);

    // --- Add a key to force re-mounting InstantSearch to bust cache ---
    const [searchKey, setSearchKey] = useState(Date.now());

    useEffect(() => {
        // If we receive a refresh signal from App.tsx (after an edit), refresh the list
        if (location.state?.refreshTimestamp) {
            setSearchKey(Date.now());
            // Optional: clear the state to prevent double refreshes if needed, 
            // though changing the key handles it safely.
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            
            // Cascading clear: If Sector changes, wipe out categories and subcategories
            if (key === 'sectorFilter') {
                newFilters.categoriesFilter = [];
                newFilters.subcategoriesFilter = [];
            }
            // Cascading clear: If Categories change, wipe out subcategories
            else if (key === 'categoriesFilter') {
                newFilters.subcategoriesFilter = [];
            }
            
            return newFilters;
        });
    };

    const handleResetFilters = () => {
        setFilters({
            searchTerm: '',
            sectorFilter: 'All',
            categoriesFilter: [],
            subcategoriesFilter: [],
            seasonalityFilter: [],
            audienceFilter: [],
            promoFilter: [],
            microgamesFilter: [],
            numGamesFilter: 'All',
            flowComponentsFilter: [],
            conversionMethodsFilter: [],
            conversionScreensFilter: [],
            themeFilter: 'All',
            economyFilter: 'All',
            audioFilter: 'All'
        });
        setSearchKey(Date.now());
    };

    const handleDeleteMultipleMacrogames = async (ids: string[]) => {
        // Check if we are searching (Algolia mode)
        const isSearching = filters.searchTerm.trim().length > 0;

        // 1. Call the "silent" delete function (it handles the confirmation dialog)
        const wasConfirmed = await deleteMultipleMacrogames(ids);

        // 2. If confirmed, handle the UI flow based on mode
        if (wasConfirmed) {
            if (isSearching) {
                // ALGOLIA MODE: Needs delay
                const loadingToast = notifications.loading(`Deleting ${ids.length} macrogames...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                notifications.dismiss(loadingToast);
                notifications.success(`${ids.length} macrogames deleted`);
                setSearchKey(Date.now()); // Force refresh
            } else {
                // LOCAL MODE: Instant
                notifications.success(`${ids.length} macrogames deleted`);
            }
        }
    };

    const filterConfig = useMemo(() => {
        // 1. Map Microgames with Usage Counts
        const microgameOptions = allMicrogames
            .filter(mg => mg.isActive !== false)
            .map(mg => {
                const count = macrogames.filter(m => (m.flowMicrogameIds || []).includes(mg.id)).length;
                return { value: mg.id, label: `${mg.name} (${count})`, count };
            })
            // Sort by count descending, then alphabetically
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
            .map(({ value, label }) => ({ value, label }));

        // 2. Map Conversion Screens with Usage Counts
        const conversionScreenOptions = allConversionScreens
            .map(screen => {
                const count = macrogames.filter(m => m.conversionScreenId === screen.id).length;
                return { value: screen.id, label: `${screen.name} (${count})`, count };
            })
            // Sort by count descending, then alphabetically
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
            .map(({ value, label }) => ({ value, label }));

        const methodTypeOptions = CONVERSION_METHOD_TYPES.map(type => ({ 
            value: type, 
            label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
        }));

        const flowComponentOptions = [
            { value: 'intro', label: 'Intro Screen' },
            { value: 'promo', label: 'Promo Screen' },
            { value: 'preGame', label: 'Pre-Game Overlay/Screen' },
            { value: 'result', label: 'Game Result Screen' }
        ];

        const config: FilterConfig[] = [
            { type: 'select', label: 'Business Sector', options: SECTORS, stateKey: 'sectorFilter' },
            // Product Categories inserted dynamically below
            // Subcategories inserted dynamically below
            { type: 'multiselect', label: 'Seasonality', options: SEASONALITY_OPTIONS.map(s => ({ value: s.id, label: s.label })), stateKey: 'seasonalityFilter' },
            { type: 'multiselect', label: 'Target Audience', options: TARGET_AUDIENCE_OPTIONS.map(a => ({ value: a.id, label: a.label })), stateKey: 'audienceFilter' },
            { type: 'multiselect', label: 'Promo Compatibility', options: PROMOTION_COMPATIBILITY_OPTIONS.map(p => ({ value: p.id, label: p.label })), stateKey: 'promoFilter' },
            { type: 'multiselect', label: 'Microgames Included', options: microgameOptions, stateKey: 'microgamesFilter' },
            { type: 'select', label: '# of Microgames', options: NUMBER_OF_GAMES_OPTIONS, stateKey: 'numGamesFilter' },
            { type: 'multiselect', label: 'Flow Components', options: flowComponentOptions, stateKey: 'flowComponentsFilter' },
            { type: 'multiselect', label: 'Conversion Methods', options: methodTypeOptions, stateKey: 'conversionMethodsFilter' },
            { type: 'multiselect', label: 'Conversion Screens', options: conversionScreenOptions, stateKey: 'conversionScreensFilter' },
            { type: 'select', label: 'Global Theme', options: ['All', 'Dark', 'Light'], stateKey: 'themeFilter' },
            { type: 'select', label: 'Point Economy Enabled', options: YES_NO_ALL_OPTIONS, stateKey: 'economyFilter' },
            { type: 'select', label: 'Audio Enabled', options: YES_NO_ALL_OPTIONS, stateKey: 'audioFilter' },
        ];

        // Only show Product Categories if a specific Sector (not 'All') is selected
        if (filters.sectorFilter !== 'All' && SECTOR_CATEGORIES[filters.sectorFilter]) {
            const categoryOptions = SECTOR_CATEGORIES[filters.sectorFilter].map(c => ({ value: c, label: c }));
            
            config.splice(1, 0, {
                type: 'multiselect', 
                label: 'Product Categories', 
                options: categoryOptions, 
                stateKey: 'categoriesFilter'
            });

            // Only show Subcategories if one or more Product Categories are selected
            if (filters.categoriesFilter.length > 0) {
                const subcategoryOptions: any[] = [];
                
                filters.categoriesFilter.forEach(cat => {
                    const subs = CATEGORY_SUBCATEGORIES[cat] || [];
                    if (subs.length > 0) {
                        // If only one category is selected, keep it flat
                        if (filters.categoriesFilter.length === 1) {
                            subs.forEach(sub => subcategoryOptions.push({ value: sub, label: sub }));
                        } else {
                            // If multiple categories are selected, wrap them in a group object
                            subcategoryOptions.push({
                                group: cat,
                                options: subs.map(sub => ({ value: sub, label: sub }))
                            });
                        }
                    }
                });
                
                if (subcategoryOptions.length > 0) {
                    config.splice(2, 0, {
                        type: 'multiselect',
                        label: 'Subcategories',
                        options: subcategoryOptions,
                        stateKey: 'subcategoriesFilter'
                    });
                }
            }
        }

        return config;
    }, [filters.sectorFilter, filters.categoriesFilter, allMicrogames, allConversionScreens, macrogames]);
    
    // --- REMOVED: filteredGames array ---

    return (
        <div style={styles.creatorSection}>
            <div style={styles.managerHeader}>
                <h2 style={styles.h2}>Macrogame Manager</h2>
                <button onClick={() => navigate('/creator')} style={styles.saveButton}>Create New</button>
            </div>
            
            {/* --- Wrap filtering UI in InstantSearch --- */}
            <InstantSearch key={searchKey} searchClient={searchClient} indexName={`${indexPrefix}macrogames`}>
                <div style={styles.filterContainer}>
                    
                    {/* --- THIS IS THE FIX (Part 2) --- */}
                    {/* We render the new component *inside* InstantSearch */}
                    <ConnectedSearchBox 
                        searchTerm={filters.searchTerm}
                        handleFilterChange={handleFilterChange}
                    />

                    <FilterBar filters={filterConfig} filterValues={filters} onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
                </div>
                
                {/* Conditional Rendering: Algolia vs Local */}
                {filters.searchTerm.trim().length > 0 ? (
                    <AlgoliaMacrogameList 
                        filters={filters}
                        handleDeployMacrogame={handleDeployClick} // Use safe wrapper
                        handleEditMacrogame={handleEditClick} // Use safe wrapper
                        duplicateMacrogame={duplicateMacrogame}
                        deleteMacrogame={deleteMacrogame}
                        toggleMacrogameFavorite={toggleMacrogameFavorite}
                        deleteMultipleMacrogames={handleDeleteMultipleMacrogames}
                        favoriteGames={favoriteGames}
                        setFavoriteGames={setFavoriteGames}
                        forceRefresh={() => setSearchKey(Date.now())}
                    />
                ) : (
                    <LocalMacrogameList 
                        filters={filters}
                        handleDeployMacrogame={handleDeployClick} // Use safe wrapper
                        handleEditMacrogame={handleEditClick}     // Use safe wrapper
                        duplicateMacrogame={handleDuplicateClick} // Use main handler
                        deleteMacrogame={handleDeleteClick}       // Use main handler
                        toggleMacrogameFavorite={toggleMacrogameFavorite}
                        deleteMultipleMacrogames={handleDeleteMultipleMacrogames}
                        favoriteGames={favoriteGames}
                        setFavoriteGames={setFavoriteGames}
                    />
                )}
            </InstantSearch>
        </div>
    );
};