import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { resolveDemoEventByRouteSlug } from '../../../../../lib/events/demo-events';
import {
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_FILE_BYTES,
  sanitizeGuestMessage,
  sanitizeGuestName,
} from '../../../../../lib/photos/photo-validation';
import { detectImageMimeType } from '../../../../../lib/photos/mime-detection';
import { buildPhotoStoragePaths } from '../../../../../lib/photos/photo-paths';
import { createSignedPhoto, type InvalidRecord, normalizePhotoRecord } from '../../../../../lib/photos/photo-server';
import { rollbackUploadedObjects } from '../../../../../lib/photos/upload-rollback';

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

function resolveEvent(slug: string | undefined) {
  if (!slug) return null;
  return resolveDemoEventByRouteSlug(slug);
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

async function detectFileMime(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  return detectImageMimeType(bytes);
}

function getUploadPairs(formData: FormData): Array<{ original: File; thumbnail: File }> {
  const originals = [
    ...formData.getAll('original').filter((item): item is File => item instanceof File),
    ...formData.getAll('originals').filter((item): item is File => item instanceof File),
  ];

  const thumbnails = [
    ...formData.getAll('thumbnail').filter((item): item is File => item instanceof File),
    ...formData.getAll('thumbnails').filter((item): item is File => item instanceof File),
  ];

  if (originals.length === 0) {
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);
    if (files.length > 0) {
      return files.map((file) => ({ original: file, thumbnail: file }));
    }
  }

  if (originals.length !== thumbnails.length) {
    return [];
  }

  return originals.map((original, index) => ({
    original,
    thumbnail: thumbnails[index],
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const event = resolveEvent(params.slug);

  if (!event) {
    return errorResponse('Evento no encontrado.', 404);
  }

  if (!event.isActive) {
    return errorResponse('Evento inactivo.', 403);
  }

  const { client: supabase, error: serverError } = getServerClientOrError();
  if (!supabase || serverError) {
    return serverError!;
  }
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', event.eventId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return errorResponse('No pudimos listar las fotos del evento.', 500);
  }

  const failed: InvalidRecord[] = [];
  const signedPhotos = await Promise.all(
    (data ?? []).map(async (row) => {
      const record = normalizePhotoRecord(row);

      try {
        const signed = await createSignedPhoto(supabase, record);
        return signed;
      } catch (err) {
        failed.push({
          filename: record.id,
          message: err instanceof Error ? err.message : 'No se pudo preparar la foto.',
        });
        return null;
      }
    }),
  );

  return jsonResponse({
    photos: signedPhotos.filter(Boolean).map((item) => item!.photo),
    failed,
  });
};

export const POST: APIRoute = async ({ params, request }) => {
  const event = resolveEvent(params.slug);

  if (!event) {
    return errorResponse('Evento no encontrado.', 404);
  }

  if (!event.isActive) {
    return errorResponse('Evento inactivo.', 403);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return errorResponse('El endpoint solo acepta multipart/form-data.', 415);
  }

  const formData = await request.formData();
  const uploadPairs = getUploadPairs(formData);

  if (uploadPairs.length === 0) {
    return errorResponse('No se detectaron archivos para subir.');
  }

  if (uploadPairs.length > MAX_UPLOAD_FILES) {
    return errorResponse(`Solo se permiten ${MAX_UPLOAD_FILES} archivos por solicitud.`);
  }

  const guestName = sanitizeGuestName(formData.get('guestName'));
  const message = sanitizeGuestMessage(formData.get('message'));

  const { client: supabase, error: serverError } = getServerClientOrError();
  if (!supabase || serverError) {
    return serverError!;
  }
  const photos: Array<Record<string, unknown>> = [];
  const failed: Array<{ filename: string; message: string }> = [];

  for (const pair of uploadPairs) {
    const originalFile = pair.original;
    const thumbnailFile = pair.thumbnail;

    const filename = originalFile.name || 'archivo';

    if (!originalFile.size) {
      failed.push({ filename, message: 'El archivo esta vacio.' });
      continue;
    }

    if (originalFile.size > MAX_UPLOAD_FILE_BYTES) {
      failed.push({ filename, message: 'El archivo supera el limite de 15 MB.' });
      continue;
    }

    if (thumbnailFile.size > MAX_UPLOAD_FILE_BYTES) {
      failed.push({ filename, message: 'La miniatura supera el limite permitido.' });
      continue;
    }

    const [detectedOriginalMime, detectedThumbnailMime] = await Promise.all([
      detectFileMime(originalFile),
      detectFileMime(thumbnailFile),
    ]);

    if (detectedOriginalMime !== 'image/webp' || detectedThumbnailMime !== 'image/webp') {
      failed.push({
        filename,
        message: 'El archivo no viene optimizado en WEBP. Intenta de nuevo desde la vista de carga.',
      });
      continue;
    }

    const photoId = crypto.randomUUID();
    const { originalPath, thumbnailPath } = buildPhotoStoragePaths(event.eventId, photoId);

    const uploadedPaths: string[] = [];

    try {
      const { error: originalUploadError } = await supabase.storage
        .from('guest-photos')
        .upload(originalPath, originalFile, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (originalUploadError) {
        throw new Error('No se pudo guardar la foto original en Storage.');
      }

      uploadedPaths.push(originalPath);

      const { error: thumbnailUploadError } = await supabase.storage
        .from('guest-photos')
        .upload(thumbnailPath, thumbnailFile, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (thumbnailUploadError) {
        await rollbackUploadedObjects(
          (paths) => supabase.storage.from('guest-photos').remove(paths),
          uploadedPaths,
        );
        throw new Error('No se pudo guardar la miniatura en Storage.');
      }

      uploadedPaths.push(thumbnailPath);

      const widthValue = Number(formData.get('width') ?? 0);
      const heightValue = Number(formData.get('height') ?? 0);

      const { data: insertedRow, error: insertError } = await supabase
        .from('photos')
        .insert({
          id: photoId,
          event_id: event.eventId,
          storage_provider: 'supabase',
          storage_bucket: 'guest-photos',
          storage_path: originalPath,
          thumbnail_path: thumbnailPath,
          original_filename: filename,
          mime_type: 'image/webp',
          size_bytes: originalFile.size,
          guest_name: guestName || null,
          guest_phone: null,
          message: message || null,
          status: event.photoVisibilityStatus,
          width: Number.isFinite(widthValue) && widthValue > 0 ? Math.round(widthValue) : null,
          height: Number.isFinite(heightValue) && heightValue > 0 ? Math.round(heightValue) : null,
        })
        .select('*')
        .single();

      if (insertError || !insertedRow) {
        await rollbackUploadedObjects(
          (paths) => supabase.storage.from('guest-photos').remove(paths),
          uploadedPaths,
        );
        throw new Error('No se pudo guardar el registro en base de datos.');
      }

      const signed = await createSignedPhoto(supabase, normalizePhotoRecord(insertedRow));

      photos.push({
        ...signed.photo,
        status: signed.status,
      });
    } catch (err) {
      failed.push({
        filename,
        message: err instanceof Error ? err.message : 'No se pudo procesar el archivo.',
      });
    }
  }

  if (photos.length === 0) {
    return jsonResponse({ success: false, photos: [], failed }, 400);
  }

  return jsonResponse({
    success: failed.length === 0,
    photos,
    failed,
  });
};
