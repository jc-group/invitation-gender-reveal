export interface RollbackResult {
  ok: boolean;
  errors: string[];
}

export type RemoveStorageObjects = (paths: string[]) => Promise<{ error: { message: string } | null }>;

export async function rollbackUploadedObjects(
  removeObjects: RemoveStorageObjects,
  paths: string[],
): Promise<RollbackResult> {
  if (paths.length === 0) {
    return { ok: true, errors: [] };
  }

  const { error } = await removeObjects(paths);

  if (error) {
    return {
      ok: false,
      errors: [error.message || 'No se pudo revertir la carga de archivos.'],
    };
  }

  return { ok: true, errors: [] };
}
