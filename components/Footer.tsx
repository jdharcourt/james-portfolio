import { profile, socials } from "@/lib/data";

export function Footer() {
  return <footer className="footer shell">
    <p>© {new Date().getFullYear()} {profile.name} — {profile.location}</p>
    <nav aria-label="Contact links">
      <a href={`mailto:${profile.email}`}>{profile.email}</a>
      <a href={socials.github} target="_blank" rel="me noopener noreferrer">GitHub</a>
      <a href={socials.linkedin} target="_blank" rel="me noopener noreferrer">LinkedIn</a>
    </nav>
  </footer>;
}
