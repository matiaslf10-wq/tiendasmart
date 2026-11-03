-- Analytics security repair. Atomic; no business rows removed.
BEGIN;
CREATE TABLE IF NOT EXISTS public.store_analytics_keys (
 store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
 api_key text NOT NULL UNIQUE
);
ALTER TABLE public.store_analytics_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_analytics_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.store_analytics_keys TO authenticated;
CREATE POLICY analytics_keys_owner_admin ON public.store_analytics_keys FOR ALL TO authenticated
 USING (EXISTS(SELECT 1 FROM public.store_users su JOIN public.stores s ON s.id=su.store_id WHERE su.store_id=store_analytics_keys.store_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin') AND s.plan IN ('pro','intelligence') AND s.is_active))
 WITH CHECK (EXISTS(SELECT 1 FROM public.store_users su JOIN public.stores s ON s.id=su.store_id WHERE su.store_id=store_analytics_keys.store_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin') AND s.plan IN ('pro','intelligence') AND s.is_active));
-- Previously public keys must not remain valid.
INSERT INTO public.store_analytics_keys(store_id, api_key)
 SELECT id, 'tsk_' || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') FROM public.stores WHERE analytics_api_key IS NOT NULL;
UPDATE public.stores SET analytics_api_key=NULL WHERE analytics_api_key IS NOT NULL;
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT(id,name,slug,plan,is_active,created_at,subdomain,custom_domain,whatsapp_number,logo_url,cover_url,google_analytics_id,google_analytics_property_id) ON public.stores TO anon;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_events,public.categories,public.order_status_history FROM anon,authenticated;
GRANT SELECT,INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT ON public.categories TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.categories TO authenticated;
GRANT SELECT,INSERT ON public.order_status_history TO authenticated;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS event_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_event_id_unique UNIQUE(event_id);
CREATE POLICY analytics_member_read ON public.analytics_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.store_users su WHERE su.store_id=analytics_events.store_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin')));
CREATE POLICY analytics_public_insert ON public.analytics_events FOR INSERT TO anon,authenticated
 WITH CHECK(event_name IN ('view_item','add_to_cart','begin_checkout','send_to_whatsapp','contact_whatsapp') AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=analytics_events.store_id AND s.is_active) AND (product_id IS NULL OR EXISTS(SELECT 1 FROM public.products p WHERE p.id=analytics_events.product_id AND p.store_id=analytics_events.store_id AND p.is_active)));
CREATE POLICY categories_visible ON public.categories FOR SELECT TO anon,authenticated
 USING((is_active AND EXISTS(SELECT 1 FROM public.stores s WHERE s.id=categories.store_id AND s.is_active)) OR EXISTS(SELECT 1 FROM public.store_users su WHERE su.store_id=categories.store_id AND su.user_id=(SELECT auth.uid())));
CREATE POLICY categories_admin_write ON public.categories FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.store_users su WHERE su.store_id=categories.store_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin')))
 WITH CHECK(EXISTS(SELECT 1 FROM public.store_users su WHERE su.store_id=categories.store_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin')));
CREATE POLICY history_member_read ON public.order_status_history FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.store_users su WHERE su.store_id=order_status_history.store_id AND su.user_id=(SELECT auth.uid())));
CREATE POLICY history_admin_insert ON public.order_status_history FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.store_users su JOIN public.orders o ON o.store_id=su.store_id WHERE su.store_id=order_status_history.store_id AND o.id=order_status_history.order_id AND su.user_id=(SELECT auth.uid()) AND su.role IN ('owner','admin')));

-- Deliberate capability endpoint: accepts only a protected key, active Pro store,
-- fixed date bounds; returns only the matching store. No dynamic SQL.
CREATE OR REPLACE FUNCTION public.analytics_export(p_api_key text,p_start timestamptz DEFAULT NULL,p_end timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_store public.stores%ROWTYPE; v_orders jsonb; v_items jsonb; v_products jsonb;
BEGIN
 IF p_api_key IS NULL OR length(p_api_key)<20 THEN RETURN NULL; END IF;
 SELECT s.* INTO v_store FROM public.stores s JOIN public.store_analytics_keys k ON k.store_id=s.id WHERE k.api_key=p_api_key AND s.is_active AND s.plan IN ('pro','intelligence');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(o)),'[]'::jsonb) INTO v_orders FROM public.orders o WHERE o.store_id=v_store.id AND (p_start IS NULL OR o.created_at>=p_start) AND (p_end IS NULL OR o.created_at<p_end);
 SELECT coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object('orders',to_jsonb(o))),'[]'::jsonb) INTO v_items FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE o.store_id=v_store.id AND (p_start IS NULL OR o.created_at>=p_start) AND (p_end IS NULL OR o.created_at<p_end);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'category_id',p.category_id,'categories',jsonb_build_object('name',c.name))),'[]'::jsonb) INTO v_products FROM public.products p LEFT JOIN public.categories c ON c.id=p.category_id AND c.store_id=p.store_id WHERE p.store_id=v_store.id;
 RETURN jsonb_build_object('store',jsonb_build_object('id',v_store.id,'name',v_store.name,'slug',v_store.slug),'orders',v_orders,'items',v_items,'products',v_products);
END $$;
REVOKE ALL ON FUNCTION public.analytics_export(text,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_export(text,timestamptz,timestamptz) TO anon,authenticated;
COMMIT;
