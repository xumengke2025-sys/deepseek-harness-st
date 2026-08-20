/**
 * Local n-gram embedding, cosine retrieval, Data Bank chunking, and the
 * st-vector file provider over a temp data root.
 */
import { describe, expect, it, afterEach } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import StVectorLocalProvider, {
  LocalNgramEmbedder,
  OpenAIEmbeddingProvider,
  cosineSimilarity,
  chunkText,
  LOCAL_EMBEDDING_DIMS,
} from '../src/index.ts'
import { newWorldInfoEntry } from '@deepseek-ai/dsh-st-lorebook'

let root = ''

async function makeCtx(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'st-vector-'))
  const ctx = new Context()
  await ctx.plugin(StVectorLocalProvider, { dataRoot: root })
  return ctx
}

afterEach(async () => {
  if (root !== '') await rm(root, { recursive: true, force: true })
  root = ''
})

/** One vectorized World Info entry with `content` set. */
function vectorizedEntry(uid: number, content: string) {
  const e = { ...newWorldInfoEntry(), uid, content }
  e.vectorized = true
  return e
}

describe('local n-gram embedder', () => {
  it('is deterministic and L2-normalized', () => {
    const embedder = new LocalNgramEmbedder()
    const a = embedder.one('the dragon guards the mountain')
    const b = embedder.one('the dragon guards the mountain')
    expect(a).toEqual(b)
    expect(a).toHaveLength(LOCAL_EMBEDDING_DIMS)
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('ranks related text above unrelated text', () => {
    const embedder = new LocalNgramEmbedder()
    const query = embedder.one('dragon fire breath')
    const related = embedder.one('the dragon breathes fire on the village')
    const unrelated = embedder.one('quarterly tax filing deadlines')
    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated))
    expect(cosineSimilarity(query, query)).toBeCloseTo(1, 5)
  })

  it('splits CJK text into per-character tokens', () => {
    const embedder = new LocalNgramEmbedder()
    const a = embedder.one('東京タワー')
    const b = embedder.one('東京スカイツリー')
    const c = embedder.one('quarterly report')
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c))
  })
})

describe('data bank chunking', () => {
  it('accumulates paragraphs up to the size limit', () => {
    const p = (n: number) => `paragraph ${n}`
    const text = [p(1), p(2), p(3)].join('\n\n')
    const chunks = chunkText(text, 'paragraph 1\nparagraph 2'.length)
    expect(chunks).toEqual(['paragraph 1\nparagraph 2', 'paragraph 3'])
  })

  it('keeps an oversized paragraph as one chunk', () => {
    const long = 'x'.repeat(50)
    expect(chunkText(long, 10)).toEqual([long])
  })
})

describe('st-vector file provider', () => {
  it('indexes only vectorized entries and retrieves them by similarity', async () => {
    const ctx = await makeCtx()
    const count = await ctx.stVector.indexWorld('Lore', {
      entries: {
        0: vectorizedEntry(0, 'The dragon breathes fire across the village square.'),
        1: { ...newWorldInfoEntry(), uid: 1, content: 'keyword entry never vectorized' },
      },
    })
    expect(count).toBe(1)
    const hits = await ctx.stVector.searchWorld('fire dragon village', { threshold: 0.1 })
    expect(hits.map((h) => h.key)).toEqual(['Lore#0'])
  })

  it('drops rows under the similarity threshold', async () => {
    const ctx = await makeCtx()
    await ctx.stVector.indexWorld('Lore', {
      entries: { 0: vectorizedEntry(0, 'The dragon breathes fire across the village square.') },
    })
    expect(await ctx.stVector.searchWorld('quarterly tax report', { threshold: 0.5 })).toEqual([])
  })

  it('persists the index across provider instances', async () => {
    const ctx = await makeCtx()
    await ctx.stVector.indexWorld('Lore', {
      entries: { 0: vectorizedEntry(0, 'The dragon breathes fire across the village square.') },
    })
    const ctx2 = new Context()
    await ctx2.plugin(StVectorLocalProvider, { dataRoot: root })
    const hits = await ctx2.stVector.searchWorld('fire dragon village', { threshold: 0.1 })
    expect(hits.map((h) => h.key)).toEqual(['Lore#0'])
  })

  it('forgetWorld removes the book from search', async () => {
    const ctx = await makeCtx()
    await ctx.stVector.indexWorld('Lore', {
      entries: { 0: vectorizedEntry(0, 'The dragon breathes fire across the village square.') },
    })
    await ctx.stVector.forgetWorld('Lore')
    expect(await ctx.stVector.searchWorld('fire dragon village', { threshold: 0.0 })).toEqual([])
  })

  it('indexes a data bank document in chunks and retrieves chunk text', async () => {
    const ctx = await makeCtx()
    const chunks = await ctx.stVector.indexFile(
      'notes',
      'The dragon lives on the eastern ridge.\n\nIt hoards silver coins and old maps.',
    )
    expect(chunks).toBe(1)
    const hits = await ctx.stVector.searchFiles('dragon ridge', { threshold: 0.1, topK: 3 })
    expect(hits[0]!.key).toBe('notes#0')
    expect(hits[0]!.text).toContain('eastern ridge')
  })

  it('lists and forgets data bank documents', async () => {
    const ctx = await makeCtx()
    await ctx.stVector.indexFile('b', 'first document about dragons')
    await ctx.stVector.indexFile('a', 'second document about taxes')
    expect(await ctx.stVector.listFiles()).toEqual(['a', 'b'])
    await ctx.stVector.forgetFile('a')
    expect(await ctx.stVector.listFiles()).toEqual(['b'])
  })

  it('fails loud when an index row predates a different-width embedder', async () => {
    const ctx = await makeCtx()
    await ctx.stVector.indexWorld('Lore', {
      entries: { 0: vectorizedEntry(0, 'The dragon breathes fire across the village square.') },
    })
    const wide = new Context()
    await wide.plugin(StVectorLocalProvider, { dataRoot: root, dims: LOCAL_EMBEDDING_DIMS + 8 })
    await expect(wide.stVector.searchWorld('fire dragon village')).rejects.toThrow(/re-index/)
  })
})

describe('openai-compatible embedder', () => {
  let server: Server
  let base = ''
  let lastAuth = ''
  let lastBody: { model?: string; input?: string[] } = {}

  afterEach(async () => {
    await new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  })

  /** Start one throwaway endpoint serving `handler` on 127.0.0.1. */
  function start(handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void): Promise<void> {
    server = createServer(handler)
    return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        base = `http://127.0.0.1:${String((server.address() as import('node:net').AddressInfo).port)}`
        resolve()
      })
    })
  }

  /** Read one request's body as JSON, then hand it to the responder. */
  function readJson(req: import('node:http').IncomingMessage, respond: (body: unknown) => void): void {
    let raw = ''
    req.on('data', (chunk: Buffer) => { raw += chunk })
    req.on('end', () => { respond(JSON.parse(raw)) })
  }

  it('posts model and inputs, maps rows by index, L2-normalizes', async () => {
    await start((req, res) => {
      lastAuth = String(req.headers.authorization ?? '')
      readJson(req, (body) => {
        lastBody = body as typeof lastBody
        res.setHeader('content-type', 'application/json')
        // Deliberately out of order: rows go back by their `index` field.
        res.end(JSON.stringify({ data: [
          { index: 1, embedding: [0, 6] },
          { index: 0, embedding: [3, 4] },
        ] }))
      })
    })
    process.env.ST_VECTOR_TEST_KEY = 'secret-token'
    try {
      const provider = new OpenAIEmbeddingProvider(
        { baseUrl: base, model: 'test-embed', apiKeyEnv: 'ST_VECTOR_TEST_KEY' },
        async (ref) => process.env[ref],
      )
      const vectors = await provider.embed(['alpha', 'beta'])
      expect(lastBody.model).toBe('test-embed')
      expect(lastBody.input).toEqual(['alpha', 'beta'])
      expect(lastAuth).toBe('Bearer secret-token')
      expect(vectors[0]).toEqual([0.6, 0.8])
      expect(vectors[1]).toEqual([0, 1])
    } finally {
      delete process.env.ST_VECTOR_TEST_KEY
    }
  })

  it('sends no bearer header without a configured key', async () => {
    await start((req, res) => {
      lastAuth = String(req.headers.authorization ?? '')
      readJson(req, () => { res.end(JSON.stringify({ data: [{ index: 0, embedding: [1] }] })) })
    })
    const provider = new OpenAIEmbeddingProvider({ baseUrl: base, model: 'm' }, async () => undefined)
    await provider.embed(['solo'])
    expect(lastAuth).toBe('')
  })

  it('fails loud on a non-200 response', async () => {
    await start((_req, res) => { res.statusCode = 500; res.end('boom') })
    const provider = new OpenAIEmbeddingProvider({ baseUrl: base, model: 'm' })
    await expect(provider.embed(['x'])).rejects.toThrow(/500/)
  })

  it('fails loud when the response drops an input row', async () => {
    await start((_req, res) => { res.end(JSON.stringify({ data: [{ index: 0, embedding: [1] }] })) })
    const provider = new OpenAIEmbeddingProvider({ baseUrl: base, model: 'm' })
    await expect(provider.embed(['a', 'b'])).rejects.toThrow(/missing rows/)
  })
})

describe('st-vector api-backed provider', () => {
  let server: Server
  let base = ''

  afterEach(async () => {
    await new Promise<void>((resolve) => { server.close(() => { resolve() }) })
  })

  /** Deterministic 3-dim test embedding: [dragon, fire, tax] token counts. */
  function mockEmbedding(text: string): number[] {
    const count = (word: string) => (text.toLowerCase().split(word).length - 1)
    return [count('dragon'), count('fire'), count('tax')]
  }

  it('indexes and retrieves through the configured endpoint', async () => {
    server = createServer((req, res) => {
      let raw = ''
      req.on('data', (chunk: Buffer) => { raw += chunk })
      req.on('end', () => {
        const body = JSON.parse(raw) as { input: string[] }
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({
          data: body.input.map((text, index) => ({ index, embedding: mockEmbedding(text) })),
        }))
      })
    })
    await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve) })
    base = `http://127.0.0.1:${String((server.address() as import('node:net').AddressInfo).port)}`

    root = await mkdtemp(join(tmpdir(), 'st-vector-api-'))
    const ctx = new Context()
    await ctx.plugin(StVectorLocalProvider, {
      dataRoot: root,
      embedding: { baseUrl: base, model: 'mock-embed' },
    })
    const count = await ctx.stVector.indexWorld('Lore', {
      entries: {
        0: vectorizedEntry(0, 'the dragon breathes fire'),
        1: vectorizedEntry(1, 'the tax office closes early'),
      },
    })
    expect(count).toBe(2)
    const hits = await ctx.stVector.searchWorld('dragon fire', { threshold: 0.35 })
    expect(hits.map((h) => h.key)).toEqual(['Lore#0'])
  })
})
