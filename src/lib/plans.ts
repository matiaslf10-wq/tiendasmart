export type Plan = 'esencial' | 'pro' | 'intelligence';

export type Feature =
  | 'products'
  | 'categories'
  | 'basic_orders'
  | 'custom_domain'
  | 'coupons'
  | 'advanced_analytics'
  | 'abandoned_cart'
  | 'whatsapp_automation'
  | 'ai_descriptions'
  | 'smart_insights';

export const PLAN_FEATURES: Record<Plan, Feature[]> = {
  esencial: [
    'products',
    'categories',
    'basic_orders',
  ],

  pro: [
    'products',
    'categories',
    'basic_orders',
    'custom_domain',
    'coupons',
    'advanced_analytics',
    'abandoned_cart',
  ],

  intelligence: [
    'products',
    'categories',
    'basic_orders',
    'custom_domain',
    'coupons',
    'advanced_analytics',
    'abandoned_cart',
    'whatsapp_automation',
    'ai_descriptions',
    'smart_insights',
  ],
};

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.includes(feature) ?? false;
}