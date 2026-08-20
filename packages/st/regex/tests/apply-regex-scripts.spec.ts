/**
 * applyRegexScripts behavior: placement selection (array vs legacy booleans),
 * find/replace with backreferences, trimStrings, macro substitution, and the
 * per-script skip on an invalid pattern.
 */
import { describe, expect, it } from 'vitest'
import { applyRegexScripts, PLACEMENT, type RegexScript } from '../src/index.ts'

function script(extra: Partial<RegexScript>): RegexScript {
  return {
    id: 'test', scriptName: 'test', findRegex: '', replaceString: '',
    trimStrings: [], placement: [], disabled: false,
    markdownOnly: false, promptOnly: false, substituteRegex: false,
    ...extra,
  }
}

describe('applyRegexScripts', () => {
  it('applies a placement-array script only to its declared targets', () => {
    const s = script({ findRegex: 'o', replaceString: '0', placement: [PLACEMENT.USER_INPUT] })
    expect(applyRegexScripts([s], 'foo', 'user_input')).toBe('f00')
    expect(applyRegexScripts([s], 'foo', 'ai_output')).toBe('foo')
    expect(applyRegexScripts([s], 'foo', 'display')).toBe('foo')
  })

  it('treats markdownOnly as display-only in the legacy form', () => {
    const s = script({ findRegex: '\\*', replaceString: '', markdownOnly: true })
    expect(applyRegexScripts([s], 'a*b', 'display')).toBe('ab')
    expect(applyRegexScripts([s], 'a*b', 'user_input')).toBe('a*b')
  })

  it('runs a legacy script with no flags on every target', () => {
    const s = script({ findRegex: 'x', replaceString: 'y' })
    for (const target of ['user_input', 'ai_output', 'display'] as const) {
      expect(applyRegexScripts([s], 'x', target)).toBe('y')
    }
  })

  it('skips disabled scripts', () => {
    const s = script({ findRegex: 'a', replaceString: 'b', disabled: true })
    expect(applyRegexScripts([s], 'aaa', 'display')).toBe('aaa')
  })

  it('supports $1 backreferences and removes trimStrings afterward', () => {
    const s = script({ findRegex: '\\[(.*?)\\]', replaceString: '($1)', trimStrings: ['()'] })
    expect(applyRegexScripts([s], '[b] and []', 'display')).toBe('(b) and ')
  })

  it('substitutes {{char}}/{{user}} in the replacement when asked', () => {
    const s = script({ findRegex: 'NAME', replaceString: '{{char}} greets {{user}}', substituteRegex: true })
    const out = applyRegexScripts([s], 'NAME!', 'display', { char: 'Seraphina', user: 'Kai' })
    expect(out).toBe('Seraphina greets Kai!')
  })

  it('skips a script with an invalid regex source instead of failing the pipeline', () => {
    const broken = script({ findRegex: '([', replaceString: 'x' })
    const fine = script({ findRegex: 'a', replaceString: 'b' })
    expect(applyRegexScripts([broken, fine], 'aa', 'display')).toBe('bb')
  })

  it('applies scripts in file order so later scripts see earlier output', () => {
    const first = script({ findRegex: 'cat', replaceString: 'dog' })
    const second = script({ findRegex: 'dog', replaceString: 'wolf' })
    expect(applyRegexScripts([first, second], 'cat', 'display')).toBe('wolf')
    expect(applyRegexScripts([second, first], 'cat', 'display')).toBe('dog')
  })
})
