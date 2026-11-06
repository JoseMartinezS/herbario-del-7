# Herbario Del 7 — Sitio web

Sitio web de **Herbario Del 7**, herbolario de Frontera, Coahuila (México): hierbas y preparados de siempre, veladoras para cada intención, aguas de riego, lociones, cápsulas, suplementos y artículos esotéricos y naturistas, con asesoría tradicional de mostrador.

## El negocio y el objetivo

- **Negocio:** herbolario físico establecido en Presidente Carranza #119, Col. Guadalupe Borja, Frontera, Coahuila. Atiende de lunes a sábado en dos turnos (9:00–14:00 y 15:00–21:00) y domingo de 10:00 a 13:00.
- **Objetivo del sitio:** dar presencia digital al negocio y pasar la **verificación de negocio de Meta** (Business Verification), que exige que el sitio publique información consistente del negocio: nombre, dirección, teléfono y correo (los datos NAP).
- **Alcance actual:** catálogo informativo + contacto. **No hay e-commerce** (sin carrito, sin pagos), **no hay backend** (el formulario de contacto abre WhatsApp con el mensaje armado; no se guarda nada en servidores propios) y **no hay cookies de rastreo**. Los planes de admin y marketing están documentados abajo, no implementados.

## Stack y requisitos

- [Next.js](https://nextjs.org) 15.5 con **App Router** (sin directorio `src/`; el alias `@/*` apunta a la raíz del proyecto)
- **TypeScript** en modo estricto
- **Tailwind CSS v4** (configuración CSS-first; los tokens de diseño viven en `app/globals.css`)
- **Zod** para validar el catálogo y **react-hook-form** para el formulario de contacto
- **Requisitos:** Node.js 20 o superior y npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

El sitio queda en `http://localhost:3000`.

### Variable de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio, **sin slash final** (p. ej. `https://herbariodel7.com`). Alimenta el `metadataBase`, el JSON-LD, el sitemap, el robots y las URLs canónicas. Actualízala al conectar el dominio real. |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción. **Nota:** no se corre en este repositorio de forma automática; lo ejecuta el dueño desde su terminal o Vercel al publicar. |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint (config `next/core-web-vitals` + `next/typescript`) |
| `npx tsc --noEmit` | Verificación de tipos de todo el proyecto |
| `npm test` | Suite unitaria (Vitest) |
| `npm run test:e2e` | E2E con Playwright contra el dev server |
| `npm run test:e2e:prod` | E2E contra el build de producción (hace `npm run build` él mismo) |

Antes de entregar cambios, corre `npx tsc --noEmit` y `npm run lint`: deben salir sin errores.

## Testing

| Comando | Qué cubre |
| --- | --- |
| `npm test` | Suite unitaria (Vitest, jsdom): validación del ContactForm, composición del mensaje de WhatsApp, integridad de `business.ts` y `products.json`, reglas del schema zod y generadores JSON-LD de la ficha de producto. |
| `npm run test:e2e` | E2E con Playwright **contra el dev server**: rutas principales y 404 personalizada, navegación (header, breadcrumb, menú móvil), filtro del catálogo por categoría, flujo de contacto de punta a punta, botón flotante de WhatsApp en todas las páginas, SEO servido (sitemap.xml, robots.txt, JSON-LD, títulos únicos) y accesibilidad con axe (WCAG 2.0 A/AA). |
| `npm run test:e2e:prod` | La misma suite E2E **contra el build de producción**: el script hace `npm run build` y después sirve con `npm run start`. Lo corre el dueño o CI al publicar; no hace falta en el día a día. |

Notas sobre la suite E2E (`tests/e2e/`):

- **El server se levanta solo.** Playwright arranca `npm run dev` vía `webServer` (y lo apaga al terminar). Si ya hay un dev server corriendo en `:3000`, lo reutiliza. Vos no necesitás levantar nada.
- **Un solo browser (Chromium)** para mantener la suite lean. La primera vez, `npx playwright install chromium` descarga el navegador (~130 MB).
- **Nunca abre WhatsApp de verdad**: el spec de contacto intercepta `window.open` antes de cargar la página y registra las URLs en `window.__waOpened`.
- Vitest excluye `tests/e2e/**` (ver `vitest.config.mts`), así que `npm test` y `npm run test:e2e` no se pisan.
- Config en `playwright.config.ts` (dev) y `playwright.prod.config.ts` (producción).


## Estructura del proyecto

```
app/                    Rutas (App Router)
  layout.tsx            Layout raíz: fuentes, Header/Footer, JSON-LD
  page.tsx              Inicio (hero, categorías, destacados, testimonios)
  nosotros/             Historia, valores y equipo
  catalogo/             Vista del catálogo con filtro por categoría
  catalogo/[slug]/      Ficha de producto (pre-renderizada con generateStaticParams)
  ubicacion/            Mapa embebido, dirección y horarios
  contacto/             Canales de contacto + formulario que abre WhatsApp
  privacidad/           Política de privacidad
  terminos/             Términos y condiciones
  cookies/              Política de cookies
  admin/                Placeholder noindex del panel de administración (futuro)
  not-found.tsx         Página 404
  sitemap.ts            Genera /sitemap.xml
  robots.ts             Genera /robots.txt
  opengraph-image.tsx   Imagen Open Graph 1200×630 del sitio
components/             Componentes de UI (Header, Footer, ProductCard, LegalPage, JsonLd, íconos…)
content/                Contenido editable del negocio y del catálogo
  business.ts           Fuente única de verdad del NAP y horarios
  products.json         Catálogo de productos
lib/                    Lógica: acceso al catálogo, esquema zod, tipos, URL del sitio
tests/
  setup.ts              Setup global de Vitest (jest-dom)
  e2e/                  Specs E2E de Playwright (excluidos de Vitest)
public/images/          Logo y una ilustración SVG por producto
```

## Cómo editar el contenido

### Productos → `content/products.json`

Cada producto tiene estos campos:

| Campo | Descripción |
| --- | --- |
| `slug` | Identificador en kebab-case; es la URL (`/catalogo/<slug>`) |
| `name` | Nombre visible |
| `shortDescription` | Una línea (máx. 140 caracteres) para tarjetas y metadatos |
| `description` | Dos párrafos separados por una línea en blanco (`\n\n`) |
| `category` | Una de las categorías de `lib/types.ts` |
| `price` | **Número** = precio visible en pesos (MXN). **`null`** = se muestra "Consulta el precio por WhatsApp" |
| `image` | Ruta pública de la imagen, p. ej. `/images/products/veladoras-parafina.jpg` |
| `featured` | Opcional; `true` lo muestra en los destacados del inicio |

> **Ojo con los precios:** hoy todo el catálogo se publica con `null` ("consulta el precio por WhatsApp") porque los precios se confirman al momento del pedido. La página de términos deja claro que los precios del sitio son referenciales. Carga el número cuando el dueño lo confirme.

### Datos del negocio → `content/business.ts`

Es la **única fuente de verdad** del NAP (nombre, dirección, teléfono) y de los horarios. Header, Footer, páginas de contacto/ubicación, metadatos y el JSON-LD leen de aquí: **cambia el dato una vez y se actualiza en todo el sitio**. Nunca dupliques estos valores en otro archivo.

### Fotos del catálogo → `public/images/products/`

Cada línea de producto lleva una **foto real del mostrador** (JPG, ~90 KB, fondo blanco), nombrada con el slug exacto de su ficha (p. ej. `veladoras-parafina.jpg`), o una ilustración SVG de transición mientras llega la foto (`hierbas.svg` es la única pendiente).

Para reponer o mejorar una foto:

1. Saca la foto cuadrada, idealmente **800×800 px o más**, en JPG o WebP, con fondo limpio y buena luz.
2. Guárdala en `public/images/products/` **con el nombre del slug** (p. ej. `hierbas.jpg` para la ficha `hierbas`).
3. Actualiza el campo `image` del producto en `content/products.json` con la nueva extensión.

Nota técnica: el validador del catálogo (`lib/schema.ts`) acepta imágenes `.svg`, `.jpg`, `.jpeg` y `.webp` dentro de `/images/products/`, en minúsculas y nombradas igual que el slug.

## SEO: qué hay y dónde

- **Metadatos por página** (`title` + `description` en español, títulos únicos; el layout define la plantilla `… | Herbario Del 7` y el `metadataBase`).
- **JSON-LD** (`components/JsonLd.tsx`, montado en `app/layout.tsx`): schema.org `Store` con nombre, teléfono, correo, dirección, horarios por turno y redes. Sale de `content/business.ts`.
- **JSON-LD por ficha de producto** (`components/ProductJsonLd.tsx`, montado en `app/catalogo/[slug]/page.tsx`): schema.org `Product` (con `offers` en MXN solo si el producto tiene precio) y `BreadcrumbList` (Inicio › Catálogo › Producto). Los generadores son funciones puras en `lib/product-schema.ts`, testeadas con Vitest.
- **Sitemap** (`app/sitemap.ts` → `/sitemap.xml`): incluye las 8 rutas fijas y las fichas de los 15 productos. `/admin` queda fuera.
- **robots** (`app/robots.ts` → `/robots.txt`): permite todo salvo `/admin`.
- **Open Graph** (`app/opengraph-image.tsx`): imagen 1200×630 con la identidad del sitio; Next la aplica a todas las páginas.
- Todo lo anterior se construye sobre `NEXT_PUBLIC_SITE_URL`.

## Deploy en Vercel + dominio propio

1. Sube el repositorio a GitHub (`git push`).
2. En [Vercel](https://vercel.com), importa el proyecto (detecta Next.js solo).
3. Configura la variable de entorno `NEXT_PUBLIC_SITE_URL` (inicialmente, la URL que asigne Vercel).
4. Compra el dominio **herbariodel7.com** y conéctalo al proyecto en Vercel (Settings → Domains).
5. Actualiza `NEXT_PUBLIC_SITE_URL` a `https://herbariodel7.com` y vuelve a publicar, para que sitemap, robots, JSON-LD y OG apunten al dominio final.

### Verificación de negocio de Meta

Los datos registrados en el **Business Manager de Meta deben coincidir EXACTAMENTE** con los publicados en el sitio: nombre legal, dirección completa, teléfono y correo. Antes de solicitar la verificación, revisa `content/business.ts` (la fuente de verdad) y corrige ahí cualquier cambio — el sitio entero se actualiza solo.

## Google Search Console (guía rápida)

Google Search Console es la herramienta gratuita de Google para saber cómo te encuentra la gente. Dar de alta el sitio toma unos 10 minutos y **solo se hace una vez**. Necesitas la cuenta de Google del negocio y acceso al dashboard de Cloudflare (donde vive el DNS del dominio).

1. **Da de alta la propiedad.** Entra a [search.google.com/search-console](https://search.google.com/search-console), inicia sesión y pulsa **"Añadir propiedad"**. Elige el tipo **Dominio** y escribe `herbariodel7.com`. Google te mostrará un registro TXT (algo como `google-site-verification=...`): cópialo tal cual.
2. **Publica el registro en Cloudflare.** Entra al [dashboard de Cloudflare](https://dash.cloudflare.com), abre el dominio `herbariodel7.com` y ve a **DNS → "Add record"**: tipo **TXT**, nombre `@` y valor el registro que copiaste. Guarda y espera un par de minutos a que se propague.
3. **Verifica.** Vuelve a Search Console y pulsa **"Verificar"**: con el TXT publicado, la propiedad se valida al instante.
4. **Envía el sitemap.** En el menú lateral abre **"Sitemaps"**, pega `https://herbariodel7.com/sitemap.xml` y envíalo. Eso le dice a Google todas las páginas que puede indexar (el sitio ya lo genera solo).
5. **Pide la indexación del inicio.** En la barra de **"Inspección de URL"** (arriba) pega `https://herbariodel7.com` y pulsa **"Solicitar indexación"**.

> **Nota:** la indexación tarda días — a veces semanas — en reflejarse; no te preocupes si al principio el sitio no aparece en Google. Tener el **Google Business Profile** del negocio verificado también ayuda: Google cruza esos datos y favorece el descubrimiento local en Frontera y alrededores.

## Panel de administración (futuro, no implementado)

`/admin` es hoy un placeholder público de sola lectura y `noindex`. El plan cuando se implemente:

- CRUD de productos: crear, editar y retirar fichas con foto, precio y categoría, validado con el mismo esquema zod de `lib/schema.ts`.
- Marcar/desmarcar destacados para el inicio.
- Acceso protegido con autenticación, solo para personal del herbolario (middleware + login; hoy no hay ninguna credencial en el proyecto).

## Fase 2 (futuro)

- **Bot de WhatsApp:** compartir el catálogo con el bot del proyecto herbario-del-7-agent (repositorio separado) para consultar disponibilidad y precios desde WhatsApp.
- **Meta Pixel + banner de consentimiento:** si se agrega medición de campañas, hay que añadir un banner de consentimiento con opción de rechazo y actualizar `/cookies` y `/privacidad` (la política de cookies ya describe este compromiso).

## Notas legales sobre el contenido

- Los textos marcados con `TODO` en el código son **ejemplos por confirmar** (testimonios del inicio, historia en `/nosotros`, integrantes del equipo, precios del catálogo). No los des por verificados.
- Páginas legales vigentes: `/privacidad`, `/terminos` y `/cookies` (redactadas en octubre de 2026; la de privacidad cita la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, DOF 20/03/2025). Actualízalas si cambia la forma de trabajar del sitio.
