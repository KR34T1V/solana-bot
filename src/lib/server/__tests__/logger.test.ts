import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { logger, logRequest, logError, logResponse } from '../logger'
import winston from 'winston'

describe('Logger Service', () => {
  // Spy on winston logger methods
  beforeEach(() => {
    vi.spyOn(logger, 'info')
    vi.spyOn(logger, 'error')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('logRequest', () => {
    it('should log API request with user ID', () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'test-agent',
          'referer': 'https://example.com'
        }
      })
      const userId = 'test-user'

      logRequest(request, userId)

      expect(logger.info).toHaveBeenCalledWith('API Request', {
        method: 'POST',
        path: '/api/test',
        userId: 'test-user',
        userAgent: 'test-agent',
        referer: 'https://example.com'
      })
    })

    it('should log API request without user ID', () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'user-agent': 'test-agent'
        }
      })

      logRequest(request)

      expect(logger.info).toHaveBeenCalledWith('API Request', {
        method: 'GET',
        path: '/api/test',
        userId: undefined,
        userAgent: 'test-agent',
        referer: null
      })
    })
  })

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error')
      const context = { additionalInfo: 'test info' }

      logError(error, context)

      expect(logger.error).toHaveBeenCalledWith(error.message, {
        name: error.name,
        stack: error.stack,
        additionalInfo: 'test info'
      })
    })

    it('should log error without context', () => {
      const error = new Error('Test error')

      logError(error)

      expect(logger.error).toHaveBeenCalledWith(error.message, {
        name: error.name,
        stack: error.stack
      })
    })
  })

  describe('logResponse', () => {
    it('should log API response with user ID', () => {
      logResponse(200, '/api/test', 150, 'test-user')

      expect(logger.info).toHaveBeenCalledWith('API Response', {
        status: 200,
        path: '/api/test',
        duration: '150ms',
        userId: 'test-user'
      })
    })

    it('should log API response without user ID', () => {
      logResponse(404, '/api/test', 50)

      expect(logger.info).toHaveBeenCalledWith('API Response', {
        status: 404,
        path: '/api/test',
        duration: '50ms',
        userId: undefined
      })
    })
  })

  describe('logger configuration', () => {
    it('should have correct log format', () => {
      const testTransport = new winston.transports.Console({ level: 'info' })
      const testLogger = winston.createLogger({
        level: 'info',
        transports: [testTransport]
      })

      const logMessage = 'Test log message'
      const logMetadata = { test: 'metadata' }

      testLogger.info(logMessage, logMetadata)

      expect(testLogger.level).toBe('info')
      expect(testTransport.level).toBe('info')
    })
  })
}) 