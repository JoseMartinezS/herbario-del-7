import { BUSINESS } from "@/content/business";

/**
 * Renderiza los turnos de atención agrupados por días: los turnos que
 * comparten días (p. ej. lunes–sábado matutino y vespertino) se muestran
 * en una sola línea ("de 9:00 a 14:00 y de 15:00 a 21:00").
 *
 * `showLunchNote` agrega la nota del cierre para comida cuando detecta
 * turnos partidos (hay un hueco entre el cierre de un turno y la apertura
 * del siguiente el mismo día).
 */

interface HoursListProps {
  /** Muestra la nota del cierre para comida (solo si hay turnos partidos). */
  showLunchNote?: boolean;
  /** Fondo sobre el que vive la lista. */
  tone?: "cream" | "green";
}

interface DayGroup {
  key: string;
  days: readonly string[];
  windows: Array<{ open: string; close: string }>;
}

/** "Lunes" … "Sábado" → "Lunes a sábado" | "Sábado y domingo" | "Domingo". */
function formatDays(days: readonly string[]): string {
  if (days.length === 0) return "";
  if (days.length === 1) return days[0];
  const rest = days.slice(1).map((day) => day.toLowerCase());
  if (days.length === 2) return `${days[0]} y ${rest[0]}`;
  return `${days[0]} a ${rest[rest.length - 1]}`;
}

/** "09:00" → "9:00" (mantenemos el formato de 24 horas, sin cero a la izquierda). */
function formatTime(time: string): string {
  return time.replace(/^0(?=\d)/, "");
}

function groupHours(): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const turno of BUSINESS.hours) {
    const key = turno.days.join(",");
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.windows.push({ open: turno.open, close: turno.close });
    } else {
      groups.push({
        key,
        days: turno.days,
        windows: [{ open: turno.open, close: turno.close }],
      });
    }
  }
  return groups;
}

export default function HoursList({
  showLunchNote = false,
  tone = "cream",
}: HoursListProps) {
  const groups = groupHours();

  // Primer hueco entre turnos del mismo grupo de días = cierre de comida.
  const lunchBreak =
    showLunchNote &&
    groups.find(
      (group) =>
        group.windows.length > 1 &&
        group.windows
          .slice(1)
          .some((window, index) => window.open > group.windows[index].close),
    );
  const lunchText = lunchBreak
    ? `Cerramos de ${formatTime(lunchBreak.windows[0].close)} a ${formatTime(
        lunchBreak.windows[1].open,
      )} para la comida (${formatDays(lunchBreak.days).toLowerCase()}).`
    : null;

  const dayClass = tone === "green" ? "text-cream" : "text-green-800";
  const timeClass = tone === "green" ? "text-cream/80" : "text-green-800/75";
  const noteClass = tone === "green" ? "text-gold-200/90" : "text-terracotta-700";

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <li key={group.key} className="leading-relaxed">
            <span className={`font-semibold ${dayClass}`}>
              {formatDays(group.days)}:
            </span>{" "}
            <span className={timeClass}>
              {group.windows
                .map(
                  (window) =>
                    `de ${formatTime(window.open)} a ${formatTime(window.close)}`,
                )
                .join(" y ")}
            </span>
          </li>
        ))}
      </ul>
      {lunchText ? <p className={`text-sm ${noteClass}`}>{lunchText}</p> : null}
    </div>
  );
}
