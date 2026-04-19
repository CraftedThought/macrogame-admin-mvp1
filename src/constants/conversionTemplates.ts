/* src/constants/conversionTemplates.ts */

export interface ConversionTemplate {
  id: string;
  tacticId: string; // Links back to PILLARS.tactics.id
  name: string; // Display name
  description: string; // Strategy explanation
  
  // The configuration to load into the Builder
  config: {
    headline: string;
    bodyText: string;
    layout: 'single_column'; 
    methods: {
      type: 'coupon_display' | 'email_capture' | 'link_redirect' | 'social_follow' | 'form_submit';
      contentAbove?: string;
      contentBelow?: string;
      gate?: {
        type: 'none' | 'on_success' | 'point_threshold' | 'point_purchase';
        methodInstanceId?: string; // Placeholder: "previous" implies logic to link to previous method
        visibility?: 'hidden' | 'locked_mask';
        replacePrerequisite?: boolean;
        maskConfig?: {
            headline: string;
            showIcon: boolean;
            style: { backgroundColor: string; textColor: string; strokeColor: string };
        };
      };
      // Partial defaults for the method itself
      data?: any; 
    }[];
  };
}

export const CONVERSION_TEMPLATES: ConversionTemplate[] = [
  
  // --- DRIVE SALES: CONVERT NEW VISITOR ---
  
  {
    id: 'soft_landing',
    tacticId: 'convert_new_visitor',
    name: 'Soft Landing (Low Friction)',
    description: 'Immediate access to the discount. Best for impatient visitors or lower-margin items where you just want the sale.',
    config: {
      headline: '<h2 style="text-align: center;">Welcome! Here is your gift.</h2>',
      bodyText: '<p style="text-align: center;">Thanks for playing! Use this code at checkout.</p>',
      layout: 'single_column',
      methods: [
        {
          type: 'coupon_display',
          gate: { type: 'none' },
          data: {
             headline: '<h2 style="text-align: center;">10% OFF</h2>',
             subheadline: '<p style="text-align: center;">Valid for 24 hours.</p>'
          }
        },
        {
          type: 'link_redirect',
          gate: { type: 'none' },
          contentAbove: '',
          data: {
              buttonText: 'Shop Best Sellers',
              url: '/collections/best-sellers'
          }
        }
      ]
    }
  },
  {
    id: 'earned_discount',
    tacticId: 'convert_new_visitor',
    name: 'Earned Discount (Gamified)',
    description: 'Locks the discount behind a score threshold. Leverages the "Endowment Effect"—users value the coupon more because they "won" it.',
    config: {
      headline: '<h2 style="text-align: center;">Did you win?</h2>',
      bodyText: '<p style="text-align: center;">Check below to see if you scored high enough to unlock the reward.</p>',
      layout: 'single_column',
      methods: [
        {
          type: 'coupon_display',
          gate: { 
              type: 'point_threshold',
              maskConfig: {
                  headline: "Score 500+ to Unlock",
                  showIcon: true,
                  style: { backgroundColor: '#cfc33a', textColor: '#000000', strokeColor: '#000000' }
              }
          },
          data: {
             headline: '<h2 style="text-align: center;">WINNER!</h2>',
             subheadline: '<p style="text-align: center;">You crushed it. Here is 20% off.</p>'
          }
        }
      ]
    }
  },

  // --- CAPTURE LEADS: NEWSLETTER SIGNUP ---

  {
    id: 'standard_promise',
    tacticId: 'newsletter_signup',
    name: 'The Standard Promise',
    description: 'A fair trade: Contact info in exchange for a discount code. The industry standard.',
    config: {
      headline: '<h2 style="text-align: center;">Unlock Your Score</h2>',
      bodyText: '<p style="text-align: center;">Join our club to save your high score and get a reward.</p>',
      layout: 'single_column',
      methods: [
        {
          type: 'email_capture',
          gate: { type: 'none' },
          data: {
              headline: '<h2 style="text-align: center;">Sign Up</h2>',
              subheadline: '<p style="text-align: center;">We send 2 emails a month. No spam.</p>',
              submitButtonText: 'Reveal My Reward'
          }
        },
        {
          type: 'coupon_display',
          gate: { 
              type: 'on_success', 
              visibility: 'hidden', // Completely hide until email is entered
              replacePrerequisite: true // Swaps the form for the coupon
          },
          data: {
              headline: '<h2 style="text-align: center;">Welcome to the Club!</h2>'
          }
        }
      ]
    }
  },
  {
    id: 'mystery_reward',
    tacticId: 'newsletter_signup',
    name: 'Mystery Reward (High Curiosity)',
    description: 'Uses a locked "Secret" mask to drive curiosity. Higher conversion rate, but potentially lower lead quality.',
    config: {
      headline: '<h2 style="text-align: center;">Secret Prize Found!</h2>',
      bodyText: '<p style="text-align: center;">You found a hidden reward box. Enter your email to open it.</p>',
      layout: 'single_column',
      methods: [
        {
          type: 'email_capture',
          gate: { type: 'none' },
          contentBelow: '<p style="text-align: center; font-size: 0.8rem;">Enter email to unlock.</p>'
        },
        {
          type: 'coupon_display',
          gate: { 
              type: 'on_success', 
              visibility: 'locked_mask', // Show the lock
              maskConfig: {
                  headline: "SECRET REWARD",
                  showIcon: true,
                  style: { backgroundColor: '#1a1a1a', textColor: '#ffffff', strokeColor: '#cfc33a' }
              }
          }
        }
      ]
    }
  },

  // --- BOOST ENGAGEMENT: GROW SOCIAL ---

  {
    id: 'social_unlock',
    tacticId: 'grow_social',
    name: 'Social Unlock',
    description: 'Incentivize followers by locking a small reward behind a social action.',
    config: {
      headline: '<h2 style="text-align: center;">Join the Family</h2>',
      bodyText: '<p style="text-align: center;">Follow us to get a free shipping code.</p>',
      layout: 'single_column',
      methods: [
        {
          type: 'social_follow',
          gate: { type: 'none' },
          data: {
              headline: '<h2 style="text-align: center;">Follow Us</h2>'
          }
        },
        {
          type: 'coupon_display',
          gate: { 
              type: 'on_success', 
              visibility: 'locked_mask',
              maskConfig: {
                  headline: "LOCKED",
                  showIcon: true,
                  style: { backgroundColor: '#ddd', textColor: '#555', strokeColor: '#aaa' }
              }
          }
        }
      ]
    }
  }
];