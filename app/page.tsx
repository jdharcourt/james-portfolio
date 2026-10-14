import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PcbModel } from "@/components/PcbModel";
import { Contributions } from "@/components/Contributions";
import { projects, toolbox, builds, socials, profile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  return <>
    <Nav />
    <main id="main-content" tabIndex={-1}>
      <section className="intro" aria-labelledby="intro-title">
        <div className="intro-copy">
          <h1 id="intro-title">{profile.name}</h1>
          <p className="intro-role">{profile.role} · {profile.location}</p>
          <p className="intro-description">{profile.intro}</p>
          <div className="actions"><a className="button button-primary" href="#work">Explore projects</a><Link className="button" href="/resume">View résumé</Link></div>
          <div className="intro-current">Co-founder at <a href="https://ie.linkedin.com/company/equilibriumhvac" target="_blank" rel="noopener noreferrer">Equilibrium</a></div>
        </div>
        <Image className="intro-portrait" src="/headshot.webp" alt="James Harcourt outdoors beside a lake" width={240} height={280} sizes="(max-width: 720px) 96px, 192px" preload />
      </section>
      <section className="section" id="work">
        <div className="section-heading"><div><h2>Selected projects</h2><p>Hardware, firmware and apps, built end to end.</p></div><a className="text-link" href={socials.github} target="_blank" rel="noopener noreferrer">All repositories</a></div>
        <div className="project-list">{projects.map(project => <article className={`project${project.featured ? " project-featured" : ""}`} key={project.name}>
          <div className="project-main"><div className="project-title"><h3><a href={project.href} target="_blank" rel="noopener noreferrer">{project.name}</a></h3><span>{project.tag.replace("Featured · ", "")}</span></div><p>{project.description}</p><ul className="project-stack">{project.stack.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div className="project-links"><span className="muted">{project.year}</span><a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} source code`}>Source code</a>{project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" aria-label={`Try ${project.name}`}>Try demo</a>}</div>
          {project.name === "GlucoBit" && <PcbModel />}
        </article>)}</div>
      </section>
      <section className="section" id="experience"><div className="section-heading"><h2>Experience & achievements</h2><Link className="text-link" href="/resume">Full résumé</Link></div><Timeline /></section>
      <section className="section" id="about"><div className="about-grid"><div><h2>A little about me</h2><p>{profile.about}</p><p>{profile.approach}</p><p>Current obsession: turning messy sensor work into calm little devices.</p></div><aside className="toolbox"><h3>Toolbox</h3><ul>{toolbox.map(item => <li key={item}>{item}</li>)}</ul><h3>What I build</h3><p>{builds.join(" · ")}</p></aside></div></section>
      <section className="section" aria-label="GitHub activity"><Contributions /></section>
      <section className="contact" id="contact"><div><h2>Get in touch</h2><p>Open to opportunities and collaborations in hardware, embedded systems and health-tech.</p></div><div className="actions"><a className="button button-primary" href={`mailto:${profile.email}`}>Email James</a><a className="button" href={socials.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></div></section>
    </main>
    <Footer />
  </>;
}
