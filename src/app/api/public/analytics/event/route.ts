import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'send_to_whatsapp',
  'contact_whatsapp',
]);

function getSessionId(request: NextRequest) {
  const fromHeader = request.headers.get('x-session-id');
  if (fromHeader) return fromHeader;

  const cookieValue = request.cookies.get('ts_session_id')?.value;
  if (cookieValue) return cookieValue;

  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventId = typeof body.eventId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventId) ? body.eventId : crypto.randomUUID();
    const storeSlug = String(body.storeSlug ?? '').trim();
    const eventName = String(body.eventName ?? '').trim();
    const productId =
      body.productId && String(body.productId).trim()
        ? String(body.productId).trim()
        : null;
    const metadata =
      body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!storeSlug) {
      return NextResponse.json({ error: 'Falta storeSlug' }, { status: 400 });
    }

    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json(
        { error: 'Evento no permitido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, slug, is_active')
      .eq('slug', storeSlug)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    const sessionId = typeof body.sessionId === 'string' && /^[0-9a-f-]{36}$/i.test(body.sessionId) ? body.sessionId : getSessionId(request);

    const { error: insertError } = await supabase.rpc('record_analytics_event', {
      p_event_id: eventId,
      p_store_id: store.id,
      p_event_name: eventName,
      p_product_id: productId,
      p_session_id: sessionId,
      p_metadata: { ...metadata, client_at: typeof body.occurredAt === 'string' && Math.abs(Date.now()-Date.parse(body.occurredAt)) < 5*60000 ? body.occurredAt : new Date().toISOString() },
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });

    if (!request.cookies.get('ts_session_id')?.value) {
      response.cookies.set('ts_session_id', sessionId, {
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}