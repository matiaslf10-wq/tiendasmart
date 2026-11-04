import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export default async function CompleteSignup(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data,error}=await db.from('store_registrations').select('access_state').eq('user_id',user.id).maybeSingle();
 if(error)throw new Error('No se pudo comprobar el registro. Volvé a ingresar.');
 redirect(data?.access_state==='pending_payment'?'/signup/cobro':'/admin');
}
