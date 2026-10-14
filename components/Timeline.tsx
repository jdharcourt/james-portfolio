import { experience } from "@/lib/data";

export function Timeline() {
  return <ol className="timeline" aria-label="Experience">
    {experience.map((item) => <li key={`${item.org}-${item.role}`}>
      <p className="timeline-period">{item.period}</p>
      <div><h3>{item.role} <span className="timeline-company">at {item.org}</span></h3><p className="muted">{item.description}</p></div>
    </li>)}
  </ol>;
}
