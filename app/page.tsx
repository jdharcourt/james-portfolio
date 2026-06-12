import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import { projects, toolbox, builds, socials } from "@/lib/data";

export default function Home() {
  return (
    <>
      <div className="grain" aria-hidden />
      <Nav />

      <main id="top">
        {/* Hero */}
        <section className="hero">
          <Reveal as="div">
            <p className="hero__eyebrow">Hardware × Software Engineer</p>
          </Reveal>
          <Reveal as="div" delay={80}>
            <h1 className="hero__title">
              James <span className="grad">Harcourt</span>
            </h1>
          </Reveal>
          <Reveal as="div" delay={160}>
            <p className="hero__lead">
              I design and build <strong>embedded systems and health-tech</strong> —
              from low-cost IoT glucose monitors to solar trackers and iOS companion
              apps. Bringing hardware, firmware and clean interfaces together into things
              people can actually use.
            </p>
          </Reveal>
          <Reveal as="div" delay={240}>
            <div className="hero__cta">
              <a href="#work" className="btn btn--primary">
                View my work
              </a>
              <a
                href={socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
              >
                GitHub ↗
              </a>
            </div>
          </Reveal>
          <Reveal as="div" delay={320}>
            <div className="hero__stats">
              <div>
                <span className="stat__num">
                  <CountUp to={4} />
                </span>
                <span className="stat__label">Shipped projects</span>
              </div>
              <div>
                <span className="stat__num">Embedded</span>
                <span className="stat__label">+ iOS + Web</span>
              </div>
              <div>
                <span className="stat__num">IoT</span>
                <span className="stat__label">Health-tech focus</span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Marquee */}
        <div className="marquee" aria-hidden>
          <div className="marquee__track">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="marquee__group">
                {[
                  "CircuitPython",
                  "Swift",
                  "C++",
                  "BLE",
                  "PCB Design",
                  "IoT",
                  "Embedded Firmware",
                  "SwiftUI",
                ].map((w) => (
                  <span key={w}>
                    {w} <i>•</i>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* Work */}
        <section className="section" id="work">
          <Reveal className="section__head">
            <h2 className="section__title">Selected work</h2>
            <p className="section__sub">
              A mix of hardware, firmware and apps I&apos;ve built end-to-end.
            </p>
          </Reveal>

          <div className="projects">
            {projects.map((p, i) => (
              <Reveal as="article" key={p.name} delay={i * 80}>
                <div className="card" data-accent={p.accent}>
                  <div className="card__top">
                    <span className="card__tag">{p.tag}</span>
                    <span className="card__year">{p.year}</span>
                  </div>
                  <h3 className="card__title">{p.name}</h3>
                  <p className="card__desc">{p.description}</p>
                  <ul className="card__stack">
                    {p.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <div className="card__links">
                    <a href={p.href} target="_blank" rel="noopener noreferrer">
                      Code ↗
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}

            <Reveal as="article" delay={projects.length * 80}>
              <div className="card card--cta">
                <h3 className="card__title">More on GitHub</h3>
                <p className="card__desc">
                  Personal site builds, experiments and works in progress.
                </p>
                <div className="card__links">
                  <a href={socials.github} target="_blank" rel="noopener noreferrer">
                    View profile ↗
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* About */}
        <section className="section about" id="about">
          <div className="about__grid">
            <Reveal>
              <h2 className="section__title">About</h2>
              <p className="about__text">
                I&apos;m an engineer who likes to live at the boundary between hardware
                and software. Most of my work starts with a real-world problem — like
                making glucose data glanceable for someone living with diabetes — and
                follows it all the way down: schematic and PCB, firmware on the metal,
                the cloud calls, and the app in your hand.
              </p>
              <p className="about__text">
                I care about systems that are <em>reliable</em>, <em>low-cost</em> and
                genuinely usable — not just demos. I&apos;m comfortable across embedded
                CircuitPython and C++, native iOS in Swift, and the web. I also enjoy the hands-on side of things: soldering, 3D printing, and designing PCBs.
              </p>
            </Reveal>
            <Reveal as="aside" className="about__panel" delay={120}>
              <h4>Toolbox</h4>
              <div className="chips">
                {toolbox.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <h4>What I build</h4>
              <div className="chips chips--alt">
                {builds.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Contact */}
        <section className="section contact" id="contact">
          <Reveal className="contact__inner">
            <p className="contact__eyebrow">Get in touch</p>
            <h2 className="contact__title">Let&apos;s build something.</h2>
            <p className="contact__sub">
              Open to opportunities and collaborations in hardware, embedded systems and
              health-tech.
            </p>
            <div className="contact__links">
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary"
              >
                LinkedIn ↗
              </a>
              <a
                href={socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
              >
                GitHub ↗
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} James Harcourt</span>
        <span>Built with Next.js - And a little help from my good friend Claude</span>
      </footer>
    </>
  );
}
