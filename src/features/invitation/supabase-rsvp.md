# Supabase RSVP

## 1. Crear tabla

Ejecuta esto en Supabase SQL Editor:

```sql
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  event text not null default 'Gender Reveal Catherine & Josafat',
  name text not null,
  attendance text not null,
  guests integer not null default 1,
  prediction text not null,
  phone text,
  message text,

  user_agent text,
  source text not null default 'invitation-web'
);

alter table public.rsvps enable row level security;

grant insert on table public.rsvps to anon;

drop policy if exists "Allow public RSVP inserts" on public.rsvps;

create policy "Allow public RSVP inserts"
on public.rsvps
for insert
to anon
with check (
  name <> ''
  and attendance in ('Sí asistiré', 'No podré asistir')
  and guests between 1 and 10
  and prediction in ('Niña', 'Niño')
  and phone is not null
  and phone <> ''
);
```

## 2. Configurar variables de entorno

En `.env` del proyecto:

```
PUBLIC_SUPABASE_URL=https://tu-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

En `.env.example` del proyecto:

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

## 3. Datos guardados

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | Identificador único |
| created_at | timestamptz | Fecha y hora del registro |
| event | text | Nombre del evento |
| name | text | Nombre del invitado |
| attendance | text | "Sí asistiré" o "No podré asistir" |
| guests | integer | Número de personas (1-10) |
| prediction | text | "Niña" o "Niño" |
| phone | text | Teléfono |
| message | text | Mensaje (opcional) |
| user_agent | text | User agent del navegador |
| source | text | Origen ("invitation-web") |

## 4. Seguridad

- Row Level Security (RLS) habilitado
- Solo permite INSERT desde anon
- Validación en CHECK constraint para valores esperados
- No se expone service_role key
- Se usa anon key para insertar desde frontend

## 5. Función para votos públicos

No se debe crear policy SELECT para anon.

Para mostrar porcentajes públicos, crear una función RPC que solo regrese conteos agregados:

```sql
create or replace function public.get_rsvp_vote_counts()
returns table (
  girl_votes bigint,
  boy_votes bigint,
  total_votes bigint
)
language sql
security definer
set search_path = public
as $$
  select
    count(*) filter (where prediction = 'Niña')::bigint as girl_votes,
    count(*) filter (where prediction = 'Niño')::bigint as boy_votes,
    count(*) filter (where prediction in ('Niña', 'Niño'))::bigint as total_votes
  from public.rsvps;
$$;

grant execute on function public.get_rsvp_vote_counts() to anon;
```

## 6. Sección LiveVotes

La sección LiveVotes usa polling cada 15 segundos contra `get_rsvp_vote_counts()`.
No usa SELECT directo a `rsvps`.
También se actualiza inmediatamente cuando el usuario confirma RSVP mediante el evento `rsvp:submitted`.

## 7. Pantalla de predicciones en vivo

La ruta `/pantalla` muestra votos y mensajes en tiempo real para pantalla grande (TV/monitor).

### Función para mensajes

```sql
create or replace function public.get_rsvp_live_messages()
returns table (
  id uuid,
  name text,
  prediction text,
  message text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    id,
    name,
    prediction,
    message,
    created_at
  from public.rsvps
  where message is not null
    and btrim(message) <> ''
  order by created_at desc
  limit 40;
$$;

grant execute on function public.get_rsvp_live_messages() to anon;
```

### Campos devueltos

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | Identificador único del registro |
| name | text | Nombre del invitado |
| prediction | text | Predicción ("Niña" o "Niño") |
| message | text | Mensaje del invitado |
| created_at | timestamptz | Fecha y hora del registro |

### Seguridad

- No se expone `phone`, `user_agent` ni `source`
- Se usa RPC con `security definer`
- Se filtra solo mensajes con texto (no vacíos)
- Límite de 40 mensajes más recientes
- No requiere autenticación (anon)

## 8. Panel de anfitriones

La ruta `/anfitriones` muestra un panel protegido por código para ver todas las confirmaciones.

### Función para el panel

```sql
create or replace function public.get_host_rsvp_dashboard(p_host_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_hash constant text := 'PEGAR_AQUI_EL_HASH_DEL_CODIGO';
  input_hash text;
  result jsonb;
begin
  input_hash := encode(sha256(lower(trim(p_host_code))::bytea), 'hex');

  if input_hash <> expected_hash then
    return jsonb_build_object(
      'ok', false,
      'message', 'Código incorrecto.'
    );
  end if;

  result := jsonb_build_object(
    'ok', true,
    'summary', (
      select jsonb_build_object(
        'responses', count(*),
        'attending_responses', count(*) filter (where attendance = 'Sí asistiré'),
        'not_attending_responses', count(*) filter (where attendance = 'No podré asistir'),
        'attending_guests', sum(guests) filter (where attendance = 'Sí asistiré'),
        'girl_votes', count(*) filter (where prediction = 'Niña'),
        'boy_votes', count(*) filter (where prediction = 'Niño')
      )
      from public.rsvps
    ),
    'guests', (
      select jsonb_agg(row_to_json(t))
      from (
        select
          name,
          attendance,
          guests,
          prediction,
          phone,
          message,
          created_at
        from public.rsvps
        order by created_at desc
      ) t
    )
  );

  return result;
end;
$$;

grant execute on function public.get_host_rsvp_dashboard(text) to anon;
```

### Seguridad

- No se crea SELECT policy pública para `rsvps`
- Se usa RPC con `security definer`
- El código se compara por hash SHA-256, nunca en texto plano
- Se expone `phone` **solo** en este panel (dentro de la red de los anfitriones)
- No se expone `user_agent` ni `source`
- El código de anfitrión se pasa desde el frontend y se verifica en el backend

### Campos devueltos

| Campo | Tipo | Descripción |
|---|---|---|
| ok | boolean | Si la autenticación fue exitosa |
| message | text | Mensaje de error si ok=false |
| summary.responses | integer | Total de respuestas |
| summary.attending_responses | integer | Personas que asistirán |
| summary.not_attending_responses | integer | Personas que no asistirán |
| summary.attending_guests | integer | Total de personas que vendrán |
| summary.girl_votes | integer | Votos por niña |
| summary.boy_votes | integer | Votos por niño |
| guests | array | Lista de invitados |

### Generar el hash del código

Para generar el hash de tu código en Supabase SQL Editor:

```sql
select encode(sha256('tu-palabra-secreta'::bytea), 'hex');
```

Reemplaza `PEGAR_AQUI_EL_HASH_DEL_CODIGO` con el resultado.
```
