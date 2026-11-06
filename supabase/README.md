# Supabase: catálogo en la nube (F2.1)

Esta carpeta guarda lo necesario para **mover el catálogo del sitio a Supabase**
(sin que el sitio deje de funcionar jamás: si Supabase falla, el sitio cae
automáticamente al catálogo local `content/products.json` que ya conoce).

| Archivo | Qué es |
| --- | --- |
| `migration.sql` | Script de migración: crea la tabla `products`, los permisos, el bucket de imágenes y carga las 15 líneas actuales. **Se corre UNA vez.** |

---

## Paso a paso para activar el catálogo en Supabase

Son 4 pasos, **en este orden**. Todos desde el navegador, nada de terminal.

### 1. Correr la migración (crea tabla + permisos + carga los 15 productos)

1. Entra a [supabase.com](https://supabase.com) e inicia sesión.
2. Abre tu proyecto de Herbario Del 7.
3. En el menú lateral, elige **SQL Editor** → botón **New query**.
4. Abre el archivo `supabase/migration.sql`, copia **todo** su contenido y pégalo en el editor.
5. Pulsa **Run** (abajo a la derecha). En segundos debe decir "Success".

> El script es **idempotente**: si por accidente lo corres dos veces, no pasa
> nada (no duplica productos ni rompe permisos). Lo que NO hace es actualizar
> productos que ya editaste a mano en el dashboard: para eso está el panel
> de administración de la fase 2.3.

### 2. Subir las 15 fotos al bucket `products`

La migración ya creó el bucket (la carpeta pública de Storage). Falta subirle
los archivos de imagen, que están en este repo en `public/images/products/`:

1. En el menú lateral del proyecto, elige **Storage**.
2. Abre la carpeta **products** (el bucket que acaba de crear la migración).
3. Pulsa **Upload files** (o arrastra los archivos) y sube estos 15,
   **con estos nombres exactos** (son los que la tabla espera):

   | Archivo | | Archivo |
   | --- | --- | --- |
   | `veladoras-parafina.jpg` | | `lociones-wiskeras.jpg` |
   | `veladoras-coctel.jpg` | | `capsulas-y-productos-naturales.jpg` |
   | `veladoras-preparadas.jpg` | | `jabones-y-cremas.jpg` |
   | `hierbas.svg` | | `shampoos-y-acondicionadores.jpg` |
   | `tes-e-infusiones.jpg` | | `copal-para-sahumerio.jpg` |
   | `aguas-espirituales.jpg` | | `lagrimas-de-maria.jpg` |
   | `banos-espirituales.jpg` | | `inciensos-de-caja.jpg` |
   | `riegos-fuertes.jpg` | | |

> El bucket acepta fotos de hasta 10 MB, en formato JPG, PNG, WebP o SVG.
> Si un archivo pesa más, la web lo rechazará: avisale a quien te apoya
> técnico para comprimirla antes.

### 3. Configurar las variables en Vercel

Las dos variables le dicen al sitio "lee el catálogo de Supabase". Sin ellas,
el sitio sigue leyendo el JSON local (el modo de siempre).

1. Entra a [vercel.com](https://vercel.com) y abre el proyecto de Herbario Del 7.
2. **Settings → Environment Variables** y agrega estas dos (los valores se
   copian del dashboard de Supabase, en **Project Settings → API**):
   - `NEXT_PUBLIC_SUPABASE_URL` → copiá **Project URL**
     (algo como `https://mmvifyolydrohrfffqtl.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → copiá la **Publishable key**
     (la clave pública; ⚠️ NUNCA uses la `service_role`: esa es privada)
3. Guardá los cambios.

### 4. Redeployar

En Vercel: **Deployments → el más reciente → ⋯ → Redeploy**. Con las variables
ya configuradas, el nuevo deploy lee el catálogo de Supabase.

**Para verificar que quedó activo:** abrí `herbariodel7.com/catalogo` — si ves
el catálogo completo con fotos, listo. (Con Supabase caído también verías el
catálogo, pero desde el JSON local: es el respaldo automático.)

---

## Cómo funciona el modo doble (resumen)

| Situación | Qué lee el sitio |
| --- | --- |
| Sin las variables en Vercel | `content/products.json` (catálogo local — el modo original) |
| Con las variables | Tabla `products` de Supabase |
| Con las variables pero Supabase caído o con error | `content/products.json` (respaldo automático + aviso en los logs de Vercel) |

**Desactivar Supabase:** borra (o vacía) las dos variables en Vercel y
redeploya. El sitio vuelve al JSON local, igual que antes.

**Editar productos:** hasta la fase 2.3 (panel de administración), los cambios
se hacen directo en el dashboard de Supabase (**Table Editor → products**) y el
sitio los refleja dentro de la hora. Ojo con dos campos:
- `status`: solo `published` se muestra al público; `retired` lo esconde sin borrarlo.
- `position`: el orden de exhibición (1 = primero).
