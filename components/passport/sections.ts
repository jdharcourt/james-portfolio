import { projects } from "@/lib/data";

/** Page order inside the passport. Kept free of drawing code so the UI can import it cheaply. */
export const FACE_IDS = (() => {
  const ids = ["cover", "inside-front", "identity", "contents", "equilibrium", ...projects.map((_, i) => `project-${i}`), "experience", "awards", "toolbox", "notes"];
  // Paper leaves carry two faces each, so pad with a blank visa page when needed.
  if ((ids.length - 2) % 2) ids.push("visas");
  ids.push("contact");
  return ids;
})();

export const LAST_SPREAD = (FACE_IDS.length - 1) / 2;

export const spreadOf = (id: string) => Math.ceil(FACE_IDS.indexOf(id) / 2);
export const pageOf = (id: string) => FACE_IDS.indexOf(id);

export const SECTIONS = [
  { label: "Cover", spread: 0 },
  { label: "Identity", spread: spreadOf("identity") },
  { label: "Equilibrium", spread: spreadOf("equilibrium") },
  { label: "Projects", spread: spreadOf("project-0") },
  { label: "Experience", spread: spreadOf("experience") },
  { label: "Contact", spread: LAST_SPREAD },
];
