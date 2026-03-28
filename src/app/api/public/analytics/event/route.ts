import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_EVENTS = new Set([
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'send_to_whatsapp',
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

    const storeSlug = String(body.storeSlug ?? '').trim();
    const eventName = String(body.eventName ?? '').trim();
    const productId =
      body.productId && String(body.productId).trim()
        ? String(body.productId).trim()
        : null;
    const metadata =
      body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!storeSlug) {
      return NextResponse.json(
        { error: 'Falta storeSlug' },
        { status: 400 }
      );
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

    const sessionId = getSessionId(request);

    const { error: insertError } = await supabase
      .from('analytics_events')
      .insert({
        store_id: store.id,
        event_name: eventName,
        product_id: productId,
        session_id: sessionId,
        metadata,
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