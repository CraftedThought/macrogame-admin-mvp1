/* src/hooks/useData.ts */
import { useStore } from '../store/useStore';
import { DataContext } from '../context/DataContext';
import { useContext } from 'react';

export const useData = () => {
  const state = useStore();
  const actions = useContext(DataContext);

  if (actions === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }

  return { ...state, ...actions };
};