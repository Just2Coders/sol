import Image from "next/image";
import { CheckCircle } from "reicon-react";

import { FlatCta } from "./flat-cta";
import { SectionHeading } from "./section-heading";
import { TrustPhotoCarousel } from "./trust-photo-carousel";
import { TRUST_TEAMS, type TrustTeam } from "./trust-data";

/**
 * "Quién va a entrar a tu casa".
 *
 * Cada equipo ocupa una pantalla entera —texto y foto a la vez, lado a lado—
 * en vez de competir por espacio con el otro equipo a media altura. Por eso el
 * bloque completo es `h-screen`: el visitante ve un proveedor por pantalla,
 * texto y foto juntos, y pasa al siguiente con un solo empujón de scroll.
 *
 * Por eso el `px-gutter` no vive en la sección sino en cada bloque de texto:
 * la foto tiene que poder sangrar borde a borde, igual que el hero.
 *
 * Los dos equipos usan la misma anatomía y se diferencian en cómo cuentan: el
 * primero en filas de datos consultables, el segundo en lista de lo que
 * incluye.
 *
 * ⚠️ Los equipos son de ejemplo — ver `./trust-data`.
 */
export function Trust() {
  return (
    <section className="bg-background py-section-md">
      <div className="px-gutter">
        <SectionHeading
          eyebrow="quién instala"
          title="Quién va a entrar a tu casa."
          body="Un equipo con nombre, provincia y garantía — no un número de teléfono suelto."
        />
      </div>

      <div className="mt-14 flex flex-col">
        {TRUST_TEAMS.map((team) => (
          <TeamBlock key={team.headline} team={team} />
        ))}
      </div>
    </section>
  );
}

function TeamBlock({ team }: { team: TrustTeam }) {
  return (
    <article className="flex h-screen flex-col md:flex-row">
      <div className="px-gutter flex shrink-0 flex-col justify-center gap-7 py-10 md:w-150 md:shrink-0">
        <h3 className="text-display-3 text-foreground">{team.headline}</h3>

        <div>
          <FlatCta href="/sell" size="md">
            {team.cta}
          </FlatCta>
        </div>

        {team.layout === "rows" ? (
          <ul className="mt-3">
            {team.facts.map((fact) => (
              <li
                key={fact}
                className="border-foreground text-body-sm text-foreground border-t py-4.5 last:border-b"
              >
                {fact}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-2 flex flex-col gap-5">
            {team.facts.map((fact) => (
              <li key={fact} className="flex items-center gap-3">
                <CheckCircle
                  aria-hidden
                  className="text-foreground size-5 shrink-0"
                />
                <span className="text-body-sm text-foreground">{fact}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* La foto llena el resto de la pantalla que ya reservó el `h-screen`
          del artículo — no tiene alto propio. Varias fotos son un carrusel:
          una a la vez entera, no cuatro lonchas cortadas. */}
      <div className="relative min-h-0 flex-1">
        {team.photos.length > 1 ? (
          <TrustPhotoCarousel photos={team.photos} />
        ) : (
          <Image
            src={team.photos[0].url}
            alt={team.photos[0].alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>
    </article>
  );
}
