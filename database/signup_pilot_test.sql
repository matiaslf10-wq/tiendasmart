BEGIN;
DO $$
DECLARE v_pilot uuid:=gen_random_uuid();v_paid uuid:=gen_random_uuid();v_bad uuid:=gen_random_uuid();v_store uuid;v_state text;v_active boolean;v_plan text;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(v_pilot,'qa-pilot-'||v_pilot||'@example.invalid',jsonb_build_object('business_name','QA Registro Piloto','business_type','Pruebas','business_phone','5491100000000','first_name','Titular','last_name','Ficticio','holder_phone','1100000000','use_pilot_code',true,'pilot_code','TIENDASMART-PILOTO-2026'));
 SELECT r.store_id,r.access_state,s.is_active,s.plan INTO v_store,v_state,v_active,v_plan FROM public.store_registrations r JOIN public.stores s ON s.id=r.store_id WHERE r.user_id=v_pilot;
 IF v_state<>'pilot' OR NOT v_active OR v_plan<>'pro' THEN RAISE EXCEPTION 'Pilot signup failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.store_users WHERE store_id=v_store AND user_id=v_pilot AND role='owner') OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_pilot AND full_name='Titular Ficticio') THEN RAISE EXCEPTION 'Membership/profile missing';END IF;
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(v_paid,'qa-paid-'||v_paid||'@example.invalid',jsonb_build_object('business_name','QA Registro Piloto','business_type','Pruebas','business_phone','5491100000000','first_name','Titular','last_name','Ficticio','holder_phone','1100000000','use_pilot_code',false,'pilot_code','TIENDASMART-PILOTO-2026','plan','intelligence'));
 SELECT r.store_id,r.access_state,s.is_active,s.plan INTO v_store,v_state,v_active,v_plan FROM public.store_registrations r JOIN public.stores s ON s.id=r.store_id WHERE r.user_id=v_paid;
 IF v_state<>'pending_payment' OR v_active OR v_plan<>'pro' THEN RAISE EXCEPTION 'Paid gate failed';END IF;
 BEGIN UPDATE public.stores SET is_active=true WHERE id=v_store;RAISE EXCEPTION 'Pending store activation bypass';EXCEPTION WHEN OTHERS THEN IF SQLERRM='Pending store activation bypass' THEN RAISE;END IF;END;
 UPDATE auth.users SET raw_user_meta_data=raw_user_meta_data||'{"use_pilot_code":true,"pilot_code":"TIENDASMART-PILOTO-2026"}'::jsonb WHERE id=v_paid;
 IF (SELECT access_state FROM public.store_registrations WHERE user_id=v_paid)<>'pending_payment' THEN RAISE EXCEPTION 'Editable metadata changed entitlement';END IF;
 BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(v_bad,'qa-invalid-'||v_bad||'@example.invalid',jsonb_build_object('business_name','QA Registro Inválido','business_type','Pruebas','business_phone','5491100000000','first_name','Titular','last_name','Ficticio','holder_phone','1100000000','use_pilot_code',true,'pilot_code','INVALIDO'));
 RAISE EXCEPTION 'Invalid code accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Invalid code accepted' THEN RAISE;END IF;END;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=v_bad) THEN RAISE EXCEPTION 'Partial user persisted';END IF;
 IF has_table_privilege('authenticated','public.store_registrations','UPDATE') OR has_table_privilege('anon','public.store_registrations','SELECT') THEN RAISE EXCEPTION 'Registry privileges exposed';END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_pilot,'role','authenticated')::text,true);
END$$;
SET LOCAL ROLE authenticated;
DO $$BEGIN IF (SELECT count(*) FROM public.store_registrations)<>1 THEN RAISE EXCEPTION 'Registration isolation failed';END IF;END$$;
SELECT 'PASS: pilot Pro active, payment pending inactive, owner/profile created, slug collision handled, invalid code atomic rollback, editable metadata cannot grant access, activation bypass blocked, registry isolated' AS result;
ROLLBACK;
