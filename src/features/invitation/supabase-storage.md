# Supabase Storage

## 1. Crear bucket

Ejecuta esto en Supabase SQL Editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-photos',
  'guest-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
);
```

## 2. Crear policies

```sql
-- Policy para subir fotos (cualquier persona)
create policy "Anyone can upload guest photos"
on storage.objects for insert
to anon
with check ( bucket_id = 'guest-photos' );

-- Policy para ver fotos (público)
create policy "Guest photos are public"
on storage.objects for select
to anon
using ( bucket_id = 'guest-photos' );
```

## 3. Configuración

El bucket es público, no requiere autenticación para:
- Subir archivos (POST)
- Ver archivos (GET)

## 4. Uso desde el frontend

### Subir imagen

```javascript
const file = input.files[0];
const formData = new FormData();
formData.append('file', file);

const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;

await fetch(
  `${SUPABASE_URL}/storage/v1/object/guest-photos/${filename}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'x-upsert': 'true'
    },
    body: formData
  }
);
```

### Obtener URL pública

```
${SUPABASE_URL}/storage/v1/object/public/guest-photos/${filename}
```

### Listar todas las fotos

```javascript
const response = await fetch(
  `${SUPABASE_URL}/storage/v1/object/list/guest-photos?prefix=`,
  {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    }
  }
);
const files = await response.json();
// files es un array de { name, id, created_at, ... }
```

## 5. Estructura de archivos

```
guest-photos/
  1742320800000-abc123.jpg
  1742320900000-def456.png
  ...
```

## 6. Límites

- Tamaño máximo: 10MB por archivo
- Formatos permitidos: JPEG, PNG, WEBP
- bucket público: sí

## 7. Tabla photos (para Realtime)

La tabla `photos` se usa para detectar fotos nuevas en tiempo real via Supabase Realtime.

```sql
-- Crear tabla para registrar fotos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table public.photos enable row level security;

-- Policy: cualquiera puede insertar
create policy "Anyone can insert photos"
on public.photos for insert to anon with check (true);

-- Policy: cualquiera puede ver
create policy "Anyone can view photos"
on public.photos for select to anon using (true);

-- Habilitar Realtime
alter publication supabase_realtime add table public.photos;
```

## 8. Flujo completo

1. **Upload**: Sube archivo a Storage → INSERT en `photos`
2. **Realtime**: Otros clientes reciben evento INSERT via WebSocket
3. **Gallery**: Renderiza foto nueva inmediatamente

## 9. Sincronización

- Upload inserta en `photos` después de subir a Storage
- PhotoGallery subscribe a cambios en `photos`
- No se depende de polling a Storage API
