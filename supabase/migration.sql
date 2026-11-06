-- ============================================================================
-- Herbario Del 7 — Migración inicial del catálogo a Supabase (F2.1)
-- ============================================================================
--
-- QUÉ HACE ESTE ARCHIVO (en orden):
--   1. Crea la tabla `public.products` con las validaciones del dominio.
--   2. Crea los índices de consulta (por categoría y por destacados).
--   3. Activa Row Level Security y declara las políticas de acceso:
--      lectura pública, escritura solo para usuarios con sesión.
--   4. Crea el bucket público `products` de Storage (las fotos del catálogo)
--      con sus políticas de acceso.
--   5. Siembra las 15 líneas actuales del catálogo (content/products.json).
--
-- CÓMO CORRERLO (una sola vez, el dueño):
--   Dashboard de Supabase → tu proyecto → SQL Editor → New query →
--   pegar TODO este archivo → Run. Duración: segundos.
--
-- ES IDEMPOTENTE: se puede correr más de una vez sin romper nada
--   (if not exists / on conflict do nothing / drop policy if exists).
--   Re-correrlo NO actualiza datos existentes: las filas que ya están
--   no se tocan (por el on conflict). Sirve como punto de partida, no
--   para re-sincronizar datos editados a mano en el dashboard.
--
-- NOTA: gen_random_uuid() viene incluido en PostgreSQL 13+ (Supabase usa
--   versiones más nuevas), no hace falta crear la extensión pgcrypto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla del catálogo
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  -- Identificador público y URL de la ficha (/catalogo/<slug>), kebab-case.
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  -- Una línea (máx. 140) para tarjetas y metadatos.
  short_description text not null,
  -- Descripción larga: dos párrafos separados por una línea en blanco.
  description text not null,
  -- Solo las 7 categorías del sitio (lib/types.ts).
  category text not null
    check (category in (
      'veladoras',
      'hierbas-y-preparados',
      'aguas-y-riegos',
      'lociones',
      'capsulas-y-suplementos',
      'cuidado-personal',
      'sahumerios-e-inciensos'
    )),
  -- Precio en pesos (MXN). NULL = "consulta el precio por WhatsApp".
  price numeric(10, 2) check (price is null or price >= 0),
  -- Ruta local (/images/products/…) o URL absoluta del bucket de Storage.
  image text not null,
  -- Marca el producto para los destacados del home.
  featured boolean not null default false,
  -- 'published' = visible al público; 'retired' = retirado sin borrar
  -- (el sitio solo sirve los published).
  status text not null default 'published'
    check (status in ('published', 'retired')),
  -- Orden de exhibición del catálogo (el orden curado del JSON original).
  -- El sitio pide las filas ordenadas por esta columna.
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Catálogo de Herbario Del 7: líneas de producto del mostrador. El sitio público solo sirve las filas status=''published'' ordenadas por position.';

comment on column public.products.position is
  'Orden de exhibición (1 = primero). Hereda el orden curado de content/products.json.';

-- ----------------------------------------------------------------------------
-- 2. Índices de consulta
-- ----------------------------------------------------------------------------
create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security: el catálogo es público de LECTURA, privado de
--    escritura. Sin estas políticas, la tabla estaría bloqueada para la
--    anon key (Supabase niega todo por defecto con RLS activado).
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;

-- Lectura pública: cualquiera (sin login) puede ver el catálogo. La key
-- anon del sitio viaja solo con permiso de SELECT.
drop policy if exists "products_select_publico" on public.products;
create policy "products_select_publico"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Escritura solo con sesión iniciada (para el panel de administración
-- de la fase 2.3). Hoy nadie más que el dueño puede tocar los datos.
drop policy if exists "products_insert_autenticado" on public.products;
create policy "products_insert_autenticado"
  on public.products
  for insert
  to authenticated
  with check (true);

drop policy if exists "products_update_autenticado" on public.products;
create policy "products_update_autenticado"
  on public.products
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "products_delete_autenticado" on public.products;
create policy "products_delete_autenticado"
  on public.products
  for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 4. Bucket público de Storage para las fotos del catálogo
--    (URL pública: https://<proyecto>.supabase.co/storage/v1/object/public/products/<archivo>)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Lectura pública de las imágenes del bucket 'products'.
drop policy if exists "products_storage_select_publico" on storage.objects;
create policy "products_storage_select_publico"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'products');

-- Subida/edición/borrado de imágenes solo con sesión (panel F2.3).
drop policy if exists "products_storage_insert_autenticado" on storage.objects;
create policy "products_storage_insert_autenticado"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'products');

drop policy if exists "products_storage_update_autenticado" on storage.objects;
create policy "products_storage_update_autenticado"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'products')
  with check (bucket_id = 'products');

drop policy if exists "products_storage_delete_autenticado" on storage.objects;
create policy "products_storage_delete_autenticado"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'products');

-- ----------------------------------------------------------------------------
-- 5. Semilla: las 15 líneas actuales del catálogo (content/products.json).
--    Los datos salen EXACTOS del JSON (nombres, descripciones completas,
--    categorías y destacados); la imagen apunta al bucket público y
--    position conserva el orden curado. Todas nacen 'published'.
--    on conflict (slug) do nothing: si la fila ya existe, no se toca.
-- ----------------------------------------------------------------------------
insert into public.products
  (slug, name, short_description, description, category, price, image, featured, status, position)
values
  ('veladoras-parafina', 'Veladoras de Parafina', 'Veladoras de parafina de 7 días en varios colores para cada intención.', 'Las veladoras de parafina son las de toda la vida: cera de combustión lenta, frasco de vidrio y mecha que acompaña los siete días de una novena. En la tradición mexicana cada color lleva su intención, y en el mostrador te ayudamos a elegir la indicada para tu petición.

Manejamos la línea en varios colores y tamaños, de la blanca clásica a las de intención específica. Consulta por WhatsApp el color y el tamaño que buscas y te decimos qué hay disponibles hoy.', 'veladoras', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/veladoras-parafina.jpg', false, 'published', 1),
  ('veladoras-coctel', 'Veladoras de Coctel', 'Veladoras de coctel, las chicas de vidrio, para altarcitos y peticiones cortas.', 'Las veladoras de coctel son las hermanas chicas de la de 7 días: veladoras de vidrio en tamaño pequeño, ideales para altarcitos y santitos, para peticiones cortas o para encender una intención sin comprometer una vela grande. Chicas en tamaño, no en fe.

Manejamos la línea en varios colores y aromas. Consulta por WhatsApp qué veladoras de coctel hay disponibles hoy, o dinos tu intención y te orientamos con la indicada.', 'veladoras', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/veladoras-coctel.jpg', false, 'published', 2),
  ('veladoras-preparadas', 'Veladoras Preparadas', 'Veladoras ya preparadas con hierbas y esencias para una intención específica.', 'Las veladoras preparadas llegan listas para encenderse: vienen cargadas con hierbas, esencias y oración según la intención —protección, amor, dinero, limpia— para que no tengas que vestirla tú. Preparar la veladora es una de las costumbres más antiguas del herbolario mexicano, y aquí se sigue haciendo a mano.

Cada preparación se arma en la casa con su hierba y su oración. Pregunta por WhatsApp qué veladoras preparadas hay disponibles hoy, o cuéntanos qué necesitas y te decimos cuál te sirve.', 'veladoras', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/veladoras-preparadas.jpg', true, 'published', 3),
  ('hierbas', 'Hierbas', 'Hierbas frescas y secas de la casa para tés, baños, limpias y preparados.', 'El corazón del herbolario: ruda, romero, albahaca, manzanilla, tila y muchas más, frescas cuando hay temporada y secas el resto del año. La hierba es la base de casi todo lo que se hace aquí: tés de sobremesa, baños, limpias y preparaciones de la casa.

La disponibilidad cambia con la temporada y con lo que llega del mercado. Consulta por WhatsApp la hierba que buscas y te confirmamos qué hay fresco y qué hay seco.', 'hierbas-y-preparados', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/hierbas.svg', false, 'published', 4),
  ('tes-e-infusiones', 'Tés e Infusiones de la Casa', 'Mezclas de tés e infusiones armadas en la casa para cada momento del día.', 'Los tés de la casa son mezclas armadas aquí mismo con hierbas de siempre: manzanilla con tila para calmar la noche, menta y poleo para la digestión, y combinaciones para el frío y para los nervios. La infusión es sobremesa, remedio y compañía en la casa mexicana.

Manejamos distintas mezclas armadas y hierbas sueltas para infusionar. Consulta por WhatsApp qué mezclas hay disponibles hoy o dinos qué traes en mente y te decimos con qué contamos.', 'hierbas-y-preparados', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/tes-e-infusiones.jpg', false, 'published', 5),
  ('aguas-espirituales', 'Aguas Espirituales', 'Aguas espirituales de distintos títulos para limpias, protección y devoción.', 'Las aguas espirituales son preparaciones de hierbas y esencias dedicadas a un título —como el agua de San Miguel Arcángel o las de flores— que se usan para limpias personales, baños de piso y para rociar la casa cortando lo denso y pidiendo protección.

Manejamos varios títulos, cada uno con su intención y su oración. Consulta por WhatsApp el título específico que buscas y te confirmamos cuáles hay disponibles hoy.', 'aguas-y-riegos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/aguas-espirituales.jpg', true, 'published', 6),
  ('banos-espirituales', 'Baños Espirituales', 'Baños espirituales preparados para despojar y atraer lo que se pide.', 'El baño espiritual es una de las prácticas más arraigadas de la tradición mexicana: se prepara con hierbas, esencias y flores para despojarse de energías densas o para atraer amor, suerte y prosperidad. Aquí los armamos listos para vaciarse en la tina o en la cubeta.

Cada baño lleva su combinación de hierbas según su propósito. Pregunta por WhatsApp qué baños hay disponibles o dinos qué necesitas y te orientamos con el indicado.', 'aguas-y-riegos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/banos-espirituales.jpg', false, 'published', 7),
  ('riegos-fuertes', 'Riegos Fuertes', 'Riegos fuertes para limpiar a fondo pisos y umbrales de trabajos densos.', 'Los riegos fuertes son para cuando la casa necesita más que una limpia de rutina: preparaciones concentradas de hierbas y esencias que se riegan en pisos y umbrales para cortar trabajos densos, despejar el ambiente y dejar la casa en paz.

Se aplican diluidos en agua, de adentro hacia afuera de la casa. Consulta por WhatsApp qué riegos hay disponibles y cómo te conviene aplicarlos según tu caso.', 'aguas-y-riegos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/riegos-fuertes.jpg', false, 'published', 8),
  ('lociones-wiskeras', 'Lociones Wiskeras', 'Línea de lociones wiskeras para limpias, untes y trabajos de protección.', 'Las lociones wiskeras son un clásico del mostrador: lociones de hierbas y esencias que se usan para limpias personales, untes en el cuerpo y para acompañar trabajos de protección, atracción o despojo según la loción que se elija.

Manejamos la línea completa, cada loción con su intención. Consulta por WhatsApp qué lociones wiskeras hay disponibles hoy.', 'lociones', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/lociones-wiskeras.jpg', false, 'published', 9),
  ('capsulas-y-productos-naturales', 'Cápsulas y Productos Naturales', 'Cápsulas, suplementos y productos naturistas para el cuidado diario.', 'Cápsulas de ajo, de hierbas y otros complementos naturistas de uso diario: la forma práctica de seguir las costumbres de la casa sin preparar nada. El ajo deshidratado en cápsulas, por ejemplo, es de lo más pedido por quienes lo toman como complemento de siempre.

Manejamos distintas presentaciones y líneas naturistas. Consulta por WhatsApp el producto o la presentación que buscas y te confirmamos qué hay en mostrador.', 'capsulas-y-suplementos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/capsulas-y-productos-naturales.jpg', false, 'published', 10),
  ('jabones-y-cremas', 'Jabones y Cremas', 'Jabones artesanales, cremas y más productos de tocador elaborados con hierbas.', 'Jabones artesanales de miel, avena y hierbas, cremas para la piel y más productos de tocador hechos o seleccionados con el mismo criterio de siempre: ingredientes naturales y elaboración en pequeñas tandas, como se ha hecho toda la vida.

La selección del mostrador va cambiando según lo que llega. Pregunta por WhatsApp qué jabones y cremas hay hoy, o dinos qué necesitas para tu piel y te orientamos.', 'cuidado-personal', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/jabones-y-cremas.jpg', false, 'published', 11),
  ('shampoos-y-acondicionadores', 'Shampoos y Acondicionadores', 'Shampoos y acondicionadores de hierbas para el cuidado diario del cabello.', 'El cabello también se cuida con hierbas: shampoos y acondicionadores de sábila, romero y otras plantas clásicas del cuidado capilar mexicano, pensados para lavado frecuente y para mantener sano el cuero cabelludo.

Manejamos distintas presentaciones y líneas según lo que hay en mostrador. Consulta por WhatsApp qué shampoos y acondicionadores hay disponibles hoy.', 'cuidado-personal', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/shampoos-y-acondicionadores.jpg', false, 'published', 12),
  ('copal-blanco', 'Copal para Sahumerio', 'Copal en grano para sahumerios, limpias de casa y ceremonias.', 'El copal es la resina ceremonial más emblemática de México: desde la época prehispánica se emplea tradicionalmente para sahumar espacios, acompañar ceremonias y elevar peticiones. Su humo blanco y aromático se usa para limpiar el ambiente y dejar la casa en paz.

Se presenta en grano, listo para quemarse en sahumerio o bracero. Pregunta por nuestras demás resinas e inciensos para sahumerio.', 'sahumerios-e-inciensos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/copal-para-sahumerio.jpg', true, 'published', 13),
  ('lagrimas-de-maria', 'Lágrimas de María', 'Resina de lágrimas de María para sahumerios de protección y consuelo.', 'Las lágrimas de María son una resina aromática de la tradición devocional mexicana: se queman en sahumerio para pedir protección y consuelo, y para acompañar peticiones a la Virgen. Su aroma dulce y profundo perfuma la casa y serena el ambiente.

Se presenta en grano, lista para el sahumerio o el bracero. Consulta por WhatsApp la presentación disponible y cómo quemarla según tu intención.', 'sahumerios-e-inciensos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/lagrimas-de-maria.jpg', false, 'published', 14),
  ('inciensos-de-caja', 'Inciensos de Caja', 'Inciensos en caja: varitas, conos y mezclas para cada aroma e intención.', 'Los inciensos de caja son la forma más práctica de perfumar y limpiar la casa: varitas, conos y mezclas aromáticas —desde el sándalo clásico hasta mezclas de intención— listos para encenderse un rato y cambiar el ambiente del cuarto.

Manejamos distintos aromas y marcas, y la selección del mostrador va rotando. Consulta por WhatsApp qué aromas hay disponibles hoy.', 'sahumerios-e-inciensos', null, 'https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products/inciensos-de-caja.jpg', false, 'published', 15)
on conflict (slug) do nothing;
