import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PcbModel } from "@/components/PcbModel";
import { Terminal } from "@/components/Terminal";
import { Contributions } from "@/components/Contributions";
import { projects, toolbox, builds, socials, profile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Home() {
  return <>
    <Nav />
    <main id="top">
      <section className="intro" aria-labelledby="intro-title">
        <div className="intro-copy">
          <p className="intro-role">{profile.role} <span> / {profile.location}</span></p>
          <h1 id="intro-title">James<br />Harcourt<span>.</span></h1>
          <p className="intro-description">{profile.intro}</p>
          <p className="intro-note">Current obsession: turning messy sensor work into calm little devices.</p>
          <div className="actions"><a className="button button-primary" href="#work">Explore projects <span aria-hidden="true">↓</span></a><Link className="button" href="/resume">View résumé <span aria-hidden="true">↗</span></Link></div>
          <div className="intro-current"><span className="status-dot" aria-hidden="true" />Co-founder at <a href="https://ie.linkedin.com/company/equilibriumhvac" target="_blank" rel="noopener noreferrer">Equilibrium ↗</a></div>
        </div>
        <PcbModel />
      </section>
      <div className="interactive-row"><Terminal /><Contributions /></div>
      <section className="section" id="work">
        <div className="section-heading"><div><h2>Selected projects</h2><p>Hardware, firmware and apps, built end to end.</p></div><a className="text-link" href={socials.github} target="_blank" rel="noopener noreferrer">All repositories ↗</a></div>
        <div className="project-list">{projects.map((project, index) => <article className="project" key={project.name}>
          <span className="project-index">{String(index + 1).padStart(2, "0")}</span>
          <div className="project-main"><div className="project-title"><h3><a href={project.href} target="_blank" rel="noopener noreferrer">{project.name}</a></h3><span>{project.tag.replace("Featured · ", "")}</span></div><p>{project.description}</p><ul className="project-stack">{project.stack.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div className="project-links"><span className="muted">{project.year}</span><a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.name} source code`}>Code ↗</a>{project.demo && <a href={project.demo} target="_blank" rel="noopener noreferrer" aria-label={`Try ${project.name}`}>Try it ↗</a>}</div>
        </article>)}</div>
      </section>
      <section className="section" id="about"><div className="about-grid"><div><h2>A little about me</h2><p>{profile.about}</p><p>{profile.approach}</p></div><aside className="toolbox"><h3>Toolbox</h3><ul>{toolbox.map(item => <li key={item}>{item}</li>)}</ul><h3>What I build</h3><p>{builds.join(" · ")}</p></aside></div></section>
      <section className="section" id="experience"><div className="section-heading"><div><h2>Experience & achievements</h2><p>Work, internships, education and things learned along the way.</p></div><Link className="text-link" href="/resume">Full résumé ↗</Link></div><Timeline /></section>
      <section className="contact" id="contact"><div><h2>Let&apos;s build something.</h2><p>Open to opportunities and collaborations in hardware, embedded systems and health-tech.</p></div><div className="actions"><a className="button button-primary" href={`mailto:${profile.email}`}>Get in touch ↗</a><a className="button" href={socials.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></div></section>
    </main>
    <Footer />
  </>;
}
