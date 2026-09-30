/**
 * Single source of truth for all factual content.
 * Every fact here comes exclusively from the CV document
 * (Brayan_Ricardo_Pisso_Ramirez_CV.pdf). Do NOT add invented content.
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
  docs:
    'https://drive.google.com/drive/folders/1gq-mUJ3unNOivBP7oHyEAeMZfHrIhP75?usp=sharing',
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

export interface SkillCategory {
  name: string;
  items: readonly string[];
}

/** Skills grouped into visual categories. Only technologies from the CV. */
export const SKILLS: readonly SkillCategory[] = [
  {
    name: 'Machine Learning & AI',
    items: ['PyTorch', 'TensorFlow / Keras', 'Machine Learning', 'Computer Vision'],
  },
  {
    name: 'Cloud & Infrastructure',
    items: ['AWS', 'Amazon SageMaker', 'AWS Lambda', 'Amazon Bedrock', 'Amazon S3', 'Docker'],
  },
  {
    name: 'Programming',
    items: ['Python', 'Rust', 'C', 'C++'],
  },
  {
    name: 'Development',
    items: ['Git'],
  },
  {
    name: 'Embedded Systems',
    items: ['STM32', 'ESP32', 'BeaglePlay', 'Raspberry Pi'],
  },
  {
    name: 'Engineering & Design',
    items: ['MATLAB', 'AutoCAD', 'Proteus', 'Multisim', 'KiCad'],
  },
  {
    name: 'Manufacturing',
    items: ['CNC Router', 'CNC Laser'],
  },
  {
    name: 'Languages',
    items: ['English — B2 (CEFR)', 'Spanish — Native'],
  },
  {
    name: 'Soft Skills',
    items: [
      'Proactivity and initiative',
      'Needs analysis',
      'Effective communication',
      'Resilience',
      'Teamwork',
      'Leadership',
    ],
  },
];

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
