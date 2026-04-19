/* src/constants/pillars.ts */

// Add this to make the IDs strictly typed for your Rules Engine
export type PillarId = keyof typeof PILLARS;

export const PILLARS = {
  capture_leads: {
    id: 'capture_leads',
    label: 'Capture Leads',
    shortDescription: 'Build your email and SMS list.',
    fullDescription: 'Focus on acquiring owned audience data. High value rewards are exchanged for user contact information.',
    
    // "Real World Examples" - These become the Templates in the Wizard
    tactics: [
      { 
        id: 'newsletter_signup', 
        label: 'Newsletter Signup', 
        description: 'Standard email collection for marketing flows.' 
      },
      { 
        id: 'sms_optin', 
        label: 'SMS / Text List', 
        description: 'Mobile number collection for high-conversion text campaigns.' 
      },
      { 
        id: 'account_creation', 
        label: 'Loyalty Account Signup', 
        description: 'Encourage users to create a store account to save progress or points.' 
      },
      { 
        id: 'waitlist_join', 
        label: 'Waitlist / Early Access', 
        description: 'Collect leads for an upcoming product drop or out-of-stock item.' 
      },
      { 
        id: 'consultation_request', 
        label: 'Schedule Demo / Call', 
        description: 'For high-ticket or B2B items requiring a sales conversation.' 
      }
    ]
  },

  drive_sales: {
    id: 'drive_sales',
    label: 'Drive Sales',
    shortDescription: 'Turn visitors into buyers & increase AOV.',
    fullDescription: 'Focus on immediate revenue generation. Incentives are designed to be redeemed "now" rather than later.',
    
    tactics: [
      { 
        id: 'convert_new_visitor', 
        label: 'First-Time Buyer Conversion', 
        description: 'Offer a discount to nudge a new visitor to make their first purchase.' 
      },
      { 
        id: 'increase_aov', 
        label: 'Increase Average Order Value', 
        description: 'Unlock rewards only after reaching a high score or spending threshold.' 
      },
      { 
        id: 'clear_inventory', 
        label: 'Flash Sale / Clearance', 
        description: 'Aggressive promotion to move specific overstocked items.' 
      },
      { 
        id: 'abandoned_cart', 
        label: 'Cart Abandonment Recovery', 
        description: 'Triggered on exit-intent to save a sale before the user leaves.' 
      },
      { 
        id: 'gift_with_purchase', 
        label: 'Gift with Purchase', 
        description: 'Offer a free physical item instead of a discount code.' 
      }
    ]
  },

  boost_engagement: {
    id: 'boost_engagement',
    label: 'Boost Engagement',
    shortDescription: 'Grow brand awareness & social following.',
    fullDescription: 'Focus on top-of-funnel metrics and brand affinity. Low friction interactions that encourage sharing and learning.',
    
    tactics: [
      { 
        id: 'grow_social', 
        label: 'Grow Social Following', 
        description: 'Incentivize users to follow on Instagram, TikTok, etc.' 
      },
      { 
        id: 'product_discovery', 
        label: 'Product Discovery', 
        description: 'Help users find the right product through quizzes or choice-based games.' 
      },
      { 
        id: 'brand_education', 
        label: 'Brand Education', 
        description: 'Trivia or matching games that teach users about your unique selling points.' 
      },
      { 
        id: 'collect_feedback', 
        label: 'Survey / Feedback', 
        description: 'Gamified polls to learn more about customer preferences.' 
      },
      { 
        id: 'referral_sharing', 
        label: 'Referral & Sharing', 
        description: 'Reward users for sharing the game or brand with friends.' 
      }
    ]
  }
} as const; // 'as const' makes the IDs read-only and strict for TypeScript