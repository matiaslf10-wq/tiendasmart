BEGIN;
INSERT INTO public.stores(id,name,slug,plan) VALUES ('11111111-9a00-4000-8000-000000000001','QA A','qa-security-a-20261103','pro'),('11111111-9a00-4000-8000-000000000002','QA B','qa-security-b-20261103','pro');
INSERT INTO public.store_analytics_keys VALUES ('11111111-9a00-4000-8000-000000000001','QA_FAKE_SECRET_A_20261103_12345678'),('11111111-9a00-4000-8000-000000000002','QA_FAKE_SECRET_B_20261103_12345678');
INSERT INTO public.store_users(store_id,user_id,role) SELECT '11111111-9a00-4000-8000-000000000001',id,'owner' FROM auth.users ORDER BY created_at LIMIT 1;
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT user_id FROM public.store_users WHERE store_id='11111111-9a00-4000-8000-000000000001'),'role','authenticated')::text,true);
INSERT INTO public.orders(id,store_id,order_number,customer_name,customer_phone,total,status) VALUES ('11111111-9a00-4000-8000-000000000011','11111111-9a00-4000-8000-000000000001',-910001,'QA A','0000000000',100,'delivered'),('11111111-9a00-4000-8000-000000000012','11111111-9a00-4000-8000-000000000002',-910002,'QA B','0000000000',900,'cancelled');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF has_table_privilege('anon','public.store_analytics_keys','SELECT') OR has_column_privilege('anon','public.stores','analytics_api_key','SELECT') OR has_table_privilege('anon','public.analytics_events','SELECT') OR has_table_privilege('anon','public.order_status_history','INSERT') THEN RAISE EXCEPTION 'Public exposure regression'; END IF;
 IF public.analytics_export('INVALID_KEY_20261103_12345678') IS NOT NULL THEN RAISE EXCEPTION 'Invalid key accepted'; END IF;
 IF jsonb_array_length(public.analytics_export('QA_FAKE_SECRET_A_20261103_12345678')->'orders')<>1 THEN RAISE EXCEPTION 'Export isolation failed'; END IF;
 IF (public.analytics_export('QA_FAKE_SECRET_A_20261103_12345678')->'orders'->0->>'total')::numeric<>100 THEN RAISE EXCEPTION 'Wrong export total'; END IF;
END $$;
SELECT public.record_analytics_event('11111111-9a00-4000-8000-000000000021','11111111-9a00-4000-8000-000000000001','view_item',null,'qa-session','{}');
SELECT public.record_analytics_event('11111111-9a00-4000-8000-000000000021','11111111-9a00-4000-8000-000000000001','view_item',null,'qa-session','{}');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.store_analytics_keys WHERE store_id IN ('11111111-9a00-4000-8000-000000000001','11111111-9a00-4000-8000-000000000002'))<>1 THEN RAISE EXCEPTION 'Owner key isolation failed'; END IF;
 IF (SELECT count(*) FROM public.analytics_events WHERE store_id='11111111-9a00-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Owner event access or deduplication failed'; END IF;
END $$;
RESET ROLE;
UPDATE public.store_users SET role='staff' WHERE store_id='11111111-9a00-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.store_analytics_keys WHERE store_id='11111111-9a00-4000-8000-000000000001') THEN RAISE EXCEPTION 'Staff can read key'; END IF;
 IF EXISTS(SELECT 1 FROM public.analytics_events WHERE store_id='11111111-9a00-4000-8000-000000000001') THEN RAISE EXCEPTION 'Staff can read analytics'; END IF;
END $$;
SELECT 'PASS: anonymous access blocked; export scoped; invalid key rejected; owner scoped; staff blocked; event deduplicated; transaction rolled back' AS result;
ROLLBACK;
