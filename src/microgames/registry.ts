/* src/microgames/registry.ts */

import { lazy } from 'react';

// This registry maps the "ID" from the database/catalog to the actual React Component.
// We use 'lazy' loading so we don't load the code for "Catch" when playing "Avoid".

export const MICROGAME_COMPONENTS: { [key: string]: React.LazyExoticComponent<React.FC<any>> } = {
    // --- Active Games ---
    Avoid: lazy(() => import('./games/Avoid')),
    Catch: lazy(() => import('./games/Catch')),

    // --- Future Games (Placeholders) ---
    // Uncomment these as you build the actual game files in src/microgames/games/
    /*
    Build: lazy(() => import('./games/Build')),
    Claw: lazy(() => import('./games/Claw')),
    Drop: lazy(() => import('./games/Drop')),
    // ... add others from catalog.ts as you create them
    */
};