export type UploadStatus = 'ready' | 'processing' | 'uploading' | 'success' | 'error';

export interface GuestPhotoRecord {
  id: string;
  created_at: string;
  event_id: string;
  storage_provider: string;
  storage_bucket: string;
  storage_path: string | null;
  thumbnail_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  guest_name: string | null;
  guest_phone: string | null;
  message: string | null;
  status: string;
  width: number | null;
  height: number | null;
  updated_at: string;
}

export interface GuestPhoto {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  guestName: string;
  message: string;
  createdAt: string;
  alt?: string;
}

export interface ProcessedImage {
  originalBlob: Blob;
  thumbnailBlob: Blob;
  width: number;
  height: number;
  mimeType: 'image/webp';
  sizeBytes: number;
}

export interface UploadCandidate {
  localId: string;
  file: File;
  previewUrl: string;
  originalFilename: string;
  sourceMimeType: string;
  status: UploadStatus;
  progress: number;
  errorMessage: string;
  processed: ProcessedImage | null;
  photoId?: string;
}

export interface UploadFailedItem {
  filename: string;
  message: string;
}

export interface UploadResult {
  success: boolean;
  photos: GuestPhoto[];
  failed: UploadFailedItem[];
}

export interface PhotoApiResponse {
  photos: GuestPhoto[];
  failed?: UploadFailedItem[];
}

export interface PhotoUpdatePayload {
  guestName?: string;
  message?: string;
}
