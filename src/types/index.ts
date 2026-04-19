// src/types/index.ts

export type EntityStatus = {
  code: 'ok' | 'warning' | 'error';
  message: string;
}

export interface Alert {
  code: 'CONFIG_MISSING_SKIN' | 'MACROGAME_DELETED' | 'MACROGAME_HAS_ISSUES';
  message: string;
  severity: 'warning' | 'error';
}

// Represents a UI skin that can be applied to a popup.
export interface UISkin {
  id: string;
  name: string;
  fontFamily: string;
  fontUrl?: string;
}

// --- NEW: Configuration object for the ConfigurablePopupSkin ---
// (This will be stored on the DeliveryContainer document)

// Defines a single block of text content
export interface SkinContentBlock {
    id: string;
    position: 'above' | 'below';
    // v1 Text Editor Content (HTML string)
    content: string;
}

// Defines the entire V1 configuration for the new skin
export interface SkinConfig {
  // --- Controls ---
  showMuteButton?: boolean;
  muteButtonPosition?: 'left' | 'right'; 
  showExitButton?: boolean;
  exitButtonPosition?: 'left' | 'right'; 
  buttonStyle?: 'circle' | 'minimal';   
  
  header?: {
    title?: string;
    textColor?: string;
    // --- Header Spacing ---
    paddingX?: number;
    paddingTop?: number;    // Split from paddingY
    paddingBottom?: number; // Split from paddingY
    fontWeight?: 'normal' | 'bold' | '800';
  };
  contentBlocks?: SkinContentBlock[];
  styling?: {
    popupWidth?: 'small' | 'medium' | 'large';
    borderRadius?: number;
    padding?: number;
    boxShadowStrength?: number;
    backgroundColor?: string;
    headerBackground?: string;
    headerBgSpanEdges?: boolean; // Span Top/Left/Right
    // --- Content Block Styling ---
    contentBackground?: string;
    contentBgSpanEdges?: boolean; // Span Bottom/Left/Right
    contentPaddingTop?: number;
    contentPaddingBottom?: number;
    contentPaddingX?: number;
    // --- Game Section Configuration ---
    gameSection?: {
        orientation: 'landscape' | 'portrait';
        desktopHeightLimit?: number; 
        alignment: 'left' | 'center' | 'right';
        borderRadius?: number;

        // Game Section Padding
        paddingTop?: number;
        paddingBottom?: number;
        paddingX?: number;
            
        // Side Content Slots (HTML Strings)
        leftContent?: string;
        rightContent?: string;
        
        // Side Slot Styling
        slotVerticalAlign?: 'top' | 'center' | 'bottom';
        slotPaddingTop?: number;
        slotPaddingBottom?: number;
        slotPaddingX?: number;
    };

    // Global Font Family
    fontFamily?: string; 
  };
}

// A reusable config for screens like Intro and Promo.
export interface ScreenConfig {
  enabled: boolean;
  
  // --- Content Blocks ---
  headline: string; // HTML string from SimpleTextEditor
  bodyText: string; // HTML string from SimpleTextEditor
  textShadowEnabled?: boolean;
  
  // --- Behavior & Media ---
  transition: TransitionConfig;
  backgroundImageUrl?: string | null;
  spotlightImageUrl?: string | null;
  spotlightImageLayout?: 'left' | 'right' | 'top' | 'bottom' | null;
  
  // --- Styling (Aligned with Conversion Methods) ---
  style?: {
    verticalAlign?: 'top' | 'center' | 'bottom';
    spacing?: number; // Gap between headline and body
    blockSpacing?: number; // Gap between text block and transition/button block
    backgroundColor?: string;
    textColor?: string;
    textPaddingTop?: number;
    textPaddingBottom?: number;
    textPaddingLeft?: number;
    textPaddingRight?: number;
    // --- Spotlight Formatting ---
    contentGap?: number; // Gap between image and text block
    spotlightSize?: number; // Percentage (10-90) - Layout Split
    spotlightScale?: number; // Percentage (10-100) - Image Scale within its container
    spotlightAlignX?: 'left' | 'center' | 'right';
    spotlightAlignY?: 'top' | 'center' | 'bottom';
    spotlightFit?: 'cover' | 'contain';
    spotlightBorderRadius?: number; // Specific override for the image
    spotlightPaddingTop?: number;
    spotlightPaddingBottom?: number;
    spotlightPaddingLeft?: number;
    spotlightPaddingRight?: number;
  };
  lightStyle?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface MacrogameGlobalStyling {
  theme: 'dark' | 'light';
  fontType?: 'standard' | 'google' | 'custom';
  fontFamily: string;
  googleFontUrl?: string;
  customFontUrl?: string;
  borderRadius: number;
  width?: number;  // Container Width (%)
  height?: number; // Container Height (%)
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  
  // --- HUD Positioning ---
  hudLayout?: 'viewport' | 'safe_area';
  hudPaddingY?: number;
  hudPaddingX?: number;
}

// --- Universal Mask Types ---

export interface MaskThemeStyle {
    backgroundColor: string;
    textColor: string;
    strokeColor: string;
}

export interface MaskConfig {
    // Content
    headline: string; // e.g., "LOCKED", "CLICK TO REVEAL"
    body: string;     // e.g., "Complete task to unlock"
    showIcon: boolean;

    // Layout & Global Visuals
    animation: 'fade' | 'none';
    strokeWidth: number;
    strokeStyle: 'solid' | 'dashed' | 'dotted' | 'none';
    paddingTop: number;
    paddingBottom: number;
    paddingX: number;
    spacing: number; // Vertical gap between Icon, Headline, Body, Action

    // Theme Specifics
    style: MaskThemeStyle;      // Dark / Default
    lightStyle: MaskThemeStyle; // Light Override
}

// Update ConversionMethod (Partial)
// You likely have this interface already; ensure it can hold this config.
// For CouponDisplayMethod, we might map 'clickToReveal' properties to this shape or extend it.

// --- Lean Screen Configuration Interfaces ---

export interface ButtonThemeStyle {
  backgroundColor?: string;
  textColor?: string;
  strokeColor?: string;
}

export interface ButtonStructureConfig {
  text: string;
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;
  widthMode: 'wrap' | 'max' | 'custom';
  customWidth: number; // Percentage (20-100)
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  strokeWidth?: number;
  enableHoverAnimation?: boolean;
}

export interface TransitionConfig {
  type: 'auto' | 'interact';
  
  // --- Auto-Transition Settings ---
  autoDuration?: number;           
  showCountdown?: boolean;         
  countdownText?: string;          
  
  // --- Interact Settings ---
  interactionMethod?: 'click' | 'any_interaction';
  clickFormat?: 'disclaimer' | 'button'; // Only used if interactionMethod === 'click'
  
  disclaimerText?: string;         
  pulseAnimation?: boolean;        
  
  // Button Settings (Only used if clickFormat === 'button')
  buttonConfig?: ButtonStructureConfig;
  buttonStyle?: ButtonThemeStyle;
  lightButtonStyle?: ButtonThemeStyle;
}

export interface PreGameConfig {
  headline?: string; // HTML string
  bodyText?: string; // HTML string
  textSpacing?: number | ''; // Gap between headline and body
  blockSpacing?: number | ''; // Gap between text block and button block
  
  paddingTop?: number | '';
  paddingBottom?: number | '';
  paddingLeft?: number | '';
  paddingRight?: number | '';
  
  transition: TransitionConfig;
}

export interface ScoreLedgerItem {
  gameIndex: number;
  eventId: string;
  label: string;
  points: number;
}

export interface ResultConfig {
  enabled: boolean;
  format?: 'overlay' | 'stand_alone'; // How the result screen visually renders
  
  winText: string; // HTML string
  winBodyText?: string; // HTML string
  lossText: string; // HTML string
  lossBodyText?: string; // HTML string
  tryAgainText: string; // HTML string
  tryAgainBodyText?: string; // HTML string
  textSpacing?: number | ''; // Gap between headline and body
  buttonSpacing?: number | ''; // Gap between buttons
  blockSpacing?: number | ''; // Gap between text block and button block

  paddingTop?: number | '';
  paddingBottom?: number | '';
  paddingLeft?: number | '';
  paddingRight?: number | '';
  
  showPlayAgainOnWin: boolean;
  showPlayAgainOnLoss: boolean;
  showPlayAgainOnTryAgain: boolean;
  
  transition: TransitionConfig; // The 'Continue' action
  
  // Play Again Action (Secondary)
  secondaryButtonConfig?: ButtonStructureConfig;
  secondaryButtonStyle?: ButtonThemeStyle;
  lightSecondaryButtonStyle?: ButtonThemeStyle;
}

// Configuration options for a single Macrogame.
export interface MacrogameConfig {
  backgroundMusicUrl: string | null;
  screenFlowType?: 'Separate' | 'Overlay' | 'Skip';
  showPoints?: boolean;

  // --- Point Display Settings (Global) ---
  pointDisplayMode?: 'none' | 'simple' | 'detailed';
  showLineItemDetails?: boolean;
  enableTallyAnimation?: boolean;

  showProgress?: boolean;
  progressFormat?: 'text' | 'visual';
  progressShowLabels?: boolean;
  progressStyle?: {
      inactiveColor?: string;
      activeColor?: string;
      rewardColor?: string;
      activeTextColor?: string;
      inactiveTextColor?: string;
  };
  lightProgressStyle?: {
      inactiveColor?: string;
      activeColor?: string;
      rewardColor?: string;
      activeTextColor?: string;
      inactiveTextColor?: string;
  };
  
  // --- Progressive Disclosure Screen Configs ---
  preGameConfig?: PreGameConfig;
  resultConfig?: ResultConfig;
  conversionScreenConfig?: {
    syncWidth: boolean;
    customWidth?: number;
  };
}

// Represents a single microgame within the flow of a macrogame.
export interface MacrogameFlowItem {
  microgameId: string;
  variantId: string | null;
  order: number;
  pointRules?: { [eventId: string]: number }; // Admin-defined points for each event
}

// The main data structure for a Macrogame experience.

// --- Robust Audio Configuration Types ---
export interface AudioTrackConfig {
    url?: string | null;       // Uploaded file URL
    fileName?: string | null;  // Original file name
    libraryId?: string | null; // Predefined library ID (e.g., 'default-click')
    volume?: number;
    // --- Extended Playback Options (Reward Music) ---
    playFullDuration?: boolean;
    bgmBehavior?: 'overlap' | 'stop' | 'duck';
    bgmDuckVolume?: number;
}

export interface MacrogameAudioConfig {
    global: {
        bgMusic?: AudioTrackConfig;
        buttonClick?: AudioTrackConfig;
        screenTransition?: AudioTrackConfig;
        timerTick?: AudioTrackConfig;
        timerGo?: AudioTrackConfig;
    };
    stages: {
        [stageKey: string]: { // e.g., 'intro', 'flow_0_pre', 'flow_0_result', 'promo', 'conversion'
            playMusic: boolean;
            bgMusic?: AudioTrackConfig;
            primaryClick?: AudioTrackConfig;
            secondaryClick?: AudioTrackConfig;
            scoreTally?: AudioTrackConfig;
            screenTransition?: AudioTrackConfig;
            timerTick?: AudioTrackConfig;
            timerGo?: AudioTrackConfig;
        }
    };
    events: {
        pointPurchaseSuccess?: AudioTrackConfig;
        pointPurchaseFailure?: AudioTrackConfig;
        couponReveal?: AudioTrackConfig;
        formSuccess?: AudioTrackConfig;
        formError?: AudioTrackConfig;
    };
}

// The main data structure for a Macrogame experience.
export interface Macrogame {
  id: string;
  name: string;
  conversionGoal?: string;
  gameplayExperience?: 'Rehearsal' | 'Generalized';
  sectors?: string[];
  categories?: string[];
  subcategories?: string[];
  seasonality?: string[];
  targetAudience?: string[];
  promotionCompatibility?: string[];
  createdAt: string;
  config: MacrogameConfig;
  introScreen: ScreenConfig;
  promoScreen: ScreenConfig;
  flow: MacrogameFlowItem[];
  conversionScreenId: string | null; // ID of the linked Conversion Screen
  audioConfig?: MacrogameAudioConfig; // Upgraded to strictly typed config
  type: 'default' | 'wizard';
  isFavorite?: boolean;
  pointCosts?: { [methodInstanceId: string]: number }; // "Price list" for point-gated rewards
  globalStyling?: MacrogameGlobalStyling;
}

// --- Microgame Architecture Types ---

export type ConversionPillar = 'capture_leads' | 'drive_sales' | 'boost_engagement';

export interface GoalSuitability {
  score: number; // 1-10
  reasoning: string; // Context for why this fits the goal
  recommended: boolean;
}

// A Preset defines how the game's mechanics should be configured for a specific goal
export interface MechanicPreset {
  label: string; // e.g. "High Intensity / High Reward"
  description: string;
  mechanicOverrides: { [key: string]: any }; // Key-value pairs matching the game's mechanics
  recommendedConversionMethods: string[]; 
}

// Detailed metadata for conversion strategy
export interface MicrogameConversionMetadata {
  // 1. Scoring: How well does it fit each pillar?
  pillars: {
    capture_leads: GoalSuitability;
    drive_sales: GoalSuitability;
    boost_engagement: GoalSuitability;
  };

  // 2. Configuration: "One-click" setups for each pillar
  presets: {
    capture_leads?: MechanicPreset;
    drive_sales?: MechanicPreset;
    boost_engagement?: MechanicPreset;
  };

  // 3. Context
  bestForTip: string;
  audienceVibe: string[];
  
  // Optional: Keep triggers if they are still useful for the "Strategy Mode" UI later
  triggers?: {
    label: string;
    id: string;
    description: string;
    difficulty: 'Low' | 'Medium' | 'High' | 'Variable';
  }[];
}

// 1. The Static Definition (Lives in Code/Catalog)
export interface MicrogameCatalogItem {
  id: string; // The PascalCase ID (e.g., "DiceRoll")
  name: string; // Display Name (e.g., "Dice Roll")
  baseType: string;
  mechanicType: 'skill' | 'chance';
  controls: string;
  length: number; // Default duration in seconds
  tempo: 'Fast' | 'Normal' | 'Slow';
  gameplayExperience: 'Rehearsal' | 'Generalized';
  
  // Metadata for filtering & suggestions
  compatibleConversionGoals: string[];
  compatibleProductCategories: string[];
  compatibleCustomerTypes: string[];
  seasonality?: string[];
  promotionCompatibility?: string[];

  // --- Detailed Strategy Metadata ---
  conversionMetadata?: MicrogameConversionMetadata;
  
  // Critical for the Points System:
  trackableEvents: { 
      eventId: string; 
      label: string; 
      defaultPoints: number;
  }[];
  
  // Default visual configuration (if any)
  skins?: {
      [category: string]: { description: string };
  };
}

// 2. The User's Install (Lives in Firestore)
export interface MicrogameLibraryItem {
  id: string; // Matches the Catalog ID
  installedAt: string; // ISO Date
  isFavorite?: boolean;
  isActive?: boolean; // User can disable it locally
}

// 3. The Hydrated Object (What the App uses)
// This combines the Catalog data with the User's library data.
export type Microgame = MicrogameCatalogItem & MicrogameLibraryItem;

// A user-created variant of a base microgame.
export interface CustomMicrogame {
    id: string;
    name: string;
    description?: string;
    baseMicrogameId: string;
    baseMicrogameName: string;
    createdAt: string;
    
    // --- Taxonomy Fields  ---
    sectors?: string[];            // e.g. ["Retail & E-commerce", "Real Estate"]
    categories?: string[];         // e.g. ["Apparel & Fashion"]
    subcategories?: string[];      // e.g. ["Mens", "Womens"]
    seasonality?: string[];        // e.g. ["valentines", "evergreen"]
    targetAudience?: string[];
    promotionCompatibility?: string[];

    // --- Existing Fields ---
    skinData: { [key: string]: { url: string; fileName: string; width?: number; height?: number } };
    mechanics?: any; 
    // Add themeId/isPublished if you need them for future features, but optional for now.
    themeId?: string;
    isPublished?: boolean;
    // --- Rules Engine Storage ---
    rules?: {
        enablePoints: boolean;
        showScore: boolean;
        scores: { [eventId: string]: number };
        winCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
        lossCondition: { type: string; quotaEvent?: string; quotaAmount?: number; endImmediately?: boolean };
    };
}

// Defines the schedule for when a popup or campaign can appear.
export interface Schedule {
  days: { [key: string]: boolean };
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  timezone: string;
}

// The data structure for a delivery container.
export interface DeliveryContainer {
    id: string;
    name: string;
    macrogameId: string;
    macrogameName: string;
    createdAt: string;

    // --- NEW ARCHITECTURE FIELDS ---
    // "deliveryMethod" maps to "Container Type" in the UI.
    // Defines the "type" of container
    deliveryMethod?: 'popup_modal' | 'on_page_section' | 'new_webpage'; 
    
    // Defines the "state" of the container
    // 'unconfigured': Newly deployed, needs setup
    // 'ok': Configured and healthy
    // 'error': Configured but broken (e.g., bad link)
    status: EntityStatus & { code: 'unconfigured' | 'ok' | 'error' };

    // --- POPUP-SPECIFIC FIELDS (optional) ---
    skinId?: string; // This will ID which skin to use (e.g., 'configurable-popup')
    skinConfig?: SkinConfig; // This will hold the new dynamic configuration
    
    // --- (FUTURE) SECTION-SPECIFIC FIELDS ---
    // elementSelector?: string; 

    // --- CAMPAIGN & ANALYTICS ---
    campaignId?: string | null;
    views: number;
    engagements: number;
    isFavorite?: boolean;
}

export interface DisplayRule {
  id: string; // A unique identifier for the rule (e.g., a UUID)
  name: string; // e.g., "Weekday Mornings for New Visitors"
  trigger: 'exit_intent' | 'timed' | 'scroll';
  audience: 'all_visitors' | 'new_visitors' | 'returning_visitors';
  schedule: Schedule;
  containers: { containerId: string, weight: number }[];
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Active' | 'Paused';
  createdAt: string;
  goal: string;
  displayRules: DisplayRule[];
  startDate?: string | null;
  endDate?: string | null;
  // --- NEW: For Algolia indexing ---
  containerIdList?: string[];
}

// --- Conversion Method Interfaces ---

// --- NEW: Shared Style Definition ---
// This defines the shape of the styling object for Coupons (and future styled methods)
export interface ConversionMethodStyle {
    size?: number;
    backgroundColor?: string;
    textColor?: string;
    strokeColor?: string;
    strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
    strokeWidth?: number;
    boxShadowOpacity?: number;
    spacing?: number; // Gap between elements
    paddingTop?: number;
    paddingBottom?: number;
    paddingX?: number;
    revealAnimation?: 'none' | 'fade';
    revealBackgroundColor?: string;
    revealTextColor?: string;
}

// Base properties shared by all conversion types
interface ConversionMethodBase {
  id: string;
  name: string; // Internal name for management
  headline: string;
  // --- Forked content for Light Theme ---
  lightHeadline?: string;
  // ------------------------------------------
  subheadline: string;
  createdAt: string;
  
  // --- NEW: Theme Support ---
  // Note: Specific method types (like Coupon) will enforce the shape of 'style' via the shared interface above,
  // but we can define the generic property existence here if we want common access.
  // However, for strict typing, it is often better to leave 'style' on the specific interfaces 
  // if different methods have drastically different style needs.
  
  // For Strategy #2 (Adaptive Asset), we want a generic container for the "Light Mode" variant.
  // We use 'any' or a Union here if methods differ, or the specific interface if they share.
  // Let's add it to the specific interfaces to be type-safe.
}

export interface EmailCaptureMethod extends ConversionMethodBase {
  type: 'email_capture';
  submitButtonText: string;
  // --- Support for styling (spacing) ---
  style?: ConversionMethodStyle;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  required: boolean;
}

export interface FormSubmitMethod extends ConversionMethodBase {
  type: 'form_submit';
  fields: FormField[];
  submitButtonText: string;
}

export interface LinkRedirectMethod extends ConversionMethodBase {
  type: 'link_redirect';
  buttonText: string;
  url: string;
  utmEnabled?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CouponDisplayMethod extends ConversionMethodBase {
  type: 'coupon_display';
  codeType: 'static' | 'dynamic';
  staticCode?: string;
  discountType: 'percentage' | 'fixed_amount'; // for display
  discountValue: number; // for display
  clickToReveal?: boolean;
  revealScope?: 'entire_card' | 'code_only'; // --- NEW FIELD ---
  
  // --- Styling Configuration ---
  style?: ConversionMethodStyle;      // Default / Dark Theme
  lightStyle?: ConversionMethodStyle; // Light Theme Variant
}

export interface SocialFollowMethod extends ConversionMethodBase {
  type: 'social_follow';
  style?: {
    size?: number; // Container Width (%)
    spacing?: number; // Vertical Spacing
    iconSpacing?: number; // Horizontal gap between icons
    iconColor?: string;
    iconSize?: string;
  };
  // Add Light Theme support
  lightStyle?: {
    iconColor?: string;
  };
  links: {
    platform: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'x' | 'youtube';
    url: string;
    isEnabled: boolean;
  }[];
}

// A union type to represent any possible conversion method
export type ConversionMethod = EmailCaptureMethod | FormSubmitMethod | LinkRedirectMethod | CouponDisplayMethod | SocialFollowMethod;

// Represents the final screen in a macrogame, which hosts conversion methods.
export interface ConversionScreen {
  id: string;
  name: string; // Internal name for management
  status?: EntityStatus;

  // Content & Styling
  headline: string;
  bodyText: string;
  backgroundImageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  layout: 'single_column'; // Preparing for future layouts like 'two_column'

  // Hosted Methods with Gating Logic
  methods: {
    instanceId: string; // Unique ID for this specific instance on the screen
    methodId: string;   // ID of the ConversionMethod being used
    
    // --- Content Blocks for interleaved layout ---
    contentAbove?: string; // HTML string for content directly above this method
    contentBelow?: string; // HTML string for content directly below this method

    gate?: {
        type: 'on_success' | 'point_threshold' | 'point_purchase';
        
        // For 'on_success'
        methodInstanceId?: string; 
        visibility?: 'hidden' | 'locked_mask'; 
        replacePrerequisite?: boolean; // If true, hides the prerequisite method upon success

        // Note: For point types, the VALUE is stored in the Macrogame config.

        // Stores the custom styling for this specific gate's mask
        maskConfig?: MaskConfig;
    }
  }[];
}

// The result of a single microgame play.
export interface MicrogameResult {
  win: boolean;
}

// Props passed to every microgame component.
export interface MicrogameProps {
  onEnd: (result: MicrogameResult) => void;
  // Note: We allow flexible props like hitboxScale, color, and volume in the data object
  skinConfig: { [key: string]: { url: string; width?: number; height?: number; [key: string]: any } };
  gameData: Microgame;
  // Logic State: Is the game paused waiting for start?
  isOverlayVisible?: boolean;
  // Visual State: Should we actually render the black overlay box?
  hideOverlayVisuals?: boolean; 
  // Explicit control over the game loop
  isPlaying?: boolean; 
  onInteraction?: () => void;
  onReportEvent?: (eventName: string) => void;
  // New: For Editor/Builder feedback
  debugState?: {
      showHitboxId?: string | null; 
      activeMechanicId?: string | null;
  };
}

// Represents the currently active page in the main App component.
export interface CurrentPage {
  page: 'creator' | 'manager' | 'delivery' | 'microgames' | 'conversions' | 'campaigns';
}

// --- INTELLIGENCE LAYER (Guided Mode) ---

// 1. The Input Context (The "Selector")
// The engine matches these against the current user configuration.
export interface StrategySelector {
    aestheticId?: string;       // e.g., 'Retro'
    productCategoryId?: string; // e.g., 'Beauty & Cosmetics'
    subcategoryId?: string;     // e.g., 'Lips'
    seasonId?: string;          // e.g., 'christmas_holidays'
    audienceId?: string;        // e.g., 'gamer'
    goalId?: string;            // e.g., 'drive_sales'
}

// 2. The Rule Structure (The "Logic")
// T = The type of configuration this rule outputs (Style, Assets, or Mechanics)
export interface StrategyRule<T> {
    id: string;                 // Unique rule ID for debugging
    selectors: StrategySelector; // The conditions (AND logic)
    specificity: number;        // Priority Score (10=Base, 20=Category, 50=Season, 100=Exact)
    outcome: Partial<T>;        // The config to apply if matched
}

// 3. The Output Definitions

// A. Styling Outcome (Maps to SkinConfig)
// We use a subset of SkinConfig to ensure rules only touch safe visual properties.
export interface StyleOutcome {
    fontFamily?: string;
    colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        text?: string;
    };
    skinId?: string; // e.g. 'barebones' vs 'configurable-popup'
}

// B. Asset Outcome (Maps to Microgame Assets)
// Instead of hard URLs, we map to "Asset Keys" or "Tags" that we resolve later.
// This allows us to switch the actual image file without breaking the logic.
export interface AssetOutcome {
    [elementId: string]: { // e.g. 'player', 'obstacle', 'background'
        assetKey?: string;   // e.g. 'retro_lipstick_red'
        tintColor?: string;  // Fallback color if asset is missing
    };
}

// C. Mechanic Outcome (Maps to Mechanics)
export interface MechanicOutcome {
    [mechanicId: string]: any; // e.g. { playerSpeed: 2.5, duration: 15 }
}