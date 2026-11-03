CREATE OR REPLACE FUNCTION public.record_analytics_event(p_event_id uuid,p_store_id uuid,p_event_name text,p_product_id uuid,p_session_id text,p_metadata jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_event_name NOT IN ('view_item','add_to_cart','begin_checkout','send_to_whatsapp','contact_whatsapp') OR p_event_id IS NULL THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=p_store_id AND is_active) THEN RAISE EXCEPTION 'Tienda no disponible'; END IF;
 IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_product_id AND store_id=p_store_id AND is_active) THEN RAISE EXCEPTION 'Producto inválido'; END IF;
 IF length(coalesce(p_session_id,''))>200 OR octet_length(coalesce(p_metadata,'{}'::jsonb)::text)>8192 THEN RAISE EXCEPTION 'Evento demasiado grande'; END IF;
 INSERT INTO public.analytics_events(event_id,store_id,event_name,product_id,session_id,metadata)
 VALUES(p_event_id,p_store_id,p_event_name,p_product_id,p_session_id,coalesce(p_metadata,'{}'::jsonb)) ON CONFLICT(event_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.record_analytics_event(uuid,uuid,text,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_analytics_event(uuid,uuid,text,uuid,text,jsonb) TO anon,authenticated;
