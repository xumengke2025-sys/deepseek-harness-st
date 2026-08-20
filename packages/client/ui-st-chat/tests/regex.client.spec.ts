/**
 * displayRegex (the client half of the regex engine): placement resolution,
 * find/replace, trimStrings, macros, and the per-script skip on an invalid
 * pattern — kept in lockstep with the host engine's applyRegexScripts tests.
 */
import { describe, expect, it } from 'vitest'
import { displayRegex } from '../src/client/regex.ts'
import type { StRegexScript } from '../src/client/contract.ts'

function script(extra: Partial<StRegexScript>): StRegexScript {
  return {
    id: 'test', scriptName: 'test', findRegex: '', replaceString: '',
    trimStrings: [], placement: [], disabled: false,
    markdownOnly: false, promptOnly: false, substituteRegex: false,
    ...extra,
  }
}

describe('displayRegex', () => {
  it('runs a placement-array script only when DISPLAY is flagged', () => {
    // ST placement values: 0 display, 1 user input, 2 AI output
    const display = script({ findRegex: 'o', replaceString: '0', placement: [0] })
    const prompt = script({ findRegex: 'o', replaceString: '0', placement: [1] })
    expect(displayRegex([display], 'foo')).toBe('f00')
    expect(displayRegex([prompt], 'foo')).toBe('foo')
  })

  it('resolves the legacy flags: markdownOnly runs, promptOnly does not', () => {
    const markdown = script({ findRegex: '\\*', replaceString: '', markdownOnly: true })
    const promptOnly = script({ findRegex: '\\*', replaceString: '', promptOnly: true })
    expect(displayRegex([markdown], 'a*b')).toBe('ab')
    expect(displayRegex([promptOnly], 'a*b')).toBe('a*b')
  })

  it('applies display scripts in file order and removes trimStrings', () => {
    const first = script({ findRegex: 'foo', replaceString: 'bar' })
    const second = script({ findRegex: 'bar', replaceString: 'BAR', trimStrings: ['<x>'] })
    expect(displayRegex([first, second], 'foo <x>')).toBe('BAR ')
  })

  it('substitutes {{char}}/{{user}} in the replacement when asked', () => {
    const s = script({ findRegex: 'NAME', replaceString: '{{user}} of {{char}}', substituteRegex: true })
    expect(displayRegex([s], 'NAME', { char: 'Seraphina', user: 'Kai' })).toBe('Kai of Seraphina')
  })

  it('skips disabled scripts and invalid patterns without failing the row', () => {
    const off = script({ findRegex: 'a', replaceString: 'b', disabled: true })
    const broken = script({ findRegex: '([', replaceString: 'x' })
    expect(displayRegex([off, broken], 'aa')).toBe('aa')
  })
})
