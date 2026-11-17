import Link from "next/link";
import { awards, education, equilibrium, experience, profile, projects, socials, toolbox } from "@/lib/data";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * The passport's contents as plain HTML: read by screen readers and search
 * engines, and shown on its own if WebGL is unavailable.
 */
export function PassportText() {
  return (
    <article className="passport-text" id="passport-text">
      <header>
        <h1>{profile.name}</h1>
        <p>
          {profile.role} · {equilibrium.role}, {equilibrium.name} · {profile.location}
        </p>
        <p>{profile.intro}</p>
      </header>
      <section aria-labelledby="pt-equilibrium">
        <h2 id="pt-equilibrium">{equilibrium.name}</h2>
        <p>
          {equilibrium.role}, {equilibrium.period}. {equilibrium.summary} {equilibrium.target} {equilibrium.targetLabel}.
        </p>
        <p>
          <a href={equilibrium.href} {...external}>
            equilibrium.ie
          </a>
        </p>
      </section>
      <section aria-labelledby="pt-projects">
        <h2 id="pt-projects">Projects</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.name}>
              <h3>
                {p.name} <span>· {p.year}</span>
              </h3>
              <p>{p.summary ?? p.description}</p>
              <p>
                <a href={p.href} {...external}>
                  Source
                </a>
                {p.demo && (
                  <>
                    {" · "}
                    <a href={p.demo} {...external}>
                      Demo
                    </a>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="pt-experience">
        <h2 id="pt-experience">Experience</h2>
        <ul>
          {experience.map((e) => (
            <li key={e.org + e.title}>
              {e.title}, {e.org} · {e.period}
            </li>
          ))}
        </ul>
        <h2>Awards</h2>
        <ul>
          {awards.map((a) => (
            <li key={a.title}>
              {a.title}, {a.org} · {a.period}
            </li>
          ))}
        </ul>
        <h2>Education</h2>
        <ul>
          {education.map((e) => (
            <li key={e.title}>
              {e.title}, {e.org} · {e.period}
            </li>
          ))}
        </ul>
        <p>{toolbox.join(" · ")}</p>
      </section>
      <section aria-labelledby="pt-contact">
        <h2 id="pt-contact">Contact</h2>
        <p>
          <a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={socials.linkedin} {...external}>LinkedIn</a> ·{" "}
          <a href={socials.github} {...external}>
            GitHub
          </a>{" "}
          · <Link href="/resume">Résumé</Link>
        </p>
      </section>
    </article>
  );
}
