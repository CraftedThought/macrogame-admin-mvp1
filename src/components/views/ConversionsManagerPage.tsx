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
const algoliaPrefix = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX || '';

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
  filters: { [key: string]: any };
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
      
      // Type Filter & Sub-filters
      if (filters.typeFilter && filters.typeFilter !== 'All') {
        if (item.type !== filters.typeFilter) return false;

        if (filters.typeFilter === 'coupon_display' && filters.couponRevealType && filters.couponRevealType !== 'All') {
            let revType = 'none';
            if ((item as any).clickToReveal) {
                revType = (item as any).revealScope === 'code_only' ? 'code_only' : 'entire_card';
            }
            if (revType !== filters.couponRevealType) return false;
        }

        if (filters.typeFilter === 'link_redirect' && filters.linkTransitionType && filters.linkTransitionType !== 'All') {
            let transType = 'none';
            const t = (item as any).transition;
            if (t) {
                if (t.type === 'auto') transType = 'auto';
                else if (t.interactionMethod === 'click' && t.clickFormat === 'button') transType = 'button';
                else transType = 'disclaimer';
            }
            if (transType !== filters.linkTransitionType) return false;
        }

        if (filters.typeFilter === 'form_submit' && filters.numFields && filters.numFields !== 'All') {
            const count = (item as any).fields?.length || 0;
            if (filters.numFields === '5+') {
                if (count < 5) return false;
            } else {
                if (count !== Number(filters.numFields)) return false;
            }
        }

        if (filters.typeFilter === 'social_follow' && filters.socialPlatforms && filters.socialPlatforms.length > 0) {
            const activePlatforms = (item as any).links?.filter((l: any) => l.isEnabled).map((l: any) => l.platform) || [];
            // AND condition: item must have ALL selected platforms
            const hasAll = filters.socialPlatforms.every((p: string) => activePlatforms.includes(p));
            if (!hasAll) return false;
        }
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
  handlePreview,
  handleDeleteMultiple,
}: {
  filters: { [key: string]: any }; 
  handleDuplicate: (item: ConversionScreen) => void;
  handleEdit: (item: ConversionScreen) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionScreen) => void;
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
          if (allowedMethodIds.length === 0) return false; 
          const screenMethodIds = item.methods?.map(m => m.methodId) || [];
          const hasMatch = allowedMethodIds.some(id => screenMethodIds.includes(id));
          if (!hasMatch) return false;
      }

      // Gate Filters
      if (filters.gateTypes && filters.gateTypes.length > 0) {
          if (filters.gateTypes.includes('none')) {
              const screenGateCount = (item.methods || []).filter((m: any) => m.gate && m.gate.type !== 'none').length;
              if (screenGateCount > 0) return false;
          } else {
              const screenGateTypes = (item.methods || []).map((m: any) => m.gate?.type).filter((t: string) => t && t !== 'none');
              const hasAllGates = filters.gateTypes.every((gate: string) => screenGateTypes.includes(gate));
              if (!hasAllGates) return false;
          }
      }

      if (filters.numGates && filters.numGates !== 'All') {
          if (filters.numGates === '4+') {
              if (screenGateCount < 4) return false;
          } else {
              if (screenGateCount !== Number(filters.numGates)) return false;
          }
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
  filters: { [key: string]: any };
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
        
        // Dynamic Sub-filters based on type
        if (filters.typeFilter === 'coupon_display' && filters.couponRevealType && filters.couponRevealType !== 'All') {
            algoliaFilters.push(`couponRevealType:"${filters.couponRevealType}"`);
        }
        if (filters.typeFilter === 'link_redirect' && filters.linkTransitionType && filters.linkTransitionType !== 'All') {
            algoliaFilters.push(`linkTransitionType:"${filters.linkTransitionType}"`);
        }
        if (filters.typeFilter === 'form_submit' && filters.numFields && filters.numFields !== 'All') {
            if (filters.numFields === '5+') {
                algoliaFilters.push(`numFields >= 5`);
            } else {
                algoliaFilters.push(`numFields = ${filters.numFields}`);
            }
        }
        if (filters.typeFilter === 'social_follow' && filters.socialPlatforms && filters.socialPlatforms.length > 0) {
            // Algolia Multiselect AND condition: each platform must exist in the array
            filters.socialPlatforms.forEach((platform: string) => {
                algoliaFilters.push(`socialPlatforms:"${platform}"`);
            });
        }
      }
      return algoliaFilters.join(' AND ');
    }, [filters]),
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
  handlePreview,
  handleDeleteMultiple,
}: {
  searchTerm: string;
  filters: { [key: string]: any }; 
  handleDuplicate: (item: ConversionScreen) => void;
  handleEdit: (item: ConversionScreen) => void;
  handleDelete: (id: string) => void;
  handlePreview: (item: ConversionScreen) => void;
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
              algoliaFilters.push(`methodIdList:"NONE_MATCH"`);
          } else {
              const idFilters = allowedMethodIds.map(id => `methodIdList:"${id}"`);
              algoliaFilters.push(`(${idFilters.join(' OR ')})`);
          }
      }

      // Gate Filters
      if (filters.gateTypes && filters.gateTypes.length > 0) {
          if (filters.gateTypes.includes('none')) {
              algoliaFilters.push(`numGates = 0`);
          } else {
              // AND condition: screen must have every selected gate type
              filters.gateTypes.forEach((gate: string) => {
                  algoliaFilters.push(`gateTypes:"${gate}"`);
              });
          }
      }

      if (filters.numGates && filters.numGates !== 'All') {
          if (filters.numGates === '4+') {
              algoliaFilters.push(`numGates >= 4`);
          } else {
              algoliaFilters.push(`numGates = ${filters.numGates}`);
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
          <button onClick={() => handlePreview(item)} style={styles.previewButton}>Preview</button>
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

const MethodManager = ({ onBuilderToggle }: { onBuilderToggle: (isOpen: boolean) => void }) => {
  const {
    createConversionMethod,
    updateConversionMethod,
    deleteConversionMethod,
    duplicateConversionMethod,
    deleteMultipleConversionMethods,
  } = useData();

  // "Builder" State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  
  useEffect(() => {
      onBuilderToggle(isBuilderOpen);
  }, [isBuilderOpen, onBuilderToggle]);

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
  const [methodFilters, setMethodFilters] = useState<Record<string, any>>({ 
      computedStatusFilter: 'All', 
      typeFilter: 'All' 
  });
  const forceMethodRefresh = () => setMethodSearchKey(Date.now());

  // --- Dynamic Method Filter Config ---
  const methodFilterConfig: FilterConfig[] = useMemo(() => {
        const configs: FilterConfig[] = [
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
            { 
                type: 'select', 
                label: 'Method Type', 
                stateKey: 'typeFilter', 
                options: ['All', ...CONVERSION_METHOD_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))] 
            }
        ];

        // Conditional Sub-Filters based on Method Type
        if (methodFilters.typeFilter === 'coupon_display') {
            configs.push({
                type: 'select', label: 'Reveal Mask', stateKey: 'couponRevealType',
                options: [
                    { value: 'All', label: 'All' },
                    { value: 'entire_card', label: 'Full Coupon Cover' },
                    { value: 'code_only', label: 'Code Only Cover' },
                    { value: 'none', label: 'No Mask' }
                ]
            });
        } else if (methodFilters.typeFilter === 'link_redirect') {
            configs.push({
                type: 'select', label: 'Transition Type', stateKey: 'linkTransitionType',
                options: [
                    { value: 'All', label: 'All' },
                    { value: 'auto', label: 'Auto-Transition (Timer)' },
                    { value: 'button', label: 'Button Click' },
                    { value: 'disclaimer', label: 'Disclaimer Click' }
                ]
            });
        } else if (methodFilters.typeFilter === 'form_submit') {
            configs.push({
                type: 'select', label: 'Number of Fields', stateKey: 'numFields',
                options: ['All', '1', '2', '3', '4', '5+']
            });
        } else if (methodFilters.typeFilter === 'social_follow') {
            configs.push({
                type: 'multiselect', label: 'Included Platforms', stateKey: 'socialPlatforms',
                options: [
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'instagram', label: 'Instagram' },
                    { value: 'linkedin', label: 'LinkedIn' },
                    { value: 'tiktok', label: 'TikTok' },
                    { value: 'x', label: 'X (Twitter)' },
                    { value: 'youtube', label: 'YouTube' }
                ]
            });
        }

        return configs;
  }, [methodFilters.typeFilter]);

  const handleMethodFilterChange = (key: string, value: string | string[]) => {
    setMethodFilters((prev) => {
        const next = { ...prev, [key]: value };
        // If changing the main type filter, clear out the irrelevant sub-filters
        if (key === 'typeFilter') {
            delete next.couponRevealType;
            delete next.linkTransitionType;
            delete next.numFields;
            delete next.socialPlatforms;
        }
        return next;
    });
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
        {isBuilderOpen ? (
            <div style={{ height: 'calc(100vh - 150px)', minHeight: '650px', width: '100%' }}>
                <ConversionMethodBuilder
                    initialMethod={editingMethod}
                    onSave={() => { 
                        setIsBuilderOpen(false); 
                        setEditingMethod(null);
                        forceMethodRefresh(); 
                    }}
                    onCancel={() => { 
                        setIsBuilderOpen(false); 
                        setEditingMethod(null);
                    }}
                />
            </div>
        ) : (
            <>
                <button 
                    onClick={() => { setEditingMethod(null); setIsBuilderOpen(true); }}
                    style={{ ...styles.createButton, marginBottom: '2rem' }}
                >
                    Create New Conversion Method
                </button>

                {/* --- LIST VIEW --- */}
                <div style={styles.filterContainer}>
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
                        filters={methodFilterConfig}
                        filterValues={{
                            ...methodFilters,
                            ...methodFilterConfig.reduce((acc, f) => {
                                if (f.type === 'multiselect' && !methodFilters[f.stateKey]) {
                                    acc[f.stateKey] = [];
                                }
                                return acc;
                            }, {} as Record<string, any>)
                        }}
                        onFilterChange={handleMethodFilterChange}
                        onResetFilters={() => { setMethodFilters({ computedStatusFilter: 'All', typeFilter: 'All' }); setMethodSearchTerm(''); forceMethodRefresh(); }}
                    />
                </div>
                <h3 id="methods-list-header" style={styles.h3}>Existing Conversion Methods</h3>

                {methodSearchTerm.trim().length > 0 ? (
                    <InstantSearch key={methodSearchKey} searchClient={searchClient} indexName={`${algoliaPrefix}conversionMethods`}>
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
                                    setIsBuilderOpen(true);
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
                        handleEdit={(item) => {
                            setEditingMethod(item);
                            setIsBuilderOpen(true);
                        }}
                        handlePreview={setPreviewingMethod}
                    />
                )}
            </>
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

const ScreenManager = ({ onBuilderToggle }: { onBuilderToggle: (isOpen: boolean) => void }) => {
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

  useEffect(() => {
      onBuilderToggle(isBuilderOpen);
  }, [isBuilderOpen, onBuilderToggle]);

  // Preview State
  const [previewingScreen, setPreviewingScreen] = useState<ConversionScreen | null>(null);
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  // Search State
  const [screenSearchKey, setScreenSearchKey] = useState(Date.now());
  const [screenSearchTerm, setScreenSearchTerm] = useState('');
  const [screenFilters, setScreenFilters] = useState<Record<string, any>>({
    computedStatusFilter: 'All',
    gateTypes: [] as string[],
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
                label: 'Gate Types',
                stateKey: 'gateTypes',
                options: [
                    { value: 'none', label: 'No Gate', isExclusive: true },
                    { value: 'on_success', label: 'On Method Success' },
                    { value: 'point_threshold', label: 'Point Threshold' },
                    { value: 'point_purchase', label: 'Point Purchase' }
                ]
            }
        ];

        // Hide the count filter if they explicitly chose 'none'
        const hasNoGate = screenFilters.gateTypes?.includes('none');
        if (!hasNoGate) {
            configs.push({
                type: 'select',
                label: 'Number of Gates',
                stateKey: 'numGates',
                options: ['All', '1', '2', '3', '4+']
            });
        }

        // Always show Method Types AFTER Gates
        configs.push({ 
            type: 'multiselect', 
            label: 'Contains Method Type', 
            stateKey: 'methodTypesFilter', 
            options: CONVERSION_METHOD_TYPES.map(t => ({ value: t, label: formatType(t) })) 
        });

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
  }, [allConversionMethods, screenFilters.methodTypesFilter, screenFilters.gateTypes]);

  const handleScreenFilterChange = (key: string, value: string | string[]) => {
    setScreenFilters((prev) => {
        const next = { ...prev, [key]: value };
        // Clean up ghost numGates if 'No Gate' is selected
        if (key === 'gateTypes' && Array.isArray(value) && value.includes('none')) {
            next.numGates = 'All';
        }
        return next;
    });
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
        {isBuilderOpen ? (
            <div style={{ height: 'calc(100vh - 150px)', minHeight: '650px', width: '100%' }}>
                <ConversionScreenBuilder 
                    initialScreen={editingScreen}
                    onSave={() => { 
                        setIsBuilderOpen(false); 
                        setEditingScreen(null); 
                        forceScreenRefresh(); 
                    }}
                    onCancel={() => { 
                        setIsBuilderOpen(false); 
                        setEditingScreen(null); 
                    }}
                />
            </div>
        ) : (
            <>
                <button 
                    onClick={() => { setEditingScreen(null); setIsBuilderOpen(true); }}
                    style={{ ...styles.createButton, marginBottom: '2rem' }}
                >
                    Create New Conversion Screen
                </button>

                {/* --- LIST VIEW --- */}
                <div style={{ marginTop: '1rem' }}>
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
                                ...screenFilterConfig.reduce((acc, f) => {
                                    if (f.type === 'multiselect' && !screenFilters[f.stateKey]) {
                                        acc[f.stateKey] = [];
                                    }
                                    return acc;
                                }, {} as Record<string, any>)
                            }}
                            onFilterChange={handleScreenFilterChange}
                            onResetFilters={() => { setScreenFilters({ computedStatusFilter: 'All', gateTypes: [], methodTypesFilter: [] }); setScreenSearchTerm(''); forceScreenRefresh(); }}
                        />
                    </div>
                    <h3 id="screens-list-header" style={styles.h3}>Existing Conversion Screens</h3>
                    
                    {screenSearchTerm.trim().length > 0 ? (
                        <InstantSearch key={screenSearchKey} searchClient={searchClient} indexName={`${algoliaPrefix}conversionScreens`}>
                            <AlgoliaScreenList
                                searchTerm={screenSearchTerm}
                                filters={screenFilters}
                                handleDelete={handleDeleteScreen}
                                handlePreview={async (item) => { 
                                     const id = item.id || (item as any).objectID;
                                     const docRef = doc(db, 'conversionScreens', id);
                                     const snap = await getDoc(docRef);
                                     if(snap.exists()) {
                                         setPreviewingScreen({id: snap.id, ...snap.data()} as ConversionScreen);
                                     }
                                }}
                                handleDuplicate={async (item) => { 
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
                            handlePreview={(item) => setPreviewingScreen(item)}
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
            </>
        )}

        {/* --- PREVIEW MODAL --- */}
            <Modal
                isOpen={!!previewingScreen}
                onClose={() => { 
                    setPreviewingScreen(null); 
                    setPreviewTheme('dark'); 
                    setPreviewOrientation('landscape');
                    setPreviewRefreshKey(0); 
                }}
                title={`Preview: ${previewingScreen?.name}`}
                size="large"
                footer={
                    <button 
                        onClick={() => {
                            setPreviewingScreen(null);
                            setPreviewTheme('dark');
                            setPreviewOrientation('landscape');
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
                        screen={previewingScreen} 
                        themeMode={previewTheme}
                        onThemeChange={setPreviewTheme}
                        orientation={previewOrientation}
                        onOrientationChange={setPreviewOrientation}
                        refreshKey={previewRefreshKey}
                        onRefresh={() => setPreviewRefreshKey(prev => prev + 1)}
                    />
                </div>
            </Modal>
        </div>
  );
};

export const ConversionsManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'screens' | 'methods'>('screens');
  const [isBuilding, setIsBuilding] = useState(false);

  return (
    <div style={styles.creatorSection}>
      {!isBuilding && (
          <>
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
          </>
      )}

      {activeTab === 'screens' ? <ScreenManager onBuilderToggle={setIsBuilding} /> : <MethodManager onBuilderToggle={setIsBuilding} />}
    </div>
  );
};