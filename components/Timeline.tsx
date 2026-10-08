import { experience } from "@/lib/data";

export function Timeline() {
  return <ol className="timeline" aria-label="Experience">
    {experience.map((item) => <li key={`${item.org}-${item.role}`}>
      <p className="timeline-period">{item.period}</p>
      <div><h3>{item.role}</h3><p className="timeline-org">{item.org}</p><p className="muted">{item.description}</p></div>
    </li>)}
  </ol>;
}
