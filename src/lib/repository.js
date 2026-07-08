/**
 * Repository Pattern - Decouples application from Supabase
 * Allows easy switching to other database providers in the future
 */

import { supabase } from './supabase.js'

/**
 * User Repository - Handles all user-related database operations
 */
export const userRepository = {
  /**
   * Find user by ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('userRepository.findById:', error)
      return null
    }
  },

  /**
   * Create new user
   * @param {Object} userData 
   * @returns {Promise<Object|null>}
   */
  async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('userRepository.create:', error)
      return null
    }
  },

  /**
   * Update user
   * @param {string} userId 
   * @param {Object} userData 
   * @returns {Promise<Object|null>}
   */
  async update(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('userRepository.update:', error)
      return null
    }
  }
}

/**
 * Career Profile Repository
 */
export const careerProfileRepository = {
  /**
   * Find career profile by user ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_career_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('careerProfileRepository.findByUserId:', error)
      return null
    }
  },

  /**
   * Upsert career profile
   * @param {Object} profileData 
   * @returns {Promise<Object|null>}
   */
  async upsert(profileData) {
    try {
      const { data, error } = await supabase
        .from('user_career_profiles')
        .upsert(profileData)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('careerProfileRepository.upsert:', error)
      return null
    }
  }
}

/**
 * Chat History Repository
 */
export const chatHistoryRepository = {
  /**
   * Get chat history for user
   * @param {string} userId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async findByUserId(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('chatHistoryRepository.findByUserId:', error)
      return []
    }
  },

  /**
   * Save chat message
   * @param {Object} messageData 
   * @returns {Promise<Object|null>}
   */
  async create(messageData) {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert([messageData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('chatHistoryRepository.create:', error)
      return null
    }
  },

  /**
   * Delete chat history for user (for GDPR compliance)
   * @param {string} userId 
   * @returns {Promise<boolean>}
   */
  async deleteByUserId(userId) {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', userId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('chatHistoryRepository.deleteByUserId:', error)
      return false
    }
  }
}

/**
 * Genome Score Repository
 */
export const genomeScoreRepository = {
  /**
   * Find genome scores by user ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_genome_scores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('genomeScoreRepository.findByUserId:', error)
      return null
    }
  },

  /**
   * Upsert genome scores
   * @param {Object} scoreData 
   * @returns {Promise<Object|null>}
   */
  async upsert(scoreData) {
    try {
      const { data, error } = await supabase
        .from('user_genome_scores')
        .upsert(scoreData)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('genomeScoreRepository.upsert:', error)
      return null
    }
  }
}

/**
 * Growth State Repository
 */
export const growthStateRepository = {
  /**
   * Find growth state by user ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_growth_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('growthStateRepository.findByUserId:', error)
      return null
    }
  },

  /**
   * Upsert growth state
   * @param {Object} stateData 
   * @returns {Promise<Object|null>}
   */
  async upsert(stateData) {
    try {
      const { data, error } = await supabase
        .from('user_growth_state')
        .upsert(stateData)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('growthStateRepository.upsert:', error)
      return null
    }
  }
}

/**
 * Milestones Repository
 */
export const milestonesRepository = {
  /**
   * Find milestones by user ID
   * @param {string} userId 
   * @returns {Promise<Array>}
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('milestonesRepository.findByUserId:', error)
      return []
    }
  },

  /**
   * Create milestone
   * @param {Object} milestoneData 
   * @returns {Promise<Object|null>}
   */
  async create(milestoneData) {
    try {
      const { data, error } = await supabase
        .from('user_milestones')
        .insert([milestoneData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('milestonesRepository.create:', error)
      return null
    }
  },

  /**
   * Bulk insert milestones
   * @param {Array} milestonesData 
   * @returns {Promise<Array|null>}
   */
  async bulkInsert(milestonesData) {
    try {
      const { data, error } = await supabase
        .from('user_milestones')
        .insert(milestonesData)
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('milestonesRepository.bulkInsert:', error)
      return null
    }
  }
}

/**
 * Auth Repository - Abstracts authentication operations
 */
export const authRepository = {
  /**
   * Sign up with email/password
   * @param {string} email 
   * @param {string} password 
   * @param {string} fullName 
   * @returns {Promise<Object>}
   */
  async signUp(email, password, fullName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('authRepository.signUp:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Sign in with email/password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>}
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('authRepository.signIn:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Sign out
   * @returns {Promise<Object>}
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('authRepository.signOut:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get current session
   * @returns {Promise<Object>}
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { success: true, session }
    } catch (error) {
      console.error('authRepository.getSession:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get current user
   * @returns {Promise<Object>}
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { success: true, user }
    } catch (error) {
      console.error('authRepository.getUser:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Sign in with OAuth provider
   * @param {string} provider 
   * @param {string} redirectTo 
   * @returns {Promise<Object>}
   */
  async signInWithOAuth(provider, redirectTo) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      })
      
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('authRepository.signInWithOAuth:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Subscribe to auth state changes
   * @param {Function} callback 
   * @returns {Object} subscription object with unsubscribe method
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
    return {
      unsubscribe: () => subscription.unsubscribe()
    }
  }
}

export default {
  user: userRepository,
  careerProfile: careerProfileRepository,
  chatHistory: chatHistoryRepository,
  genomeScore: genomeScoreRepository,
  growthState: growthStateRepository,
  milestones: milestonesRepository,
  auth: authRepository
}
