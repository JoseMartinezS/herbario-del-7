import { describe, expect, it } from "vitest";
import { BUSINESS } from "./business";
import type { BusinessHours } from "./business";

/**
 * Tests de integridad del NAP (Name, Address, Phone).
 *
 * content/business.ts es el ACTIVO de la verificación de Meta: si el teléfono,
 * la dirección o los horarios se rompen, se rompe la verificación del negocio.
 * Estos tests son la red de seguridad.
 */

const DIAS_ENTRE_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

describe("BUSINESS.name", () => {
  it("debería ser el nombre exacto del negocio", () => {
    expect(BUSINESS.name).toBe("Herbario Del 7");
  });
});

describe("BUSINESS.phone y BUSINESS.whatsapp", () => {
  it("debería tener el teléfono de llamadas con tel y display consistentes", () => {
    expect(BUSINESS.phone.tel).toBe("+528666357585");
    // El display muestra el mismo número, solo formateado con espacios.
    expect(BUSINESS.phone.display.replace(/\s/g, "")).toBe(BUSINESS.phone.tel);
  });

  it("debería tener teléfono y WhatsApp distintos (los DOS números existen)", () => {
    const telefonoLlamadas = BUSINESS.phone.tel.replace(/\D/g, "");
    const telefonoWhatsApp = BUSINESS.whatsapp.url.replace(/\D/g, "");
    expect(telefonoLlamadas).not.toBe(telefonoWhatsApp);
    expect(BUSINESS.phone.display).not.toBe(BUSINESS.whatsapp.display);
  });

  it("debería apuntar el WhatsApp a wa.me con el número correcto", () => {
    expect(BUSINESS.whatsapp.url).toBe("https://wa.me/5218661647442");
  });
});

describe("BUSINESS.email", () => {
  it("debería tener formato de dirección de correo", () => {
    expect(BUSINESS.email).toContain("@");
    expect(BUSINESS.email).toMatch(/\.com$/);
  });
});

describe("BUSINESS.address", () => {
  it("debería tener la dirección completa de Frontera, Coahuila", () => {
    expect(BUSINESS.address.street).not.toBe("");
    expect(BUSINESS.address.neighborhood).not.toBe("");
    expect(BUSINESS.address.city).toBe("Frontera");
    expect(BUSINESS.address.state).toBe("Coahuila");
    expect(BUSINESS.address.country).toBe("México");
  });

  it("debería poder armarse una búsqueda de Google Maps desde la dirección", () => {
    const { street, neighborhood, city, state, mapsQuery } = BUSINESS.address;
    // mapsQuery no lleva el "#" del número ni el prefijo "Col." de la colonia.
    expect(mapsQuery).toContain(street.replace("#", ""));
    expect(mapsQuery).toContain(neighborhood.replace("Col. ", ""));
    expect(mapsQuery).toContain(city);
    expect(mapsQuery).toContain(state);
  });
});

describe("BUSINESS.hours", () => {
  it("debería cubrir lunes a sábado con DOS turnos (09:00–14:00 y 15:00–21:00)", () => {
    for (const dia of DIAS_ENTRE_SEMANA) {
      // Anotar el turno como BusinessHours: sobre la unión de tuplas literales
      // de `as const`, `.includes()` tipa su parámetro como `never`.
      const turnos = BUSINESS.hours.filter(
        (turno: BusinessHours) => turno.days.includes(dia),
      );
      const horarios = turnos.map((turno) => `${turno.open}-${turno.close}`);
      expect(horarios, `Horarios del ${dia}`).toEqual([
        "09:00-14:00",
        "15:00-21:00",
      ]);
    }
  });

  it("debería cubrir el domingo con UN solo turno (10:00–13:00)", () => {
    const domingo = BUSINESS.hours.filter(
      (turno: BusinessHours) => turno.days.includes("Domingo"),
    );
    expect(domingo).toHaveLength(1);
    expect(domingo[0].open).toBe("10:00");
    expect(domingo[0].close).toBe("13:00");
  });

  it("debería usar horarios en formato 24 h HH:MM", () => {
    for (const turno of BUSINESS.hours) {
      expect(turno.open).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(turno.close).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });
});

describe("BUSINESS.social", () => {
  it("debería tener URLs https válidas de Facebook e Instagram", () => {
    const facebook = new URL(BUSINESS.social.facebook);
    expect(facebook.protocol).toBe("https:");
    expect(facebook.hostname).toBe("www.facebook.com");

    const instagram = new URL(BUSINESS.social.instagram);
    expect(instagram.protocol).toBe("https:");
    expect(instagram.hostname).toBe("www.instagram.com");
  });
});
