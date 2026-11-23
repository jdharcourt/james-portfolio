import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Timeline } from "@/components/Timeline";
import { PrintResume } from "@/components/PrintResume";
import { JsonLd } from "@/components/JsonLd";
import { buttonVariants } from "@/components/button/components/button";
import { profile, projects, experience, awards, education, toolbox, socials } from "@/lib/data";
import { buildResumeJsonLd, openGraphImages, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Résumé",
  description: "James Harcourt's one-page résumé: achievements, experience, education and key hardware and software engineering projects.",
  alternates: { canonical: "/resume" },
  openGraph: {
    title: "Résumé | James Harcourt",
    description: "James Harcourt's one-page résumé: achievements, experience, education and key hardware and software engineering projects.",
    url: `${SITE_URL}/resume`,
    type: "profile",
    firstName: "James",
    lastName: "Harcourt",
    images: [openGraphImages[0]],
  },
};

/** Printed from this page; regenerate with `npm run resume:pdf` after changing it or its data. */
const pdf = "/james-harcourt-resume.pdf";

export default function Resume() {
  const keyProjects = projects.filter(project => project.resume).map(project => ({ title: project.name, org: project.category, period: project.year, href: project.href, meta: project.stack.join(" · "), description: project.summary ?? project.description }));

  return <><JsonLd data={buildResumeJsonLd()} /><Nav /><main className="shell resume-page" id="main-content" tabIndex={-1}>
    <div className="resume-toolbar">
      <Link className="section-link link" href="/">← Back to portfolio</Link>
      <div className="resume-actions"><PrintResume /><a className={buttonVariants({ className: "h-11 px-5" })} href={pdf} download="James-Harcourt-Resume.pdf">Download PDF</a></div>
    </div>
    <article className="resume-sheet">
      <header className="resume-header">
        <div><h1>{profile.name}</h1><p className="resume-role">{profile.role} · {profile.headline}</p></div>
        <div className="resume-contact"><a href={`mailto:${profile.email}`}>{profile.email}</a><a href={`https://${profile.site}`}>{profile.site}</a><a href={socials.github} target="_blank" rel="me noopener noreferrer">github.com/jdharcourt</a><a href={socials.linkedin} target="_blank" rel="me noopener noreferrer">linkedin.com/in/james-harcourt</a><span>{profile.location}</span></div>
      </header>
      <p className="resume-summary">{profile.resumeSummary}</p>
      <section className="resume-section"><h2>Achievements</h2><Timeline entries={awards} label="Achievements" /></section>
      <section className="resume-section"><h2>Experience</h2><Timeline entries={experience} label="Experience" /></section>
      <section className="resume-section"><h2>Key projects</h2><Timeline entries={keyProjects} label="Key projects" /></section>
      <div className="resume-columns">
        <section className="resume-section"><h2>Education</h2><Timeline entries={education} label="Education" /></section>
        <section className="resume-section"><h2>Skills</h2><p className="resume-skills">{toolbox.join(" · ")}</p></section>
      </div>
    </article>
  </main><Footer /></>;
}
