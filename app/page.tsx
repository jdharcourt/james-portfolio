import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PcbModel } from "@/components/PcbModel";
import { Contributions } from "@/components/Contributions";
import { buttonVariants } from "@/components/button/components/button";
import { projects, equilibrium, experience, awards, toolbox, socials, profile } from "@/lib/data";

export const dynamic = "force-dynamic";

const cta = "h-11 px-5 text-sm";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Home() {
  const featured = projects.find(project => project.featured)!;
  const others = projects.filter(project => !project.featured);

  return <>
    <Nav />
    <main id="main-content" tabIndex={-1} className="shell">
      <section className="hero" aria-labelledby="intro-title">
        <div className="hero-copy">
          <p className="eyebrow">{profile.role} — {profile.location}</p>
          <h1 id="intro-title" className="hero-name">James<br />Harcourt<span className="dot">.</span></h1>
          <p className="hero-intro">{profile.intro}</p>
          <div className="hero-actions">
            <a className={buttonVariants({ className: cta })} href="#work">Explore projects →</a>
            <Link className={buttonVariants({ variant: "outline", className: cta })} href="/resume">View résumé</Link>
            <span className="hero-note">{equilibrium.role} at <a className="link" href="#equilibrium">{equilibrium.name}</a></span>
          </div>
        </div>
        <figure className="plate">
          <div className="plate-frame"><Image src="/headshot.webp" alt="James Harcourt outdoors beside a lake" width={240} height={304} sizes="(max-width: 52rem) 112px, 244px" preload /></div>
          <figcaption className="label"><span>Fig. 01 — The author</span><span>53.35°N</span></figcaption>
        </figure>
      </section>

      <section className="section" id="equilibrium" aria-labelledby="equilibrium-title">
        <div className="eq">
          <div className="eq-copy">
            <p className="section-label">§ 01 — Now building</p>
            <h2 id="equilibrium-title">{equilibrium.name}<span className="dot">.</span></h2>
            <p className="label">{equilibrium.role} · {equilibrium.period}</p>
            <p className="eq-text">{equilibrium.summary}</p>
            <p className="eq-text">{equilibrium.origin}</p>
            <div className="hero-actions">
              <a className={buttonVariants({ className: cta })} href={equilibrium.href} {...external}>equilibrium.ie ↗</a>
              <a className={buttonVariants({ variant: "outline", className: cta })} href={equilibrium.linkedin} {...external}>Follow on LinkedIn</a>
            </div>
          </div>
          <div className="spec">
            <div className="spec-head"><span>Spec sheet — EQ-01</span><span>Designed in Ireland</span></div>
            <dl>
              {equilibrium.spec.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.text}</dd></div>)}
              <div><dt>Target</dt><dd className="spec-target"><strong>{equilibrium.target}</strong><span>{equilibrium.targetLabel}</span></dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section" id="work" aria-labelledby="work-title">
        <div className="section-head">
          <div><p className="section-label">§ 02 — Selected projects</p><h2 id="work-title" className="section-title">Built end to end.</h2></div>
          <a className="section-link link" href={socials.github} {...external}>All repositories ↗</a>
        </div>
        <article className="featured" aria-labelledby="featured-title">
          <div className="featured-copy">
            <div className="badge-row"><span className="badge">Featured</span><span className="label">{featured.category} · {featured.year}</span></div>
            <h3 id="featured-title">{featured.name}</h3>
            <p>{featured.description}</p>
            <ul className="chips" aria-label="Stack">{featured.stack.map(item => <li key={item}>{item}</li>)}</ul>
            <a className={buttonVariants({ className: cta })} href={featured.href} {...external}>Source code</a>
          </div>
          <PcbModel />
        </article>
        <div className="index" role="table" aria-label="More projects">
          <div className="index-row index-head" role="row"><span role="columnheader">No.</span><span role="columnheader">Project</span><span role="columnheader">Description</span><span role="columnheader">Stack</span><span role="columnheader">Year</span><span role="columnheader" style={{ textAlign: "right" }}>Links</span></div>
          {others.map((project, index) => <article className="index-row" role="row" key={project.name}>
            <span className="index-no" role="cell">{String(index + 2).padStart(2, "0")}</span>
            <h3 role="cell">{project.name}</h3>
            <p role="cell">{project.description}</p>
            <span className="index-stack" role="cell">{project.stack.join(" · ")}</span>
            <span className="index-year" role="cell">{project.year}</span>
            <span className="index-links" role="cell">
              {project.demo && <a className="link" href={project.demo} {...external} aria-label={`Try ${project.name}`}>Demo</a>}
              <a className="link" href={project.href} {...external} aria-label={`${project.name} source code`}>Source</a>
            </span>
          </article>)}
        </div>
      </section>

      <section className="section" id="experience" aria-labelledby="experience-title">
        <div className="log">
          <div className="log-aside">
            <p className="section-label">§ 03 — Experience &amp; awards</p>
            <h2 id="experience-title" className="section-title">Log book.</h2>
            <p className="log-about">{profile.about}</p>
            <ul aria-label="Toolbox">{toolbox.map(item => <li key={item}>{item}</li>)}</ul>
            <Link className="section-link link" href="/resume">Full résumé →</Link>
          </div>
          <div>
            <div className="log-group"><h3 className="label">Experience</h3><Timeline entries={experience} label="Experience" /></div>
            <div className="log-group"><h3 className="label">Awards</h3><Timeline entries={awards} label="Awards" /></div>
          </div>
        </div>
      </section>

      <section className="section" id="activity" aria-labelledby="contributions-title">
        <div className="section-head">
          <div><p className="section-label">§ 04 — Activity</p><h2 id="contributions-title" className="section-title">Commits, public &amp; private.</h2></div>
          <a className="section-link link" href={socials.github} {...external}>@jdharcourt ↗</a>
        </div>
        <Contributions />
      </section>

      <section className="contact" id="contact" aria-labelledby="contact-title">
        <p className="section-label">§ 05 — Get in touch</p>
        <div className="contact-row">
          <h2 id="contact-title">Let’s build something <em>calm.</em></h2>
          <div className="contact-aside">
            <p>Open to opportunities and collaborations in hardware, embedded systems, health-tech and smart buildings.</p>
            <div className="hero-actions">
              <a className={buttonVariants({ className: `${cta} [--color-primary:var(--signal-ink)]` })} href={`mailto:${profile.email}`}>Email James</a>
              <a className={buttonVariants({ variant: "outline", className: cta })} href={socials.linkedin} {...external}>LinkedIn</a>
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
