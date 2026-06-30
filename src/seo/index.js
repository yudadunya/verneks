// src/seo/index.js
//
// Barrel export — satu titik import untuk semua SEO utilities.
// import { useSEO, FAQSection, generateBreadcrumb } from '../seo'

export { useSEO } from './useSEO'
export { generateMetadata, applyMetadata, SITE_URL, SITE_NAME } from './generateMetadata'
export {
  organizationSchema,
  webSiteSchema,
  softwareApplicationSchema,
  faqSchema,
  breadcrumbSchema,
  articleSchema,
  howToSchema,
  injectSchemas,
} from './generateSchema'
export { generateBreadcrumb } from './generateBreadcrumb'
export { FAQSection } from './generateFAQ.jsx'
export {
  careers, skills, tools, industries, roadmaps,
  salaries, certifications, interviews, companies,
  getEntity, getRelatedEntities,
} from './entities'
