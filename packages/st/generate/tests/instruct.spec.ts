/** serializeInstruct: ST instruct-mode flattening (wrapper sequences, system fallback, stop marker). */
import { describe, expect, it } from 'vitest'
import { CHATML_INSTRUCT, serializeInstruct, type AssembledPrompt } from '../src/index.ts'
import { createAssistantMessage, createUserMessage, createMessage } from '@deepseek-ai/dsh-llm'

const user = (text: string) => createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
const bot = (text: string) => createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 't', model: 't' } })
const sys = (text: string) => createMessage({
  role: 'system',
  content: [{ type: 'text', text }],
  source: { kind: 'plugin', plugin: 't' },
})

const PROMPT: AssembledPrompt = {
  system: 'You are Seraphina.',
  messages: [user('Hello!'), bot('Welcome, traveler.'), user('Tell me about the library.')],
}

describe('serializeInstruct', () => {
  it('wraps every row in the ChatML sequences and exposes the stop marker', () => {
    const out = serializeInstruct(PROMPT, CHATML_INSTRUCT)
    expect(out.system).toBe('')
    expect(out.messages).toHaveLength(1)
    expect(out.messages[0]!.role).toBe('user')
    expect(text(out)).toBe(
      '<|im_start|>system\n'
      + 'You are Seraphina.<|im_end|>\n'
      + '<|im_start|>user\nHello!<|im_end|>\n'
      + '<|im_start|>assistant\nWelcome, traveler.<|im_end|>\n'
      + '<|im_start|>user\nTell me about the library.<|im_end|>\n',
    )
    expect(out.stop).toEqual(['<|im_end|>'])
  })

  it('drops the system row when its opening wrapper is empty', () => {
    const out = serializeInstruct(PROMPT, { ...CHATML_INSTRUCT, systemSequence: '' })
    expect(text(out)).not.toContain('You are Seraphina.')
    expect(out.stop).toEqual(['<|im_end|>'])
  })

  it('uses the last-output wrapper for the final assistant row and the first-output wrapper for row zero', () => {
    const template = {
      ...CHATML_INSTRUCT,
      firstOutputSequence: '<first>\n',
      lastOutputSequence: '<last>\n',
      inputSequence: 'User: ',
      inputSuffix: '',
      outputSequence: 'Bot: ',
      outputSuffix: '',
      systemSequence: 'System: ',
    }
    const first = serializeInstruct({ system: '', messages: [bot('hi'), user('yo'), bot('bye')] }, template)
    expect(text(first)).toBe('<first>\nhiUser: yo<last>\nbye')

    const withSystem = serializeInstruct({ ...PROMPT, messages: [user('q')] }, template)
    expect(text(withSystem)).toContain('System: You are Seraphina.User: q')
  })

  it('separates rows with the separator sequence and honors wrap and trim', () => {
    const out = serializeInstruct(
      { system: 'SYS', messages: [user('one'), user('two')] },
      {
        systemSequence: 'SYS<',
        systemSequencePrefix: '',
        systemSequenceSuffix: '',
        inputSequence: ' IN ',
        inputSuffix: ' OUT ',
        outputSequence: '',
        outputSuffix: '',
        firstOutputSequence: '',
        firstOutputSuffix: '',
        lastOutputSequence: '',
        lastOutputSuffix: '',
        stopSequence: '  STOP  ',
        separatorSequence: '##',
        wrap: true,
        trimSequences: true,
      },
    )
    expect(text(out)).toBe('SYS<\nSYSOUT##IN\noneOUT##IN\ntwoOUT')
    // An empty output suffix falls the system row back to the trimmed input suffix.
    expect(out.stop).toEqual(['STOP'])
  })

  it('keeps temperature and maxTokens and drops mid-list system rows with an empty system wrapper', () => {
    const out = serializeInstruct(
      {
        system: 'S',
        messages: [user('a'), sys('mid'), bot('b')],
        temperature: 0.7,
        maxTokens: 512,
      },
      { ...CHATML_INSTRUCT, systemSequence: '', stopSequence: '' },
    )
    expect(text(out)).not.toContain('mid')
    expect(out.stop).toBeUndefined()
    expect(out.temperature).toBe(0.7)
    expect(out.maxTokens).toBe(512)
  })
})

function text(prompt: AssembledPrompt): string {
  return prompt.messages
    .flatMap((m) => m.content)
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
