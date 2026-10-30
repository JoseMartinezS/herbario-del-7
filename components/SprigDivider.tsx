import { IconSprig } from "./icons";

/**
 * Fleurón botánico: filete — brote — filete. Separa secciones sobre fondo
 * crema con un guiño al sello de la marca. Puramente decorativo.
 */
export default function SprigDivider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-sand" />
      <IconSprig className="h-4.5 w-4.5 text-gold-500" />
      <span className="h-px flex-1 bg-sand" />
    </div>
  );
}
