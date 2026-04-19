/* src/store/useStore.ts */

import { create } from 'zustand';
import { Macrogame, Microgame, DeliveryContainer, ConversionMethod, CustomMicrogame, Campaign, ConversionScreen, EntityStatus } from '../types';

interface State {
    isDataLoading: boolean;
    isGuidedMode: boolean; // --- Toggles the "Intelligence Layer" UI ---
    macrogames: (Macrogame & { status?: EntityStatus })[];
    deliveryContainers: (DeliveryContainer & { status?: EntityStatus })[];
    campaigns: Campaign[];
    allConversionMethods: ConversionMethod[];
    allConversionScreens: ConversionScreen[];
    allMicrogames: Microgame[];
    customMicrogames: CustomMicrogame[];
    setState: (newState: Partial<State>) => void;
}

const useStore = create<State>((set) => ({
    isDataLoading: true, // <-- 2. INITIALIZE THE FLAG TO 'true'
    isGuidedMode: false, // Default to "Raw Platform" view
    macrogames: [],
    deliveryContainers: [],
    campaigns: [],
    allConversionMethods: [],
    allConversionScreens: [],
    allMicrogames: [],
    customMicrogames: [],
    setState: (newState) => set(newState),
}));

export { useStore };