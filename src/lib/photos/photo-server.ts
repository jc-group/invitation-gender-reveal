import type { SupabaseClient } from '@supabase/supabase-js';
import type { GuestPhoto, GuestPhotoRecord } from './photo-types';

export const GUEST_PHOTOS_BUCKET = 'guest-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 20;

export interface ApiPhotoResult {
  photo: GuestPhoto;
  status: string;
}

export interface InvalidRecord {
  filename: string;
  message: string;
}

function asText(value: unknown): string {
  return String(value ?? '').trim();
}

function buildGuestAlt(guestName: string): string {
  if (!guestName) return 'Foto compartida por un invitado';
  return `Foto compartida por ${guestName}`;
}

export async function createSignedPhoto(
  supabase: SupabaseClient,
  record: GuestPhotoRecord,
): Promise<ApiPhotoResult> {
  if (!record.storage_path) {
    throw new Error('Registro sin storage_path.');
  }

  if (!record.thumbnail_path) {
    throw new Error('Registro sin thumbnail_path.');
  }

  const [{ data: originalData, error: originalError }, { data: thumbnailData, error: thumbnailError }] =
    await Promise.all([
      supabase.storage
        .from(record.storage_bucket)
        .createSignedUrl(record.storage_path, SIGNED_URL_TTL_SECONDS),
      supabase.storage
        .from(record.storage_bucket)
        .createSignedUrl(record.thumbnail_path, SIGNED_URL_TTL_SECONDS),
    ]);

  if (originalError || !originalData?.signedUrl) {
    throw new Error('No se pudo generar signed URL para imagen original.');
  }

  if (thumbnailError || !thumbnailData?.signedUrl) {
    throw new Error('No se pudo generar signed URL para thumbnail.');
  }

  const guestName = asText(record.guest_name);

  return {
    photo: {
      id: record.id,
      thumbnailUrl: thumbnailData.signedUrl,
      imageUrl: originalData.signedUrl,
      guestName,
      message: asText(record.message),
      createdAt: record.created_at,
      alt: buildGuestAlt(guestName),
    },
    status: record.status,
  };
}

export function normalizePhotoRecord(row: unknown): GuestPhotoRecord {
  return row as GuestPhotoRecord;
}
