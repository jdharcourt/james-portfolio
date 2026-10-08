import { profile, socials } from "@/lib/data";

export function Footer() {
  return <footer className="footer">
    <p>© {new Date().getFullYear()} {profile.name}</p>
    <a href={`mailto:${profile.email}`}>{profile.email}</a>
    <a href={socials.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    <a href={socials.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
    <p className="footer-credit">Built with Next.js and a little help from Claude</p>
  </footer>;
}
