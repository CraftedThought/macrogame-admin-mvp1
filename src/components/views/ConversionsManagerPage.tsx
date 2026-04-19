import React, { useState, useEffect, useMemo } from 'react';
import { styles } from '../../App.styles';
import { ConversionMethod, ConversionScreen } from '../../types';
import { useData } from '../../hooks/useData';
import { PaginatedList } from '../ui/PaginatedList';
import { StaticConversionPreview } from '../previews/StaticConversionPreview';
import { ConversionScreenBuilder } from '../builders/ConversionScreenBuilder';
import { notifications } from '../../utils/notifications';
import { FilterBar, FilterConfig } from '../ui/FilterBar';
import { CONVERSION_METHOD_TYPES } from '../../constants';
import { ConversionMethodBuilder } from '../builders/ConversionMethodBuilder';
import { Modal } from '../ui/Modal';
import { EditConversionModal } from '../modals/EditConversionModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

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

// --- SEARCH COMPONENTS ---

const ConnectedSearchBox = ({
  searchTerm,
  setSearchTerm,
  placeholder,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  placeholder: string;
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
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        style={styles.input}
      />
    </div>
  );
};

// --- NEW LOCAL LIST COMPONENTS ---

const LocalMethodList = ({
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handlePreview,
  handleDeleteMultiple,
}: {
  filters: { [key: string]: string };
  handleDuplicate: (item: ConversionMethod) => void;
  handleEdit: (item: ConversionMethod) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionMethod) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  const { allConversionMethods, allConversionScreens, macrogames, deliveryContainers, campaigns } = useData();

  // Local Filtering Logic
  const filteredItems = useMemo(() => {
    return allConversionMethods.filter((item) => {
      // Computed Status Filter
      if (filters.computedStatusFilter && filters.computedStatusFilter !== 'All') {
        const computedState = getMethodComputedState(item, allConversionScreens, macrogames, deliveryContainers, campaigns);
        if (computedState !== filters.computedStatusFilter) return false;
      }
      // Type Filter
      if (filters.typeFilter && filters.typeFilter !== 'All') {
        if (item.type !== filters.typeFilter) return false;
      }
      return true;
    });
  }, [allConversionMethods, filters, allConversionScreens, macrogames, deliveryContainers, campaigns]);

  const renderItem = (
    item: ConversionMethod,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => {
    const computedState = getMethodComputedState(item, allConversionScreens, macrogames, deliveryContainers, campaigns);

    return (
      <li
        key={item.id}
        style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
      >
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
        <div style={{ ...styles.rewardInfo, flex: 1 }}>
          <strong>{item.name}</strong>
          <div style={{ ...styles.rewardAnalytics, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={styles.tag}>
              {item.type.replace(/_/g, ' ').toUpperCase()}
            </span>
            
            {computedState === 'error' && (
                <span style={{ ...styles.tag, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
                    🚨 Needs Attention
                </span>
            )}
            
            {computedState === 'live' && (
                <span style={{ ...styles.tag, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                    🟢 Live
                </span>
            )}

            {computedState === 'in_use' && (
              <span style={{ ...styles.tag, backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
                🟡 In Use (Not Live)
              </span>
            )}

            {computedState === 'unused' && (
                <span style={{ ...styles.tag, backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }}>
                    ⚪️ Unused
                </span>
            )}
          </div>
        </div>
        <div style={styles.rewardActions}>
          <button onClick={() => handlePreview(item)} style={styles.previewButton}>Preview</button>
          <button onClick={() => handleDuplicate(item)} style={styles.editButton}>Duplicate</button>
          <button onClick={() => handleEdit(item)} style={styles.editButton}>Edit</button>
          <button onClick={() => handleDelete(item.id)} style={styles.deleteButton}>Delete</button>
        </div>
      </li>
    );
  };

  return (
    <PaginatedList
      items={filteredItems}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item) => item.id)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

const LocalScreenList = ({
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handleDeleteMultiple,
}: {
  filters: { [key: string]: any }; 
  handleDuplicate: (item: ConversionScreen) => void;
  handleEdit: (item: ConversionScreen) => void;
  handleDelete: (id: string) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  const { allConversionScreens, macrogames, deliveryContainers, campaigns, allConversionMethods } = useData();

  // Local Filtering Logic
  const filteredItems = useMemo(() => {
    return allConversionScreens.filter((item) => {
      // Computed Status Filter
      if (filters.computedStatusFilter && filters.computedStatusFilter !== 'All') {
        const computedState = getScreenComputedState(item, macrogames, deliveryContainers, campaigns);
        if (computedState !== filters.computedStatusFilter) return false;
      }
      
      // Dynamic Method Types & Specific Methods Filter
      const allowedMethodIds = getAllowedMethodIds(filters, allConversionMethods);
      if (allowedMethodIds !== null) {
          if (allowedMethodIds.length === 0) return false; // Filtered to a type with no methods created
          const screenMethodIds = item.methods?.map(m => m.methodId) || [];
          const hasMatch = allowedMethodIds.some(id => screenMethodIds.includes(id));
          if (!hasMatch) return false;
      }

      return true;
    });
  }, [allConversionScreens, filters, macrogames, deliveryContainers, campaigns, allConversionMethods]);

  const renderItem = (
    item: ConversionScreen,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => {
    const computedState = getScreenComputedState(item, macrogames, deliveryContainers, campaigns);

    return (
      <li
        key={item.id}
        style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
      >
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
        <div style={{ ...styles.rewardInfo, flex: 1 }}>
          <div>
            <strong>{item.name}</strong>
          </div>
          <div style={{ ...styles.rewardAnalytics, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={styles.tag}>Methods: {item.methods?.length || 0}</span>
            
            {computedState === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ ...styles.tag, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
                        🚨 Needs Attention (0 Methods)
                    </span>
                    <span title="A Conversion Screen must have at least one Conversion Method. Any associated Live Macrogames will be automatically paused until this is resolved." style={{ cursor: 'help', marginLeft: '6px', fontSize: '1rem' }}>ℹ️</span>
                </div>
            )}

            {computedState === 'live' && (
                <span style={{ ...styles.tag, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                    🟢 Live
                </span>
            )}
            
            {computedState === 'in_use' && (
                <span style={{ ...styles.tag, backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
                    🟡 In Use (Not Live)
                </span>
            )}

            {computedState === 'unused' && (
                <span style={{ ...styles.tag, backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }}>
                    ⚪️ Unused
                </span>
            )}
          </div>
        </div>
        <div style={styles.rewardActions}>
          <button onClick={() => handleDuplicate(item)} style={styles.editButton}>Duplicate</button>
          <button onClick={() => handleEdit(item)} style={styles.editButton}>Edit</button>
          <button onClick={() => handleDelete(item.id)} style={styles.deleteButton}>Delete</button>
        </div>
      </li>
    );
  };

  return (
    <PaginatedList
      items={filteredItems}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item) => item.id)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

const AlgoliaMethodList = ({
  searchTerm,
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handlePreview,
  handleDeleteMultiple,
}: {
  searchTerm: string;
  filters: { [key: string]: string };
  handleDuplicate: (item: ConversionMethod) => void;
  handleEdit: (item: ConversionMethod) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionMethod) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  const { allConversionScreens, macrogames, deliveryContainers, campaigns } = useData();

  useConfigure({
    query: searchTerm, 
    hitsPerPage: 1000,
    filters: useMemo(() => {
      const algoliaFilters = [];
      if (filters.typeFilter && filters.typeFilter !== 'All') {
        algoliaFilters.push(`type:"${filters.typeFilter}"`);
      }
      return algoliaFilters.join(' AND ');
    }, [filters.typeFilter]),
  });

  const { hits } = useHits();
  const { refresh } = useInstantSearch();
  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderItem = (
    item: ConversionMethod,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => {
    const computedState = getMethodComputedState(item, allConversionScreens, macrogames, deliveryContainers, campaigns);

    return (
      <li
        key={(item as any).objectID}
        style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
      >
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
        <div style={{ ...styles.rewardInfo, flex: 1 }}>
          <strong>{item.name}</strong>
          <div style={{ ...styles.rewardAnalytics, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={styles.tag}>
              {item.type.replace(/_/g, ' ').toUpperCase()}
            </span>
            
            {computedState === 'error' && (
                <span style={{ ...styles.tag, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
                    🚨 Needs Attention
                </span>
            )}
            
            {computedState === 'live' && (
                <span style={{ ...styles.tag, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                    🟢 Live
                </span>
            )}

            {computedState === 'in_use' && (
              <span style={{ ...styles.tag, backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
                🟡 In Use (Not Live)
              </span>
            )}

            {computedState === 'unused' && (
                <span style={{ ...styles.tag, backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }}>
                    ⚪️ Unused
                </span>
            )}
          </div>
        </div>
        <div style={styles.rewardActions}>
          <button onClick={() => handlePreview(item)} style={styles.previewButton}>Preview</button>
          <button onClick={() => handleDuplicate(item)} style={styles.editButton}>Duplicate</button>
          <button onClick={() => handleEdit(item)} style={styles.editButton}>Edit</button>
          <button onClick={() => handleDelete((item as any).objectID)} style={styles.deleteButton}>Delete</button>
        </div>
      </li>
    );
  };

  return (
    <PaginatedList
      items={hits as ConversionMethod[]}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item: any) => item.objectID)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

const AlgoliaScreenList = ({
  searchTerm,
  filters,
  handleDuplicate,
  handleEdit,
  handleDelete,
  handleDeleteMultiple,
}: {
  searchTerm: string;
  filters: { [key: string]: any }; 
  handleDuplicate: (item: ConversionScreen) => void;
  handleEdit: (item: ConversionScreen) => void;
  handleDelete: (id: string) => void;
  handleDeleteMultiple: (ids: string[]) => void;
}) => {
  const { macrogames, deliveryContainers, campaigns, allConversionMethods } = useData();

  useConfigure({
    query: searchTerm,
    hitsPerPage: 1000,
    filters: useMemo(() => {
      const algoliaFilters = [];
      
      // Inject Dynamic Method Filters
      const allowedMethodIds = getAllowedMethodIds(filters, allConversionMethods);
      if (allowedMethodIds !== null) {
          if (allowedMethodIds.length === 0) {
              // Forced fail if they filtered to a type that has zero methods
              algoliaFilters.push(`methodIdList:"NONE_MATCH"`);
          } else {
              const idFilters = allowedMethodIds.map(id => `methodIdList:"${id}"`);
              algoliaFilters.push(`(${idFilters.join(' OR ')})`);
          }
      }
      
      return algoliaFilters.join(' AND ');
    }, [filters, allConversionMethods]),
  });

  const { hits } = useHits();
  const { refresh } = useInstantSearch();
  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderItem = (
    item: ConversionScreen,
    isSelected: boolean,
    onToggleSelect: () => void,
  ) => {
    const id = (item as any).objectID || item.id;
    // We can still calculate the visual state on the fly for Algolia hits
    const computedState = getScreenComputedState(item, macrogames, deliveryContainers, campaigns);

    return (
      <li
        key={id}
        style={{ ...styles.rewardListItem, ...styles.listItemWithCheckbox }}
      >
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
        <div style={{ ...styles.rewardInfo, flex: 1 }}>
          <div>
            <strong>{item.name}</strong>
          </div>
          <div style={{ ...styles.rewardAnalytics, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={styles.tag}>Methods: {item.methods?.length || 0}</span>
            
            {computedState === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ ...styles.tag, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
                        🚨 Needs Attention (0 Methods)
                    </span>
                    <span title="A Conversion Screen must have at least one Conversion Method. Any associated Live Macrogames will be automatically paused until this is resolved." style={{ cursor: 'help', marginLeft: '6px', fontSize: '1rem' }}>ℹ️</span>
                </div>
            )}

            {computedState === 'live' && (
                <span style={{ ...styles.tag, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                    🟢 Live
                </span>
            )}
            
            {computedState === 'in_use' && (
                <span style={{ ...styles.tag, backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
                    🟡 In Use (Not Live)
                </span>
            )}

            {computedState === 'unused' && (
                <span style={{ ...styles.tag, backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db' }}>
                    ⚪️ Unused
                </span>
            )}
          </div>
        </div>
        <div style={styles.rewardActions}>
          <button onClick={() => handleDuplicate(item)} style={styles.editButton}>Duplicate</button>
          <button onClick={() => handleEdit(item)} style={styles.editButton}>Edit</button>
          <button onClick={() => handleDelete(id)} style={styles.deleteButton}>Delete</button>
        </div>
      </li>
    );
  };

  return (
    <PaginatedList
      items={hits as ConversionScreen[]}
      renderItem={renderItem}
      bulkActions={[
        {
          label: 'Delete Selected',
          onAction: (selectedItems) =>
            handleDeleteMultiple(selectedItems.map((item: any) => item.objectID)),
        },
      ]}
      listContainerComponent="ul"
      listContainerStyle={styles.rewardsListFull}
    />
  );
};

// --- MANAGER SECTIONS ---

const MethodManager = () => {
  const {
    createConversionMethod,
    updateConversionMethod,
    deleteConversionMethod,
    duplicateConversionMethod,
    deleteMultipleConversionMethods,
  } = useData();

  // "Builder" State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  
  // Modal States
  const [editingMethod, setEditingMethod] = useState<ConversionMethod | null>(null);
  const [previewingMethod, setPreviewingMethod] = useState<ConversionMethod | null>(null);

  // Preview Modal Controls
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewWidth, setPreviewWidth] = useState(60); 
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  // Search State
  const [methodSearchKey, setMethodSearchKey] = useState(Date.now());
  const [methodSearchTerm, setMethodSearchTerm] = useState('');
  const [methodFilters, setMethodFilters] = useState({ computedStatusFilter: 'All', typeFilter: 'All' });
  const forceMethodRefresh = () => setMethodSearchKey(Date.now());

  const handleMethodFilterChange = (key: string, value: string) => {
    setMethodFilters((prev) => ({ ...prev, [key]: value }));
  };

  // --- STANDARDIZED ACTION HANDLERS ---

  const handleDeleteMethod = async (id: string) => {
    // Check if we are currently searching (using Algolia)
    const isSearching = methodSearchTerm.trim().length > 0;

    if(await deleteConversionMethod(id)) {
        if (isSearching) {
            // ALGOLIA MODE: Needs delay for re-indexing
            const loadingToast = notifications.loading('Deleting method...');
            await new Promise(r => setTimeout(r, 3000));
            notifications.dismiss(loadingToast);
            notifications.success('Method deleted');
            forceMethodRefresh(); // Trigger Algolia re-fetch
        } else {
            // LOCAL MODE: Instant
            // Firestore listener updates UI automatically. No refresh needed.
            notifications.success('Method deleted');
        }
    }
  };

  const handleDeleteMultiple = async (ids: string[]) => {
    const isSearching = methodSearchTerm.trim().length > 0;

    const success = await deleteMultipleConversionMethods(ids);
    
    if (success) {
        if (isSearching) {
            const loadingToast = notifications.loading(`Deleting ${ids.length} methods...`);
            await new Promise(r => setTimeout(r, 3000));
            notifications.dismiss(loadingToast);
            notifications.success(`${ids.length} methods deleted`);
            forceMethodRefresh();
        } else {
            notifications.success(`${ids.length} methods deleted`);
        }
    }
  };

  const handleDuplicateMethod = async (item: ConversionMethod) => {
    const isSearching = methodSearchTerm.trim().length > 0;
    
    // Only show loading if we need to wait for Algolia
    const loadingToast = isSearching ? notifications.loading('Duplicating method...') : undefined;

    try {
        await duplicateConversionMethod(item);
        
        if (isSearching && loadingToast) {
            await new Promise(r => setTimeout(r, 3000)); // Wait for Algolia
            forceMethodRefresh();
            notifications.dismiss(loadingToast);
        }
        
        notifications.success('Method duplicated');
    } catch (error) {
        if (loadingToast) notifications.dismiss(loadingToast);
        notifications.error('Failed to duplicate method');
    }
  };

  // Helper to normalize ID for duplicate/edit whether it comes from Algolia or Firestore
  const getFullItem = async (item: ConversionMethod | any) => {
      // If it's a Firestore object, it has all data. 
      // If it's Algolia, we might need to fetch fresh data or just rely on hit data.
      // For safety, let's fetch if it looks like an Algolia hit (has objectID)
      const id = item.id || item.objectID;
      if (!id) throw new Error("Missing ID");
      
      const docRef = doc(db, 'conversionMethods', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Method not found");
      return { id: snap.id, ...snap.data() } as ConversionMethod;
  };

  return (
    <div>
        {/* --- TOGGLE LOGIC: Show Button OR Builder (For Creation) --- */}
        {!isBuilderOpen ? (
            <button 
                onClick={() => { setEditingMethod(null); setIsBuilderOpen(true); }}
                style={{ ...styles.createButton, marginBottom: '2rem' }}
            >
                Create New Conversion Method
            </button>
        ) : (
            <div style={{ marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '2rem', height: '650px' }}>
                <ConversionMethodBuilder
                    initialMethod={null} // Always null for creation mode here
                    onSave={() => { 
                        setIsBuilderOpen(false); 
                        forceMethodRefresh(); 
                        setTimeout(() => document.getElementById('methods-list-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                    }}
                    onCancel={() => { setIsBuilderOpen(false); }}
                />
            </div>
        )}

        {/* --- LIST VIEW --- */}
        {/* REFACTOR: Hybrid Architecture */}
        
        <div style={styles.filterContainer}>
            {/* Standard Input instead of ConnectedSearchBox */}
            <div style={styles.configItem}>
                <label>Search</label>
                <input
                    type="text"
                    placeholder="Search methods..."
                    value={methodSearchTerm}
                    onChange={(e) => setMethodSearchTerm(e.target.value)}
                    style={styles.input}
                />
            </div>
            <FilterBar
            filters={[
                { 
                    type: 'select', 
                    label: 'Status', 
                    stateKey: 'computedStatusFilter', 
                    options: [
                        { value: 'All', label: 'All' }, 
                        { value: 'live', label: 'Live' }, 
                        { value: 'in_use', label: 'In Use (Not Live)' }, 
                        { value: 'unused', label: 'Unused' },
                        { value: 'error', label: 'Needs Attention' }
                    ] 
                },
                { type: 'select', label: 'Method Type', stateKey: 'typeFilter', options: ['All', ...CONVERSION_METHOD_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))] }
            ]}
            filterValues={methodFilters}
            onFilterChange={handleMethodFilterChange}
            onResetFilters={() => { setMethodFilters({ computedStatusFilter: 'All', typeFilter: 'All' }); setMethodSearchTerm(''); forceMethodRefresh(); }}
            />
        </div>
        <h3 id="methods-list-header" style={styles.h3}>Existing Conversion Methods</h3>

        {/* Conditional Rendering based on Search Term */}
        {methodSearchTerm.trim().length > 0 ? (
            <InstantSearch key={methodSearchKey} searchClient={searchClient} indexName="conversionMethods">
                <AlgoliaMethodList
                    searchTerm={methodSearchTerm}
                    filters={methodFilters}
                    handleDelete={handleDeleteMethod}
                    handleDeleteMultiple={handleDeleteMultiple}
                    handleDuplicate={async (item) => {
                        try {
                            const fullData = await getFullItem(item);
                            await handleDuplicateMethod(fullData);
                        } catch (e) { notifications.error("Failed to duplicate."); }
                    }}
                    handleEdit={async (item) => {
                        const t = notifications.loading("Loading editor...");
                        try {
                            const fullData = await getFullItem(item);
                            setEditingMethod(fullData);
                        } catch (e) { notifications.error("Failed to load editor."); }
                        finally { notifications.dismiss(t); }
                    }}
                    handlePreview={async (item) => {
                         const t = notifications.loading("Loading preview...");
                        try {
                            const fullData = await getFullItem(item);
                            setPreviewingMethod(fullData);
                        } catch (e) { notifications.error("Failed to load preview."); }
                        finally { notifications.dismiss(t); }
                    }}
                />
            </InstantSearch>
        ) : (
            <LocalMethodList
                filters={methodFilters}
                handleDelete={handleDeleteMethod}
                handleDeleteMultiple={handleDeleteMultiple}
                handleDuplicate={handleDuplicateMethod}
                handleEdit={setEditingMethod}
                handlePreview={setPreviewingMethod}
            />
        )}

        {/* --- PREVIEW MODAL --- */}
        <Modal
            isOpen={!!previewingMethod}
            onClose={() => { 
                setPreviewingMethod(null); 
                setPreviewTheme('dark'); 
                setPreviewOrientation('landscape');
                setPreviewWidth(60); // Reset width
                setPreviewRefreshKey(0); // Reset key
            }}
            title={`Preview: ${previewingMethod?.name}`}
            size="large"
            footer={
                <button 
                    onClick={() => {
                        setPreviewingMethod(null);
                        setPreviewTheme('dark');
                        setPreviewOrientation('landscape');
                        setPreviewWidth(60);
                        setPreviewRefreshKey(0);
                    }} 
                    style={styles.secondaryButton}
                >
                    Close
                </button>
            }
        >
            <div style={{ height: 'calc(80vh - 165px)', minHeight: '500px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                <StaticConversionPreview 
                    method={previewingMethod} 
                    themeMode={previewTheme}
                    onThemeChange={setPreviewTheme}
                    orientation={previewOrientation}
                    onOrientationChange={setPreviewOrientation}
                    previewWidth={previewWidth}
                    onPreviewWidthChange={setPreviewWidth}
                    refreshKey={previewRefreshKey}
                    onRefresh={() => setPreviewRefreshKey(prev => prev + 1)}
                />
            </div>
        </Modal>

        {/* --- EDIT MODAL --- */}
        <EditConversionModal
            isOpen={!!editingMethod}
            onClose={() => setEditingMethod(null)}
            conversion={editingMethod}
            onSaveSuccess={() => {
                setEditingMethod(null);
                forceMethodRefresh();
            }}
        />
    </div>
  );
};

// Helper to calculate the true hierarchical state of a Conversion Screen
export const getScreenComputedState = (
    screen: ConversionScreen, 
    macrogames: any[], 
    deliveryContainers: any[], 
    campaigns: any[]
): 'error' | 'live' | 'in_use' | 'unused' => {
    // 1. Error State Check
    if (screen.status?.code === 'error' || !screen.methods || screen.methods.length === 0) {
        return 'error';
    }

    // 2. Trace to Macrogames
    const linkedMacrogames = macrogames.filter(m => m.conversionScreenId === screen.id);
    if (linkedMacrogames.length === 0) return 'unused';

    // 3. Trace to Containers
    const linkedMacrogameIds = linkedMacrogames.map(m => m.id);
    const linkedContainers = deliveryContainers.filter(c => linkedMacrogameIds.includes(c.macrogameId));
    if (linkedContainers.length === 0) return 'in_use';

    // 4. Trace to Campaigns or Iframes to determine "Live"
    const isLive = linkedContainers.some(c => {
        // Iframes are inherently live conduits
        if (c.deliveryMethod === 'iframe') return true;
        // Popups/Webpages must be in an Active Campaign
        if (c.campaignId) {
            const camp = campaigns.find(camp => camp.id === c.campaignId);
            return camp && camp.status === 'Active'; 
        }
        return false;
    });

    return isLive ? 'live' : 'in_use';
};

// Helper to calculate the true hierarchical state of a Conversion Method
export const getMethodComputedState = (
    method: ConversionMethod,
    allConversionScreens: ConversionScreen[],
    macrogames: any[],
    deliveryContainers: any[],
    campaigns: any[]
): 'error' | 'live' | 'in_use' | 'unused' => {
    if (method.status?.code === 'error') return 'error';

    const linkedScreens = allConversionScreens.filter(s => 
        s.methodIdList?.includes(method.id) || 
        s.methods?.some(m => m.methodId === method.id)
    );

    if (linkedScreens.length === 0) return 'unused';

    // If ANY linked screen is Live, the method is Live.
    for (const screen of linkedScreens) {
        const screenState = getScreenComputedState(screen, macrogames, deliveryContainers, campaigns);
        if (screenState === 'live') return 'live';
    }

    return 'in_use';
};

// Helper to translate nested type & specific method filters into a single array of allowed IDs
export const getAllowedMethodIds = (filters: Record<string, any>, allMethods: ConversionMethod[]) => {
    if (!filters.methodTypesFilter || filters.methodTypesFilter.length === 0) return null;
    
    let allowedIds: string[] = [];
    filters.methodTypesFilter.forEach((type: string) => {
        const specificSelection = filters[`specificMethods_${type}`] || [];
        if (specificSelection.length > 0) {
            // If they selected specific variants, ONLY allow those
            allowedIds.push(...specificSelection);
        } else {
            // Otherwise, allow ALL methods of this type
            const typeIds = allMethods.filter(m => m.type === type).map(m => m.id);
            allowedIds.push(...typeIds);
        }
    });
    return allowedIds;
};

const ScreenManager = () => {
  const {
    allConversionMethods,
    deleteConversionScreen,
    duplicateConversionScreen,
    deleteMultipleConversionScreens,
    macrogames,
    deliveryContainers,
    campaigns
  } = useData();

  // State for the "Hidden Builder" pattern
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<ConversionScreen | null>(null);

  // Search State
  const [screenSearchKey, setScreenSearchKey] = useState(Date.now());
  const [screenSearchTerm, setScreenSearchTerm] = useState('');
  const [screenFilters, setScreenFilters] = useState<Record<string, any>>({
    computedStatusFilter: 'All',
    methodTypesFilter: [] as string[],
  });
  const forceScreenRefresh = () => setScreenSearchKey(Date.now());

  // --- Dynamic Filter Config ---
  const screenFilterConfig: FilterConfig[] = useMemo(() => {
        const formatType = (t: string) => t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        const configs: FilterConfig[] = [
            { 
                type: 'select', 
                label: 'Status', 
                stateKey: 'computedStatusFilter', 
                options: [
                    { value: 'All', label: 'All' }, 
                    { value: 'live', label: 'Live' }, 
                    { value: 'in_use', label: 'In Use (Draft/Paused)' }, 
                    { value: 'unused', label: 'Unused' },
                    { value: 'error', label: 'Needs Attention' }
                ] 
            },
            { 
                type: 'multiselect', 
                label: 'Contains Method Type', 
                stateKey: 'methodTypesFilter', 
                options: CONVERSION_METHOD_TYPES.map(t => ({ value: t, label: formatType(t) })) 
            }
        ];

        // Inject conditional sub-filters based on selected types
        if (screenFilters.methodTypesFilter && screenFilters.methodTypesFilter.length > 0) {
            screenFilters.methodTypesFilter.forEach((type: string) => {
                const methodsOfThisType = allConversionMethods.filter(m => m.type === type);
                if (methodsOfThisType.length > 0) {
                    configs.push({
                        type: 'multiselect',
                        label: `Specific ${formatType(type)}`,
                        stateKey: `specificMethods_${type}`,
                        options: methodsOfThisType.map(m => ({ value: m.id, label: m.name }))
                    });
                }
            });
        }

        return configs;
  }, [allConversionMethods, screenFilters.methodTypesFilter]);

  const handleScreenFilterChange = (key: string, value: string | string[]) => {
    setScreenFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteScreen = async (id: string) => {
    const isSearching = screenSearchTerm.trim().length > 0;

    if(await deleteConversionScreen(id)) {
        if (isSearching) {
            const loadingToast = notifications.loading('Deleting screen...');
            await new Promise(r => setTimeout(r, 3000));
            notifications.dismiss(loadingToast);
            notifications.success('Screen deleted');
            forceScreenRefresh();
        } else {
            notifications.success('Screen deleted');
        }
    }
  };

  const handleDeleteMultiple = async (ids: string[]) => {
    const isSearching = screenSearchTerm.trim().length > 0;

    const success = await deleteMultipleConversionScreens(ids);
    
    if (success) {
        if (isSearching) {
            const loadingToast = notifications.loading(`Deleting ${ids.length} screens...`);
            await new Promise(r => setTimeout(r, 3000));
            notifications.dismiss(loadingToast);
            notifications.success(`${ids.length} screens deleted`);
            forceScreenRefresh();
        } else {
            notifications.success(`${ids.length} screens deleted`);
        }
    }
  };

  return (
    <div>
        {/* --- TOGGLE LOGIC --- */}
        {!isBuilderOpen ? (
            <button 
                onClick={() => { setEditingScreen(null); setIsBuilderOpen(true); }}
                style={{ ...styles.createButton, marginBottom: '2rem' }}
            >
                Create New Conversion Screen
            </button>
        ) : (
            // The Builder takes over this slot, pushing content down
            <div style={{ marginBottom: '2rem' }}>
                <ConversionScreenBuilder 
                    initialScreen={editingScreen}
                    onSave={() => { 
                        setIsBuilderOpen(false); 
                        setEditingScreen(null); 
                        forceScreenRefresh(); 
                        setTimeout(() => document.getElementById('screens-list-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                    }}
                    onCancel={() => { setIsBuilderOpen(false); setEditingScreen(null); }}
                />
            </div>
        )}

        {/* --- LIST VIEW (Always visible below) --- */}
        <div style={{ marginTop: '1rem' }}>
            {/* REFACTOR: Hybrid Architecture */}
            <div style={styles.filterContainer}>
                 <div style={styles.configItem}>
                    <label>Search</label>
                    <input
                        type="text"
                        placeholder="Search screens..."
                        value={screenSearchTerm}
                        onChange={(e) => setScreenSearchTerm(e.target.value)}
                        style={styles.input}
                    />
                </div>
                <FilterBar
                filters={screenFilterConfig}
                filterValues={{
                    ...screenFilters,
                    // Safety mapping: ensure dynamic multiselects default to [] instead of undefined
                    ...screenFilterConfig.reduce((acc, f) => {
                        if (f.type === 'multiselect' && !screenFilters[f.stateKey]) {
                            acc[f.stateKey] = [];
                        }
                        return acc;
                    }, {} as Record<string, any>)
                }}
                onFilterChange={handleScreenFilterChange}
                onResetFilters={() => { setScreenFilters({ computedStatusFilter: 'All', methodTypesFilter: [] }); setScreenSearchTerm(''); forceScreenRefresh(); }}
                />
            </div>
            <h3 id="screens-list-header" style={styles.h3}>Existing Conversion Screens</h3>
            
            {screenSearchTerm.trim().length > 0 ? (
                <InstantSearch key={screenSearchKey} searchClient={searchClient} indexName="conversionScreens">
                    <AlgoliaScreenList
                        searchTerm={screenSearchTerm}
                        filters={screenFilters}
                        handleDelete={handleDeleteScreen}
                        handleDuplicate={async (item) => { 
                             // Basic ID normalization if needed, similar to Methods, but mostly handled by hooks
                             const id = item.id || (item as any).objectID;
                             const docRef = doc(db, 'conversionScreens', id);
                             const snap = await getDoc(docRef);
                             if(snap.exists()) {
                                const t = notifications.loading('Duplicating screen...');
                                await duplicateConversionScreen({id: snap.id, ...snap.data()} as ConversionScreen);
                                notifications.dismiss(t);
                                notifications.success('Screen duplicated');
                                forceScreenRefresh(); 
                             }
                        }}
                        handleEdit={(item) => { 
                             // We don't have a fetch wrapper here for Edit, assume local state is fast enough or pass basic data
                             // Ideally fetch fresh data like in Methods, but preserving original logic structure where possible.
                             setEditingScreen({ ...item, id: item.id || (item as any).objectID }); 
                             setIsBuilderOpen(true); 
                        }}
                        handleDeleteMultiple={handleDeleteMultiple}
                    />
                </InstantSearch>
            ) : (
                <LocalScreenList
                    filters={screenFilters}
                    handleDelete={handleDeleteScreen}
                    handleDuplicate={async (item) => { 
                        const t = notifications.loading('Duplicating screen...');
                        await duplicateConversionScreen(item); 
                        notifications.dismiss(t);
                        notifications.success('Screen duplicated');
                        forceScreenRefresh(); 
                    }}
                    handleEdit={(item) => { 
                        setEditingScreen(item); 
                        setIsBuilderOpen(true); 
                    }}
                    handleDeleteMultiple={handleDeleteMultiple}
                />
            )}
        </div>
    </div>
  );
};

export const ConversionsManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screens' | 'methods'>('screens');

  return (
    <div style={styles.creatorSection}>
      <div style={styles.managerHeader}>
        <h2 style={styles.h2}>Conversion Manager</h2>
      </div>
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('screens')}
          style={activeTab === 'screens' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}
        >
          Screens
        </button>
        <button
          onClick={() => setActiveTab('methods')}
          style={activeTab === 'methods' ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}
        >
          Methods
        </button>
      </div>

      {activeTab === 'screens' ? <ScreenManager /> : <MethodManager />}
    </div>
  );
};