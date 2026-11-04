BEGIN;
CREATE TABLE public.store_registrations (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
 access_state text NOT NULL CHECK(access_state IN ('pilot','pending_payment','paid')),
 business_type text NOT NULL,
 city text,
 holder_first_name text NOT NULL,
 holder_last_name text NOT NULL,
 holder_phone text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_registrations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.store_registrations TO authenticated;
CREATE POLICY registration_owner_read ON public.store_registrations FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_pilot_code(p_code text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT upper(trim(coalesce(p_code,'')))='TIENDASMART-PILOTO-2026' $$;
REVOKE ALL ON FUNCTION public.validate_pilot_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_pilot_code(text) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_store_for_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_meta jsonb:=coalesce(NEW.raw_user_meta_data,'{}'); v_pilot boolean; v_store uuid; v_name text; v_first text; v_last text; v_phone text; v_business_phone text; v_type text; v_slug text; v_base text; v_suffix integer:=0;
BEGIN
 v_name:=trim(coalesce(v_meta->>'business_name',''));v_type:=trim(coalesce(v_meta->>'business_type',''));
 v_first:=trim(coalesce(v_meta->>'first_name',''));v_last:=trim(coalesce(v_meta->>'last_name',''));
 v_phone:=regexp_replace(coalesce(v_meta->>'holder_phone',''),'[^0-9]','','g');v_business_phone:=regexp_replace(coalesce(v_meta->>'business_phone',''),'[^0-9]','','g');
 IF length(v_name)<2 OR length(v_name)>120 OR length(v_type)<2 OR length(v_type)>100 OR length(v_first)<2 OR length(v_first)>80 OR length(v_last)<2 OR length(v_last)>80 OR length(v_phone)<8 OR length(v_phone)>15 OR length(v_business_phone)<8 OR length(v_business_phone)>15 OR length(coalesce(v_meta->>'city',''))>120 THEN RAISE EXCEPTION 'Datos de registro incompletos o inválidos'; END IF;
 v_pilot:=coalesce(v_meta->>'use_pilot_code','false')='true';
 IF v_pilot AND NOT public.validate_pilot_code(v_meta->>'pilot_code') THEN RAISE EXCEPTION 'Código TiendaSmart inválido'; END IF;
 -- Serialize generated slugs; prevents races between registrations with the same name.
 v_base:=trim(both '-' from regexp_replace(lower(public.unaccent(v_name)),'[^a-z0-9]+','-','g'));v_base:=left(v_base,60);
 IF v_base='' THEN v_base:='tienda'; END IF;
 IF v_base IN ('admin','api','login','signup','auth','debug-user','debug-membership','_sites') THEN v_base:='tienda-'||v_base; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('tiendasmart-signup-slug'));
 v_slug:=v_base;
 WHILE EXISTS(SELECT 1 FROM public.stores WHERE slug=v_slug OR subdomain=v_slug) LOOP v_suffix:=v_suffix+1;v_slug:=v_base||'-'||v_suffix;END LOOP;
 INSERT INTO public.stores(name,slug,subdomain,plan,is_active,whatsapp_number) VALUES(v_name,v_slug,v_slug,'pro',v_pilot,v_business_phone) RETURNING id INTO v_store;
 INSERT INTO public.store_users(store_id,user_id,role) VALUES(v_store,NEW.id,'owner');
 INSERT INTO public.profiles(id,full_name,email) VALUES(NEW.id,v_first||' '||v_last,NEW.email) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.store_registrations(user_id,store_id,access_state,business_type,city,holder_first_name,holder_last_name,holder_phone) VALUES(NEW.id,v_store,CASE WHEN v_pilot THEN 'pilot' ELSE 'pending_payment' END,v_type,nullif(trim(v_meta->>'city'),''),v_first,v_last,v_phone);
 -- Code is an input to this transaction, never a reusable authorization claim.
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.create_store_for_user() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.guard_pending_store_activation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.is_active AND EXISTS(SELECT 1 FROM public.store_registrations WHERE store_id=NEW.id AND access_state='pending_payment') THEN RAISE EXCEPTION 'Tienda pendiente de activación de pago'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_pending_store_activation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_pending_store_activation BEFORE UPDATE OF is_active ON public.stores FOR EACH ROW EXECUTE FUNCTION public.guard_pending_store_activation();
COMMIT;
-- Plans are assigned by registration/payment logic, not editable by the browser.
REVOKE UPDATE ON public.stores FROM authenticated;
GRANT UPDATE(name,slug,subdomain,custom_domain,is_active,whatsapp_number,logo_url,cover_url,google_analytics_id,google_analytics_property_id) ON public.stores TO authenticated;
