export type Project = {
  name: string;
  tag: string;
  year: string;
  accent: "lime" | "cyan" | "amber";
  description: string;
  stack: string[];
  href: string;
  featured?: boolean;
  demo?: string;
};

export const projects: Project[] = [
  {
    name: "GlucoBit",
    tag: "Featured · IoT Health",
    year: "2025–26",
    accent: "lime",
    featured: true,
    description:
      "A low-cost IoT system for non-invasive glucose visualisation. A CircuitPython device pulls live readings from the Dexcom cloud over WiFi, renders them on a colour LCD, and fires audible + LED alarms on lows, paired with a native iOS companion app over Bluetooth.",
    stack: ["CircuitPython", "Swift / SwiftUI", "BLE", "Custom PCB", "OTA Updates"],
    href: "https://github.com/jdharcourt/GlucoBit",
  },
  {
    name: "CertifyMe",
    tag: "PCB tooling",
    year: "2026",
    accent: "lime",
    description: "A KiCad plugin and CLI that links component datasheets, generates priced bills of materials, and verifies parts against DigiKey. Built to take the repetitive work out of preparing a PCB.",
    stack: ["Python", "KiCad", "DigiKey API", "BOM verification"],
    href: "https://github.com/jdharcourt/CertifyMe",
  },
  {
    name: "Gate Lab",
    tag: "Learning tools",
    year: "2026",
    accent: "amber",
    description: "An interactive Boolean logic workbench. Draw gate circuits, build expressions, generate truth tables, and practise logic problems directly in the browser.",
    stack: ["TypeScript", "Next.js", "Boolean logic"],
    href: "https://github.com/jdharcourt/gate-lab",
    demo: "https://gate-lab-taupe.vercel.app",
  },
  {
    name: "CodePaper",
    tag: "Learning tools",
    year: "2026",
    accent: "amber",
    description: "A browser-based Python IDE for Leaving Certificate Computer Science practice. Run code locally with Pyodide and check answers against exam marking rubrics.",
    stack: ["TypeScript", "Python", "Pyodide", "Web Workers"],
    href: "https://github.com/jdharcourt/CodePaper",
    demo: "https://code-paper-blush.vercel.app",
  },
  {
    name: "ytascii",
    tag: "Terminal tools",
    year: "2026",
    accent: "lime",
    description: "Play videos as live truecolour ASCII art in the terminal, with audio. Frames are streamed and converted in real time using Python, yt-dlp, and ffmpeg.",
    stack: ["Python", "ffmpeg", "yt-dlp", "CLI"],
    href: "https://github.com/jdharcourt/ytascii",
  },
  {
    name: "Zana",
    tag: "Health-tech",
    year: "2026",
    accent: "lime",
    description: "A Swift project exploring health and medical report assistance.",
    stack: ["Swift", "Health-tech"],
    href: "https://github.com/jdharcourt/zana",
  },
  {
    name: "DiabeTech",
    tag: "iOS App",
    year: "2025",
    accent: "cyan",
    description:
      "An iOS app to support diabetes management and data visualisation",
    stack: ["Swift", "SwiftUI", "HealthKit"],
    href: "https://github.com/jdharcourt/DiabeTech",
  },
  {
    name: "Solar Tracker",
    tag: "Embedded",
    year: "2024",
    accent: "amber",
    description:
      "A dual-axis solar tracking system in C++, sensing light direction and driving motors to keep a panel aligned with the sun for maximum yield. Hands-on embedded control, sensors and actuation.",
    stack: ["C++", "Microcontroller", "Sensors", "Motor Control"],
    href: "https://github.com/jdharcourt/Solar-Tracking",
  },
  {
    name: "Pointy R1",
    tag: "Thrust Vector Controlled model rocket",
    year: "2026",
    accent: "lime",
    description:
      "A thrust vector controlled model rocket with telemetry and flight data analysis.",
    stack: ["Python", "PCB Design", "CAD", "Microcontroller", "Sensors", "Motor Control"],
    href: "https://github.com/BasilAmin/pointy_rocket",
  }
];

export const toolbox = [
  "CircuitPython",
  "Swift",
  "SwiftUI",
  "C++",
  "BLE / Bluetooth",
  "WiFi / HTTP APIs",
  "PCB Design",
  "I2S / SPI / ADC",
  "OTA Updates",
  "Git",
  "Python",
  "TypeScript / Next.js",
  "KiCad",
];

export const builds = [
  "IoT devices",
  "Health-tech",
  "Embedded firmware",
  "iOS apps",
  "Hardware prototypes",
];

export type Experience = {
  role: string;
  org: string;
  period: string;
  description: string;
  type: "work" | "achievement" | "experience" | "education";
};

export const experience: Experience[] = [
  {
    role: "Co-founder",
    org: "Equilibrium",
    period: "2026",
    description: "Co-founded an autonomous retrofit building management system during Patch. The team deployed custom environmental sensors, a live dashboard, and predictive controls at Dogpatch Labs.",
    type: "work",
  },
  {
    role: "Patch Accelerator Participant",
    org: "Dogpatch Labs",
    period: "Summer 2026",
    description:
      "Selected as one of 36 cohort members for Ireland's most competitive Youth Tech Accelerator, developing GlucoBit and co-founding Equilibrium, with a building management prototype deployed at Dogpatch Labs.",
    type: "experience",
  },
  {
    role: "Lifeguard",
    org: "Aura Leisure",
    period: "Jun 2026 – Present",
    description: "Lifeguarding and Water Safety Training across Aura facilities.",
    type: "work",
  },
  {
    role: "Competitor, Technology Category",
    org: "Stripe Young Scientist & Technology Exhibition",
    period: "Jan 2026",
    description:
      "Entered GlucoBit, a standalone blood glucose visualisation and alert device, placed in the Technology category and won the Medtronic special award.",
    type: "achievement",
  },
  {
    role: "Pharmacy Assistant",
    org: "Meaghers Pharmacy",
    period: "Feb 2026",
    description:
      "Assisted customers with product queries, managed stock levels with daily inventory checks, and operated tills in a busy retail pharmacy environment.",
    type: "experience",
  },
  {
    role: "Work Experience",
    org: "Head Diagnostics",
    period: "Nov 2025",
    description:
      "Hands-on internship at a medical device company, gaining exposure to regulated healthcare engineering, device testing workflows, and product development in a clinical context.",
    type: "experience",
  },
  {
    role: "Completed Junior Cycle",
    org: "Castleknock College",
    period: "Jun 2025",
    description:
      "Completed the Junior Cycle curriculum with a focus on STEM subjects, achieving 7x distinctions and 2x higher merits",
    type: "education",
  },
  {
    role: "Most Commercial Potential Award",
    org: "Local Enterprise Offices, National Student Enterprise Awards",
    period: "May 2023",
    description:
      "Competed at the National Student Enterprise Awards and won the Most Commercial potential prize.",
    type: "achievement",
  },
  {
    role: "Competitor",
    org: "SciFest",
    period: "May 2023",
    description: "Presented a science project at SciFest, Ireland's national STEM competition for students. Presented solar tracking as a method to improve solar panel efficiency, winning the Eirgrid sustainable future award.",
    type: "achievement",
  },
];

export const socials = {
  github: "https://github.com/jdharcourt",
  linkedin: "https://www.linkedin.com/in/james-harcourt-3131473ab/",
};

export const profile = {
  name: "James Harcourt",
  role: "Hardware & software engineer",
  location: "Dublin, Ireland",
  email: "hi@jamesharcourt.ie",
  intro: "I design and build embedded systems and health-tech, from low-cost IoT glucose monitors to solar trackers and iOS companion apps. Bringing hardware, firmware and clean interfaces together into things people can actually use.",
  about: "I'm an engineer who likes to live at the boundary between hardware and software. Most of my work starts with a real-world problem, like making glucose data glanceable for someone living with diabetes, and follows it all the way down: schematic and PCB, firmware on the metal, the cloud calls, and the app in your hand.",
  approach: "I care about systems that are reliable, low-cost and usable. I'm comfortable across embedded CircuitPython and C++, native iOS in Swift, and the web. I also enjoy the hands-on side of things: soldering, 3D printing, and designing PCBs.",
};
