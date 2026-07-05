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
```
