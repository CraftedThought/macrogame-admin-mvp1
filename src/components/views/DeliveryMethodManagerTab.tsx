/* src/components/views/DeliveryMethodManagerTab.tsx */

import React from 'react';
import { styles } from '../../App.styles';
import { PaginatedList } from '../ui/PaginatedList';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import { DeliveryContainer } from '../../types';

interface DeliveryMethodManagerTabProps {
    // --- REFACTOR: Update prop types ---
    items: DeliveryContainer[];
    favoriteItems: DeliveryContainer[];
    renderItem: (item: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => React.ReactNode;
    onDeleteMultiple: (ids: string[]) => void;
    itemTypeName: string;
    favoriteItemTypeName?: string;
    isLoading: boolean;
}

export const DeliveryMethodManagerTab: React.FC<DeliveryMethodManagerTabProps> = ({
    items,
    favoriteItems,
    renderItem,
    onDeleteMultiple,
    itemTypeName,
    favoriteItemTypeName,
    isLoading
}) => {
    if (isLoading) {
        return <p>Loading {itemTypeName.toLowerCase()}...</p>;
    }

    // These wrapper functions add a unique prefix to the 'key'
    // --- REFACTOR: Update type in function signature ---
    const renderFavoriteItem = (item: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => {
        const element = renderItem(item, isSelected, onToggleSelect) as React.ReactElement;
        // --- THIS IS THE FIX ---
        // We use objectID, which is guaranteed to be on the Algolia object
        return React.cloneElement(element, { key: `fav-${(item as any).objectID}` });
    };

    // --- REFACTOR: Update type in function signature ---
    const renderFullItem = (item: DeliveryContainer, isSelected: boolean, onToggleSelect: () => void) => {
        const element = renderItem(item, isSelected, onToggleSelect) as React.ReactElement;
        // --- THIS IS THE FIX ---
        // We use objectID, which is guaranteed to be on the Algolia object
        return React.cloneElement(element, { key: `all-${(item as any).objectID}` });
    };


    return (
        <div>
            {favoriteItems.length > 0 && (
                <div style={styles.rewardsListContainer}>
                    <h3 style={{...styles.h3, marginTop: '2rem'}}>
                        {favoriteItemTypeName || `Favorite ${itemTypeName}`}
                    </h3>
                    <PaginatedList
                        items={favoriteItems}
                        renderItem={renderFavoriteItem} // Use the wrapper
                        bulkActions={[{
                            label: 'Delete Selected',
                            onAction: (selectedItems) => onDeleteMultiple(selectedItems.map(item => item.id))
                        }]}
                        listContainerComponent="ul"
                        listContainerStyle={styles.rewardsListFull}
                    />
                </div>
            )}

            <div style={styles.rewardsListContainer}>
                <h3 style={{...styles.h3, marginTop: '2T2rem'}}>All {itemTypeName}</h3>
                {items.length > 0 ? (
                    <PaginatedList
                        items={items}
                        renderItem={renderFullItem} // Use the wrapper
                        bulkActions={[{
                            label: 'Delete Selected',
                            onAction: (selectedItems) => onDeleteMultiple(selectedItems.map(item => item.id))
                        }]}
                        listContainerComponent="ul"
                        listContainerStyle={styles.rewardsListFull}
                    />
                ) : (
                    <p>No {itemTypeName.toLowerCase()} found.</p>
                )}
            </div>
        </div>
    );
};
