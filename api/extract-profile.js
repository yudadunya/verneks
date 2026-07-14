/**
 * /api/extract-profile
 * 
 * POST endpoint
 * Extract and save user profile from discovery conversation
 * Called after user completes discovery → genome result
 * 
 * Input: Discovery messages + genome data
 * Output: Saved profile → user can access
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, messages, genomeData } = req.body

    // Validate input
    if (!userId || !messages || !genomeData) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Step 1: Parse messages into structured data
    const extracted = parseDiscoveryMessages(messages)

    // Step 2: Combine with genome scores
    const profile = combineProfileData(extracted, genomeData)

    // Step 3: Create user model
    const userModel = buildUserModel(userId, profile)

    // Step 4: Save to database
    const savedProfile = await saveProfile(userId, userModel)

    // Step 5: Save reflection log
    await saveReflection(userId, extracted, genomeData)

    return res.status(200).json({
      success: true,
      profile: savedProfile,
      message: 'Profile extracted and saved successfully'
    })

  } catch (error) {
    console.error('[extract-profile] Error:', error)
    return res.status(500).json({
      error: 'Failed to extract profile',
      details: error.message
    })
  }
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 1: PARSE DISCOVERY MESSAGES
// ════════════════════════════════════════════════════════════════════════════

function parseDiscoveryMessages(messages) {
  /**
   * Extract structured data from conversation
   * Messages format: [{ role: "user"|"bot", text: "..." }]
   */

  const extracted = {
    dream: {
      ideal_role: null,
      ideal_industry: null,
      timeline: null,
      why: null
    },
    current: {
      role: null,
      industry: null,
      years_experience: null,
      what_works: [],
      frustrations: []
    },
    skills: {
      top_3: [],
      technical: [],
      soft: [],
      hidden: []
    },
    blockers: {
      main: null,
      secondary: [],
      financial_constraint: false,
      time_constraint: false,
      location_constraint: false
    },
    motivation: {
      reason_for_change: null,
      success_definition: null,
      support_system: null,
      fear: null
    },
    readiness: {
      commitment_level: 5, // 1-10
      willing_to_learn: true,
      ready_for_sacrifice: true,
      timeline_realistic: true
    }
  }

  // Iterate through messages and extract
  for (const msg of messages) {
    const text = msg.text?.toLowerCase() || ''
    
    // Extract role/industry
    if (text.includes('saya') && (text.includes('kerja') || text.includes('role'))) {
      // Attempt extraction
      if (text.includes('manager')) extracted.current.role = 'Manager'
      if (text.includes('developer')) extracted.current.role = 'Developer'
      if (text.includes('analyst')) extracted.current.role = 'Analyst'
      // ... etc
    }

    // Extract timeline
    if (text.includes('tahun') || text.includes('tahun pengalaman')) {
      const match = text.match(/(\d+)\s*tahun/)
      if (match) extracted.current.years_experience = parseInt(match[1])
    }

    // Extract skills (simple keyword matching)
    if (text.includes('skill') || text.includes('kemampuan')) {
      // Could use Claude here for better extraction
      // For now, basic keywords
      if (text.includes('python')) extracted.skills.technical.push('Python')
      if (text.includes('javascript')) extracted.skills.technical.push('JavaScript')
      if (text.includes('leadership')) extracted.skills.soft.push('Leadership')
      if (text.includes('komunikasi')) extracted.skills.soft.push('Communication')
    }
  }

  return extracted
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 2: COMBINE WITH GENOME DATA
// ════════════════════════════════════════════════════════════════════════════

function combineProfileData(extracted, genomeData) {
  /**
   * Merge extracted data with genome scores
   * Genome has: genome_scores, career_stage, growth_state, gps_steps, etc.
   */

  return {
    ...extracted,
    genome: {
      scores: genomeData.genome_scores,
      stage: genomeData.career_stage,
      top_strength: genomeData.top_strength,
      wow_insight: genomeData.wow_insight,
      mentor_message: genomeData.mentor_message
    },
    growth_state: genomeData.growth_state,
    gps_steps: genomeData.gps_steps
  }
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 3: BUILD USER MODEL
// ════════════════════════════════════════════════════════════════════════════

function buildUserModel(userId, profile) {
  /**
   * Transform extracted + genome into user_models table format
   */

  const model = {
    user_id: userId,
    
    // Goals
    career_goal: profile.dream.ideal_role || 'To be determined',
    income_goal: null, // Not directly from discovery, but can infer
    
    // Current situation
    current_role: profile.current.role,
    current_industry: profile.current.industry,
    years_experience: profile.current.years_experience || 0,
    
    // Skills
    skill_map: {
      technical: profile.skills.technical,
      soft: profile.skills.soft,
      hidden: profile.skills.hidden,
      gaps: estimateSkillGaps(profile)
    },
    
    // Profile
    strengths: [
      profile.genome.top_strength,
      ...inferStrengths(profile)
    ].filter(Boolean),
    
    weaknesses: [
      profile.blockers.main,
      ...profile.blockers.secondary
    ].filter(Boolean),
    
    // Psychology
    personality_type: inferPersonality(profile), // Can infer from responses
    learning_style: inferLearningStyle(profile),
    
    // Progress & engagement
    career_readiness: profile.genome.growth_state.career_readiness || 0,
    readiness_level: inferReadiness(profile.readiness),
    success_patterns: [profile.genome.top_strength],
    motivation_driver: profile.motivation.reason_for_change,
    
    // Constraints
    constraints: {
      financial: profile.blockers.financial_constraint,
      time: profile.blockers.time_constraint,
      location: profile.blockers.location_constraint
    },
    
    // Metadata
    discovery_completed_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    
    // Reference
    genome_data: profile.genome,
    gps_steps: profile.gps_steps
  }

  return model
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function estimateSkillGaps(profile) {
  const target_skills = guessTargetSkills(profile.dream.ideal_role)
  const current_skills = [
    ...profile.skills.technical,
    ...profile.skills.soft
  ]
  
  return target_skills.filter(s => !current_skills.includes(s))
}

function guessTargetSkills(role) {
  // Simple mapping, can be enhanced
  const roleSkillMap = {
    'Product Manager': ['Analytics', 'Communication', 'SQL', 'User Research'],
    'Developer': ['Coding', 'Problem Solving', 'System Design'],
    'Manager': ['Leadership', 'Communication', 'Strategic Thinking'],
    'Analyst': ['Analytics', 'Excel', 'SQL', 'Business Acumen']
  }
  
  return roleSkillMap[role] || []
}

function inferStrengths(profile) {
  const strengths = []
  
  if (profile.current.what_works.length > 0) {
    strengths.push(...profile.current.what_works)
  }
  
  if (profile.skills.technical.length > 0) {
    strengths.push('Technical Skills')
  }
  
  if (profile.motivation.support_system) {
    strengths.push('Support System')
  }
  
  return strengths
}

function inferPersonality(profile) {
  // Very simplified - in reality use assessment
  if (profile.motivation.fear?.includes('public')) return 'Introvert'
  if (profile.skills.soft.includes('Leadership')) return 'Extrovert'
  return 'Ambivert'
}

function inferLearningStyle(profile) {
  // Could detect from how they answer
  // For now, default
  return 'Practical'
}

function inferReadiness(readiness) {
  const score = (
    readiness.commitment_level / 10 +
    (readiness.willing_to_learn ? 1 : 0) +
    (readiness.ready_for_sacrifice ? 1 : 0) +
    (readiness.timeline_realistic ? 1 : 0)
  ) / 4
  
  if (score > 0.8) return 'High'
  if (score > 0.5) return 'Medium'
  return 'Low'
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 4: SAVE TO DATABASE
// ════════════════════════════════════════════════════════════════════════════

async function saveProfile(userId, userModel) {
  const { data, error } = await supabase
    .from('user_career_profiles')
    .upsert(
      {
        user_id: userId,
        ...userModel
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`)
  }

  return data
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 5: SAVE REFLECTION LOG
// ════════════════════════════════════════════════════════════════════════════

async function saveReflection(userId, extracted, genomeData) {
  /**
   * Save initial reflection after discovery
   * Used for future pattern matching
   */

  const reflection = {
    user_id: userId,
    type: 'discovery_completion',
    insight: {
      wow_insight: genomeData.wow_insight,
      mentor_message: genomeData.mentor_message,
      career_readiness: genomeData.career_readiness,
      top_strength: genomeData.top_strength
    },
    pattern: 'discovery_complete',
    learning: 'Initial career DNA identified',
    created_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('reflections')
    .insert(reflection)

  if (error) {
    console.warn('[extract-profile] Warning: Failed to save reflection:', error)
    // Don't throw - reflection is optional
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Success response:
 * {
 *   "success": true,
 *   "profile": {
 *     "user_id": "uuid",
 *     "career_goal": "...",
 *     "current_role": "...",
 *     "skill_map": {...},
 *     ...
 *   },
 *   "message": "Profile extracted and saved successfully"
 * }
 * 
 * Error response:
 * {
 *   "error": "...",
 *   "details": "..."
 * }
 */

/**
 * USAGE:
 * 
 * Called from GenomeResult.jsx:
 * 
 * fetch('/api/extract-profile', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     userId: user.id,
 *     messages: discoveryMessages,
 *     genomeData: genomeResult
 *   })
 * })
 * .then(r => r.json())
 * .then(data => {
 *   if (data.success) {
 *     // Redirect to /chat
 *     navigate('/chat')
 *   }
 * })
 */
