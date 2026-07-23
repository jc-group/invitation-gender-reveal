# Invitation Gender Reveal

Invitacion web para un evento de gender reveal, construida con Astro.
Incluye una pagina principal de invitacion, pantalla de predicciones en vivo y panel para anfitriones.

## Requisitos

- Node.js `>=22.12.0`
- `pnpm`

## Inicio rapido

Desde la raiz del proyecto:

```sh
pnpm install
pnpm dev
```

Comandos disponibles:

- `pnpm dev` inicia el servidor de desarrollo
- `pnpm build` genera el sitio en `dist/`
- `pnpm preview` sirve el build local

## Variables de entorno

Crea un archivo `.env` tomando `.env.example` como base:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Estas variables habilitan el RSVP y las vistas de datos en vivo con Supabase.

## Rutas disponibles

- `/` invitacion principal
- `/pantalla` pantalla de predicciones en vivo
- `/anfitriones` panel de confirmaciones para anfitriones

## Personalizacion rapida

- `src/features/invitation/invitation.data.ts` textos del evento (titulo, fecha, lugar, copy)
- `src/features/invitation/invitation.seo.ts` metadatos SEO y Open Graph

## Documentacion adicional

- Configuracion de base de datos y RPC para RSVP: `src/features/invitation/supabase-rsvp.md`
- Documentacion oficial de Astro: https://docs.astro.build
