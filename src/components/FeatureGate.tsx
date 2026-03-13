'use client';

import { ReactNode } from 'react';
import { Feature, hasFeature } from '@/lib/plans';

type Props = {
  plan: string;
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
  if (!hasFeature(plan as any, feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}