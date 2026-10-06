/**
 * Single source of truth for all factual content.
 * Every fact here comes exclusively from the CV document
 * (Brayan_Ricardo_Pisso_Ramirez_CV.pdf). Do NOT add invented content.
 *
 * Promotion rule for the stack: an item may enter it only if it appears
 * verbatim in the CV, anywhere — skills list, body text or project prose.
 * `CNNs` and `Segment Anything Model (SAM)` qualify on body text, which is why
 * they sit in Tier 1 beside PyTorch.
 */

export const SITE = {
  displayName: 'Brayan Pisso',
  fullName: 'Brayan Ricardo Pisso Ramírez',
  title: 'Electronic Engineer',
  /**
   * Positioning, not a CV claim. The CV lists the degree, never a job title, so
   * `title` above stays the PDF truth and this is the role the page is aimed at.
   */
  targetRole: 'Machine Learning Engineer',
  location: 'Manizales, Caldas, Colombia',
  email: 'bpisso@unal.edu.co',
  phoneDisplay: '+57 3152162946',
  phoneHref: 'tel:+573152162946',
  linkedin:
    'https://www.linkedin.com/in/brayan-ricardo-pisso-ramirez-8a089a363',
  github: 'https://github.com/BRAYANPISSO02',
} as const;

/** PDF filename served from /public (copied to dist/ as-is at build time). */
export const CV_FILENAME = 'Brayan_Ricardo_Pisso_Ramirez_CV.pdf';

/** Absolute path to the served PDF, base-aware (works under GitHub Pages). */
export const CV_URL = import.meta.env.BASE_URL + CV_FILENAME;

/**
 * The single Hero value sentence: actor + measured outcome, no claim the CV
 * does not carry.
 *
 * This is an editorial composition, not a verbatim quote, so it must carry an
 * `EDITORIAL_ALLOWLIST` entry once the provenance gate reads this file. Every
 * fragment traces to the redacted extract at `scripts/fixtures/cv.txt`:
 *
 * - "computer vision", "end-to-end solutions" — About
 * - "dataset construction", "supervised model training",
 *   "deploying solutions using PyTorch and Amazon SageMaker" — About
 * - "microenterprise", "manual design time by approximately two hours per
 *   image" — featured project
 *
 * The actor is named with the CV's own noun rather than a synonym, so the
 * outcome has something real attached to it. `≈ 2 hours per image` is the only
 * number-shaped performance claim allowed on the page.
 */
export const HERO_VALUE =
  'Builds computer vision models end-to-end — dataset construction, PyTorch training, SageMaker deployment — cutting ≈ 2 hours of manual design time per image for a microenterprise.';

export interface ExperienceItem {
  title: string;
  org: string;
  period: string;
  description: string;
  tags: readonly string[];
}

/** Featured project — full case study content. Facts only. */
export const FEATURED_PROJECT = {
  title: 'Automatic Generation of Human Vector Representations Using Deep Learning',
  org: 'Small Business',
  period: 'Feb 2026 – Present',
  tags: ['Computer Vision', 'PyTorch', 'Amazon SageMaker', 'Deep Learning'] as const,
  summary:
    'Implemented a computer vision solution to automatically generate SVG vector representations of people from photographs. The project, aimed at a microenterprise specializing in laser cutting and engraving, has a real impact by reducing manual design time by approximately two hours per image. It leverages deep learning models developed in PyTorch, including the Segment Anything Model (SAM) for interactive segmentation tasks. A data engineering pipeline was developed to build a dataset for supervised training of a vision model in Amazon SageMaker, focused on image-to-image translation tasks.',
  case: {
    problem:
      'Generating vector representations of people by hand is slow. For a microenterprise specializing in laser cutting and engraving, manual design work consumed approximately two hours per image — a direct cost on every order.',
    solution:
      'An automated computer vision pipeline that generates SVG vector representations of people directly from photographs, delivering a real impact in a production environment.',
    technology:
      'Deep learning models in PyTorch, including the Segment Anything Model (SAM) for interactive segmentation. A data engineering pipeline builds the dataset for supervised training of a vision model in Amazon SageMaker, focused on image-to-image translation tasks.',
    impact:
      'Approximately two hours of manual design time reduced per image for a real-world business.',
  },
} as const;

/** Remaining professional experience, most recent first. */
export const EXPERIENCE: readonly ExperienceItem[] = [
  {
    title: 'Long-Range Telemetry Project',
    org: 'Percepción y Control Inteligente (PCI) Research Group',
    period: 'Jun 2025 – Dec 2025',
    description:
      'Developed and implemented a pilot test at the Universidad Nacional de Colombia, La Nubia campus, of a long-distance data acquisition system for multiple electrical energy meters, using Modbus RTU/TCP and DLMS/COSEM protocols over Wi-Fi HaLow connectivity, with integration into the ThingsBoard IoT monitoring and management platform, designed to operate in self-organized multi-hop mesh network topologies.',
    tags: ['Data Acquisition', 'IoT', 'Wireless Communications', 'Electronics'],
  },
  {
    title: 'Image Processing Project',
    org: 'Universidad Nacional de Colombia',
    period: 'Aug 2024 – Dec 2024',
    description:
      'Developed computer vision pipelines for image classification using convolutional neural networks (CNNs) in TensorFlow/Keras, including data preprocessing, supervised training, dropout-based regularization, and experimental performance evaluation across multiple standard datasets.',
    tags: ['Computer Vision', 'CNNs', 'TensorFlow / Keras'],
  },
  {
    title: 'Electronic Designer',
    org: 'Microenterprise',
    period: 'Jan 2021 – Present',
    description:
      'Responsible for schematic design and PCB routing in KiCad (2D/3D) as well as electronic board prototyping and the development of structures for manufacturing using CNC machining and laser cutting.',
    tags: ['PCB Design', 'KiCad', 'CNC Machining', 'Laser Cutting'],
  },
];

export interface EducationItem {
  degree: string;
  institution: string;
  period: string;
  researchNote?: string;
}

export const EDUCATION: readonly EducationItem[] = [
  {
    degree: 'M.S. Student in Industrial Automation Engineering',
    institution: 'Universidad Nacional de Colombia',
    period: 'Jun 2026 – Present',
    researchNote: 'Research Focus: Machine Learning and Automatic Recognition',
  },
  {
    degree: 'Electronic Engineer',
    institution: 'Universidad Nacional de Colombia',
    period: 'Aug 2020 – Apr 2026',
  },
  {
    degree: 'Software Programming Technician',
    institution: 'Servicio Nacional de Aprendizaje (SENA)',
    period: 'Feb 2019 – Nov 2019',
  },
];

export interface StackTier {
  label: string;
  items: readonly string[];
}

/**
 * Three peer tiers, ordered by how they answer an ML-engineer screen. The
 * tier labels are editorial and must carry an `EDITORIAL_ALLOWLIST` entry
 * once the provenance gate reads this file.
 *
 * Bare `AWS` is dropped: it is the parent of four listed chips, not a peer of
 * them. `Git` joins Programming because the CV lists it with the programming
 * languages.
 */
export const STACK_PRIMARY: readonly StackTier[] = [
  {
    label: 'Machine Learning & Computer Vision',
    items: [
      'PyTorch',
      'TensorFlow / Keras',
      'Machine Learning',
      'Computer Vision',
      'CNNs',
      'Segment Anything Model (SAM)',
      'Deep Learning',
    ],
  },
  {
    label: 'Cloud & MLOps',
    items: ['Amazon SageMaker', 'Amazon S3', 'AWS Lambda', 'Amazon Bedrock', 'Docker'],
  },
  {
    label: 'Programming',
    items: ['Python', 'Rust', 'C', 'C++', 'Git'],
  },
] as const;

export interface StackBand {
  /**
   * One framing sentence tying the band to the telemetry project. Editorial,
   * so it must carry an `EDITORIAL_ALLOWLIST` entry; every clause traces to
   * the redacted extract at `scripts/fixtures/cv.txt`.
   */
  note: string;
  items: readonly string[];
}

/**
 * The demoted band. Electronics, embedded and hardware are real and provable,
 * but a peer chip beside PyTorch dilutes the ML signal, so they render once,
 * below the tiers, at a lower weight. Language proficiency lives here too: it
 * is CV-verifiable and there is no fourth tier to put it in.
 */
export const STACK_SECONDARY: StackBand = {
  note: 'Long-Range Telemetry Project: long-distance data acquisition over Wi-Fi HaLow connectivity, with integration into the ThingsBoard IoT monitoring and management platform.',
  items: [
    'STM32',
    'ESP32',
    'BeaglePlay',
    'Raspberry Pi',
    'MATLAB',
    'AutoCAD',
    'Proteus',
    'Multisim',
    'KiCad',
    'CNC Router',
    'CNC Laser',
    'English — B2 (CEFR)',
    'Spanish — Native',
  ],
} as const;

/**
 * Six soft skills, rendered as one low-emphasis strip rather than chips: they
 * are the weakest kind of evidence on the page and must not read as a tier.
 */
export const SOFT_SKILLS: readonly string[] = [
  'Proactivity and initiative',
  'Needs analysis',
  'Effective communication',
  'Resilience',
  'Teamwork',
  'Leadership',
] as const;

export interface CourseItem {
  title: string;
  platform: string;
  provider: string;
}

export const COURSES: readonly CourseItem[] = [
  {
    title: 'GenAI and LLMs on AWS',
    platform: 'Coursera',
    provider: 'Duke University',
  },
  {
    title: 'Data Science & Inteligencia Artificial aplicados a negocios',
    platform: 'Coursera',
    provider: 'University of Palermo',
  },
  {
    title: 'AWS S3 Basic',
    platform: 'Coursera',
    provider: 'Coursera',
  },
];

export interface ReferenceItem {
  name: string;
  credentials: string;
  affiliation: string;
}

export const REFERENCES: readonly ReferenceItem[] = [
  {
    name: 'GUSTAVO ADOLFO OSORIO LONDOÑO',
    credentials: 'Ph.D. in Industrial Automation, M.Sc. in Engineering',
    affiliation:
      'Professor, Department of Electrical, Electronic and Communications Engineering, Universidad Nacional de Colombia',
  },
  {
    name: 'LUIS FERNANDO DÍAZ CADAVID',
    credentials: 'Ph.D., M.Sc.',
    affiliation:
      'Professor, Department of Electrical, Electronic and Communications Engineering, Universidad Nacional de Colombia',
  },
];

export const REFERENCES_NOTE = 'References contacts available upon request';

/**
 * One document the owner is willing to hand over, described but never linked.
 *
 * There is deliberately no `href`, `path` or `url` field. A document link is
 * not merely discouraged here, it is unrepresentable: adding the field is a
 * type error. That is the structural closure of the Drive-exposure class — the
 * design's answer to "the folder link is one permission change away from being
 * public" is that the site has no place to put a link, not a rule saying not
 * to add one.
 */
export interface DocumentEntry {
  readonly title: string;
  /** What the file is, so the reader knows what they are asking for. */
  readonly kind: string;
  /** One line on what it covers and when it was last current. */
  readonly note: string;
}

/**
 * A data-only switch, discriminated so the inactive path is type-enforced.
 *
 * `mode: 'form'` requires an `endpoint`; there is no way to write a form config
 * without naming where the data goes, and no way to write a `mailto` config
 * that carries one. Flipping the mode is an edit to this object and nothing
 * else: no component, no CSS, no template.
 *
 * The endpoint stays absent. Turning the form on means a commercial third party
 * lands in a visitor's personal-data path and in page source, which is a
 * decision for the owner to make deliberately, not a default to inherit.
 */
export type DocRequestConfig =
  | {
      readonly mode: 'mailto';
      readonly documents: readonly DocumentEntry[];
    }
  | {
      readonly mode: 'form';
      readonly endpoint: string;
      /** Only read by the form branch; never serialised anywhere else. */
      readonly accessKey?: string;
      readonly documents: readonly DocumentEntry[];
    };

/**
 * Copy for the document-request channel.
 *
 * `DOC_REQUEST_COPY` is separate from `DOC_REQUEST` so the union above carries
 * only facts, and the wording lives in one place a reviewer can read end to end.
 *
 * Two constraints shape this wording. It must never imply the site can verify
 * anyone: there are no accounts, no login and no signature, so whatever a
 * visitor types is self-reported and the honest phrasing is a request to
 * identify themselves, not a check that passes. And the privacy note has to
 * match the mode that actually ships — under `mailto:` nothing leaves the
 * visitor's own mail client for a processor to see, and claiming otherwise
 * would misdescribe where their name and email go.
 */
export const DOC_REQUEST_COPY = {
  heading: 'Documents',
  /** Shown above the catalog. Names the mechanism, not a security claim. */
  intro: 'Documents are shared on request. Tell me who you are and which one you need, and I will send it over.',
  /** The per-entry action. A verb, not a promise of a download. */
  action: 'Request',
  /** `mailto:` body preamble; the identity block is appended by the component. */
  mailSubject: 'Document request',
  mailGreeting: 'Hello Brayan,',
  /** Left blank on purpose: it is the visitor's line to fill in. */
  mailIdentityLine: 'Your name / your email:',
  /**
   * Shown under both modes. The third-party clause is supplied by the
   * component, which knows the mode; naming a service here would be a claim
   * that is wrong the moment `mode` changes.
   */
  privacy: 'Send me only your name and email address, and only what the document needs. No cookies and no tracking are used on this site.',
  /** Consent, stated as the owner's right rather than a soft promise. */
  decline: 'You can also say no, and nothing will be sent.',
} as const;

/**
 * Ships in `mailto:` mode, which is why the form branch needs no endpoint here.
 *
 * One entry, because one is what the owner is actually prepared to send. A
 * second entry would need a PDF-traceable title or an allowlist entry under
 * R-45, which is the point: the catalog cannot grow by accident.
 */
export const DOC_REQUEST: DocRequestConfig = {
  mode: 'mailto',
  documents: [
    {
      title: 'Curriculum Vitae',
      kind: 'PDF',
      note: 'Machine learning and computer vision profile, project and academic record.',
    },
  ],
};

export interface NavLink {
  label: string;
  href: string;
  sectionId: string;
  /**
   * `false` keeps the entry in the mobile menu but out of the desktop bar.
   * Used where the section is real and worth reaching but the bar is already
   * carrying enough weight at narrow desktop widths.
   */
  desktop?: boolean;
}

/**
 * One entry per rendered section, in document order, so a nav link can never
 * point at a section that no longer exists.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Home', href: '#home', sectionId: 'home' },
  { label: 'Projects', href: '#projects', sectionId: 'projects' },
  { label: 'Stack', href: '#skills', sectionId: 'skills' },
  { label: 'Experience', href: '#experience', sectionId: 'experience' },
  { label: 'Education', href: '#education', sectionId: 'education' },
  { label: 'Courses', href: '#courses', sectionId: 'courses' },
  { label: 'References', href: '#references', sectionId: 'references', desktop: false },
  { label: 'Contact', href: '#contact', sectionId: 'contact' },
] as const;
