BEGIN;
-- Anonymous ingestion accepts visits, never order_created (server-only).
CREATE OR REPLACE FUNCTION public.record_analytics_event(p_event_id uuid,p_store_id uuid,p_event_name text,p_product_id uuid,p_session_id text,p_metadata jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_event_name NOT IN ('page_view','view_item','add_to_cart','begin_checkout','send_to_whatsapp','contact_whatsapp') OR p_event_id IS NULL THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active) THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
 IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product_id AND store_id=p_store_id AND is_active) THEN RAISE EXCEPTION 'Producto inválido'; END IF;
 IF length(coalesce(p_session_id,''))>200 OR octet_length(coalesce(p_metadata,'{}'::jsonb)::text)>8192 THEN RAISE EXCEPTION 'Evento demasiado grande'; END IF;
 INSERT INTO public.analytics_events(event_id,store_id,event_name,product_id,session_id,metadata)
 VALUES(p_event_id,p_store_id,p_event_name,p_product_id,p_session_id,coalesce(p_metadata,'{}'::jsonb)) ON CONFLICT(event_id) DO NOTHING;
END $$;
-- Write only through the validated function, not arbitrary REST inserts.
REVOKE INSERT ON public.analytics_events FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_order_analytics() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.analytics_events(event_id,store_id,event_name,session_id,metadata,created_at)
 VALUES(NEW.id,NEW.store_id,'order_created',left(NEW.metadata->>'analytics_session_id',200),
 jsonb_build_object('client_at',NEW.metadata->>'analytics_client_at','order_id',NEW.id,'visitor_id',NEW.metadata->>'visitor_id','traffic_source',NEW.metadata->>'traffic_source','traffic_campaign',NEW.metadata->>'traffic_campaign'),NEW.created_at)
 ON CONFLICT(event_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_order_analytics() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_native_analytics AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.record_order_analytics();
CREATE INDEX IF NOT EXISTS analytics_events_store_created_id_idx ON public.analytics_events(store_id,created_at,id);
COMMIT;
-- Checkout always uses create_order_atomic; callers cannot forge order rows/events.
REVOKE INSERT, DELETE ON public.orders FROM anon;
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.order_items FROM anon,authenticated;
