import type { APIRoute } from 'astro';
import { resolveDemoEventByRouteSlug } from '../../../../../lib/events/demo-events';
import { isOwnedPhotoInHeader } from '../../../../../lib/photos/photo-ownership';
import { createSignedPhoto, normalizePhotoRecord } from '../../../../../lib/photos/photo-server';
import { sanitizeGuestMessage, sanitizeGuestName } from '../../../../../lib/photos/photo-validation';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, message }, status);
}

function resolveRouteEvent(slug: string | undefined) {
  if (!slug) return null;
  return resolveDemoEventByRouteSlug(slug);
}

function isSessionOwnedRequest(photoId: string, request: Request): boolean {
  const ownedHeader = request.headers.get('x-demo-photo-ids');
  // TODO(produccion): reemplazar este header por autenticacion real o token firmado por foto.
  return isOwnedPhotoInHeader(photoId, ownedHeader);
}

function getServerClientOrError(): { client: ReturnType<typeof getSupabaseServerClient> | null; error: Response | null } {
  try {
    return { client: getSupabaseServerClient(), error: null };
  } catch {
    return {
      client: null,
      error: errorResponse('Falta configurar PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.', 500),
    };
  }
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const event = resolveRouteEvent(params.slug);

  if (!event) {
    return errorResponse('Evento no encontrado.', 404);
  }

  if (!event.isActive) {
    return errorResponse('Evento inactivo.', 403);
  }

  const photoId = params.photoId;
  if (!photoId) {
    return errorResponse('photoId es obligatorio.', 400);
  }

  if (!isSessionOwnedRequest(photoId, request)) {
    return errorResponse('No puedes editar una foto que no pertenece a esta sesion.', 403);
  }

  const payload = await request.json().catch(() => ({}));
  const guestName = sanitizeGuestName(payload.guestName);
  const message = sanitizeGuestMessage(payload.message);

  const { client: supabase, error: serverError } = getServerClientOrError();
  if (!supabase || serverError) {
    return serverError!;
  }
  const { data, error } = await supabase
    .from('photos')
    .update({
      guest_name: guestName || null,
      message: message || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', photoId)
    .eq('event_id', event.eventId)
    .select('*')
    .single();

  if (error || !data) {
    return errorResponse('No encontramos la foto solicitada.', 404);
  }

  try {
    const signed = await createSignedPhoto(supabase, normalizePhotoRecord(data));
    return jsonResponse({ photo: signed.photo });
  } catch {
    return errorResponse('La foto se actualizo pero fallo la generacion de signed URL.', 500);
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const event = resolveRouteEvent(params.slug);

  if (!event) {
    return errorResponse('Evento no encontrado.', 404);
  }

  if (!event.isActive) {
    return errorResponse('Evento inactivo.', 403);
  }

  const photoId = params.photoId;
  if (!photoId) {
    return errorResponse('photoId es obligatorio.', 400);
  }

  if (!isSessionOwnedRequest(photoId, request)) {
    return errorResponse('No puedes eliminar una foto que no pertenece a esta sesion.', 403);
  }

  const { client: supabase, error: serverError } = getServerClientOrError();
  if (!supabase || serverError) {
    return serverError!;
  }
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .eq('event_id', event.eventId)
    .single();

  if (error || !data) {
    return errorResponse('No encontramos la foto solicitada.', 404);
  }

  const row = normalizePhotoRecord(data);

  if (!row.storage_path || !row.thumbnail_path) {
    return errorResponse('El registro no tiene rutas validas en Storage.', 409);
  }

  const { error: removeError } = await supabase.storage
    .from('guest-photos')
    .remove([row.storage_path, row.thumbnail_path]);

  if (removeError) {
    return jsonResponse(
      {
        success: false,
        message: 'Fallo la eliminacion en Storage. No se borro el registro en base de datos.',
        detail: removeError.message,
      },
      500,
    );
  }

  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('event_id', event.eventId);

  if (deleteError) {
    return jsonResponse(
      {
        success: false,
        message: 'Se eliminaron archivos en Storage, pero fallo el delete en base de datos.',
        detail: deleteError.message,
      },
      500,
    );
  }

  return jsonResponse({ success: true });
};
