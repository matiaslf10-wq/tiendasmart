'use client';

import { ReactNode } from 'react';
import { Feature, Plan, hasFeature } from '@/lib/plans';

type Props = {
  plan: Plan;
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function FeatureGate({
  plan,
  feature,
  children,
  fallback = null,
}: Props) {
  if (!hasFeature(plan, feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}