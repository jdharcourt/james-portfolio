import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PrintResume } from "@/components/PrintResume";
import { profile, projects, experience, awards, education, toolbox, socials } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Résumé | James Harcourt", description: "James Harcourt's experience, awards, education and selected projects." };

export default function Resume() {
  const selected = projects.filter(project => project.resume).map(project => ({ title: project.name, org: project.stack.join(", "), period: project.year, description: project.summary ?? project.description }));

  return <><Nav /><main className="shell resume-page" id="main-content" tabIndex={-1}>
    <div className="resume-toolbar"><Link className="section-link link" href="/">← Back to portfolio</Link><PrintResume /></div>
    <article className="resume-sheet">
      <header className="resume-header">
        <div><h1>{profile.name}<span className="dot">.</span></h1><p className="label">{profile.headline}<br />{profile.role}</p></div>
        <div className="resume-contact"><a href={`mailto:${profile.email}`}>{profile.email}</a><a href={`https://${profile.site}`}>{profile.site}</a><a href={socials.github}>github.com/jdharcourt</a><a href={socials.linkedin}>linkedin.com/in/james-harcourt</a><span>{profile.location}</span></div>
      </header>
      <p className="resume-summary">{profile.intro}</p>
      <section className="resume-section"><h2>Experience</h2><Timeline entries={experience} label="Experience" /></section>
      <section className="resume-section"><h2>Awards</h2><Timeline entries={awards} label="Awards" /></section>
      <section className="resume-section"><h2>Selected projects</h2><Timeline entries={selected} label="Selected projects" /></section>
      <section className="resume-section"><h2>Education</h2><Timeline entries={education} label="Education" /></section>
      <section className="resume-section"><h2>Skills</h2><p className="resume-skills">{toolbox.join(" · ")}</p></section>
    </article>
  </main><Footer /></>;
}
