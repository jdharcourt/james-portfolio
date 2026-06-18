import Reveal from "@/components/Reveal";
import { experience } from "@/lib/data";

export default function Timeline() {
  return (
    <ol className="timeline" aria-label="Experience timeline">
      {experience.map((item, i) => (
        <Reveal as="li" key={i} delay={i * 60} className="timeline__item">
          <span
            className="timeline__dot"
            data-type={item.type}
            aria-hidden="true"
          />
          <div className="timeline__body">
            <div className="timeline__meta">
              <span className="timeline__period">{item.period}</span>
              <span
                className="timeline__badge"
                data-type={item.type}
              >
                {
                  {
                    work: "Work",
                    achievement: "Achievement",
                    experience: "Experience",
                    education: "Education",
                  }[item.type]
                }
              </span>
            </div>
            <h3 className="timeline__role">{item.role}</h3>
            <p className="timeline__org">{item.org}</p>
            <p className="timeline__desc">{item.description}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
