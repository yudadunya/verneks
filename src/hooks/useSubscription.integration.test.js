import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSubscription } from './useSubscription'

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }))

describe('semua fitur gratis', () => {
  it('memberi akses penuh tanpa batas kepada setiap user', async () => {
    const { result } = renderHook(() => useSubscription('user-1'))

    expect(result.current.loading).toBe(false)
    expect(result.current.plan).toBe('premium')
    expect(result.current.isExpired).toBe(false)
    expect(result.current.getDaysRemaining()).toBeNull()
    expect(await result.current.checkUsage('chat')).toBe(true)
    expect(await result.current.getRemainingChat()).toBe(999)
  })

  it('tetap memberi akses penuh untuk user yang belum login', async () => {
    const { result } = renderHook(() => useSubscription(undefined))
    expect(result.current.plan).toBe('premium')
    expect(await result.current.checkUsage('chat')).toBe(true)
  })
})
