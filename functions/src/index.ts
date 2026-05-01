/* functions/src/index.ts */

import {
  onDocumentWritten,
  onDocumentDeleted,
} from "firebase-functions/v2/firestore";
// --- FIXED IMPORTS ---
import {
  HttpsError,
  onCall,
  CallableRequest,
} from "firebase-functions/v2/https";
import admin from "firebase-admin";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import algoliasearch from "algoliasearch";

admin.initializeApp();
const db = getFirestore();

// --- Algolia Config ---
const algoliaClient = algoliasearch.default(
  process.env.ALGOLIA_APPID as string,
  process.env.ALGOLIA_APIKEY as string,
);

// Dynamically prefix the indices based on the environment (dev_ vs prod_)
const prefix = process.env.ALGOLIA_INDEX_PREFIX || "";

const algoliaIndices = {
  macrogames: algoliaClient.initIndex(`${prefix}macrogames`),
  campaigns: algoliaClient.initIndex(`${prefix}campaigns`),
  deliveryContainers: algoliaClient.initIndex(`${prefix}deliveryContainers`),
  conversionMethods: algoliaClient.initIndex(`${prefix}conversionMethods`),
  conversionScreens: algoliaClient.initIndex(`${prefix}conversionScreens`),
  customMicrogames: algoliaClient.initIndex(`${prefix}customMicrogames`),
  microgames: algoliaClient.initIndex(`${prefix}microgames`),
};

const defaultOptions = {
  region: "us-central1",
  memory: "256MiB" as const,
  timeoutSeconds: 30,
};

// --- START REFACTOR: TRANSFORMER HELPERS ---

/**
 * Checks if a macrogame has issues with its microgame flow.
 */
function hasMacrogameIssues(
  macrogame: admin.firestore.DocumentData,
  allMicrogames: any[],
): boolean {
  if (!macrogame.flow || macrogame.flow.length === 0) {
    return true; // No flow is an issue
  }
  return (macrogame.flow || []).some((flowItem: any) => {
    const microgame = allMicrogames.find(
      (mg: any) => mg.id === flowItem.microgameId,
    );
    return !microgame || microgame.isActive === false;
  });
}

/**
 * --- REFACTOR: Renamed function from transformPopupDoc to transformContainerDoc ---
 * Creates a "smart" Algolia object for a DeliveryContainer.
 */
const transformContainerDoc = async (
  container: admin.firestore.DocumentData, // <-- REFACTOR: Renamed param
) => {
  let newStatus = { code: "ok", message: "" };

  // --- REFACTOR: Use 'container' variable ---
  if (!container.skinId) {
    newStatus = {
      code: "error",
      message: "Configuration Needed: Select a UI skin.",
    };
  } else if (!container.macrogameId) {
    newStatus = {
      code: "error",
      message: "Configuration Needed: Select a Macrogame.",
    };
  } else if (!container.deliveryMethod) {
    // --- THIS IS THE NEW CHECK ---
    // We add this to ensure the backend enforces the same rules as the frontend
    newStatus = {
      code: "error",
      message: "Configuration Needed: Select a delivery container type.", 
    };
  } else {
    // Check the health of the linked macrogame
    const macrogameDoc = await db
      .collection("macrogames")
      // --- REFACTOR: Use 'container' variable ---
      .doc(container.macrogameId)
      .get();
    if (!macrogameDoc.exists) {
      newStatus = { code: "error", message: "Linked macrogame was deleted." };
    } else {
      const macrogameStatus = macrogameDoc.data()?.status;
      if (macrogameStatus && macrogameStatus.code === "error") {
        newStatus = {
          code: "error",
          message: `Linked macrogame has an issue: ${macrogameStatus.message}`,
        };
      }
    }
  }

  return {
    // --- REFACTOR: Use 'container' variable ---
    ...container,
    // Add a simple boolean for facet filtering (this is the fix)
    isCampaignLinked: !!container.campaignId,
    status: newStatus,
    // Ensure campaignId is explicitly set to null for filtering if it doesn't exist
    campaignId: container.campaignId || null,
  };
};

/**
 * Creates a "smart" Algolia object for a Conversion Screen.
 */
const transformConversionScreenDoc = async (
  screen: admin.firestore.DocumentData,
) => {
  let newStatus = { code: "ok", message: "" };
  const methodIds = (screen.methods || []).map((m: any) => m.methodId);
  const methodIdList = [...new Set(methodIds as string[])];

  // --- Derived Metadata for Advanced Filtering ---
  const numMethods = (screen.methods || []).length;
  const gateTypesPresent = new Set<string>();
  let numGates = 0;
  const orderedMethodTypes: string[] = [];

  if (methodIds.length === 0) {
    newStatus = { code: "error", message: "Screen has no conversion methods." };
  } else {
    // Check if all methods exist and fetch their types for sequence filtering
    const methodsSnap = await db
      .collection("conversionMethods")
      .where(FieldPath.documentId(), "in", methodIds)
      .get();
      
    const methodsMap = new Map(methodsSnap.docs.map((d) => [d.id, d.data()]));
    
    if (methodsSnap.size !== methodIds.length) {
      newStatus = {
        code: "error",
        message: "Screen links to a deleted conversion method.",
      };
    }

    // Extract gates and sequence
    (screen.methods || []).forEach((m: any) => {
        if (m.gate && m.gate.type !== 'none') {
            gateTypesPresent.add(m.gate.type);
            numGates++;
        }
        const methodData = methodsMap.get(m.methodId);
        if (methodData) {
            orderedMethodTypes.push(methodData.type);
        }
    });
  }

  // Generate dynamic sequence filters (method1Type, method2Type, etc.)
  const sequenceFilters: any = {};
  orderedMethodTypes.forEach((type, index) => {
      sequenceFilters[`method${index + 1}Type`] = type;
  });

  return {
    ...screen,
    status: newStatus,
    methodIdList: methodIdList, 
    
    // Inject new advanced filter fields
    numMethods,
    numGates,
    gateTypes: Array.from(gateTypesPresent),
    ...sequenceFilters
  };
};

/**
 * Creates a "smart" Algolia object for a Conversion Method.
 * FIX: Strips out ALL heavy content (fields, styles, html, headlines) 
 * to strictly prevent Algolia size limit errors (10kb limit).
 */
const transformConversionMethodDoc = async (
  method: admin.firestore.DocumentData,
) => {
  // Destructure to remove ALL potential heavy items
  const { 
      fields, 
      style, 
      headline, 
      subheadline, 
      html,          // Static HTML content
      footerText,    // Footer content
      lightStyle,    // Light mode overrides
      links,         // Strip links array to save space
      maskConfig,    // Strip mask config to save space
      ...lightweightMethod 
  } = method;

  // --- Derived Metadata for Advanced Filtering ---
  
  // 1. Coupon Reveal Type
  let couponRevealType = 'none';
  if (method.type === 'coupon_display' && method.clickToReveal) {
      couponRevealType = method.revealScope === 'code_only' ? 'code_only' : 'entire_card';
  }

  // 2. Link Transition Type
  let linkTransitionType = 'none';
  if (method.type === 'link_redirect' && method.transition) {
      if (method.transition.type === 'auto') linkTransitionType = 'auto';
      else if (method.transition.interactionMethod === 'click' && method.transition.clickFormat === 'button') linkTransitionType = 'button';
      else linkTransitionType = 'disclaimer';
  }

  // 3. Number of Fields (Form Submit)
  let numFields = 0;
  if (method.type === 'form_submit' && fields) {
      numFields = fields.length;
  }

  // 4. Social Platforms (Social Follow)
  let socialPlatforms: string[] = [];
  if (method.type === 'social_follow' && links) {
      socialPlatforms = links.filter((l: any) => l.isEnabled).map((l: any) => l.platform);
  }

  return {
    ...lightweightMethod,
    // Store simple flags instead of the massive strings
    hasFields: !!(fields && fields.length > 0),
    hasStyle: !!style,
    hasHeadline: !!headline,
    hasHtml: !!html,
    
    // Inject new advanced filter fields
    couponRevealType,
    linkTransitionType,
    numFields,
    socialPlatforms,
    
    // Add default status
    status: { code: "ok", message: "" }, 
  };
};

/**
 * Creates a "smart" Algolia object for a Macrogame.
 * PRUNED: Strips out all heavy UI/HTML/Audio config objects and replaces
 * them with derived boolean flags and simple arrays for Algolia filtering.
 */
const transformMacrogameDoc = async (
  macrogame: admin.firestore.DocumentData,
) => {
  // --- 0. Fetch all microgames for health checks and duration ---
  const allMicrogamesSnap = await db.collection("microgames").get();
  const allMicrogames = allMicrogamesSnap.docs.map((d) => ({
    ...d.data(),
    id: d.id,
  }));

  // --- 1. Health Check Logic ---
  let newStatus = { code: "ok", message: "" };
  const hasIssues = hasMacrogameIssues(macrogame, allMicrogames);
  if (hasIssues) {
    newStatus = {
      code: "error",
      message: "Contains an archived or deleted microgame.",
    };
  }

  // --- 2. Conversion Screen Health Check & Data Fetch ---
  let conversionMethodTypes: string[] = [];
  if (macrogame.conversionScreenId) {
    const screenDoc = await db
      .collection("conversionScreens")
      .doc(macrogame.conversionScreenId)
      .get();
    if (!screenDoc.exists) {
      newStatus = {
        code: "error",
        message: "Linked conversion screen was deleted.",
      };
    } else {
      // Get Conversion Method Types for Algolia
      const screenData = screenDoc.data();
      const methodIds = (screenData?.methods || []).map((m: any) => m.methodId);
      if (methodIds.length > 0) {
        // Fetch all methods in one go
        const methodsSnap = await db
          .collection("conversionMethods")
          .where(FieldPath.documentId(), "in", methodIds)
          .get();
        const methodsMap = new Map(methodsSnap.docs.map((d) => [d.id, d.data()]));
        const methodTypes = methodIds
          .map((id: string) => methodsMap.get(id)?.type)
          .filter(Boolean);
        conversionMethodTypes = [...new Set(methodTypes as string[])];
      }
    }
  }

  // --- 3. Denormalization for Data Integrity ---
  const variantIdList = (macrogame.flow || [])
    .map((f: any) => f.variantId)
    .filter(Boolean);
  const flowMicrogameIds = (macrogame.flow || []).map(
    (f: any) => f.microgameId,
  );

  // --- 4. Derived Flags for Filters ---
  const flowComponents: string[] = [];
  if (macrogame.introScreen?.enabled) flowComponents.push("intro");
  if (macrogame.promoScreen?.enabled) flowComponents.push("promo");
  if (macrogame.config?.screenFlowType !== "Skip") flowComponents.push("preGame");
  if (macrogame.config?.resultConfig?.enabled !== false) flowComponents.push("result");

  const hasEconomy = macrogame.config?.showPoints === true;

  // Simple heuristic to check if audio config has any valid URL or non-empty library track
  const hasAudioConfigured = (audioConfig: any): boolean => {
    if (!audioConfig) return false;
    const stringified = JSON.stringify(audioConfig);
    return stringified.includes('"url":"http') || stringified.includes('.wav') || stringified.includes('.mp3');
  };
  const hasAudio = hasAudioConfigured(macrogame.audioConfig) || !!macrogame.config?.backgroundMusicUrl;

  // --- 5. Algolia Object Assembly (Strictly Pruned) ---
  return {
    objectID: macrogame.objectID, // Will be added by the caller
    id: macrogame.id,
    name: macrogame.name,
    sectors: macrogame.sectors || [],
    categories: macrogame.categories || [],
    subcategories: macrogame.subcategories || [],
    seasonality: macrogame.seasonality || [],
    targetAudience: macrogame.targetAudience || [],
    promotionCompatibility: macrogame.promotionCompatibility || [],
    conversionGoal: macrogame.conversionGoal,
    gameplayExperience: macrogame.gameplayExperience,
    createdAt: macrogame.createdAt,
    numGames: (macrogame.flow || []).length,
    hasCustomGames: variantIdList.length > 0,
    conversionScreenId: macrogame.conversionScreenId || null,
    isFavorite: macrogame.isFavorite || false,
    status: newStatus,
    conversionMethodTypes: conversionMethodTypes,
    flowMicrogameIds: flowMicrogameIds,
    variantIdList: variantIdList, // Restored for Firestore denormalization trigger
    
    // New Derived Filters
    theme: macrogame.globalStyling?.theme || "dark",
    hasEconomy: hasEconomy,
    hasAudio: hasAudio,
    flowComponents: flowComponents,
  };
};

/**
 * Creates a "smart" Algolia object for a Microgame.
 */
const transformMicrogameDoc = async (
  microgame: admin.firestore.DocumentData,
) => {
  // Simple 1-to-1 for now, can add status checks later
  return {
    ...microgame,
  };
};

/**
 * Creates a "smart" Algolia object for a Custom Microgame Variant.
 * PRUNED: Strips out heavy skinData to prevent 10kb Algolia limit issues.
 */
const transformCustomMicrogameDoc = async (
  variant: admin.firestore.DocumentData,
) => {
  const { skinData, ...lightweightVariant } = variant;
  
  return {
    ...lightweightVariant,
  };
};

/**
 * Creates a "smart" Algolia object for a Campaign.
 */
const transformCampaignDoc = async (
  campaign: admin.firestore.DocumentData,
) => {
  const displayRules = campaign.displayRules || [];
  // --- REFACTOR: Read from 'containers' array and rename variable ---
  const allContainers = displayRules.flatMap((r: any) =>
    (r.containers || []).map((c: any) => c.containerId),
  );
  const containerIdList = [...new Set(allContainers as string[])];
  // --- NEW: Denormalize delivery methods ---
  let deliveryMethods: string[] = [];
  if (containerIdList.length > 0) {
    // Fetch all containers in the list
    const containersSnap = await db
      .collection("deliveryContainers")
      .where(FieldPath.documentId(), "in", containerIdList)
      .get();

    // Get all their deliveryMethod fields
    const methods = containersSnap.docs
      .map((doc) => doc.data()?.deliveryMethod)
      .filter(Boolean); // Filter out any null/undefined

    // Save the unique list
    deliveryMethods = [...new Set(methods as string[])];
  }
  // --- END NEW ---

  // Denormalize for filtering
  const audiences = [...new Set(displayRules.map((r: any) => r.audience))];
  const triggers = [...new Set(displayRules.map((r: any) => r.trigger))];
  // --- Check 'containers' array length ---
  const isAbTesting = displayRules.some(
    (r: any) => (r.containers || []).length > 1,
  ) ? 1 : 0; // --- Save as numeric 1/0 ---

  // Simplified schedule check
  const schedules: string[] = [];
  const hasWeekdays = displayRules.some(
    (r: any) =>
      r.schedule.days.monday ||
      r.schedule.days.tuesday ||
      r.schedule.days.wednesday ||
      r.schedule.days.thursday ||
      r.schedule.days.friday,
  );
  const hasWeekends = displayRules.some(
    (r: any) => r.schedule.days.saturday || r.schedule.days.sunday,
  );
  if (hasWeekdays) schedules.push("Weekdays");
  if (hasWeekends) schedules.push("Weekends");

  return {
    ...campaign,
    // --- REFACTOR: Use 'containerIdList' ---
    containerIdList: containerIdList, // Ensure this is always present
    deliveryMethods: deliveryMethods,
    audiences,
    triggers,
    isAbTesting,
    schedules,
  };
};

// --- END REFACTOR: TRANSFORMER HELPERS ---

// ---
// --- Firestore Triggers (ON WRITE)
// --- Now they just call the transformers
// ---

// --- REFACTOR: Rename function and path ---
export const onContainerWritten = onDocumentWritten(
  { ...defaultOptions, document: "deliveryContainers/{containerId}" },
  async (event) => {
    // --- REFACTOR: Rename param ---
    const containerId = event.params.containerId;
    if (!event.data || !event.data.after.exists) {
      // --- REFACTOR: Use correct index ---
      return algoliaIndices.deliveryContainers.deleteObject(containerId);
    }
    // --- REFACTOR: Rename variable ---
    const container = event.data.after.data();
    if (!container) return;

    // --- REFACTOR: Call renamed transformer ---
    const algoliaObject = await transformContainerDoc(container);
    // --- REFACTOR: Use correct index ---
    return algoliaIndices.deliveryContainers.saveObject({
      ...algoliaObject,
      objectID: containerId,
    });
  },
);

export const onConversionScreenWritten = onDocumentWritten(
  { ...defaultOptions, document: "conversionScreens/{screenId}" },
  async (event) => {
    const screenId = event.params.screenId;
    if (!event.data || !event.data.after.exists) {
      return algoliaIndices.conversionScreens.deleteObject(screenId);
    }
    const screen = event.data.after.data();
    if (!screen) return;

    const algoliaObject = await transformConversionScreenDoc(screen);

    // Also update any macrogames that link to this screen
    const macrogameQuery = db
      .collection("macrogames")
      .where("conversionScreenId", "==", screenId);
    const macrogameSnap = await macrogameQuery.get();
    const batch = db.batch();
    macrogameSnap.forEach((doc) => {
      batch.update(doc.ref, {
        // This update will trigger onMacrogameWritten,
        // which will re-calculate the macrogame's status
        status: algoliaObject.status,
      });
    });

    return Promise.all([
      batch.commit(),
      algoliaIndices.conversionScreens.saveObject({
        ...algoliaObject,
        objectID: screenId,
      }),
    ]);
  },
);

export const onConversionMethodWritten = onDocumentWritten(
  { ...defaultOptions, document: "conversionMethods/{methodId}" },
  async (event) => {
    const methodId = event.params.methodId;
    if (!event.data || !event.data.after.exists) {
      return algoliaIndices.conversionMethods.deleteObject(methodId);
    }
    const method = event.data.after.data();
    if (!method) return;

    const algoliaObject = await transformConversionMethodDoc(method);

    // Also update any screens that link to this method
    const screenQuery = db
      .collection("conversionScreens")
      .where("methodIdList", "array-contains", methodId);
    const screenSnap = await screenQuery.get();
    const batch = db.batch();
    screenSnap.forEach((doc) => {
      // Just re-trigger the screen's write function
      batch.update(doc.ref, {
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return Promise.all([
      batch.commit(),
      algoliaIndices.conversionMethods.saveObject({
        ...algoliaObject,
        objectID: methodId,
      }),
    ]);
  },
);

export const onMacrogameWritten = onDocumentWritten(
  { ...defaultOptions, document: "macrogames/{macrogameId}" },
  async (event) => {
    const macrogameId = event.params.macrogameId;
    if (!event.data || !event.data.after.exists) {
      return algoliaIndices.macrogames.deleteObject(macrogameId);
    }

    const macrogame = event.data.after.data();
    const beforeData = event.data.before.data(); // Get previous data
    if (!macrogame) return;

    // --- 1. Call Transformer ---
    const algoliaObject = await transformMacrogameDoc(macrogame);

    // --- 2. Update Self (if status changed) ---
    if (
      algoliaObject.status.code !== (macrogame.status?.code || "ok") ||
      algoliaObject.status.message !== (macrogame.status?.message || "")
    ) {
      await event.data.after.ref.update({ status: algoliaObject.status });
    }

    // --- 3. Denormalization for Data Integrity (if changed) ---
    const variantIdList = algoliaObject.variantIdList;
    const flowMicrogameIds = algoliaObject.flowMicrogameIds;
    if (
      JSON.stringify(variantIdList) !==
        JSON.stringify(macrogame.variantIdList || []) ||
      JSON.stringify(flowMicrogameIds) !==
        JSON.stringify(macrogame.flowMicrogameIds || [])
    ) {
      await event.data.after.ref.update({
        variantIdList: variantIdList,
        flowMicrogameIds: flowMicrogameIds,
      });
    }

    // --- 4. RIPPLE UPDATE: Linked Delivery Containers ---
    const containerQuery = db
      .collection("deliveryContainers")
      .where("macrogameId", "==", macrogameId);
    const containerSnap = await containerQuery.get();
    const batch = db.batch();
    
    // Check if name changed
    const nameChanged = beforeData && beforeData.name !== macrogame.name;

    containerSnap.forEach((doc) => {
      const updates: any = {
        updatedAt: FieldValue.serverTimestamp(), // Always touch to trigger re-index
      };
      
      // If macrogame name changed, update the container's copy
      if (nameChanged) {
        updates.macrogameName = macrogame.name;
      }

      batch.update(doc.ref, updates);
    });

    // --- 5. Algolia Sync & Batch Commit ---
    return Promise.all([
      batch.commit(),
      algoliaIndices.macrogames.saveObject({
        ...algoliaObject,
        objectID: macrogameId,
      }),
    ]);
  },
);

export const onMicrogameWritten = onDocumentWritten(
  { ...defaultOptions, document: "microgames/{microgameId}" },
  async (event) => {
    // 1. --- Algolia Sync ---
    if (!event.data || !event.data.after.exists) {
      return;
    }

    const microgameId = event.params.microgameId;
    const microgame = event.data.after.data();
    const beforeData = event.data.before.data();
    const objectID = event.data.after.id;

    if (!microgame) return;

    const algoliaObject = await transformMicrogameDoc(microgame);
    const algoliaPromise = algoliaIndices.microgames.saveObject({
      ...algoliaObject,
      objectID,
    });

    const batch = db.batch();

    // 2. --- RIPPLE UPDATE: Custom Microgames (Name Change) ---
    if (beforeData && beforeData.name !== microgame.name) {
      const customGameQuery = db
        .collection("customMicrogames")
        .where("baseMicrogameId", "==", microgameId);
      const customGameSnap = await customGameQuery.get();
      
      customGameSnap.forEach((doc) => {
        // Update the denormalized base name
        batch.update(doc.ref, { baseMicrogameName: microgame.name });
      });
    }

    // 3. --- Data Integrity / Health Check (Status Change) ---
    const isActiveChanged = beforeData?.isActive !== microgame.isActive;

    if (isActiveChanged) {
      const macrogameQuery = db
        .collection("macrogames")
        .where("flowMicrogameIds", "array-contains", microgameId);
      const macrogameSnap = await macrogameQuery.get();

      // A. Microgame was ARCHIVED
      if (microgame.isActive === false) {
        macrogameSnap.forEach((doc) => {
          logger.warn(
            `Microgame ${microgameId} was archived, marking macrogame ${doc.id} as having issues.`
          );
          batch.update(doc.ref, {
            status: {
              code: "error",
              message: `Contains an archived microgame: ${microgame.name}`,
            },
          });
        });
      }

      // B. Microgame was RE-ACTIVATED
      if (microgame.isActive === true) {
        const allMicrogamesSnap = await db.collection("microgames").get();
        const allMicrogames = allMicrogamesSnap.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        }));

        macrogameSnap.forEach((doc) => {
          const macrogameData = doc.data();
          const hasOtherIssues = hasMacrogameIssues(macrogameData, allMicrogames);

          if (!hasOtherIssues) {
            logger.info(
              `Microgame ${microgameId} was reactivated, marking macrogame ${doc.id} as ok.`
            );
            batch.update(doc.ref, {
              status: { code: "ok", message: "" },
            });
          }
        });
      }
    }

    const batchPromise = batch.commit();
    return Promise.all([algoliaPromise, batchPromise]);
  },
);

export const onCustomMicrogameWritten = onDocumentWritten(
  { ...defaultOptions, document: "customMicrogames/{variantId}" },
  async (event) => {
    const variantId = event.params.variantId;
    if (!event.data || !event.data.after.exists) {
      return algoliaIndices.customMicrogames.deleteObject(variantId);
    }
    
    const variant = event.data.after.data();
    if (!variant) return;

    const algoliaObject = await transformCustomMicrogameDoc(variant);

    // Also update any macrogames that use this variant to trigger their re-index
    const macrogameQuery = db
      .collection("macrogames")
      .where("variantIdList", "array-contains", variantId);
    const macrogameSnap = await macrogameQuery.get();
    
    const batch = db.batch();
    macrogameSnap.forEach((doc) => {
      // Touching updatedAt triggers onMacrogameWritten
      batch.update(doc.ref, { updatedAt: FieldValue.serverTimestamp() });
    });

    return Promise.all([
      batch.commit(),
      algoliaIndices.customMicrogames.saveObject({
        ...algoliaObject,
        objectID: variantId,
      }),
    ]);
  },
);

// --- onMicrogameDeleted ---
export const onMicrogameDeleted = onDocumentDeleted(
  "microgames/{microgameId}",
  async (event) => {
    const microgameId = event.params.microgameId;
    // 1. Delete from Algolia
    await algoliaIndices.microgames.deleteObject(microgameId); // <-- Fixed
  },
);

export const onCampaignWritten = onDocumentWritten(
  { ...defaultOptions, document: "campaigns/{campaignId}" },
  async (event) => {
    const campaignId = event.params.campaignId;
    if (!event.data || !event.data.after.exists) {
      return algoliaIndices.campaigns.deleteObject(campaignId);
    }
    const campaign = event.data.after.data();
    if (!campaign) return;

    // --- 1. Call Transformer ---
    const algoliaObject = await transformCampaignDoc(campaign);

    // --- 2. Denormalization for Data Integrity (if changed) ---
    // --- REFACTOR: Use 'containerIdList' ---
    const containerIdList = algoliaObject.containerIdList;
    if (
      JSON.stringify(containerIdList) !==
      JSON.stringify(campaign.containerIdList || [])
    ) {
      await event.data.after.ref.update({
        // --- REFACTOR: Use 'containerIdList' ---
        containerIdList: containerIdList,
      });
    }

    // --- 3. Algolia Sync ---
    return algoliaIndices.campaigns.saveObject({
      ...algoliaObject,
      objectID: campaignId,
    });
  },
);

// ---
// --- Firestore Triggers (ON DELETE)
// ---

export const onConversionMethodDeleted = onDocumentDeleted(
  "conversionMethods/{methodId}",
  async (event) => {
    const methodId = event.params.methodId;

    // 1. Delete from Algolia
    const algoliaDelete =
      algoliaIndices.conversionMethods.deleteObject(methodId);

    // 2. Unlink from Conversion Screens
    const screenQuery = db
      .collection("conversionScreens")
      .where("methodIdList", "array-contains", methodId);
    const screenSnap = await screenQuery.get();
    const batch = db.batch();
    screenSnap.forEach((doc) => {
      const data = doc.data();
      const newMethods = (data.methods || []).filter(
        (m: any) => m.methodId !== methodId,
      );
      // This will trigger onConversionScreenWritten, which will update status
      batch.update(doc.ref, { methods: newMethods });
    });

    return Promise.all([batch.commit(), algoliaDelete]);
  },
);

export const onConversionScreenDeleted = onDocumentDeleted(
  "conversionScreens/{screenId}",
  async (event) => {
    const screenId = event.params.screenId;

    // 1. Delete from Algolia
    const algoliaDelete =
      algoliaIndices.conversionScreens.deleteObject(screenId);

    // 2. Unlink from Macrogames
    const macrogameQuery = db
      .collection("macrogames")
      .where("conversionScreenId", "==", screenId);
    const macrogameSnap = await macrogameQuery.get();
    const batch = db.batch();
    macrogameSnap.forEach((doc) => {
      // This will trigger onMacrogameWritten, which will update status
      batch.update(doc.ref, { conversionScreenId: null });
    });

    return Promise.all([batch.commit(), algoliaDelete]);
  },
);

// --- REFACTOR: Rename function and path ---
export const onContainerDeleted = onDocumentDeleted(
  "deliveryContainers/{containerId}", // <-- REFACTOR: Updated path
  async (event) => {
    // --- REFACTOR: Rename param ---
    const containerId = event.params.containerId;

    // 1. Delete from Algolia
    // --- REFACTOR: Use correct index ---
    const algoliaDelete =
      algoliaIndices.deliveryContainers.deleteObject(containerId);

    // 2. Unlink from Campaigns
    const campaignQuery = db
      .collection("campaigns")
      // --- REFACTOR: Query 'containerIdList' ---
      .where("containerIdList", "array-contains", containerId);
    const campaignSnap = await campaignQuery.get();
    const batch = db.batch();
    campaignSnap.forEach((doc) => {
      const data = doc.data();
      const newRules = (data.displayRules || []).map((rule: any) => ({
        ...rule,
        // --- REFACTOR: Update 'containers' array ---
        containers: (rule.containers || []).filter(
          (c: any) => c.containerId !== containerId,
        ),
      }));
      // This will trigger onCampaignWritten, which will update its containerIdList
      batch.update(doc.ref, { displayRules: newRules });
    });

    return Promise.all([batch.commit(), algoliaDelete]);
  },
);

export const onMacrogameDeleted = onDocumentDeleted(
  "macrogames/{macrogameId}",
  async (event) => {
    const macrogameId = event.params.macrogameId;

    // 1. Delete from Algolia
    const algoliaDelete = algoliaIndices.macrogames.deleteObject(macrogameId);

    // 2. Unlink from Delivery Containers
    // --- REFACTOR: Query 'deliveryContainers' collection ---
    const containerQuery = db
      .collection("deliveryContainers")
      .where("macrogameId", "==", macrogameId);
    const containerSnap = await containerQuery.get();
    const batch = db.batch();
    // --- REFACTOR: Loop over 'containerSnap' ---
    containerSnap.forEach((doc) => {
      // This will trigger onContainerWritten, which will update its status
      batch.update(doc.ref, { macrogameId: null, macrogameName: null });
    });

    return Promise.all([batch.commit(), algoliaDelete]);
  },
);

export const onCustomMicrogameDeleted = onDocumentDeleted(
  "customMicrogames/{variantId}",
  async (event) => {
    const variantId = event.params.variantId;

    // 1. Delete from Algolia
    const algoliaDelete =
      algoliaIndices.customMicrogames.deleteObject(variantId);

    // 2. Unlink from Macrogames
    const macrogameQuery = db
      .collection("macrogames")
      .where("variantIdList", "array-contains", variantId);
    const macrogameSnap = await macrogameQuery.get();
    const batch = db.batch();
    macrogameSnap.forEach((doc) => {
      const data = doc.data();
      const newFlow = (data.flow || []).map((item: any) =>
        item.variantId === variantId ? { ...item, variantId: null } : item,
      );
      // This will trigger onMacrogameWritten, which will update its variantIdList
      batch.update(doc.ref, { flow: newFlow });
    });

    return Promise.all([batch.commit(), algoliaDelete]);
  },
);

// --- FIXED "SMART" BACKFILL FUNCTION ---
export const backfillDataToAlgolia = onCall(
  { cors: ["http://localhost:5173"] },
  async (request: CallableRequest) => {
    // 1. Secure the function
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const results: { [key: string]: number } = {};
    const allSavePromises: Promise<any>[] = [];

    try {
      // 2. Define all collections and their "smart" transformers
      const collectionsToBackfill = [
        {
          name: "microgames",
          index: algoliaIndices.microgames,
          transformer: transformMicrogameDoc,
        },
        {
          name: "customMicrogames",
          index: algoliaIndices.customMicrogames,
          transformer: transformCustomMicrogameDoc,
        },
        {
          name: "conversionMethods",
          index: algoliaIndices.conversionMethods,
          transformer: transformConversionMethodDoc,
        },
        {
          name: "conversionScreens",
          index: algoliaIndices.conversionScreens,
          transformer: transformConversionScreenDoc,
        },
        {
          name: "macrogames",
          index: algoliaIndices.macrogames,
          transformer: transformMacrogameDoc,
        },
        {
          // --- REFACTOR: Use 'deliveryContainers' ---
          name: "deliveryContainers",
          index: algoliaIndices.deliveryContainers,
          transformer: transformContainerDoc,
        },
        {
          name: "campaigns",
          index: algoliaIndices.campaigns,
          transformer: transformCampaignDoc,
        },
      ];

      // 3. Process each collection in sequence to respect dependencies
      //    (e.g., microgames must exist before macrogames can be calculated)
      for (const { name, index, transformer } of collectionsToBackfill) {
        const snapshot = await db.collection(name).get();
        const objectsToSave: any[] = [];

        // 4. Transform all docs in parallel
        await Promise.all(
          snapshot.docs.map(async (doc) => {
            const docData = doc.data();
            // Call the *same* smart transformer that the triggers use
            const algoliaObject = await transformer(docData);
            objectsToSave.push({
              ...algoliaObject,
              objectID: doc.id,
            });
          }),
        );

        // 5. Add the batch save operation to our list
        if (objectsToSave.length > 0) {
          allSavePromises.push(index.saveObjects(objectsToSave));
          results[name] = objectsToSave.length;
        } else {
          results[name] = 0;
        }
      }

      // 6. Wait for all Algolia save operations to complete
      await Promise.all(allSavePromises);

      return {
        success: true,
        message: "Successfully backfilled all data to Algolia.",
        counts: results,
      };
    } catch (error) {
      console.error("Error during Algolia backfill:", error);
      if (error instanceof Error) {
        throw new HttpsError("internal", error.message, error.stack);
      }
      throw new HttpsError(
        "internal",
        "An unknown error occurred during the backfill.",
      );
    }
  },
);

