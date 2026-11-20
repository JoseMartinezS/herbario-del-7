/**
 * Generación de slugs kebab-case para el panel admin (F2.3).
 *
 * Función PURA (sin dependencias de framework ni de red): la usa el
 * formulario de creación EN VIVO (preview de la URL mientras el dueño
 * escribe el nombre) y la Server Action como fuente AUTORITATIVA del
 * slug al insertar la fila. Mismo código en ambos lados = lo que ve el
 * dueño en el preview es exactamente lo que se guarda.
 *
 * Contrato: el resultado es "" o un slug que matchea
 * /^[a-z0-9]+(?:-[a-z0-9]+)*$/ (la misma regex de lib/schema.ts y del
 * CHECK de la tabla `products`). Ver tests: lib/slugify.test.ts.
 */

/** kebab-case: minúsculas y números, separados por guiones (igual que schema.ts). */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** ¿El valor es un slug kebab-case válido (la forma que exige la tabla)? */
export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

/**
 * Convierte un nombre libre en slug kebab-case:
 *
 * 1. minúsculas,
 * 2. NFD + strip de marcas diacríticas (á→a, ü→u; la ñ se descompone en
 *    n + virgulilla, así que ñ→n sale solo),
 * 3. todo lo que no sea [a-z0-9] (espacios, símbolos, guiones bajos)
 *    colapsa en UN guion,
 * 4. guiones de los extremos fuera.
 *
 * "Lágrimas de María" → "lagrimas-de-maria".
 * Un nombre de solo símbolos ("¿?!") → "" (la acción lo rechaza con un
 * mensaje claro: sin letras no hay URL).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
