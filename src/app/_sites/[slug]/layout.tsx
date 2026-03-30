import { createClient } from '@/lib/supabase/server';
import GoogleAnalytics from '@/components/store/GoogleAnalytics';
import AttributionTracker from '@/components/store/AttributionTracker';

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function StoreLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('google_analytics_id, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  const measurementId = store?.google_analytics_id ?? '';

  return (
    <>
      <AttributionTracker storeSlug={slug} />
      {children}
      <GoogleAnalytics measurementId={measurementId} />
    </>
  );
}