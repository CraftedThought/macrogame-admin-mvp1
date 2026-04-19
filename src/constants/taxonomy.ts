/* src/constants/taxonomy.ts */

export const SECTORS = [
  'All',
  'Retail & E-commerce',
  'Food & Beverage',
  'Real Estate',
  'Local Services',
  'Creator & Media',
  'Non-Profit & Cause'
];

export const SECTOR_CATEGORIES: { [key: string]: string[] } = {
  'All': [],
  'Retail & E-commerce': ['Apparel & Fashion', 'Beauty & Cosmetics', 'Gaming & Electronics', 'Pet Products', 'Sporting Goods'],
  'Food & Beverage': ['Fine Dining', 'Quick Service', 'Cafes & Bakeries', 'Delivery & Catering'],
  'Real Estate': ['Residential', 'Commercial', 'Rentals', 'Property Management'],
  'Local Services': ['Salons & Spas', 'Fitness & Gyms', 'Home Services', 'Professional Services'],
  'Creator & Media': ['Digital Products', 'Merchandise', 'Subscriptions', 'Events'],
  'Non-Profit & Cause': ['Fundraising', 'Community Awareness', 'Event Registration']
};

export const CATEGORY_SUBCATEGORIES: { [key: string]: string[] } = {
  'All': [],
  // E-commerce
  'Apparel & Fashion': ['Womens', 'Mens', 'Kids', 'Shoes', 'Accessories', 'Jewelry', 'Streetwear', 'Activewear'],
  'Beauty & Cosmetics': ['Face', 'Lips', 'Skin', 'Body', 'Hair', 'Fragrance', 'Tools'],
  'Gaming & Electronics': ['Accessories', 'PC Components', 'PC Gaming', 'Consoles', 'Smart Home', 'Audio & Headphones'],
  'Pet Products': ['Food & Treats', 'Health', 'Walking Gear', 'Toys', 'Furniture'],
  'Sporting Goods': ['Outdoor', 'Fitness', 'Team Sports', 'Golf', 'Cycling'],
  // Food
  'Fine Dining': ['Reservations', 'Tasting Menus', 'Wine Pairings'],
  'Quick Service': ['Combos', 'Lunch Specials', 'Loyalty Rewards'],
  'Cafes & Bakeries': ['Coffee Subscriptions', 'Pastry Pre-orders', 'Merch'],
  'Delivery & Catering': ['Corporate Catering', 'Meal Prep', 'Grocery'],
  // Real Estate
  'Residential': ['Luxury Homes', 'Single Family', 'Condos', 'Townhouses'],
  'Commercial': ['Retail Space', 'Office Space', 'Industrial'],
  'Rentals': ['Long-term', 'Short-term', 'Vacation'],
  'Property Management': ['Tenant Services', 'Owner Portals'],
  // Local Services
  'Salons & Spas': ['Haircuts', 'Massage', 'Nail Care', 'Skincare'],
  'Fitness & Gyms': ['Personal Training', 'Group Classes', 'Memberships'],
  'Home Services': ['Landscaping', 'Cleaning', 'Repair & Maintenance'],
  'Professional Services': ['Consulting', 'Legal', 'Financial'],
  // Creator & Media
  'Digital Products': ['Courses', 'E-books', 'Templates', 'Software'],
  'Merchandise': ['Apparel', 'Accessories', 'Prints'],
  'Subscriptions': ['Newsletters', 'Exclusive Content', 'Patreon/Fan Clubs'],
  'Events': ['Webinars', 'Meetups', 'Workshops'],
  // Non-Profit
  'Fundraising': ['Donations', 'Charity Drives', 'Auctions'],
  'Community Awareness': ['Campaigns', 'Petitions', 'Volunteer Sign-ups'],
  'Event Registration': ['Galas', '5K Runs', 'Community Meetings']
};

export const SEASONALITY_OPTIONS = [
  // General Seasons (Broad)
  { id: 'spring_season', label: 'Spring Season' },
  { id: 'summer_season', label: 'Summer Season' },
  { id: 'fall_season', label: 'Fall Season' },
  { id: 'winter_season', label: 'Winter Season' },

  // Specific Holidays & Moments
  { id: 'evergreen', label: 'Evergreen (All Year)' },
  { id: 'new_year', label: 'New Year / Resolution' },
  { id: 'valentines', label: 'Valentine\'s Day' },
  { id: 'super_bowl', label: 'Big Game' },
  { id: 'spring_break', label: 'Spring Break' },
  { id: 'spring_cleaning', label: 'Spring Cleaning' },
  { id: 'mothers_day', label: 'Mother\'s Day' },
  { id: 'fathers_day', label: 'Father\'s Day' },
  { id: 'summer_sale', label: 'Summer Sale' },
  { id: 'back_to_school', label: 'Back to School' },
  { id: 'halloween', label: 'Halloween' },
  { id: 'thanksgiving', label: 'Thanksgiving' },
  { id: 'bfcm', label: 'Black Friday / Cyber Monday' },
  { id: 'christmas_holidays', label: 'Christmas / Holidays' }
];

// ------------------------------------------------------------------
// AESTHETICS: Visual Style & Vibe
// ------------------------------------------------------------------

export const AESTHETIC_CATEGORIES = [
  'Minimalist',
  'Industrial',
  'Elegant',
  'Vibrant',
  'Retro',
  'Organic',
  'Cyber'
];

export const AESTHETIC_SUBCATEGORIES: { [key: string]: string[] } = {
  'Minimalist': [
    'Clean', 'Scandinavian', 'Monochromatic', 'Airy', 'Swiss Style'
  ],
  'Industrial': [
    'Neobrutalism', 'High Contrast', 'Streetwear', 'Maximalist', 'Grunge'
  ],
  'Elegant': [
    'Classic', 'Modern Chic', 'Opulent', 'Editorial', 'Quiet Luxury'
  ],
  'Vibrant': [
    'Dopamine Decor', 'Kawaii', 'Pop Art', 'Memphis', 'Pastel'
  ],
  'Retro': [
    'Y2K', '90s Grunge', 'Synthwave', 'Pixel Art', 'Vintage'
  ],
  'Organic': [
    'Boho', 'Botanical', 'Cottagecore', 'Sustainable', 'Soft Gradient'
  ],
  'Cyber': [
    'Futuristic', 'Glassmorphism', 'Dark Mode', 'Bento Grid', 'Neon'
  ]
};

export const TARGET_AUDIENCE_OPTIONS = [
  { 
    id: 'social_shopper', 
    label: 'The Social Scroller', 
    persona: 'Discovers via TikTok/IG. Short attention span. Needs "Stop-the-Scroll" visuals.',
    motivators: ['Trends', 'Social Proof', 'Influencer validation']
  },
  { 
    id: 'deal_hunter', 
    label: 'The Value Hacker', 
    persona: 'Gamifies the shopping experience to get the best price. Will grind for a discount.',
    motivators: ['Winning', 'Exclusive Deals', 'Stacking Coupons']
  },
  { 
    id: 'validator', 
    label: 'The Validator', 
    persona: 'Anxious about quality. Reads every review. Needs reassurance before committing.',
    motivators: ['Trust Signals', 'Risk Reversal', 'Detailed Specs']
  },
  { 
    id: 'impulse_buyer', 
    label: 'The Dopamine Chaser', 
    persona: 'Buys for the rush. Reacts to scarcity, countdowns, and "New Drop" energy.',
    motivators: ['Urgency', 'Novelty', 'Instant Gratification']
  },
  { 
    id: 'loyalist', 
    label: 'The VIP / Insider', 
    persona: 'Repeater who identifies with the brand. Wants status, early access, and recognition.',
    motivators: ['Exclusivity', 'Status', 'Community']
  },
  { 
    id: 'gift_giver', 
    label: 'The Panic Giver', 
    persona: 'High intent, low product knowledge. Needs help deciding quickly.',
    motivators: ['Curation', 'Speed', 'Guaranteed Delivery']
  },
  { 
    id: 'curator', 
    label: 'The Aesthete', 
    persona: 'High standards. Hates "cheap" gimmicks. Only engages if the design is premium.',
    motivators: ['Aesthetics', 'Quality', 'Brand Story']
  }
];

export const PROMOTION_COMPATIBILITY_OPTIONS = [
  { 
    id: 'high_value_unlock', 
    label: 'High Stakes (20%+ Off)', 
    description: 'Harder games. User feels they "earned" the big discount. Reduces code sharing.' 
  },
  { 
    id: 'low_friction_nudge', 
    label: 'Low Friction (Free Ship)', 
    description: 'Easy, fast games. Just enough engagement to stop an exit bounce.' 
  },
  { 
    id: 'mystery_gacha', 
    label: 'Mystery / Gacha', 
    description: 'Unknown reward. High curiosity. "Open the box to see what you got."' 
  },
  { 
    id: 'drop_culture', 
    label: 'The "Drop" (Scarcity)', 
    description: 'Access to a limited product or early release instead of a discount.' 
  },
  { 
    id: 'community_challenge', 
    label: 'Community Goal', 
    description: 'Collective score unlocks a site-wide reward. "If we hit 1M points, everyone gets 30% off."' 
  },
  { 
    id: 'giveaway_entry', 
    label: 'Sweepstakes Entry', 
    description: 'No guaranteed prize. High engagement, low margin cost. "Top 10 scores win."' 
  }
];