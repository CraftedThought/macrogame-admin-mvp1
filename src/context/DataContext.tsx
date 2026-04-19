/* src/context/DataContext.tsx */

import { createContext, useEffect, ReactNode, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';
import toast from 'react-hot-toast';
import { ConfirmationToast } from '../components/ui/ConfirmationToast';
import { notifications } from '../utils/notifications';
import { db, storage } from '../firebase/config';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  updateDoc,
  deleteDoc,
  DocumentData,
  setDoc,
  writeBatch,
  getDocs,
  where,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
// --- REFACTOR: Import DeliveryContainer instead of Popup ---
import {
  Macrogame,
  Microgame,
  DeliveryContainer,
  MicrogameLibraryItem,
  ConversionMethod,
  CustomMicrogame,
  Campaign,
  ConversionScreen,
  EntityStatus,
} from '../types';
// Note: We no longer need hasMacrogameIssues here, as the server handles status
import { seedMicrogames } from '../scripts/seedDatabase';
import { useStore } from '../store/useStore';
import { generateUUID, ensureUniqueName } from '../utils/helpers'; // Import helpers
import { MICROGAME_CATALOG } from '../microgames/catalog';

// --- REFACTOR: Update interface with new types and return values ---
export interface DataContextType {
  user: User | null;

  // Campaign Functions
  createCampaign: (
    newCampaign: Omit<Campaign, 'id' | 'status'>,
  ) => Promise<Campaign | undefined>;
  updateCampaign: (
    campaignId: string,
    dataToUpdate: Partial<Campaign>,
  ) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<boolean>;
  deleteMultipleCampaigns: (ids: string[]) => Promise<void>;
  duplicateCampaign: (
    campaignToDuplicate: Campaign,
  ) => Promise<Campaign | undefined>;
  duplicateCustomMicrogame: (variant: CustomMicrogame) => Promise<void>;

  // Macrogame Functions
  createMacrogame: (
    newMacrogame: Omit<Macrogame, 'id' | 'type' | 'status'>,
  ) => Promise<Macrogame | undefined>;
  updateMacrogame: (
    updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null },
  ) => Promise<void>;
  deleteMacrogame: (id: string) => Promise<boolean>;
  deleteMultipleMacrogames: (ids: string[]) => Promise<void>;
  duplicateMacrogame: (
    gameToDuplicate: Macrogame,
  ) => Promise<Macrogame | undefined>;
  toggleMacrogameFavorite: (
    macrogameId: string,
    isFavorite: boolean,
  ) => Promise<void>;

  // Delivery Container Functions
  createDeliveryContainer: (
    newContainer: Omit<DeliveryContainer, 'id' | 'status'>,
  ) => Promise<DeliveryContainer | undefined>;
  deleteDeliveryContainer: (id: string) => Promise<boolean>;
  deleteMultipleDeliveryContainers: (ids: string[]) => Promise<void>;
  updateDeliveryContainer: (
    containerId: string,
    dataToUpdate: Partial<DeliveryContainer>,
  ) => Promise<void>;
  duplicateDeliveryContainer: (
    containerToDuplicate: DeliveryContainer,
  ) => Promise<DeliveryContainer | undefined>;
  toggleDeliveryContainerFavorite: (
    containerId: string,
    isFavorite: boolean,
  ) => Promise<void>;

  // Microgame Functions
  allMicrogames: Microgame[]; // <-- Ensure this is exposed
  customMicrogames: CustomMicrogame[]; // <-- Ensure this is exposed
  saveCustomMicrogame: (
    baseGame: Microgame,
    variantName: string,
    skinFiles: { [key: string]: File },
    skinMetadata: { [key: string]: { width?: number; height?: number } },
    existingVariant?: CustomMicrogame,
    mechanics?: { [key: string]: any },
    rules?: {
        enablePoints: boolean;
        showScore: boolean;
        scores: { [eventId: string]: number };
        winCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
        lossCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
    },
    extraMetadata?: {
        description?: string;
        sectors?: string[];
        categories?: string[];
        subcategories?: string[];
        seasonality?: string[];
        targetAudience?: string[];
        promotionCompatibility?: string[];
    }
  ) => Promise<void>;
  toggleMicrogameFavorite: (
    gameId: string,
    isFavorite: boolean,
  ) => Promise<void>;
  deleteCustomMicrogame: (variantId: string) => Promise<boolean>;
  deleteMultipleCustomMicrogames: (ids: string[]) => Promise<boolean>;
  duplicateCustomMicrogame: (variant: CustomMicrogame) => Promise<void>;
  
  // --- NEW: Library Management ---
  installMicrogame: (gameId: string) => Promise<void>;
  uninstallMicrogame: (gameId: string) => Promise<void>;

  // Conversion Method Functions
  createConversionMethod: (
    newMethod: Omit<ConversionMethod, 'id' | 'status'>,
  ) => Promise<ConversionMethod | undefined>;
  updateConversionMethod: (
    methodId: string,
    updatedMethod: Partial<Omit<ConversionMethod, 'id'>>,
  ) => Promise<void>;
  deleteConversionMethod: (methodId: string) => Promise<boolean>;
  deleteMultipleConversionMethods: (ids: string[]) => Promise<void>;
  duplicateConversionMethod: (
    methodToDuplicate: ConversionMethod,
  ) => Promise<ConversionMethod | undefined>;

  // Conversion Screen Functions
  createConversionScreen: (
    newScreen: Omit<ConversionScreen, 'id' | 'status'>,
  ) => Promise<ConversionScreen | undefined>;
  updateConversionScreen: (
    screenId: string,
    updatedScreen: Partial<Omit<ConversionScreen, 'id'>>,
  ) => Promise<void>;
  deleteConversionScreen: (screenId: string) => Promise<boolean>;
  deleteMultipleConversionScreens: (ids: string[]) => Promise<boolean>;
  duplicateConversionScreen: (
    screenToDuplicate: ConversionScreen,
  ) => Promise<ConversionScreen | undefined>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // State is now managed by Zustand, but we get access to the state and setState action here.
  // --- REFACTOR: Use deliveryContainers instead of popups ---
  const [user, setUser] = useState<User | null>(null);
  const {
    setState,
    macrogames,
    deliveryContainers,
    campaigns,
    allMicrogames,
    allConversionMethods,
    allConversionScreens,
    customMicrogames,
  } = useStore();

  useEffect(() => {
    // Listen for authentication changes
    const unsubscribe = onAuthChange((firebaseUser) => {
        setUser(firebaseUser); // Set the user (or null if logged out)

        if (firebaseUser) {
            // User is logging IN. Set loading to true.
            // The data-fetching effect will set it to false when done.
            setState({ isDataLoading: true });
        } else {
            // User is logging OUT, or it's the initial auth check (null).
            // Stop loading and clear all data.
            setState({ 
                isDataLoading: false, // <-- THIS IS THE FIX
                macrogames: [], 
                deliveryContainers: [], 
                campaigns: [],
                allConversionMethods: [],
                allConversionScreens: [],
                allMicrogames: [],
                customMicrogames: [],
            });
        }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setState]);


  const confirmAction = (
    message: string,
    onConfirm?: () => void | Promise<void>,
  ): Promise<boolean> => {
    let isResolved = false;
    return new Promise((resolve) => {
      const toastId = `confirm-${generateUUID()}`;
      toast.custom(
        (t) => (
          <ConfirmationToast
            t={t}
            message={message}
            onConfirm={async () => {
              if (isResolved) return;
              isResolved = true;
              toast.dismiss(t.id);
              if (onConfirm) {
                  try { await onConfirm(); } catch (e) { console.error(e); }
              }
              resolve(true);
            }}
          />
        ),
        {
          duration: Infinity, // Prevents auto-dismiss
          position: 'top-center',
          id: toastId,
          onDismiss: () => {
            if (isResolved) return;
            isResolved = true;
            resolve(false);
          },
        },
      );
    });
  };

  useEffect(() => {
    // An array to hold all our listener unsubscribe functions
    const unsubscribers: (() => void)[] = [];

    // Only attach listeners if we have an authenticated user
    if (user) {
    (window as any).seedMicrogames = seedMicrogames;

    // --- FIX: Implement correct data loading flag ---
    let initialLoadComplete = false;
    let loadCount = 0;
    // We listen to 6 main collections for the initial load
    const totalCollections = 6;

    const handleLoad = () => {
      loadCount++;
      if (loadCount === totalCollections && !initialLoadComplete && user) {
        initialLoadComplete = true;
        setState({ isDataLoading: false });
        console.log('All initial data loaded.');
      }
    };
    // --- End Fix ---

    // --- THIS IS THE FIX ---
    // We create the listener first, then push it.
    // This is syntactically simpler for Vite's scanner.
    
    const unsubMacrogames = onSnapshot(
      query(collection(db, 'macrogames')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...(doc.data() as Omit<Macrogame, 'id'>), id: doc.id }),
        );
        setState({ macrogames: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching macrogames:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubMacrogames);


    // --- REFACTOR: Listen to deliveryContainers ---
    const unsubDeliveryContainers = onSnapshot(
      query(collection(db, 'deliveryContainers')),
      (snap) => {
        const data = snap.docs.map(
          (doc) =>
            ({
              ...(doc.data() as Omit<DeliveryContainer, 'id'>),
              id: doc.id,
            } as DeliveryContainer),
        );
        setState({ deliveryContainers: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching delivery containers:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubDeliveryContainers);


    const unsubCampaigns = onSnapshot(
      query(collection(db, 'campaigns')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...(doc.data() as Omit<Campaign, 'id'>), id: doc.id }),
        );
        setState({ campaigns: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching campaigns:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubCampaigns);


    const unsubConversionMethods = onSnapshot(
      query(collection(db, 'conversionMethods')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as ConversionMethod),
        );
        setState({ allConversionMethods: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching conversion methods:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubConversionMethods);


    const unsubConversionScreens = onSnapshot(
      query(collection(db, 'conversionScreens')),
      (snap) => {
        const data = snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as ConversionScreen),
        );
        setState({ allConversionScreens: data });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching conversion screens:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubConversionScreens);


    // --- HYDRATION LOGIC: Merge Library (DB) with Catalog (Code) ---
    const unsubMicrogames = onSnapshot(
      query(collection(db, 'microgames')),
      (snap) => {
        const hydratedGames: Microgame[] = [];

        snap.docs.forEach((docSnap) => {
          const libItem = docSnap.data() as MicrogameLibraryItem;
          // The doc ID should match the Catalog ID (e.g., "DiceRoll")
          const gameId = docSnap.id; 
          
          const catalogItem = MICROGAME_CATALOG[gameId];

          if (catalogItem) {
            // MERGE: Catalog Data + Library Data
            hydratedGames.push({
              ...catalogItem,     // Static data (controls, events, etc.)
              ...libItem,         // User data (installedAt, favorites)
              id: gameId,         // Ensure ID is consistent
              isActive: true      // Default to active
            });
          } else {
             // Optional: Handle orphaned library items if a game is removed from catalog
             console.warn(`Library item "${gameId}" not found in catalog.`);
          }
        });

        setState({ allMicrogames: hydratedGames });
        handleLoad();
      },
      (error) => {
        console.error('Error fetching microgames:', error);
        handleLoad();
      },
    );
    unsubscribers.push(unsubMicrogames);


    const unsubCustomMicrogames = onSnapshot(
      query(collection(db, 'customMicrogames')),
      (snap) => {
        const data = snap.docs.map(
          (doc) =>
            ({
              ...(doc.data() as Omit<CustomMicrogame, 'id'>),
              id: doc.id,
            } as CustomMicrogame),
        );
        setState({ customMicrogames: data });
        // This collection is not part of the initial "all loaded"
        // count because it's not critical for startup.
      },
      (error) => console.error('Error fetching custom microgames:', error),
    );
    unsubscribers.push(unsubCustomMicrogames);

  } // <-- This brace closes the 'if (user)' block

    // --- REMOVED: isDataLoading: false was here, which was a bug ---

    // When the effect cleans up (due to user logout or unmount),
    // call all the unsubscribe functions.
    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [setState, user]);

  // --- REFACTORED ---
  // The complex useEffect for auto-pausing campaigns [lines 104-127 in original]
  // has been REMOVED. This logic is now handled server-side by the
  // `onContainerWritten` and `onMacrogameWritten` Cloud Functions.

  // --- Campaign Functions ---
  const createCampaign = async (
    newCampaign: Omit<Campaign, 'id' | 'status'>,
  ): Promise<Campaign | undefined> => {
    // --- REFACTOR: Add denormalized containerIdList ---
    const containerIdList = (newCampaign.displayRules || []).flatMap((r: any) =>
      (r.containers || []).map((c: any) => c.containerId),
    );
    const uniqueContainerIds = [...new Set(containerIdList)];
    const newId = generateUUID();

    const dataToSave: Campaign = {
        ...newCampaign,
        id: newId,
        containerIdList: uniqueContainerIds,
        // Use the string status passed from the form (e.g., 'Draft'),
        // not an EntityStatus object.
        status: newCampaign.status || 'Draft',
    };

    await setDoc(doc(db, 'campaigns', newId), dataToSave);

    // This part is still needed to link containers to the campaign
    const batch = writeBatch(db);
    newCampaign.displayRules.forEach((rule) => {
      // --- REFACTOR: Loop over 'containers' ---
      rule.containers.forEach((c) => {
        const containerRef = doc(db, 'deliveryContainers', c.containerId);
        batch.update(containerRef, { campaignId: newId });
      });
    });
    await batch.commit();
    return dataToSave;
  };

  const updateCampaign = async (
    campaignId: string,
    dataToUpdate: Partial<Campaign>,
  ) => {
    const campaignRef = doc(db, 'campaigns', campaignId);

    // --- REFACTOR: Add denormalized containerIdList if rules are changing ---
    if (dataToUpdate.displayRules) {
      const containerIdList = (dataToUpdate.displayRules || []).flatMap(
        (r: any) => (r.containers || []).map((c: any) => c.containerId),
      );
      dataToUpdate.containerIdList = [...new Set(containerIdList)];
    }
    // --- End New ---

    // --- REFACTOR: This logic must be updated to use 'deliveryContainers' ---
    const oldContainersQuery = query(
      collection(db, 'deliveryContainers'),
      where('campaignId', '==', campaignId),
    );
    const oldContainersSnap = await getDocs(oldContainersQuery);
    const newContainerIds = new Set(
      dataToUpdate.displayRules?.flatMap((rule) =>
        rule.containers.map((c) => c.containerId),
      ) || [],
    );
    const batch = writeBatch(db);
    oldContainersSnap.forEach((containerDoc) => {
      if (!newContainerIds.has(containerDoc.id)) {
        batch.update(containerDoc.ref, { campaignId: null });
      }
    });
    newContainerIds.forEach((containerId) => {
      const containerRef = doc(db, 'deliveryContainers', containerId);
      batch.update(containerRef, { campaignId: campaignId });
    });
    batch.update(campaignRef, dataToUpdate);
    await batch.commit();
  };
  // --- REFACTORED: Removed updateCampaignStatus function ---

  const deleteCampaign = async (campaignId: string): Promise<boolean> => {
    // --- REFACTORED ---
    // The `onCampaignDeleted` server function now handles
    // unlinking all delivery containers.
    const wasConfirmed = await confirmAction(
      'Delete campaign? Containers inside will become unassigned.',
      async () => {
        try {
          await deleteDoc(doc(db, 'campaigns', campaignId));
        } catch (error) {
          console.error('Error deleting campaign:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleCampaigns = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} campaigns?`,
      async () => {
        try {
          const batch = writeBatch(db);
          // Server-side triggers will handle unlinking containers
          ids.forEach((id) => batch.delete(doc(db, 'campaigns', id)));
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete campaigns:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const duplicateCampaign = async (
    campaignToDuplicate: Campaign,
  ): Promise<Campaign | undefined> => {
    // --- FIX: Lookup clean object ---
    const targetId = campaignToDuplicate.id || (campaignToDuplicate as any).objectID;
    const fullCampaign = campaigns.find(c => c.id === targetId) || campaignToDuplicate;

    const { id, name, ...rest } = fullCampaign;
    // Sanitize
    const { objectID, _highlightResult, ...cleanRest } = rest as any;

    const existingNames = new Set(campaigns.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    
    const newData = {
      ...cleanRest,
      name: newName,
      createdAt: new Date().toISOString(),
      status: 'Draft' as const,
    };
    // Create function will handle denormalization and return the new doc
    return await createCampaign(newData);
  };

  // --- Macrogame Functions ---
  const createMacrogame = async (
    gameData: Omit<Macrogame, 'id' | 'type' | 'status'>,
  ): Promise<Macrogame | undefined> => {
    const newId = generateUUID();
    // --- NEW: Add denormalized lists ---
    const variantIdList = (gameData.flow || [])
      .map((f: any) => f.variantId)
      .filter(Boolean);
    const flowMicrogameIds = (gameData.flow || []).map((f: any) => f.microgameId);
    const dataToSave: Macrogame = {
      ...gameData,
      id: newId,
      variantIdList: variantIdList as string[],
      flowMicrogameIds,
      status: { code: 'ok', message: '' }, // Initialize status
    };
    // --- End New ---

    await setDoc(doc(db, 'macrogames', newId), dataToSave);

    // Return the final data (with the new ID) so the UI can update optimistically
    return dataToSave;
  };

  const updateMacrogame = async (
    updatedMacrogame: Omit<Macrogame, 'id' | 'type'> & { id: string | null },
  ) => {
    if (!updatedMacrogame.id) return;
    const { id, ...gameData } = updatedMacrogame;

    // --- NEW: Add denormalized lists ---
    const variantIdList = (gameData.flow || [])
      .map((f: any) => f.variantId)
      .filter(Boolean);
    const flowMicrogameIds = (gameData.flow || []).map((f: any) => f.microgameId);
    const dataToUpdate = {
      ...gameData,
      variantIdList,
      flowMicrogameIds,
    };
    // --- End New ---

    await updateDoc(doc(db, 'macrogames', id), dataToUpdate as DocumentData);
  };

  const deleteMacrogame = async (id: string): Promise<boolean> => {
    // --- REFACTORED: Use confirmAction toast instead of window.confirm ---
    const wasConfirmed = await confirmAction(
      'Delete macrogame? It will be unlinked from any containers.',
      async () => {
        try {
          // --- REFACTORED ---
          // The `onMacrogameDeleted` server function will handle
          // unlinking all delivery containers.
          await deleteDoc(doc(db, 'macrogames', id));
        } catch (error) {
          console.error('Failed to delete macrogame:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleMacrogames = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} macrogames? This cannot be undone.`,
      async () => {
        try {
          const batch = writeBatch(db);
          // Server-side triggers will handle cleanup for each deletion
          ids.forEach((id) => batch.delete(doc(db, 'macrogames', id)));
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete macrogames:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const duplicateMacrogame = async (
    gameToDuplicate: Macrogame,
  ): Promise<Macrogame | undefined> => {
    // --- FIX: Resolve ID from either Local (id) or Algolia (objectID) ---
    const targetId = gameToDuplicate.id || (gameToDuplicate as any).objectID;

    // 1. Get the FULL, complete macrogame object from the main state
    const fullGame = macrogames.find(
      (m) => m.id === targetId,
    );

    // 2. If we can't find it (which should be rare), stop.
    if (!fullGame) {
      notifications.error('Could not find original macrogame to duplicate.');
      return;
    }

    // 3. Now, we duplicate the FULL object.
    const { id, name, ...restOfGame } = fullGame;

    // 4. Generate the new unique name
    const existingNames = new Set(macrogames.map((m) => m.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);

    // 5. Create the new game data
    const newGameData = {
      ...restOfGame,
      name: newName,
      createdAt: new Date().toISOString(),
      isFavorite: false, // Don't duplicate favorite status
    };

    // 6. Call createMacrogame
    return await createMacrogame(
      newGameData as Omit<Macrogame, 'id' | 'type' | 'status'>,
    );
  };

  const toggleMacrogameFavorite = async (
    macrogameId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'macrogames', macrogameId), { isFavorite });
  };

  // --- REFACTOR: Popup Functions -> Delivery Container Functions ---
  const createDeliveryContainer = async (
    newContainer: Omit<DeliveryContainer, 'id'>,
  ): Promise<DeliveryContainer | undefined> => {
    const newId = generateUUID();
    const dataToSave: DeliveryContainer = {
      ...newContainer,
      id: newId,
      // Use the status passed in from the caller (e.g., 'error' from deploy, 'ok' from manual create)
      status: newContainer.status || { code: 'ok', message: '' },
    };
    await setDoc(doc(db, 'deliveryContainers', newId), dataToSave);
    return dataToSave;
  };

  const deleteDeliveryContainer = async (id: string): Promise<boolean> => {
    const wasConfirmed = await confirmAction(
      'Delete this container?',
      async () => {
        try {
          // `onContainerDeleted` server function will handle campaign cleanup
          await deleteDoc(doc(db, 'deliveryContainers', id));
        } catch (error) {
          console.error('Failed to delete container:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleDeliveryContainers = async (ids: string[]) => {
    if (ids.length === 0) return;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} containers?`,
      async () => {
        try {
          const batch = writeBatch(db);
          // `onContainerDeleted` server function will handle campaign cleanup for each
          ids.forEach((id) =>
            batch.delete(doc(db, 'deliveryContainers', id)),
          );
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete containers:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const updateDeliveryContainer = async (
    containerId: string,
    dataToUpdate: Partial<DeliveryContainer>,
  ) => {
    await updateDoc(doc(db, 'deliveryContainers', containerId), dataToUpdate);
  };

  const duplicateDeliveryContainer = async (
    containerToDuplicate: DeliveryContainer,
  ): Promise<DeliveryContainer | undefined> => {
    // --- FIX: Lookup the clean object from state first ---
    const targetId = containerToDuplicate.id || (containerToDuplicate as any).objectID;
    const fullContainer = deliveryContainers.find(c => c.id === targetId) || containerToDuplicate;

    const { id, name, ...restOfContainer } = fullContainer;
    
    // Sanitize: Remove Algolia-specific fields if they slipped through
    const { objectID, _highlightResult, ...cleanRest } = restOfContainer as any;

    const existingNames = new Set(deliveryContainers.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    
    const newContainerData = {
      ...cleanRest,
      name: newName,
      // Keep existing config
      deliveryMethod: fullContainer.deliveryMethod, 
      createdAt: new Date().toISOString(),
      views: 0,
      engagements: 0,
      status: 'Draft' as const, 
      campaignId: null, 
      isFavorite: false, 
    };
    
    return await createDeliveryContainer(
      newContainerData as Omit<DeliveryContainer, 'id' | 'status'>,
    );
  };

  const toggleDeliveryContainerFavorite = async (
    containerId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'deliveryContainers', containerId), { isFavorite });
  };

  // --- Microgame Functions ---
  const installMicrogame = async (gameId: string) => {
    const catalogItem = MICROGAME_CATALOG[gameId];
    if (!catalogItem) {
        notifications.error("Cannot install: Game not found in catalog.");
        return;
    }

    const libItem: MicrogameLibraryItem = {
        id: gameId,
        installedAt: new Date().toISOString(),
        isFavorite: false,
        isActive: true
    };

    // We use setDoc with the ID to prevent duplicates (idempotent)
    await setDoc(doc(db, 'microgames', gameId), libItem);
    notifications.success(`${catalogItem.name} added to library.`);
  };

  const uninstallMicrogame = async (gameId: string) => {
      // Future: Check if any macrogames rely on this base game before deleting?
      await deleteDoc(doc(db, 'microgames', gameId));
      notifications.success("Removed from library.");
  };

  const toggleMicrogameFavorite = async (
    gameId: string,
    isFavorite: boolean,
  ) => {
    await updateDoc(doc(db, 'microgames', gameId), { isFavorite });
  };

  const saveCustomMicrogame = async (
    baseGame: Microgame,
    variantName: string,
    skinFiles: { [key: string]: File },
    skinMetadata: { [key: string]: { width?: number; height?: number } },
    existingVariant?: CustomMicrogame,
    mechanics?: { [key: string]: any },
    rules?: {
        enablePoints: boolean;
        showScore: boolean;
        scores: { [eventId: string]: number };
        winCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
        lossCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
    },
    extraMetadata?: {
        productCategory?: string;
        productSubcategory?: string;
        seasonality?: string[];
        targetAudience?: string[];
        promotionCompatibility?: string[];
    }
  ) => {
    const variantId =
      existingVariant?.id || doc(collection(db, 'customMicrogames')).id;
      
    // Initialize with existing data
    const skinData: { [key: string]: { url: string; fileName: string; width?: number; height?: number } } =
      existingVariant ? { ...existingVariant.skinData } : {};

    // --- OPTIMIZATION: Deduplicate File Uploads ---
    // 1. Map unique files to the keys that use them
    const uniqueFiles = new Map<File, string[]>(); 
    
    for (const key in skinFiles) {
        const file = skinFiles[key];
        if (file) {
            if (!uniqueFiles.has(file)) {
                uniqueFiles.set(file, []);
            }
            uniqueFiles.get(file)?.push(key);
        }
    }

    // 2. Upload each unique file ONCE
    const uploadPromises = Array.from(uniqueFiles.entries()).map(async ([file, keys]) => {
        const storageRef = ref(
            storage,
            `microgame-skins/${variantId}/${file.name}`,
        );
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // 3. Assign the URL to all keys that used this file
        keys.forEach(key => {
            const meta = skinMetadata[key] || {}; // Safety fallback
            
            // Start with base object (safe for all types)
            const baseObj: any = {
                url: downloadURL, 
                fileName: file.name,
                
                // MERGE metadata to preserve Volume, Triggers, Name, etc.
                ...meta,
                
                // Sanitize common props (prevent undefined)
                volume: meta.volume ?? null,
                triggerEvents: meta.triggerEvents ?? null,
                color: meta.color ?? null,
                name: meta.name ?? null
            };

            // FIX: Only assign visual props if they exist (prevents undefined crash for Audio)
            if (meta.width !== undefined) {
                baseObj.width = meta.width;
            } else {
                baseObj.width = null; // Explicit null if missing
            }

            if (meta.height !== undefined) {
                baseObj.height = meta.height;
            } else {
                baseObj.height = null; // Explicit null if missing
            }

            if (meta.hitboxScale !== undefined) {
                baseObj.hitboxScale = Number(meta.hitboxScale);
            } else {
                baseObj.hitboxScale = 1;
            }

            skinData[key] = baseObj;

            // Cleanup: Remove null keys to keep DB clean
            Object.keys(skinData[key]).forEach(prop => {
                if ((skinData[key] as any)[prop] === null) {
                    delete (skinData[key] as any)[prop];
                }
            });
        });
    });

    await Promise.all(uploadPromises);
    // ---------------------------------------------
    
    // 4. Process Metadata-Only Updates (Colors, Volume, Presets)
    for (const key in skinMetadata) {
        const uploadedData = skinData[key]; 
        const meta = skinMetadata[key];

        if (uploadedData) {
            // Case A: Entry exists. Merge new metadata.
            skinData[key] = {
                ...uploadedData,
                // FIX: Add '?? null' to the very end to catch cases where BOTH are undefined
                width: meta.width ?? uploadedData.width ?? null,
                height: meta.height ?? uploadedData.height ?? null,
                hitboxScale: meta.hitboxScale !== undefined ? Number(meta.hitboxScale) : (uploadedData.hitboxScale ?? 1),
                
                color: meta.color ?? (uploadedData as any).color ?? null,
                volume: meta.volume ?? (uploadedData as any).volume ?? null,
                triggerEvents: meta.triggerEvents ?? (uploadedData as any).triggerEvents ?? null,
                name: meta.name ?? (uploadedData as any).name ?? null,
                
                url: (!skinFiles[key] && (meta as any).url) ? (meta as any).url : uploadedData.url
            } as any;
        } else {
            // Case B: Entry does NOT exist (New item, no file upload).
            skinData[key] = {
                fileName: 'preset', 
                url: (meta as any).url || "",
                width: meta.width ?? null,
                height: meta.height ?? null,
                hitboxScale: meta.hitboxScale !== undefined ? Number(meta.hitboxScale) : 1,
                color: meta.color ?? null,
                volume: meta.volume ?? null,
                triggerEvents: meta.triggerEvents ?? null,
                name: meta.name ?? null
            } as any;
        }

        // Final Cleanup for this key
        Object.keys(skinData[key]).forEach(prop => {
            if ((skinData[key] as any)[prop] === undefined) {
                // Double safety: If undefined somehow crept in, delete it
                delete (skinData[key] as any)[prop];
            }
        });
    }

    const variantData: Omit<CustomMicrogame, 'id'> = {
      name: variantName,
      baseMicrogameId: baseGame.id,
      baseMicrogameName: baseGame.name,
      createdAt:
        existingVariant?.createdAt || new Date().toISOString(),
      skinData,
      mechanics: mechanics || existingVariant?.mechanics || {},
      rules: rules || existingVariant?.rules || {},
      
      // --- Save the Taxonomy Metadata ---
      description: extraMetadata?.description || existingVariant?.description || '',
      sectors: extraMetadata?.sectors || existingVariant?.sectors || [],
      categories: extraMetadata?.categories || existingVariant?.categories || [],
      subcategories: extraMetadata?.subcategories || existingVariant?.subcategories || [],
      seasonality: extraMetadata?.seasonality || existingVariant?.seasonality || [],
      targetAudience: extraMetadata?.targetAudience || existingVariant?.targetAudience || [],
      promotionCompatibility: extraMetadata?.promotionCompatibility || existingVariant?.promotionCompatibility || [],
    };
    
    await setDoc(doc(db, 'customMicrogames', variantId), variantData);
  };

  const duplicateCustomMicrogame = async (variant: CustomMicrogame): Promise<void> => {
    // 1. Setup new ID and Name
    const newId = generateUUID();
    const existingNames = new Set(customMicrogames.map((c) => c.name));
    const newName = ensureUniqueName(`Copy of ${variant.name}`, existingNames);

    // 2. Prepare to copy skin assets
    const newSkinData = { ...variant.skinData };
    
    // 3. Perform the copy operation
    const copyPromises = Object.entries(variant.skinData).map(async ([key, fileData]) => {
        try {
            // PROACTIVE FIX: Only attempt to fetch and upload if it's an actual uploaded file
            if (fileData.url && fileData.fileName && fileData.fileName !== 'preset' && fileData.fileName !== 'preview') {
                // Fetch the original image/audio as a Blob
                const response = await fetch(fileData.url);
                const blob = await response.blob();
                
                // Upload to the NEW path
                const storageRef = ref(storage, `microgame-skins/${newId}/${fileData.fileName}`);
                await uploadBytes(storageRef, blob);
                const newUrl = await getDownloadURL(storageRef);
                
                // CRITICAL FIX: Spread the old fileData to preserve name, width, height, hitbox, color, volume, triggers!
                newSkinData[key] = { 
                    ...fileData,
                    url: newUrl, 
                    fileName: fileData.fileName 
                };
            } else {
                // If it's just a color override, empty string, or preset, just carry it over exactly as is.
                newSkinData[key] = { ...fileData };
            }
        } catch (e) {
            console.error(`Failed to copy asset ${key}:`, e);
            // Fallback: Keep the old data intact if copy fails (prevents breaking)
            newSkinData[key] = { ...fileData };
        }
    });

    await Promise.all(copyPromises);

    // 4. Save the new document
    // (Mechanics, rules, and taxonomy metadata are safely carried over via ...variant)
    const newVariant: CustomMicrogame = {
        ...variant,
        id: newId,
        name: newName,
        createdAt: new Date().toISOString(),
        skinData: newSkinData
    };

    await setDoc(doc(db, 'customMicrogames', newId), newVariant);
  };

  const deleteCustomMicrogame = async (variantId: string): Promise<boolean> => {
    const wasConfirmed = await confirmAction(
      'Delete variant? It will be removed from all macrogames.',
      async () => {
        try {
          await deleteDoc(doc(db, 'customMicrogames', variantId));

          // Still need to delete files from storage on the client
          const storageFolderRef = ref(storage, `microgame-skins/${variantId}`);
          const files = await listAll(storageFolderRef);
          await Promise.all(files.items.map((fileRef) => deleteObject(fileRef)));
          
          notifications.success('Variant deleted');
        } catch (error) {
          notifications.error('Failed to delete variant.');
          console.error('Error deleting variant:', error);
        }
      },
    );
    return wasConfirmed;
  };

  const deleteMultipleCustomMicrogames = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;
    const wasConfirmed = await confirmAction(
      `Delete ${ids.length} variants? They will be removed from all macrogames.`,
      async () => {
        try {
          const batch = writeBatch(db);
          const storagePromises: Promise<void>[] = [];

          for (const id of ids) {
            batch.delete(doc(db, 'customMicrogames', id));
            const storageFolderRef = ref(storage, `microgame-skins/${id}`);
            // Catch errors silently here just in case a variant has no images in storage
            storagePromises.push(
              listAll(storageFolderRef)
                .then(files => Promise.all(files.items.map(fileRef => deleteObject(fileRef))))
                .catch(e => console.warn(`Could not clear storage for ${id}:`, e))
            );
          }
          
          await batch.commit();
          await Promise.all(storagePromises);
          notifications.success(`Deleted ${ids.length} variants.`);
        } catch (error) {
          notifications.error('Failed to delete variants.');
          console.error("Error deleting multiple variants:", error);
        }
      },
    );
    return wasConfirmed;
  };

  // --- Conversion Method Functions ---
  const createConversionMethod = async (
    newMethod: Omit<ConversionMethod, 'id' | 'status'>,
  ): Promise<ConversionMethod | undefined> => {
    const newId = generateUUID();
    const dataToSave: ConversionMethod = {
      ...newMethod,
      id: newId,
      status: { code: 'ok', message: '' }, // Initialize status
    };
    await setDoc(doc(db, 'conversionMethods', newId), dataToSave);
    return dataToSave;
  };
  const updateConversionMethod = async (
    methodId: string,
    updatedMethod: Partial<Omit<ConversionMethod, 'id'>>,
  ) => {
    await updateDoc(doc(db, 'conversionMethods', methodId), updatedMethod);
  };
  const deleteConversionMethod = async (methodId: string): Promise<boolean> => {
    const isInUse = allConversionScreens.some(screen => 
        screen.methodIdList?.includes(methodId) || 
        screen.methods?.some((m: any) => m.methodId === methodId)
    );

    if (isInUse) {
        const step1 = await confirmAction('⚠️ WARNING: This conversion method is actively being used in one or more Conversion Screens. Deleting it will temporarily break those screens. Are you sure you want to continue?');
        if (!step1) return false;
        
        const step2 = await confirmAction('🛑 FINAL CONFIRMATION: Please confirm again. This action will temporarily break one or more active Conversion Screens causing the Macrogames using them to freeze until their Conversion Screens are resolved.');
        if (!step2) return false;
    } else {
        const step1 = await confirmAction('Delete method? It will be permanently removed.');
        if (!step1) return false;
    }

    try {
        await deleteDoc(doc(db, 'conversionMethods', methodId));
        return true;
    } catch (error) {
        console.error("Error deleting conversion method:", error);
        return false;
    }
  };

  const deleteMultipleConversionMethods = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;

    const inUseCount = ids.filter(id => 
        allConversionScreens.some(screen => 
            screen.methodIdList?.includes(id) || 
            screen.methods?.some((m: any) => m.methodId === id)
        )
    ).length;

    if (inUseCount > 0) {
        const step1 = await confirmAction(`⚠️ WARNING: ${inUseCount} of these methods are actively being used in Conversion Screens. Deleting them will break those screens. Are you sure you want to continue?`);
        if (!step1) return false;
        
        const step2 = await confirmAction('🛑 FINAL CONFIRMATION: Please confirm again. This action will PERMANENTLY break active Conversion Screens and cannot be undone.');
        if (!step2) return false;
    } else {
        const step1 = await confirmAction(`Delete ${ids.length} methods? They will be permanently removed.`);
        if (!step1) return false;
    }

    try {
        const batch = writeBatch(db);
        ids.forEach((id) => batch.delete(doc(db, 'conversionMethods', id)));
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting multiple methods:", error);
        return false;
    }
  };

  const deleteConversionScreen = async (screenId: string): Promise<boolean> => {
    const isInUse = macrogames.some(m => m.conversionScreenId === screenId);

    if (isInUse) {
        const step1 = await confirmAction('⚠️ WARNING: This Conversion Screen is actively being used in one or more Macrogames. Deleting it will break those Macrogames. Are you sure you want to continue?');
        if (!step1) return false;
        
        const step2 = await confirmAction('🛑 FINAL CONFIRMATION: Please confirm again. This action will PERMANENTLY break active Macrogames and cannot be undone.');
        if (!step2) return false;
    } else {
        const step1 = await confirmAction('Delete screen? It will be unlinked from all macrogames.');
        if (!step1) return false;
    }

    try {
        await deleteDoc(doc(db, 'conversionScreens', screenId));
        return true;
    } catch (error) {
        console.error("Error deleting conversion screen:", error);
        return false;
    }
  };

  const deleteMultipleConversionScreens = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;

    const inUseCount = ids.filter(id => macrogames.some(m => m.conversionScreenId === id)).length;

    if (inUseCount > 0) {
        const step1 = await confirmAction(`⚠️ WARNING: ${inUseCount} of these screens are actively being used in Macrogames. Deleting them will break every Macrogame that is using them. Are you sure you want to continue?`);
        if (!step1) return false;
        
        const step2 = await confirmAction('🛑 FINAL CONFIRMATION: Please confirm again. This action will PERMANENTLY break active Macrogames and cannot be undone.');
        if (!step2) return false;
    } else {
        const step1 = await confirmAction(`Delete ${ids.length} screens? They will be removed from all macrogames.`);
        if (!step1) return false;
    }

    try {
        const batch = writeBatch(db);
        ids.forEach((id) => batch.delete(doc(db, 'conversionScreens', id)));
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error deleting multiple screens:", error);
        return false;
    }
  };
  const duplicateConversionMethod = async (
    methodToDuplicate: ConversionMethod,
  ): Promise<ConversionMethod | undefined> => {
    const { id, name, ...rest } = methodToDuplicate;
    const existingNames = new Set(allConversionMethods.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newData = { ...rest, name: newName, createdAt: new Date().toISOString() };
    // `createConversionMethod` will handle status and return the new doc
    return await createConversionMethod(
      newData as Omit<ConversionMethod, 'id' | 'status'>,
    );
  };
  const createConversionScreen = async (
    newScreen: Omit<ConversionScreen, 'id' | 'status'>,
  ): Promise<ConversionScreen | undefined> => {
    const newId = generateUUID();
    // --- Add denormalized methodIdList ---
    const methodIdList = (newScreen.methods || []).map((m: any) => m.methodId);
    const dataToSave: ConversionScreen = {
      ...newScreen,
      id: newId,
      methodIdList,
      status:
        newScreen.methods.length > 0
          ? { code: 'ok', message: '' }
          : { code: 'error', message: 'This screen has no methods.' },
    };
    // --- End New ---
    await setDoc(doc(db, 'conversionScreens', newId), dataToSave);
    return dataToSave;
  };
  const updateConversionScreen = async (
    screenId: string,
    updatedScreen: Partial<Omit<ConversionScreen, 'id'>>,
  ) => {
    const dataToUpdate = { ...updatedScreen } as any;

    // --- NEW: Add denormalized methodIdList if methods are changing ---
    if (updatedScreen.methods) {
      dataToUpdate.methodIdList = (updatedScreen.methods || []).map(
        (m: any) => m.methodId,
      );
    }
    // --- End New ---

    if (dataToUpdate.methods && dataToUpdate.methods.length > 0) {
      dataToUpdate.status = { code: 'ok', message: '' };
    } else if (dataToUpdate.methods) {
      // e.g., if methods array is set to []
      dataToUpdate.status = {
        code: 'error',
        message: 'This screen has no methods and will not function.',
      };
    }

    await updateDoc(doc(db, 'conversionScreens', screenId), dataToUpdate);
  };
  const duplicateConversionScreen = async (
    screenToDuplicate: ConversionScreen,
  ): Promise<ConversionScreen | undefined> => {
    const { id, name, ...rest } = screenToDuplicate;
    const existingNames = new Set(allConversionScreens.map((c) => c.name));
    const baseName = `Copy of ${name}`;
    const newName = ensureUniqueName(baseName, existingNames);
    const newData = { ...rest, name: newName };
    // `createConversionScreen` will handle denormalization
    return await createConversionScreen(
      newData as Omit<ConversionScreen, 'id' | 'status'>,
    );
  };

  const value: DataContextType = {
    user,
    createMacrogame,
    updateMacrogame,
    deleteMacrogame,
    deleteMultipleMacrogames,
    duplicateMacrogame,
    toggleMacrogameFavorite,
    // --- REFACTOR: Pass renamed functions ---
    createDeliveryContainer,
    deleteDeliveryContainer,
    deleteMultipleDeliveryContainers,
    updateDeliveryContainer,
    duplicateDeliveryContainer,
    toggleDeliveryContainerFavorite,
    saveCustomMicrogame,
    toggleMicrogameFavorite,
    deleteCustomMicrogame,
    deleteMultipleCustomMicrogames,
    duplicateCustomMicrogame,
    installMicrogame,
    uninstallMicrogame,
    createConversionMethod,
    updateConversionMethod,
    deleteConversionMethod,
    deleteMultipleConversionMethods,
    duplicateConversionMethod,
    createConversionScreen,
    updateConversionScreen,
    deleteConversionScreen,
    deleteMultipleConversionScreens,
    duplicateConversionScreen,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    deleteMultipleCampaigns,
    duplicateCampaign,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};