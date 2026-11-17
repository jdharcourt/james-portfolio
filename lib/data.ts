export type Project = {
  name: string;
  category: string;
  year: string;
  description: string;
  stack: string[];
  href: string;
  featured?: boolean;
  demo?: string;
  /** Project website, when it is not a demo. */
  site?: string;
  /** Shorter line for the résumé; defaults to the description. */
  summary?: string;
  /** Listed among the key projects on the one-page résumé. */
  resume?: boolean;
};

export const projects: Project[] = [
  {
    name: "GlucoBit",
    category: "Health-tech",
    year: "2025–26",
    featured: true,
    resume: true,
    description:
      "A low-cost IoT glucose display. A CircuitPython device pulls live readings from the Dexcom cloud over WiFi, shows them on a colour LCD, and sounds audible and LED alarms on lows, with a native iOS companion app over Bluetooth. Placed 3rd in Technology and won the Medtronic Special Award at the 2026 Young Scientist exhibition.",
    stack: ["CircuitPython", "Swift / SwiftUI", "BLE", "Custom PCB", "OTA updates"],
    summary: "Low-cost IoT glucose display on a custom PCB: pulls live Dexcom readings over WiFi, alarms on lows and pairs with a native iOS app over Bluetooth.",
    href: "https://github.com/jdharcourt/GlucoBit",
  },
  {
    name: "Pointy R1",
    category: "Aerospace",
    year: "2026",
    description: "Thrust-vector-controlled model rocket with telemetry and flight data analysis.",
    stack: ["PCB design", "CAD", "Python", "Control"],
    href: "https://github.com/BasilAmin/pointy_rocket",
  },
  {
    name: "Solar Tracker",
    category: "Embedded",
    year: "2023–24",
    description: "Dual-axis tracker in C++ that senses light direction and drives motors to keep a panel facing the sun. Won the EirGrid Sustainable Future Award at SciFest.",
    stack: ["C++", "Sensors", "Motor control"],
    href: "https://github.com/jdharcourt/Solar-Tracking",
  },
  {
    name: "UniCAD",
    category: "CAD tooling",
    year: "2026",
    resume: true,
    description: "Open-source Python SDK for parametric CAD file interchange. Readers turn SOLIDWORKS, FreeCAD, CATIA and Fusion files into one neutral document and writers rebuild it in another format, without the CAD software installed.",
    stack: ["Python", "CAD formats", "CLI"],
    summary: "Open-source Python SDK for parametric CAD file interchange between SOLIDWORKS, FreeCAD, CATIA and Fusion.",
    href: "https://github.com/TryUniCAD/Kit",
    site: "https://www.unifiedcad.org",
  },
  {
    name: "Wisprsight",
    category: "Silent speech",
    year: "2026",
    resume: true,
    description: "Camera-only silent dictation for laptops: mouth a sentence without a sound and a local lip-reading model types it. Runs in the browser on WebGPU, learns from your corrections on-device and never needs the microphone.",
    stack: ["Python", "TypeScript", "WebGPU", "Computer vision"],
    summary: "Camera-only silent dictation: a local lip-reading model in the browser on WebGPU that learns from corrections on-device.",
    href: "https://github.com/jdharcourt/wisprsight",
    demo: "https://wisprsight.vercel.app",
  },
];

export const equilibrium = {
  name: "Equilibrium",
  role: "CEO & Co-founder",
  period: "Jul 2026 – Present",
  href: "https://equilibrium.ie",
  linkedin: "https://ie.linkedin.com/company/equilibriumhvac",
  summary:
    "Predictive HVAC control for buildings without an effective building management system. Wireless room sensors and a local optimiser fit around the controls already in place, so older buildings get smarter without replacing working equipment.",
  origin: "Founded during Patch ’26 with Beatrice Cesonyte, Moaz Refaei and Tommy Byrne; the first prototype ran at Dogpatch Labs.",
  spec: [
    { label: "Sense", text: "Temperature, humidity, CO₂ and occupancy in every room, with no new cabling or Wi-Fi." },
    { label: "Predict", text: "An on-site optimiser blends schedules, weather and past behaviour, then tests actions on a digital model." },
    { label: "Control", text: "Sends a bounded instruction to the existing panel; its protections and manual overrides stay in charge." },
  ],
  target: "Up to 30%",
  targetLabel: "target reduction in total HVAC energy use",
};

export type Entry = {
  title: string;
  org: string;
  period: string;
  description?: string;
  href?: string;
};

export const experience: Entry[] = [
  {
    title: "CEO & Co-founder",
    org: "Equilibrium",
    period: "Jul 2026 – Present",
    href: "https://equilibrium.ie",
    description: "Leading a four-founder smart-building start-up: wireless sensing and local predictive control for existing commercial HVAC, targeting up to 30% lower HVAC energy use. Prototype deployed at Dogpatch Labs.",
  },
  {
    title: "Patch Summer Programme",
    org: "Dogpatch Labs",
    period: "Summer 2026",
    description: "One of 36 selected for Patch, Ireland’s youth tech accelerator. Seven weeks building with mentors including Dogpatch Labs, Stripe, OpenAI and Rethink Ireland; developed GlucoBit and founded Equilibrium.",
  },
  {
    title: "Lifeguard",
    org: "Aura Leisure",
    period: "Jun 2026 – Present",
    description: "Lifeguarding and water safety across Aura facilities.",
  },
  {
    title: "Pharmacy Assistant",
    org: "Meaghers Pharmacy",
    period: "Feb 2026",
    description: "Customer queries, daily stock checks and tills in a busy retail pharmacy.",
  },
  {
    title: "Work Experience",
    org: "Head Diagnostics",
    period: "Nov 2025",
    description: "Medical-device company placement covering regulated engineering, device testing and product development.",
  },
];

export const awards: Entry[] = [
  {
    title: "3rd in Technology & Medtronic Special Award",
    org: "Stripe Young Scientist & Technology Exhibition",
    period: "Jan 2026",
    description: "Individual Transition Year entry with GlucoBit.",
  },
  {
    title: "Most Commercial Potential",
    org: "National Student Enterprise Awards",
    period: "May 2023",
  },
  {
    title: "EirGrid Sustainable Future Award",
    org: "SciFest",
    period: "May 2023",
    description: "Dual-axis solar tracking to improve panel efficiency.",
  },
];

export const education: Entry[] = [
  {
    title: "Transition Year",
    org: "Castleknock College",
    period: "2025 – 2026",
    description: "Young Scientist, Patch and Equilibrium.",
  },
  {
    title: "Junior Cycle",
    org: "Castleknock College",
    period: "Jun 2025",
    description: "7 distinctions and 2 higher merits.",
  },
];

export const toolbox = [
  "CircuitPython",
  "C++",
  "Swift / SwiftUI",
  "Python",
  "TypeScript / Next.js",
  "BLE",
  "WiFi / HTTP APIs",
  "I2S / SPI / ADC",
  "OTA updates",
  "KiCad / PCB design",
  "3D printing",
  "Git",
];

export const socials = {
  github: "https://github.com/jdharcourt",
  linkedin: "https://www.linkedin.com/in/james-harcourt-3131473ab/",
};

export const profile = {
  name: "James Harcourt",
  role: "Hardware & software engineer",
  headline: "CEO & Co-founder, Equilibrium",
  location: "Dublin, Ireland",
  email: "james@harcourt.cc",
  site: "jamesharcourt.ie",
  intro: "I design embedded systems, health-tech and smart-building products, from schematic and firmware to cloud and app. I like reliable, low-cost devices that feel calm to use.",
  about: "Most of my work starts with a real problem, like making glucose data glanceable for someone living with diabetes, or making an old building’s HVAC behave. I follow it all the way down: schematic and PCB, firmware on the metal, the cloud calls and the app in your hand.",
  resumeSummary: "Hardware and software engineer and co-founder of Equilibrium, a Dublin smart-building start-up. I take products from schematic, PCB and firmware through to cloud services and native apps; my glucose monitor GlucoBit placed 3rd in Technology at the 2026 Young Scientist exhibition.",
  approach: "Outside the code I enjoy the hands-on side: soldering, 3D printing and designing boards.",
};
