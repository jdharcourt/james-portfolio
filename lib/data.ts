export type Project = {
  name: string;
  tag: string;
  year: string;
  accent: "lime" | "cyan" | "amber";
  description: string;
  stack: string[];
  href: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    name: "GlucoBit",
    tag: "Featured · IoT Health",
    year: "2025–26",
    accent: "lime",
    featured: true,
    description:
      "A low-cost IoT system for non-invasive glucose visualisation. A CircuitPython device pulls live readings from the Dexcom cloud over WiFi, renders them on a colour LCD, and fires audible + LED alarms on lows — paired with a native iOS companion app over Bluetooth.",
    stack: ["CircuitPython", "Swift / SwiftUI", "BLE", "Custom PCB", "OTA Updates"],
    href: "https://github.com/jdharcourt/GlucoBit",
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
      "A dual-axis solar tracking system in C++ — sensing light direction and driving motors to keep a panel aligned with the sun for maximum yield. Hands-on embedded control, sensors and actuation.",
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
    role: "Patch Accelerator Participant",
    org: "Dogpatch Labs",
    period: "Jun 2026 – Present",
    description:
      "Selected as one of 36 cohort members for Ireland's most competitive Youth Tech Accelerator, developing GlucoBit into a market-ready product.",
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
    role: "Competitor — Technology Category",
    org: "Stripe Young Scientist & Technology Exhibition",
    period: "Jan 2026",
    description:
      "Entered GlucoBit — a standalone blood glucose visualisation and alert device — and placed in the Technology category, and won the Medtronic special award",
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
    org: "Local Enterprise Offices — National Student Enterprise Awards",
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
