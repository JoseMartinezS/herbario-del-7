-- ============================================================================
-- Herbario Del 7 — Migración 2: tabla `categories` (F2.5)
-- ============================================================================
--
-- QUÉ HACE ESTE ARCHIVO (en orden):
--   1. Crea la tabla `public.categories`: las familias del mostrador dejan
--      de ser un enum compilado en el código y pasan a ser DATOS que el
--      panel de administración puede gestionar (crear, renombrar, ordenar).
--   2. Activa Row Level Security con las MISMAS políticas que products:
--      lectura pública, escritura solo con sesión iniciada.
--   3. Siembra las 7 familias actuales con sus nombres y descripciones
--      EXACTOS (los que vivían en CATEGORY_INFO de lib/types.ts) y su
--      orden vigente (posicion 1-7).
--   4. Suelta el CHECK de products.category (el enum de los 7 slugs que
--      bloqueaba categorías nuevas a nivel base) y lo reemplaza por una
--      FK hacia categories.slug: la base sigue siendo la guardiana, pero
--      de la lista REAL y no de una lista congelada en 2024.
--
-- CÓMO CORRERLO (el dueño, una sola vez por base):
--   Dashboard de Supabase → tu proyecto → SQL Editor → New query →
--   pegar TODO este archivo → Run. Duración: segundos.
--   Correrlo DESPUÉS de supabase/migration.sql (la FK necesita products).
--
-- ES IDEMPOTENTE: se puede correr más de una vez sin romper nada
--   (if not exists / on conflict do nothing / drop policy if exists).
--   Re-correrlo NO actualiza datos existentes: una categoría renombrada a
--   mano en el dashboard no se toca (mismo criterio que migration.sql).
--
-- POR QUÉ LA FK NACE VALIDADA: el CHECK viejo garantiza que hoy la columna
--   products.category solo contiene los 7 slugs, y el paso 3 ya insertó
--   esos 7 en categories — la FK no necesita migrar ningún dato.
--   - ON DELETE RESTRICT: la base RECHAZA borrar una categoría que todavía
--     tiene productos (cero huérfanos por construcción: no hace falta
--     acordarse de validar nada en el panel).
--   - ON UPDATE CASCADE: si un slug se corrige a mano en la tabla, las
--     filas de products lo acompañan solas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de categorías
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  -- Identificador público, de la URL (?categoria=<slug>) y de la FK de
  -- products.category. Kebab-case, igual que los slugs del catálogo.
  slug text primary key
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Etiqueta legible ("Veladoras"): la que se muestra en chips, badges y
  -- migas de pan (antes vivía en CATEGORY_INFO del código).
  nombre text not null,
  -- Descripción corta para la grilla de familias del home.
  descripcion text not null default '',
  -- Orden de exhibición (1 = primera); el sitio pide las filas ordenadas
  -- por esta columna, como hace con position en products.
  posicion integer not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.categories is
  'Familias del catálogo de Herbario Del 7. El sitio público las lee ordenadas por posicion; products.category apunta a categories.slug (FK products_category_fk).';

comment on column public.categories.posicion is
  'Orden de exhibición (1 = primera). Hereda el orden curado de las 7 familias originales del mostrador.';

-- ----------------------------------------------------------------------------
-- 2. Row Level Security: espejo de products — pública de LECTURA (el sitio
--    y el catálogo la necesitan sin login), privada de escritura (el panel
--    F2.5 escribirá con sesión; nadie más toca los datos).
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;

-- Lectura pública: cualquiera (sin login) puede ver las categorías. La key
-- anon del sitio viaja solo con permiso de SELECT.
drop policy if exists "categories_select_publico" on public.categories;
create policy "categories_select_publico"
  on public.categories
  for select
  to anon, authenticated
  using (true);

-- Escritura solo con sesión iniciada (para el panel de administración).
drop policy if exists "categories_insert_autenticado" on public.categories;
create policy "categories_insert_autenticado"
  on public.categories
  for insert
  to authenticated
  with check (true);

drop policy if exists "categories_update_autenticado" on public.categories;
create policy "categories_update_autenticado"
  on public.categories
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "categories_delete_autenticado" on public.categories;
create policy "categories_delete_autenticado"
  on public.categories
  for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 3. Semilla: las 7 familias actuales, en su orden vigente (posicion 1-7).
--    Nombres y descripciones EXACTOS a los que vivían en el código
--    (CATEGORY_INFO de lib/types.ts) y a content/categories.json del repo.
--    on conflict (slug) do nothing: si la fila ya existe, no se toca.
-- ----------------------------------------------------------------------------
insert into public.categories (slug, nombre, descripcion, posicion) values
  ('veladoras', 'Veladoras', 'Veladoras de 7 días y aromáticas para acompañar tus peticiones y devociones.', 1),
  ('hierbas-y-preparados', 'Hierbas y preparados', 'Hierbas frescas, tés y preparados tradicionales de la herbolaria mexicana.', 2),
  ('aguas-y-riegos', 'Aguas y riegos', 'Aguas aromáticas y de riego para limpiar y armonizar tus espacios.', 3),
  ('lociones', 'Lociones', 'Lociones y aguas de tocador elaboradas con hierbas.', 4),
  ('capsulas-y-suplementos', 'Cápsulas y suplementos', 'Cápsulas y suplementos naturales para tu rutina diaria.', 5),
  ('cuidado-personal', 'Cuidado personal', 'Jabones, shampoos y productos naturales para piel y cabello.', 6),
  ('sahumerios-e-inciensos', 'Sahumerios e Inciensos', 'Copal, resinas e inciensos para sahumar la casa y acompañar tus peticiones.', 7)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 4. products.category: del CHECK de los 7 slugs a la FK hacia categories.
--
--    El CHECK inline del create table de migration.sql quedó con el nombre
--    por defecto de PostgreSQL: "products_category_check". El bloque DO
--    de abajo suelta CUALQUIER check de esa columna (robusto aunque el
--    nombre autogenerated variara) y luego se crea la FK.
--
--    Gracias al CHECK viejo, la columna hoy solo contiene slugs de las 7
--    semillas — y el paso 3 ya las insertó: la FK nace verde sin migrar
--    datos. De acá en adelante, una categoría nueva es legal en products
--    SOLO si existe como fila en categories (la FK es el guardián).
-- ----------------------------------------------------------------------------
do $$
declare
  resticcion text;
begin
  for resticcion in
    select conname
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and conkey @> array[
        (select attnum
         from pg_attribute
         where attrelid = 'public.products'::regclass
           and attname = 'category')
      ]
  loop
    execute format('alter table public.products drop constraint %I', resticcion);
  end loop;
end
$$;

alter table public.products
  drop constraint if exists products_category_fk;

alter table public.products
  add constraint products_category_fk
  foreign key (category)
  references public.categories (slug)
  on update cascade
  on delete restrict;

-- El índice por categoría ya lo crea migration.sql; se reafirma acá por
-- si esta migración se corre sobre una base donde faltara (la FK lo usa).
create index if not exists products_category_idx on public.products (category);
