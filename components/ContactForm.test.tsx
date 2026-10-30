import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BUSINESS } from "@/content/business";
import ContactForm from "./ContactForm";

/**
 * Tests del formulario de contacto: la única interacción con estado del sitio
 * (client component sin backend). Valida reglas en español y que el envío
 * abra WhatsApp con el mensaje compuesto EXACTO.
 *
 * La composición del texto (components/ContactForm.tsx) es:
 *   `Hola, soy ${nombre}. ${mensaje}${telefono?:" Mi teléfono: ${tel}."}`
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContactForm", () => {
  it("debería renderizar los tres campos con labels accesibles y el botón de envío", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enviar por WhatsApp" }),
    ).toBeInTheDocument();
  });

  it("debería mostrar los errores en español al enviar el formulario vacío", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await user.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));

    expect(
      await screen.findByText("Ingresa tu nombre (al menos 2 letras)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cuéntanos un poco más (al menos 10 caracteres)."),
    ).toBeInTheDocument();
    // Teléfono es opcional: sin valor NO debe producir error.
    expect(
      screen.queryByText("Ingresa entre 10 y 15 dígitos, sin espacios ni guiones."),
    ).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("debería rechazar un mensaje de menos de 10 caracteres", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await user.type(screen.getByLabelText("Nombre"), "María");
    await user.type(screen.getByLabelText("Mensaje"), "hola");
    await user.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));

    expect(
      await screen.findByText("Cuéntanos un poco más (al menos 10 caracteres)."),
    ).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("debería rechazar un teléfono con letras", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await user.type(screen.getByLabelText("Nombre"), "María");
    await user.type(screen.getByLabelText(/teléfono/i), "8661234abc");
    await user.type(
      screen.getByLabelText("Mensaje"),
      "¿Tienen ruda fresca esta semana?",
    );
    await user.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));

    expect(
      await screen.findByText("Ingresa entre 10 y 15 dígitos, sin espacios ni guiones."),
    ).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("debería abrir WhatsApp con el mensaje compuesto (sin teléfono)", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await user.type(screen.getByLabelText("Nombre"), "María González");
    await user.type(
      screen.getByLabelText("Mensaje"),
      "¿Tienen ruda fresca disponible esta semana?",
    );
    await user.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));

    // El estado de éxito solo se renderiza DESPUÉS de llamar window.open:
    // esperarlo garantiza el orden de los asserts del spy.
    expect(await screen.findByRole("status")).toBeInTheDocument();

    const texto =
      "Hola, soy María González. ¿Tienen ruda fresca disponible esta semana?";
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      `${BUSINESS.whatsapp.url}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener",
    );
  });

  it("debería incluir el teléfono en el mensaje cuando se proporcionó", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await user.type(screen.getByLabelText("Nombre"), "María González");
    await user.type(screen.getByLabelText(/teléfono/i), "8661234567");
    await user.type(
      screen.getByLabelText("Mensaje"),
      "¿Tienen ruda fresca disponible esta semana?",
    );
    await user.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();

    const texto =
      "Hola, soy María González. ¿Tienen ruda fresca disponible esta semana? Mi teléfono: 8661234567.";
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      `${BUSINESS.whatsapp.url}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener",
    );
  });
});
