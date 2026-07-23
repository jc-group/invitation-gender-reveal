import type {
  GuestPhoto,
  PhotoApiResponse,
  PhotoUpdatePayload,
  UploadResult,
} from './photo-types';

interface UploadPhotoRequest {
  routeSlug: string;
  formData: FormData;
  onProgress?: (progress: number) => void;
}

function getApiBaseUrl(routeSlug: string): string {
  return `/api/events/${encodeURIComponent(routeSlug)}/photos`;
}

async function parseApiJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage =
      typeof data?.message === 'string'
        ? data.message
        : 'No se pudo completar la solicitud.';

    throw new Error(errorMessage);
  }

  return data as T;
}

export async function fetchEventPhotos(routeSlug: string): Promise<PhotoApiResponse> {
  const response = await fetch(getApiBaseUrl(routeSlug), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return parseApiJson<PhotoApiResponse>(response);
}

export function uploadEventPhoto({
  routeSlug,
  formData,
  onProgress,
}: UploadPhotoRequest): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', getApiBaseUrl(routeSlug));
    request.responseType = 'json';

    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(progress);
    });

    request.addEventListener('load', () => {
      const payload = request.response ?? {};

      if (request.status >= 200 && request.status < 300) {
        resolve(payload as UploadResult);
        return;
      }

      const message = typeof payload?.message === 'string'
        ? payload.message
        : 'No se pudo subir la foto.';
      reject(new Error(message));
    });

    request.addEventListener('error', () => {
      reject(new Error('Perdimos la conexion durante la carga.'));
    });

    request.send(formData);
  });
}

export async function updateEventPhoto(
  routeSlug: string,
  photoId: string,
  payload: PhotoUpdatePayload,
  ownedPhotoHeaderValue: string,
): Promise<{ photo: GuestPhoto }> {
  const response = await fetch(`${getApiBaseUrl(routeSlug)}/${encodeURIComponent(photoId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-photo-ids': ownedPhotoHeaderValue,
    },
    body: JSON.stringify(payload),
  });

  return parseApiJson<{ photo: GuestPhoto }>(response);
}

export async function deleteEventPhoto(
  routeSlug: string,
  photoId: string,
  ownedPhotoHeaderValue: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${getApiBaseUrl(routeSlug)}/${encodeURIComponent(photoId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-photo-ids': ownedPhotoHeaderValue,
    },
  });

  return parseApiJson<{ success: boolean }>(response);
}
