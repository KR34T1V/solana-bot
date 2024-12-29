import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword, comparePasswords } from '../auth'

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', () => {
      const password = 'ValidP@ssw0rd'
      const hash = hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should generate same hash for same password', () => {
      const password = 'ValidP@ssw0rd'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)
      
      expect(hash1).toBe(hash2)
    })
  })

  describe('comparePasswords', () => {
    it('should return true for matching password and hash', () => {
      const password = 'ValidP@ssw0rd'
      const hash = hashPassword(password)
      
      const result = comparePasswords(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for non-matching password and hash', () => {
      const password = 'ValidP@ssw0rd'
      const wrongPassword = 'WrongP@ssw0rd'
      const hash = hashPassword(password)
      
      const result = comparePasswords(wrongPassword, hash)
      expect(result).toBe(false)
    })
  })
}) 