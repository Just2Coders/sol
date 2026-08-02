import { CheckCircle } from "reicon-react";

import { FlatCta } from "./flat-cta";
import { PhotoHole } from "./photo-hole";
import { SectionHeading } from "./section-heading";
import { TRUST_TEAMS, TRUST_TERMS, type TrustTeam } from "./trust-data";

/**
 * "Gente real, instalando cerca de ti".
 *
 * Un solo bloque de tinta con todo dentro y las piezas separadas por un pelo:
 * el fondo del contenedor es el foreground y los hijos van en el fondo de
 * página con `gap-px`, así que las líneas que dividen la sección no son bordes
 * —son el propio material asomando por las juntas—. Por eso los filetes casan
 * perfecto entre columnas de distinto alto, que es donde un `border` siempre
 * termina desalineado.
 *
 * Los dos equipos usan la misma anatomía y se diferencian en cómo cuentan: el
 * primero en filas de datos consultables, el segundo en lista de lo que
 * incluye. Y la tira de condiciones cierra el bloque desde dentro, no como una
 * sección aparte: son las reglas del mismo trato.
 *
 * ⚠️ Los equipos son de ejemplo — ver `./trust-data`.
 */
export function Trust() {
  return (
    <section className="bg-background px-gutter py-section-md">
      <SectionHeading
        eyebrow="confianza"
        title="Gente real, instalando cerca de ti."
        body="Así funciona antes de que un proveedor entre a tu casa."
      />

      <div className="bg-foreground mt-14 flex flex-col gap-px">
        {TRUST_TEAMS.map((team) => (
          <TeamBlock key={team.headline} team={team} />
        ))}

        <dl className="bg-background flex flex-col gap-8 pt-8 pb-2 md:flex-row md:gap-12">
          {TRUST_TERMS.map((term) => (
            <div key={term.question} className="flex flex-col gap-1.5 md:flex-1">
              <dt className="text-label tracking-mono-sm text-foreground font-mono uppercase">
                {term.question}
              </dt>
              <dd className="text-body-xs text-foreground">{term.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function TeamBlock({ team }: { team: TrustTeam }) {
  return (
    <article className="flex flex-col gap-px md:flex-row">
      {/* La columna de texto no lleva padding izquierdo: arranca en el mismo
          gutter que el titular de la sección, así el bloque no se lee como una
          caja metida dentro de otra. */}
      <div className="bg-background flex w-full flex-col gap-5 py-10 md:w-110 md:shrink-0 md:pr-10">
        <p className="text-label tracking-mono-xs text-foreground font-mono">
          {team.dateline}
        </p>
        <h3 className="text-heading-1 text-foreground">{team.headline}</h3>

        <div>
          <FlatCta href="/#supplier" size="sm">
            {team.cta}
          </FlatCta>
        </div>

        {team.layout === "rows" ? (
          <ul className="mt-3">
            {team.facts.map((fact) => (
              <li
                key={fact}
                className="border-foreground text-body-xs text-foreground border-t py-3.5 last:border-b"
              >
                {fact}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-2 flex flex-col gap-3.5">
            {team.facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2.5">
                <CheckCircle
                  aria-hidden
                  className="text-foreground size-4 shrink-0"
                />
                <span className="text-body-xs text-foreground">{fact}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Un plano grande o una tira de cuatro: la misma altura mínima en los dos
          casos, para que los dos equipos ocupen el mismo peso en la página. */}
      <div className="flex flex-1 flex-col gap-px sm:flex-row">
        {team.photos.map((photo) => (
          <PhotoHole
            key={photo}
            label={photo}
            align={team.photos.length > 1 ? "bottom" : "center"}
            className="min-h-105 flex-1"
          />
        ))}
      </div>
    </article>
  );
}
