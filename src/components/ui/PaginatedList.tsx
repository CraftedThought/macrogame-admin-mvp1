// src/components/ui/PaginatedList.tsx

import React, { useState, useEffect } from 'react';
import { styles } from '../../App.styles';

// Type for a bulk action configuration object
interface BulkAction<T> {
    label: string;
    onAction: (selectedItems: T[]) => void;
}

interface PaginatedListProps<T extends { id: string }> {
    items: T[];
    renderItem: (item: T, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;
    itemsPerPageOptions?: number[];
    bulkActions?: BulkAction<T>[];
    listContainerStyle?: React.CSSProperties;
    listContainerComponent?: keyof JSX.IntrinsicElements;
}

export const PaginatedList = <T extends { id: string }>({
    items,
    renderItem,
    itemsPerPageOptions = [5, 10, 25],
    bulkActions = [],
    listContainerStyle = {},
    listContainerComponent = 'div'
}: PaginatedListProps<T>) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset selection and page when the base items array changes
    useEffect(() => {
        setSelectedIds(new Set());
        setCurrentPage(1);
    }, [items]);

    // Reset page if items per page changes and current page becomes invalid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);
    
    const ListContainer = listContainerComponent;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allPaginatedIds = new Set(paginatedItems.map(item => item.id));
            setSelectedIds(allPaginatedIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleSelect = (itemId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    const handleBulkAction = (action: BulkAction<T>) => {
        const selectedItems = items.filter(item => selectedIds.has(item.id));
        if (selectedItems.length > 0) {
            action.onAction(selectedItems);
            setSelectedIds(new Set()); // Clear selection after action
        }
    };
    
    const isAllOnPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.has(item.id));

    return (
        <div>
            {(bulkActions.length > 0) && (
                <div style={styles.listHeader}>
                    <div style={styles.listHeaderLeft}>
                        <input
                            type="checkbox"
                            style={styles.selectAllCheckbox}
                            checked={isAllOnPageSelected}
                            onChange={handleSelectAll}
                            aria-label="Select all items on this page"
                        />
                        {selectedIds.size > 0 && (
                             <div style={styles.bulkActionsContainer}>
                                <span>{selectedIds.size} selected</span>
                                {bulkActions.map(action => (
                                    <button key={action.label} onClick={() => handleBulkAction(action)} style={styles.editButton}>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ListContainer style={listContainerStyle}>
                {paginatedItems.map(item => renderItem(item, selectedIds.has(item.id), () => handleToggleSelect(item.id)))}
            </ListContainer>
            <div style={styles.listFooter}>
                <div style={styles.itemsPerPageContainer}>
                    <label htmlFor="items-per-page">Items per page:</label>
                    <select
                        id="items-per-page"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        style={styles.itemsPerPageSelect}
                    >
                        {itemsPerPageOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
                {totalPages > 1 && (
                    <div style={styles.paginationContainer}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={styles.paginationButton}>Previous</button>
                        <span style={styles.paginationText}>Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={styles.paginationButton}>Next</button>
                    </div>
                )}
            </div>
        </div>
    );
};