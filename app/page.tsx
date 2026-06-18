"use client";

import { useState, useEffect } from "react";
import ArrowIcon from "@/components/ArrowIcon";
import Timeline from "@/components/Timeline";
import { projects, toolbox, builds, socials } from "@/lib/data";

// ─── Icon SVGs ────────────────────────────────────────────────────────────────

function IconCode() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 8L3 12l4 4M17 8l4 4-4 4M14 4l-4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconPerson() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconMessage() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg width="29" height="29" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 10v7M7 7v.01M11 10v7m0-4a3 3 0 0 1 6 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ios-statusbar">
      <span className="ios-statusbar__time">{time}</span>
      <div className="ios-statusbar__right">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
          <rect x="9" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.35" />
        </svg>
        <svg width="16" height="13" viewBox="0 0 16 13" fill="none" aria-hidden>
          <circle cx="8" cy="11.5" r="1.2" fill="currentColor" />
          <path d="M5 8.5a4.24 4.24 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2.5 6a7.5 7.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <path d="M23 4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─── App definitions ──────────────────────────────────────────────────────────

type AppId = "projects" | "experience" | "about" | "contact" | "github" | "linkedin";

type AppDef = {
  id: AppId;
  label: string;
  bg: string;
  color: string;
  icon: React.ReactNode;
  external?: string;
};

const APPS: AppDef[] = [
  {
    id: "projects",
    label: "Projects",
    bg: "linear-gradient(145deg,#1a4208,#2a6e0e)",
    color: "#c4f042",
    icon: <IconCode />,
  },
  {
    id: "experience",
    label: "Experience",
    bg: "linear-gradient(145deg,#081a42,#0e2a6e)",
    color: "#5ad7ff",
    icon: <IconBriefcase />,
  },
  {
    id: "about",
    label: "About",
    bg: "linear-gradient(145deg,#42280a,#6e440e)",
    color: "#ffb454",
    icon: <IconPerson />,
  },
  {
    id: "contact",
    label: "Contact",
    bg: "linear-gradient(145deg,#1a0842,#2d0e6e)",
    color: "#a78bfa",
    icon: <IconMessage />,
  },
  {
    id: "github",
    label: "GitHub",
    bg: "linear-gradient(145deg,#16181f,#1e2028)",
    color: "#e5e7eb",
    icon: <IconGitHub />,
    external: socials.github,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    bg: "linear-gradient(145deg,#00367a,#004fa8)",
    color: "#ffffff",
    icon: <IconLinkedIn />,
    external: socials.linkedin,
  },
];

const DOCK_IDS: AppId[] = ["projects", "contact", "github", "linkedin"];

// ─── App icon button ──────────────────────────────────────────────────────────

function AppIconButton({
  app,
  onOpen,
  dock = false,
}: {
  app: AppDef;
  onOpen: (id: AppId) => void;
  dock?: boolean;
}) {
  return (
    <button
      className={`ios-appicon${dock ? " ios-appicon--dock" : ""}`}
      onClick={() => onOpen(app.id)}
      aria-label={`Open ${app.label}`}
    >
      <span className="ios-appicon__face" style={{ background: app.bg, color: app.color }}>
        {app.icon}
      </span>
      {!dock && <span className="ios-appicon__label">{app.label}</span>}
    </button>
  );
}

// ─── App content views ────────────────────────────────────────────────────────

function ProjectsApp() {
  return (
    <div className="ios-appcontent">
      <p className="section__sub" style={{ marginBottom: 24 }}>
        Hardware, firmware and apps — built end-to-end.
      </p>
      <div className="projects">
        {projects.map((p) => (
          <div className="card" key={p.name} data-accent={p.accent}>
            <div className="card__top">
              <span className="card__tag">{p.tag}</span>
              <span className="card__year">{p.year}</span>
            </div>
            <h3 className="card__title">{p.name}</h3>
            <p className="card__desc">{p.description}</p>
            <ul className="card__stack">
              {p.stack.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <div className="card__links">
              <a href={p.href} target="_blank" rel="noopener noreferrer">
                Code <ArrowIcon size={10} />
              </a>
            </div>
          </div>
        ))}
        <div className="card card--cta">
          <h3 className="card__title">More on GitHub</h3>
          <p className="card__desc">Personal site builds, experiments and works in progress.</p>
          <div className="card__links">
            <a href={socials.github} target="_blank" rel="noopener noreferrer">
              View profile <ArrowIcon size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperienceApp() {
  return (
    <div className="ios-appcontent">
      <p className="section__sub" style={{ marginBottom: 8 }}>
        Work, internships and achievements.
      </p>
      <Timeline />
    </div>
  );
}

function AboutApp() {
  return (
    <div className="ios-appcontent">
      <p className="about__text">
        I&apos;m an engineer who likes to live at the boundary between hardware and software.
        Most of my work starts with a real-world problem — like making glucose data glanceable
        for someone living with diabetes — and follows it all the way down: schematic and PCB,
        firmware on the metal, the cloud calls, and the app in your hand.
      </p>
      <p className="about__text">
        I care about systems that are <em>reliable</em>, <em>low-cost</em> and genuinely usable
        — not just demos. I&apos;m comfortable across embedded CircuitPython and C++, native iOS
        in Swift, and the web. I also enjoy the hands-on side: soldering, 3D printing, and
        designing PCBs.
      </p>
      <aside className="about__panel" style={{ marginTop: 28 }}>
        <h4>Toolbox</h4>
        <div className="chips">
          {toolbox.map((t) => <span key={t}>{t}</span>)}
        </div>
        <h4 style={{ marginTop: 24 }}>What I build</h4>
        <div className="chips chips--alt">
          {builds.map((b) => <span key={b}>{b}</span>)}
        </div>
      </aside>
    </div>
  );
}

function ContactApp() {
  return (
    <div className="ios-appcontent ios-appcontent--contact">
      <p className="contact__eyebrow">Get in touch</p>
      <h2 className="contact__title">Let&apos;s build something.</h2>
      <p className="contact__sub">
        Open to opportunities and collaborations in hardware, embedded systems and health-tech.
      </p>
      <div className="contact__links" style={{ marginTop: 32 }}>
        <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
          LinkedIn <ArrowIcon />
        </a>
        <a href={socials.github} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
          GitHub <ArrowIcon />
        </a>
      </div>
    </div>
  );
}

// ─── App shell (slide-up overlay) ────────────────────────────────────────────

function AppShell({ app, onClose }: { app: AppDef; onClose: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleClose() {
    setOpen(false);
    setTimeout(onClose, 420);
  }

  return (
    <div className={`ios-appshell${open ? " ios-appshell--open" : ""}`}>
      <div className="ios-appshell__bar" style={{ background: app.bg }}>
        <StatusBar />
        <div className="ios-appshell__nav">
          <button className="ios-back" onClick={handleClose} aria-label="Back to home">
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden>
              <path d="M7 1L1 6.5L7 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </button>
          <h2 className="ios-appshell__title">{app.label}</h2>
          <div style={{ width: 60 }} />
        </div>
      </div>
      <div className="ios-appshell__scroll">
        {app.id === "projects"   && <ProjectsApp />}
        {app.id === "experience" && <ExperienceApp />}
        {app.id === "about"      && <AboutApp />}
        {app.id === "contact"    && <ContactApp />}
      </div>
    </div>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function Home() {
  const [activeId, setActiveId] = useState<AppId | null>(null);

  const activeApp = APPS.find((a) => a.id === activeId) ?? null;
  const dockApps  = DOCK_IDS.map((id) => APPS.find((a) => a.id === id)!);

  function openApp(id: AppId) {
    const app = APPS.find((a) => a.id === id)!;
    if (app.external) {
      window.open(app.external, "_blank", "noopener,noreferrer");
      return;
    }
    setActiveId(id);
  }

  return (
    <div className="ios-screen">
      <div className="ios-wallpaper" aria-hidden />
      <div className="grain" aria-hidden />

      <StatusBar />

      <div className="ios-home">
        <div className="ios-widget">
          <p className="ios-widget__eyebrow">Hardware × Software Engineer</p>
          <h1 className="ios-widget__name">
            James<br />Harcourt
          </h1>
          <p className="ios-widget__tags">IoT · Health-tech · Embedded</p>
        </div>

        <div className="ios-grid">
          {APPS.map((app) => (
            <AppIconButton key={app.id} app={app} onOpen={openApp} />
          ))}
        </div>
      </div>

      <div className="ios-dock">
        <div className="ios-dock__inner">
          {dockApps.map((app) => (
            <AppIconButton key={app.id} app={app} onOpen={openApp} dock />
          ))}
        </div>
      </div>

      {activeApp && <AppShell app={activeApp} onClose={() => setActiveId(null)} />}
    </div>
  );
}
