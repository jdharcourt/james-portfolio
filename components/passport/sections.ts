import { projects } from "@/lib/data";

/** An Irish passport booklet has 32 pages between the covers: 16 paper leaves. */
const MIN_LEAVES = 16;

/** Page order inside the passport. Kept free of drawing code so the UI can import it cheaply. */
export const FACE_IDS = (() => {
  const ids = ["cover", "inside-front", "identity", "equilibrium", ...projects.map((_, i) => `project-${i}`), "experience", "awards", "toolbox", "notes", "contact"];
  // Faces: outside cover, inside front, two per paper leaf, inside back.
  const leaves = Math.max(MIN_LEAVES, Math.ceil((ids.length - 1) / 2));
  for (let v = 0; ids.length < 2 * leaves + 2; v++) ids.push(`visa-${v}`);
  ids.push("inside-back");
  return ids;
})();

export const LEAVES = (FACE_IDS.length - 3) / 2;
export const LAST_SPREAD = LEAVES + 1;

export const spreadOf = (id: string) => Math.ceil(FACE_IDS.indexOf(id) / 2);
export const pageOf = (id: string) => FACE_IDS.indexOf(id);

export const SECTIONS = [
  { label: "Cover", spread: 0 },
  { label: "Identity", spread: spreadOf("identity") },
  { label: "Equilibrium", spread: spreadOf("equilibrium") },
  { label: "Projects", spread: spreadOf("project-1") },
  { label: "Experience", spread: spreadOf("experience") },
  { label: "Contact", spread: spreadOf("contact") },
];
