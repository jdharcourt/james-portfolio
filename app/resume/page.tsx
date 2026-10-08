import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PrintResume } from "@/components/PrintResume";
import { profile, projects, toolbox, socials } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Résumé | James Harcourt", description: "James Harcourt's experience, projects, achievements and technical skills." };

export default function Resume() {
  return <><Nav /><main className="resume">
    <div className="resume-toolbar"><a className="text-link" href="/">← Back to portfolio</a><PrintResume /></div>
    <header className="resume-header"><h1>{profile.name}</h1><p>{profile.role} · {profile.location}</p><div className="resume-contact"><a href={`mailto:${profile.email}`}>{profile.email}</a><a href={socials.github}>github.com/jdharcourt</a><a href={socials.linkedin}>LinkedIn ↗</a></div></header>
    <section className="resume-section"><h2>Profile</h2><p>{profile.intro}</p></section>
    <section className="resume-section"><h2>Experience & achievements</h2><Timeline /></section>
    <section className="resume-section"><h2>Projects</h2><div className="resume-projects">{projects.map(project => <article key={project.name}><div><h3>{project.name}</h3><a href={project.href}>Source ↗</a></div><p>{project.description}</p><p className="resume-stack">{project.stack.join(" · ")}</p></article>)}</div></section>
    <section className="resume-section"><h2>Technical skills</h2><p>{toolbox.join(" · ")}</p></section>
  </main><Footer /></>;
}
