// src/seo/entities.js
//
// Skeleton struktur Knowledge Graph untuk Verneks. TIDAK ADA DATA di sini —
// hanya bentuk/shape entity dan relasinya, disiapkan untuk halaman masa depan
// (/career/*, /roadmap/*, /skills/*, dll) yang BELUM dibangun.
//
// Tujuan: saat halaman-halaman itu dibuat nanti, strukturnya sudah konsisten
// dan saling terhubung — bukan ad-hoc per halaman.
//
// AEO note: AI search engine (dan Google's Knowledge Graph) memahami dunia
// lewat entity dan relasi, bukan keyword. "AI Engineer" sebagai entity Career
// yang punya relasi ke Skill "Python", "Machine Learning" jauh lebih kuat
// secara semantik dibanding satu artikel panjang tentang "cara jadi AI engineer".

/**
 * @typedef {Object} CareerEntity
 * @property {string} id - slug, contoh: 'ai-engineer'
 * @property {string} name
 * @property {string} definition - 1 kalimat definisi berdiri sendiri
 * @property {string[]} relatedSkills - array of Skill id
 * @property {string[]} relatedTools - array of Tool id
 * @property {string} [relatedRoadmap] - Roadmap id
 * @property {string} [salaryRange] - Salary id
 * @property {string[]} [relatedIndustries] - array of Industry id
 */

/**
 * @typedef {Object} SkillEntity
 * @property {string} id
 * @property {string} name
 * @property {string} definition
 * @property {'hard'|'soft'|'ai'|'leadership'} category
 * @property {string[]} relatedCareers - array of Career id
 */

/**
 * @typedef {Object} ToolEntity
 * @property {string} id
 * @property {string} name
 * @property {string} definition
 * @property {string[]} relatedSkills
 * @property {string} [website]
 */

/**
 * @typedef {Object} IndustryEntity
 * @property {string} id
 * @property {string} name
 * @property {string} definition
 * @property {string[]} relatedCareers
 */

/**
 * @typedef {Object} RoadmapEntity
 * @property {string} id
 * @property {string} careerId - Career id yang dituju
 * @property {{phase: string, duration: string, milestones: string[]}[]} phases
 */

/**
 * @typedef {Object} SalaryEntity
 * @property {string} id
 * @property {string} careerId
 * @property {string} currency
 * @property {{level: string, range: string}[]} ranges
 * @property {string} [source]
 */

/**
 * @typedef {Object} CertificationEntity
 * @property {string} id
 * @property {string} name
 * @property {string} provider
 * @property {string[]} relatedSkills
 */

/**
 * @typedef {Object} InterviewEntity
 * @property {string} id
 * @property {string} careerId
 * @property {{question: string, tip: string}[]} commonQuestions
 */

/**
 * @typedef {Object} CompanyEntity
 * @property {string} id
 * @property {string} name
 * @property {string[]} relatedCareers
 * @property {string} [industry] - Industry id
 */

// ── Registry kosong — diisi bertahap saat halaman entity dibangun ───────────
// Pola akses yang dipakai nanti: getEntity('career', 'ai-engineer')

/** @type {Record<string, CareerEntity>} */
export const careers = {}

/** @type {Record<string, SkillEntity>} */
export const skills = {}

/** @type {Record<string, ToolEntity>} */
export const tools = {}

/** @type {Record<string, IndustryEntity>} */
export const industries = {}

/** @type {Record<string, RoadmapEntity>} */
export const roadmaps = {}

/** @type {Record<string, SalaryEntity>} */
export const salaries = {}

/** @type {Record<string, CertificationEntity>} */
export const certifications = {}

/** @type {Record<string, InterviewEntity>} */
export const interviews = {}

/** @type {Record<string, CompanyEntity>} */
export const companies = {}

const REGISTRIES = {
  career: careers,
  skill: skills,
  tool: tools,
  industry: industries,
  roadmap: roadmaps,
  salary: salaries,
  certification: certifications,
  interview: interviews,
  company: companies,
}

/**
 * Generic getter — pola akses konsisten untuk semua entity type.
 * @param {keyof typeof REGISTRIES} type
 * @param {string} id
 */
export function getEntity(type, id) {
  return REGISTRIES[type]?.[id] || null
}

/**
 * Ambil semua entity terkait sebuah Career (skills, tools, roadmap, salary).
 * Dipakai nanti untuk internal linking otomatis di halaman /career/[id].
 * @param {string} careerId
 */
export function getRelatedEntities(careerId) {
  const career = careers[careerId]
  if (!career) return null

  return {
    career,
    skills: (career.relatedSkills || []).map(id => skills[id]).filter(Boolean),
    tools: (career.relatedTools || []).map(id => tools[id]).filter(Boolean),
    roadmap: career.relatedRoadmap ? roadmaps[career.relatedRoadmap] : null,
    salary: career.salaryRange ? salaries[career.salaryRange] : null,
    industries: (career.relatedIndustries || []).map(id => industries[id]).filter(Boolean),
  }
}
