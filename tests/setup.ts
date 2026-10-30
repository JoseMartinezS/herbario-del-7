/**
 * Setup global de Vitest.
 *
 * - Registra los matchers de @testing-library/jest-dom (toBeInTheDocument, etc.)
 *   sobre el expect de Vitest.
 * - El cleanup automático de RTL no hace falta explícito: con `globals: true`
 *   existe un `afterEach` global y @testing-library/react se registra solo.
 */
import "@testing-library/jest-dom/vitest";
