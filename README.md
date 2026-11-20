# Herbario Del 7 — Sitio web

Sitio web de **Herbario Del 7**, herbolario de Frontera, Coahuila (México): hierbas y preparados de siempre, veladoras para cada intención, aguas de riego, lociones, cápsulas, suplementos y artículos esotéricos y naturistas, con asesoría tradicional de mostrador.

## El negocio y el objetivo

- **Negocio:** herbolario físico establecido en Presidente Carranza #119, Col. Guadalupe Borja, Frontera, Coahuila. Atiende de lunes a sábado en dos turnos (9:00–14:00 y 15:00–21:00) y domingo de 10:00 a 13:00.
- **Objetivo del sitio:** dar presencia digital al negocio y pasar la **verificación de negocio de Meta** (Business Verification), que exige que el sitio publique información consistente del negocio: nombre, dirección, teléfono y correo (los datos NAP).
- **Alcance actual:** catálogo informativo + contacto. **No hay e-commerce** (sin carrito, sin pagos), **no hay backend** (el formulario de contacto abre WhatsApp con el mensaje armado; no se guarda nada en servidores propios) y **no hay cookies de rastreo**. El panel de administración (`/admin`) ya tiene login protegido (F2.2) y gestión completa del catálogo desde el navegador (F2.3): crear, editar, retirar/publicar, fotos y destacados — sin tocar git. Los planes de marketing están documentados abajo.

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

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio, **sin slash final** (p. ej. `https://herbariodel7.com`). Alimenta el `metadataBase`, el JSON-LD, el sitemap, el robots y las URLs canónicas. Actualízala al conectar el dominio real. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Opcional.** URL del proyecto de Supabase. Sin esta variable (y la de abajo) el catálogo se lee de `content/products.json`, el modo original, y el panel admin queda cerrado (no hay sesión posible). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Opcional.** Publishable/anon key de Supabase (la pública, jamás la `service_role`). Con las dos variables presentes, el catálogo se lee de Supabase con fallback al JSON local, y el login del panel admin funciona con la cuenta del dashboard. |

Las dos variables de Supabase están documentadas (y vacías, como plantilla) en `.env.example`; la guía para activarlas está en [`supabase/README.md`](supabase/README.md) y en la sección de abajo.

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
| `npm test` | Suite unitaria (Vitest, jsdom): validación del ContactForm, composición del mensaje de WhatsApp, integridad de `business.ts` y `products.json`, reglas del schema zod, generadores JSON-LD de la ficha de producto, la capa de catálogo dual (mapeo de filas de Supabase, filtrado por status y fallback al JSON local), la lógica pura del login admin (config de env vars, saneo del `?next=` y traducción de errores de Supabase) y la lógica pura del panel CRUD (generación de slugs, helpers del bucket de Storage, compresión de fotos, schema del panel y mapeo de filas admin). |
| `npm run test:e2e` | E2E con Playwright **contra el dev server**: rutas principales y 404 personalizada, navegación (header, breadcrumb, menú móvil), filtro del catálogo por categoría, flujo de contacto de punta a punta, botón flotante de WhatsApp en todas las páginas, SEO servido (sitemap.xml, robots.txt, JSON-LD, títulos únicos), accesibilidad con axe (WCAG 2.0 A/AA) y la protección del panel admin (redirect a `/admin/login` sin sesión para el panel, la creación y la edición; formulario de la puerta y noindex; el smoke test de login real se activa solo con credenciales, ver abajo). |
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
  admin/                Panel de administración (protegido: ver sección propia)
    page.tsx            Interior post-login: la lista del catálogo (F2.3)
    login/page.tsx      La puerta: formulario de acceso (noindex)
    actions.ts          Server Actions: login/logout + crear/guardar producto (con subida de foto)
    productos/nuevo/    Crear un producto (slug y posición automáticos)
    productos/[id]/     Editar un producto existente
  not-found.tsx         Página 404
  sitemap.ts            Genera /sitemap.xml
  robots.ts             Genera /robots.txt
  opengraph-image.tsx   Imagen Open Graph 1200×630 del sitio
middleware.ts           El portero: protege /admin/* (menos /admin/login) con la sesión de Supabase
components/             Componentes de UI (Header, Footer, ProductCard, LegalPage, JsonLd, íconos…)
content/                Contenido editable del negocio y del catálogo
  business.ts           Fuente única de verdad del NAP y horarios
  products.json         Catálogo de productos (snapshot semilla/respaldo)
lib/                    Lógica: acceso al catálogo (JSON/Supabase), autenticación admin, esquema zod, tipos, URL del sitio
supabase/               Migración del catálogo a Supabase (SQL + guía de activación)
tests/
  setup.ts              Setup global de Vitest (jest-dom)
  e2e/                  Specs E2E de Playwright (excluidos de Vitest)
public/images/          Logo y una ilustración SVG por producto
```

## Cómo editar el contenido

### Productos → el panel `/admin` (recomendado) o `content/products.json`

**Si Supabase está activo** (las dos env vars presentes, como en producción), la forma de editar el catálogo es **el panel de administración** desde el navegador o el teléfono: crear, editar, retirar/publicar, cambiar fotos y marcar destacados — sin tocar git ni archivos. Ver la sección [«Panel de administración»](#panel-de-administración-admin).

El archivo `content/products.json` queda como **snapshot semilla y respaldo** (no lo borres): el sitio cae a él si Supabase no responde, y en modo local (sin env vars) sigue siendo la fuente.

Cada producto tiene estos campos:

| Campo | Descripción |
| --- | --- |
| `slug` | Identificador en kebab-case; es la URL (`/catalogo/<slug>`). En el panel se genera solo a partir del nombre |
| `name` | Nombre visible |
| `shortDescription` | Una línea (máx. 140 caracteres) para tarjetas y metadatos |
| `description` | Dos párrafos separados por una línea en blanco (`\n\n`) |
| `category` | Una de las categorías de `lib/types.ts` |
| `price` | **Número** = precio visible en pesos (MXN). **`null`** = se muestra "Consulta el precio por WhatsApp" |
| `image` | Ruta pública de la imagen (p. ej. `/images/products/veladoras-parafina.jpg`) o URL del bucket de Storage |
| `featured` | Opcional; `true` lo muestra en los destacados del inicio |

> **Ojo con los precios:** hoy todo el catálogo se publica con `null` ("consulta el precio por WhatsApp") porque los precios se confirman al momento del pedido. La página de términos deja claro que los precios del sitio son referenciales. Carga el número cuando el dueño lo confirme.

> **¿Edits al JSON o a Supabase?** Si el sitio está en modo JSON local (sin las env vars de Supabase), editá este archivo y deployá. Si ya está activo Supabase, los productos se editan en la tabla del dashboard y este JSON queda como respaldo — ver la sección [«Catálogo: JSON local vs Supabase»](#catálogo-json-local-vs-supabase-doble-modo).

### Datos del negocio → `content/business.ts`

Es la **única fuente de verdad** del NAP (nombre, dirección, teléfono) y de los horarios. Header, Footer, páginas de contacto/ubicación, metadatos y el JSON-LD leen de aquí: **cambia el dato una vez y se actualiza en todo el sitio**. Nunca dupliques estos valores en otro archivo.

### Fotos del catálogo → `public/images/products/`

Cada línea de producto lleva una **foto real del mostrador** (JPG, ~90 KB, fondo blanco), nombrada con el slug exacto de su ficha (p. ej. `veladoras-parafina.jpg`), o una ilustración SVG de transición mientras llega la foto (`hierbas.svg` es la única pendiente).

Para reponer o mejorar una foto:

1. Saca la foto cuadrada, idealmente **800×800 px o más**, en JPG o WebP, con fondo limpio y buena luz.
2. Guárdala en `public/images/products/` **con el nombre del slug** (p. ej. `hierbas.jpg` para la ficha `hierbas`).
3. Actualiza el campo `image` del producto en `content/products.json` con la nueva extensión.

Nota técnica: el validador del catálogo (`lib/schema.ts`) acepta imágenes `.svg`, `.jpg`, `.jpeg` y `.webp` dentro de `/images/products/`, en minúsculas y nombradas igual que el slug.

## Catálogo: JSON local vs Supabase (doble modo)

Desde la fase 2.1 el sitio puede leer el catálogo de **dos fuentes**, decidido
solo por variables de entorno. `content/products.json` dejó de ser la única
fuente, pero **sigue en el repo como snapshot semilla y respaldo** — no lo
borres aunque Supabase esté activo.

| Modo | Cuándo | Fuente |
| --- | --- | --- |
| **JSON local** (original) | Sin las env vars de Supabase | `content/products.json`, validado con zod |
| **Supabase con fallback** | Con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tabla `products` de Supabase (`lib/supabase-catalog.ts`) |

La regla de oro del diseño: **el sitio nunca se cae por culpa de Supabase**.
Toda lectura remota va envuelta en try/catch con timeout: si el fetch falla,
responde con error o devuelve un catálogo vacío/malformado, el sitio cae
automáticamente al JSON local y deja un `console.warn` en los logs de Vercel
para diagnosticarlo. Las filas retiradas (`status = 'retired'`) o malformadas
no se sirven al público, y tampoco tumban el resto del catálogo.

Detalles técnicos del modo Supabase:

- **Lectura server-side únicamente** (RSC, `generateStaticParams`, sitemap):
  nada de Supabase llega al bundle del cliente. Se usa **fetch directo a la
  REST API** (`/rest/v1/products?...`) en vez del SDK oficial: para una
  lectura pública de una tabla, PostgREST resuelve columnas, filtro y orden
  por URL, y el SDK no aporta nada que se use (a cambio de una dependencia
  más y un bundle más pesado).
- **ISR**: home, `/catalogo` y las fichas declaran `revalidate = 3600`
  (regeneración horaria). `generateStaticParams` sigue pre-renderizando las
  15 fichas en el build **en ambos modos** — el fallback al JSON garantiza
  las semillas aunque el build corra sin env vars (como en CI).
- **Orden del catálogo**: la tabla tiene una columna `position` que conserva
  el orden curado del JSON (1 = primero); el sitio pide las filas ordenadas
  por ella.
- El JSON-LD de cada ficha acepta `image` absoluta (bucket de Storage) o
  ruta local; `next.config.ts` declara el host de Storage como patrón de
  imagen remota **solo cuando la env var está presente**.

### Activar Supabase (en este orden)

1. **Correr la migración**: `supabase/migration.sql` en el SQL Editor del
   dashboard (crea tabla, permisos, bucket y las 15 filas). Guía completa en
   [`supabase/README.md`](supabase/README.md).
2. **Subir las 15 imágenes** al bucket `products` de Storage (mismos
   nombres de archivo que hoy: ver lista en `supabase/README.md`).
3. **Configurar las env vars** `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel (Settings → Environment
   Variables; los valores salen de Project Settings → API).
4. **Redeployar** en Vercel.

Desactivarlo es al revés y más simple: quitar (o vaciar) las dos variables y
redeployar — el sitio vuelve al JSON local tal como estaba.

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

## Panel de administración (`/admin`)

El panel es la **oficina del mostrador en el navegador**: el dueño crea, edita, retira y publica las fichas del catálogo **desde el teléfono**, con foto, precio y familia — sin tocar git, sin deploys. Desde F2.3 la gestión es completa.

- **Acceso:** protegido con Supabase Auth (F2.2). Solo hay **UNA cuenta** (la del personal del herbolario): no existe registro público ni "olvidé mi contraseña" en el sitio — la cuenta se administra desde el dashboard de Supabase.
- **Qué se puede hacer:**
  - **Crear** fichas (`/admin/productos/nuevo`): la dirección (slug) se arma sola a partir del nombre (con preview en vivo) y la posición en el catálogo se asigna sola (última). La foto es obligatoria y se comprime en el navegador antes de subir.
  - **Editar** cualquier ficha (toca un producto en la lista): nombre, familia, precio (o "consulta por WhatsApp" dejándolo vacío), descripciones, foto, destacar en el inicio.
  - **Retirar/Publicar** (el interruptor de estado): retirar esconde la ficha del catálogo público **sin borrarla** — es reversible, con confirmación leve al retirar.
- **Qué NO se puede hacer (a propósito):**
  - **Borrar físicamente una ficha.** No existe el borrado en el panel: retirar es la operación (reversible, sin 404s accidentales para URLs ya indexadas). Si algún día hace falta borrar de verdad, es desde el dashboard de Supabase (Table Editor).
  - **Cambiar el slug** de una ficha existente: la URL `/catalogo/<slug>` ya está indexada en buscadores; cambiarla la rompería. El slug solo se genera al crear.
  - **Reordenar a mano** (position): se asigna automáticamente al crear (último lugar). El orden curado original se conserva.

### Cómo funciona el acceso

- **`middleware.ts`** protege toda la familia `/admin/*` menos `/admin/login`. Sin sesión válida → redirect 307 a la puerta, guardando la URL original en `?next=` para volver después de entrar. Si faltan las env vars de Supabase el portero **cierra igual** (fail-closed): el panel jamás queda abierto por accidente.
- **`/admin/login`** es la puerta: correo + contraseña. El login corre entero en el servidor (Server Action): la contraseña no llega al bundle del cliente y la cookie de sesión es **httpOnly** (ningún script del navegador puede leerla). La sesión se refresca sola en el middleware cuando el token está por vencer.
- **`/admin`** es el interior: la lista de TODO el catálogo (publicado y retirado) con foto, familia, precio, destacado y estado. Toca una ficha para editarla; "Nuevo producto" abre la creación.
- Todo `/admin` sigue **noindex** y fuera del sitemap; `robots.txt` lo bloquea.

La autenticación usa las **mismas dos env vars** que el catálogo (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — no hay variables nuevas.

### Las fotos: compresión, subida y reemplazo

El flujo de la foto está diseñado para que el catálogo cargue rápido **siempre**, sin depender de transforms de imagen (el plan free de Supabase no los incluye):

1. **Compresión en el navegador** (antes de subir): la foto del teléfono (3–10 MB) se reescala a máx. 1200 px de lado mayor y se exporta a WebP calidad 0.8 (~100–300 KB típicos). Las ilustraciones SVG se suben tal cual (recomprimir un vector solo lo estropea). Si el navegador no exporta WebP (iOS viejo), cae a JPEG con fondo blanco.
2. **Subida por Server Action**: el archivo comprimido viaja al servidor del sitio y de ahí al bucket `products` de Storage con la sesión del dueño. La foto JAMÁS se sube desde el navegador directo a Supabase: la CSP del sitio (`connect-src 'self'`) queda intacta y no hay cliente browser de Supabase. El límite del cuerpo de las actions se subió a 10 MB (el techo del bucket) en `next.config.ts`.
3. **Nombre versionado**: `{slug}-{timestamp}.webp`. Al reemplazar la foto, la URL cambia (timestamp nuevo), así que la caché del CDN y del visitante **no puede** seguir sirviendo la foto vieja.
4. **Reemplazo sin huérfanos**: al cambiar la foto, tras guardar la ficha se borra del bucket el archivo anterior — pero SOLO si era de NUESTRO bucket (una ruta local del repo o una URL externa no se toca).
5. La URL pública resultante (`https://<proyecto>.supabase.co/storage/v1/object/public/products/<archivo>`) se guarda en la columna `image` de la fila.

### Al guardar, el sitio se actualiza en segundos

Cada mutation (crear, guardar, retirar, publicar) marca las rutas afectadas para regeneración inmediata (ISR bajo demanda con `revalidatePath`): la portada, el catálogo, la ficha editada y el propio panel. El público ve el cambio **al refrescar, sin deploy**.

**Limitación conocida — el sitemap:** `revalidatePath` no regenera `/sitemap.xml`, así que una ficha **nueva** tarda en aparecer ahí hasta el próximo deploy (las fichas editadas no cambian de URL, así que no les afecta). No es grave: Google descubre la ficha nueva igual por los enlaces internos del catálogo y la portada. Si algún día importa, la solución es revalidar por tag o mover el sitemap a un route handler con caché corta.

**Nota técnica — retirados y la policy de lectura:** la policy `products_select_publico` de la tabla permite leer TODAS las filas a la key anon, **incluidas las retiradas** (`using (true)`, sin filtro de status). No rompe nada: el sitio filtra `status = 'published'` en código (`lib/supabase-catalog.ts`), que es donde debe vivir el filtro. Queda documentado como decisión: si algún día se quisiera cerrar en la base, sería un `using (status = 'published')` para `anon` en un cambio de SQL — el panel ya lee con la sesión autenticada, así que no lo afectaría.

### Crear la cuenta (ya existe una)

La cuenta actual se creó desde el dashboard. Si algún día hay que crear otra o cambiar algo:

1. Entra al dashboard del proyecto en [supabase.com](https://supabase.com/dashboard) → **Authentication → Users → Add user**.
2. Marca **"Auto Confirm User"** (o confírmala después: ver abajo).
3. Anota el correo y la contraseña en un lugar seguro (no en este repo).

### Si el login falla con "Tu cuenta todavía no está confirmada"

Eso es el error **"Email not confirmed"** de Supabase: la cuenta existe pero nunca se confirmó (pasa cuando se creó sin "Auto Confirm User"). El sitio no tiene flujo de verificación de email — una sola cuenta no lo necesita — así que se resuelve a mano:

1. Dashboard → **Authentication → Users**.
2. En la fila del usuario, abre el menú (⋮) → **"Confirm user"**.

Listo: el login funciona en el intento siguiente, sin redeploy.

### Si se olvida la contraseña

Tampoco hay flujo de recuperación en el sitio (una sola cuenta, se administra por dashboard):

1. Dashboard → **Authentication → Users**.
2. En la fila del usuario, menú (⋮) → **"Send password recovery"** (llega un enlace al correo para definir una nueva) o **"Set new password"** (la cambias directo desde el dashboard).

### Probar el acceso localmente

El E2E de admin (`tests/e2e/admin.spec.ts`) valida sin credenciales que `/admin`, `/admin/productos/nuevo` y `/admin/productos/<id>` redirigen a la puerta y que el formulario responde. Para probar el login real de punta a punta:

```powershell
$env:ADMIN_EMAIL = "la cuenta del dashboard"
$env:ADMIN_PASSWORD = "su contraseña"
npx playwright test tests/e2e/admin.spec.ts
```

El smoke con sesión es **read-only a propósito**: `.env.local` apunta al mismo proyecto de Supabase que sirve el sitio en producción, así que un test que cree productos dejaría filas en la base real (y sin borrado físico, se quedarían). El smoke valida login → lista → abrir una ficha con el formulario prefilled → logout. El checklist manual del CRUD completo: crear una ficha de verdad (verla en `/catalogo`), editarla, reemplazarle la foto, retirarla y volver a publicarla.

## Fase 2 (futuro)

- **Bot de WhatsApp:** compartir el catálogo con el bot del proyecto herbario-del-7-agent (repositorio separado) para consultar disponibilidad y precios desde WhatsApp.
- **Meta Pixel + banner de consentimiento:** si se agrega medición de campañas, hay que añadir un banner de consentimiento con opción de rechazo y actualizar `/cookies` y `/privacidad` (la política de cookies ya describe este compromiso).

## Notas legales sobre el contenido

- Los textos marcados con `TODO` en el código son **ejemplos por confirmar** (testimonios del inicio, historia en `/nosotros`, integrantes del equipo, precios del catálogo). No los des por verificados.
- Páginas legales vigentes: `/privacidad`, `/terminos` y `/cookies` (redactadas en octubre de 2026; la de privacidad cita la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, DOF 20/03/2025). Actualízalas si cambia la forma de trabajar del sitio.
