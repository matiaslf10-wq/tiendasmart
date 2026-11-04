import AttributionTracker from '@/components/store/AttributionTracker';
export default async function StoreLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}) {
 const {slug}=await params;
 return <><AttributionTracker storeSlug={slug}/>{children}</>;
}
