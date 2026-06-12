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

export const socials = {
  github: "https://github.com/jdharcourt",
  linkedin: "https://www.linkedin.com/in/james-harcourt-3131473ab/",
};
