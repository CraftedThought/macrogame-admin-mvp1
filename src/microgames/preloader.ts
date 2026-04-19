/* src/microgames/preloader.ts */

// Vite's import.meta.glob feature automatically finds all files matching the pattern.
const modules = import.meta.glob('./games/*.tsx');

const loadMicrogame = async (gameId: string) => {
    // Construct the path that matches the key in 'modules'
    const path = `./games/${gameId}.tsx`;
    
    if (modules[path]) {
        // Call the import function stored in the glob object
        await modules[path]();
    } else {
        console.warn(`Microgame file not found for ID: ${gameId}`);
    }
};

export const preloadMicrogames = async (gameIds: string[]): Promise<void> => {
    try {
        const uniqueIds = [...new Set(gameIds)];
        const preloadPromises = uniqueIds.map(id => loadMicrogame(id));
        await Promise.all(preloadPromises);
        console.log(`Preloaded ${uniqueIds.length} microgames.`);
    } catch (error) {
        console.error("Failed to preload microgames:", error);
    }
};