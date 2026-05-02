import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('utils', () => {
  describe('cn function', () => {
    it('應該合併類名', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })

    it('應該處理條件類名', () => {
      const result = cn('base', { 'conditional': true, 'hidden': false })
      expect(result).toContain('base')
      expect(result).toContain('conditional')
      expect(result).not.toContain('hidden')
    })

    it('應該過濾空值', () => {
      const result = cn('class1', null, undefined, 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).not.toContain('null')
      expect(result).not.toContain('undefined')
    })
  })
})