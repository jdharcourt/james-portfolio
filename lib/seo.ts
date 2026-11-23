import { awards, education, equilibrium, profile, projects, socials, toolbox } from "@/lib/data";

export const SITE_URL = `https://${profile.site}`;
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const PROFILE_PAGE_ID = `${SITE_URL}/#profilepage`;
export const EQUILIBRIUM_ID = `${SITE_URL}/#equilibrium`;

export type SeoImage = {
  id: string;
  path: string;
  url: string;
  width: number;
  height: number;
  encodingFormat: "image/jpeg" | "image/webp";
  name: string;
  alt: string;
  caption: string;
  datePublished?: string;
  representativeOfPage?: boolean;
};

/**
 * Canonical photos of James Harcourt for Google Images, Knowledge Graph and social cards.
 * Kept in site metadata, JSON-LD and the image sitemap without rendering them visibly on the site.
 */
export const seoImages: SeoImage[] = [
  {
    id: `${SITE_URL}/images/james-harcourt-portrait.jpg#image`,
    path: "/images/james-harcourt-portrait.jpg",
    url: `${SITE_URL}/images/james-harcourt-portrait.jpg`,
    width: 900,
    height: 1600,
    encodingFormat: "image/jpeg",
    name: "James Harcourt portrait",
    alt: "James Harcourt, hardware and software engineer and CEO of Equilibrium, outdoors in Ireland",
    caption: "Portrait of James Harcourt, Dublin-based hardware and software engineer and CEO & Co-founder of Equilibrium.",
    representativeOfPage: true,
  },
  {
    id: `${SITE_URL}/images/james-harcourt-equilibrium-dogpatch-labs.jpg#image`,
    path: "/images/james-harcourt-equilibrium-dogpatch-labs.jpg",
    url: `${SITE_URL}/images/james-harcourt-equilibrium-dogpatch-labs.jpg`,
    width: 820,
    height: 1600,
    encodingFormat: "image/jpeg",
    name: "James Harcourt at Dogpatch Labs for Equilibrium",
    alt: "James Harcourt wearing an Equilibrium t-shirt at Dogpatch Labs in Dublin",
    caption: "James Harcourt, CEO and Co-founder of Equilibrium, at Dogpatch Labs in Dublin.",
    datePublished: "2026-08",
  },
  {
    id: `${SITE_URL}/images/james-harcourt-medtronic-special-award-young-scientist-2026.jpg#image`,
    path: "/images/james-harcourt-medtronic-special-award-young-scientist-2026.jpg",
    url: `${SITE_URL}/images/james-harcourt-medtronic-special-award-young-scientist-2026.jpg`,
    width: 1600,
    height: 1153,
    encodingFormat: "image/jpeg",
    name: "James Harcourt winning the Medtronic Special Award at Stripe Young Scientist 2026",
    alt: "James Harcourt receiving the Medtronic Special Award trophy on stage at the Stripe Young Scientist & Technology Exhibition 2026",
    caption: "James Harcourt accepting the Medtronic Special Award 2026 for GlucoBit at the Stripe Young Scientist & Technology Exhibition.",
    datePublished: "2026-01",
  },
  {
    id: `${SITE_URL}/images/james-harcourt-technology-award-young-scientist-2026.jpg#image`,
    path: "/images/james-harcourt-technology-award-young-scientist-2026.jpg",
    url: `${SITE_URL}/images/james-harcourt-technology-award-young-scientist-2026.jpg`,
    width: 1600,
    height: 1153,
    encodingFormat: "image/jpeg",
    name: "James Harcourt winning 3rd in Technology at Stripe Young Scientist 2026",
    alt: "James Harcourt receiving the 3rd in Technology award at the Stripe Young Scientist & Technology Exhibition 2026",
    caption: "James Harcourt on stage receiving 3rd place in Technology (sponsored by Analog Devices) at the Stripe Young Scientist & Technology Exhibition 2026.",
    datePublished: "2026-01",
  },
  {
    id: `${SITE_URL}/images/james-harcourt-young-scientist-medtronic-2026.jpg#image`,
    path: "/images/james-harcourt-young-scientist-medtronic-2026.jpg",
    url: `${SITE_URL}/images/james-harcourt-young-scientist-medtronic-2026.jpg`,
    width: 739,
    height: 1600,
    encodingFormat: "image/jpeg",
    name: "James Harcourt at Stripe Young Scientist & Technology Exhibition 2026",
    alt: "James Harcourt at the Stripe Young Scientist & Technology Exhibition 2026 in Dublin",
    caption: "James Harcourt representing Castleknock College at the Stripe Young Scientist & Technology Exhibition 2026.",
    datePublished: "2026-01",
  },
  {
    id: `${SITE_URL}/images/james-harcourt-patch-2026-demo-day-dogpatch-labs.jpg#image`,
    path: "/images/james-harcourt-patch-2026-demo-day-dogpatch-labs.jpg",
    url: `${SITE_URL}/images/james-harcourt-patch-2026-demo-day-dogpatch-labs.jpg`,
    width: 1600,
    height: 1067,
    encodingFormat: "image/jpeg",
    name: "James Harcourt and the Patch 2026 Demo Day cohort at Dogpatch Labs",
    alt: "Patch 2026 Demo Day cohort group photo including James Harcourt at Dogpatch Labs in Dublin",
    caption: "Patch 2026 Demo Day cohort at Dogpatch Labs, Dublin, where James Harcourt co-founded Equilibrium.",
    datePublished: "2026-08",
  },
  {
    id: `${SITE_URL}/headshot.webp#image`,
    path: "/headshot.webp",
    url: `${SITE_URL}/headshot.webp`,
    width: 1440,
    height: 960,
    encodingFormat: "image/webp",
    name: "James Harcourt headshot",
    alt: "James Harcourt smiling outdoors by a lake in Ireland",
    caption: "Headshot of James Harcourt, hardware and software engineer from Dublin, Ireland.",
  },
];

export const openGraphImages = [
  seoImages[2],
  seoImages[3],
  seoImages[0],
  seoImages[1],
].map((img) => ({
  url: img.url,
  width: img.width,
  height: img.height,
  alt: img.alt,
}));

export const sameAsProfiles = [
  socials.linkedin,
  socials.github,
  equilibrium.href,
];

function toImageObject(img: SeoImage) {
  return {
    "@type": "ImageObject",
    "@id": img.id,
    url: img.url,
    contentUrl: img.url,
    width: img.width,
    height: img.height,
    encodingFormat: img.encodingFormat,
    name: img.name,
    caption: img.caption,
    description: img.alt,
    about: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    creditText: profile.name,
    ...(img.datePublished ? { datePublished: img.datePublished } : {}),
    ...(img.representativeOfPage ? { representativeOfPage: true } : {}),
  };
}

export function buildHomeJsonLd() {
  const uniqueSchools = Array.from(new Set(education.map((e) => e.org)));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: profile.name,
        alternateName: [profile.site, "James Harcourt Portfolio"],
        description: profile.resumeSummary,
        inLanguage: "en-IE",
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
      },
      {
        "@type": "ProfilePage",
        "@id": PROFILE_PAGE_ID,
        url: SITE_URL,
        name: `${profile.name} | ${profile.role}`,
        description: profile.resumeSummary,
        inLanguage: "en-IE",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": PERSON_ID },
        mainEntity: { "@id": PERSON_ID },
        primaryImageOfPage: { "@id": seoImages[0].id },
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: profile.name,
        givenName: "James",
        familyName: "Harcourt",
        alternateName: ["jdharcourt"],
        url: SITE_URL,
        mainEntityOfPage: { "@id": PROFILE_PAGE_ID },
        email: `mailto:${profile.email}`,
        jobTitle: `${equilibrium.role} of ${equilibrium.name} | ${profile.role}`,
        description: profile.resumeSummary,
        image: seoImages.map((img) => ({ "@id": img.id })),
        sameAs: sameAsProfiles,
        nationality: { "@type": "Country", name: "Ireland" },
        homeLocation: {
          "@type": "Place",
          name: profile.location,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Dublin",
            addressCountry: "IE",
          },
        },
        worksFor: { "@id": EQUILIBRIUM_ID },
        founder: { "@id": EQUILIBRIUM_ID },
        alumniOf: [
          ...uniqueSchools.map((org) => ({
            "@type": "EducationalOrganization",
            name: org,
            address: {
              "@type": "PostalAddress",
              addressLocality: "Dublin",
              addressCountry: "IE",
            },
          })),
          {
            "@type": "Organization",
            name: "Patch Summer Programme (Dogpatch Labs)",
          },
        ],
        award: awards.map((a) => `${a.title}, ${a.org} (${a.period})`),
        knowsAbout: [
          "Embedded Systems",
          "Health-tech",
          "Smart Buildings",
          "Predictive HVAC",
          "Internet of Things",
          ...toolbox,
        ],
      },
      {
        "@type": "Organization",
        "@id": EQUILIBRIUM_ID,
        name: equilibrium.name,
        url: equilibrium.href,
        description: equilibrium.summary,
        founder: { "@id": PERSON_ID },
        location: {
          "@type": "Place",
          name: profile.location,
        },
      },
      ...seoImages.map(toImageObject),
      ...projects.map((project) => ({
        "@type": "SoftwareSourceCode",
        "@id": `${SITE_URL}/#project-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: project.name,
        description: project.description,
        url: project.site ?? project.demo ?? project.href,
        codeRepository: project.href,
        author: { "@id": PERSON_ID },
        keywords: [project.category, ...project.stack].join(", "),
      })),
    ],
  };
}

export function buildResumeJsonLd() {
  const resumeUrl = `${SITE_URL}/resume`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${resumeUrl}#webpage`,
        url: resumeUrl,
        name: `Résumé | ${profile.name}`,
        description: `${profile.name}'s one-page résumé: achievements, experience, education and key engineering projects.`,
        inLanguage: "en-IE",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": PERSON_ID },
        mainEntity: { "@id": PERSON_ID },
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: profile.name,
        url: SITE_URL,
        sameAs: sameAsProfiles,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${resumeUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: profile.name,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Résumé",
            item: resumeUrl,
          },
        ],
      },
    ],
  };
}
