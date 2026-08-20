/**
 * SillyTavern vector storage & Data Bank — embeddings plus cosine retrieval
 * for vectorized World Info entries and user files (ST's Vector Storage and
 * Data Bank surfaces).
 *
 * The embedding seam is a provider interface with two implementations: the
 * default local provider is a deterministic offline n-gram hasher (no network,
 * no model download), and `OpenAIEmbeddingProvider` posts to an
 * OpenAI-compatible `/v1/embeddings` endpoint — selected via the `embedding`
 * config field.
 * Vectorized entries activate by similarity threshold (ST's vectorization
 * score threshold), and grouped entries with `useGroupScoring` share the
 * group's best score during the activation scan (consumed by
 * dsh-st-lorebook's `vectorHits`).
 *
 * @module @deepseek-ai/dsh-st-vector
 */
import { Service, type Context } from '@deepseek-ai/cordis'
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type { WorldInfoFile } from '@deepseek-ai/dsh-st-lorebook'
import { sanitizeFilename } from '@deepseek-ai/dsh-st-character'
import { credentialRef } from '@deepseek-ai/dsh-credentials'

// ── Embedding seam ─────────────────────────────────────────────────────────

/** Produces one L2-normalized dense vector per input text. */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}

/** LocalNgramEmbedder's fixed output width. */
export const LOCAL_EMBEDDING_DIMS = 512

/** Deterministic 32-bit string hash (FNV-1a variant). */
function hash32(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Word tokens: lowercase runs of letters/digits, CJK-bearing words split into single characters. */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (CJK.test(word)) tokens.push(...(word.match(/./gu) ?? []))
    else tokens.push(word)
  }
  return tokens
}

/**
 * Offline n-gram hashing embedder: unigrams + bigrams hashed into a fixed
 * dense vector, term-frequency weighted, L2-normalized. Deterministic and
 * dependency-free, so vector activation works with no embedding endpoint;
 * semantic quality is far below a model embedder (recorded as a known
 * approximation, same slot an API provider fills).
 */
export class LocalNgramEmbedder implements EmbeddingProvider {
  /** @param dims output vector width */
  constructor(readonly dims: number = LOCAL_EMBEDDING_DIMS) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.one(text))
  }

  /** Embed one text into a fresh normalized vector. */
  one(text: string): number[] {
    const vec = new Array<number>(this.dims).fill(0)
    const tokens = tokenize(text)
    const grams: string[] = [...tokens]
    for (let i = 0; i + 1 < tokens.length; i++) grams.push(`${tokens[i]}_${tokens[i + 1]}`)
    for (const gram of grams) vec[hash32(gram) % this.dims]! += 1
    return l2normalize(vec)
  }
}

/** Scale one dense vector to unit length; the zero vector passes through unchanged. */
function l2normalize(vec: number[]): number[] {
  let norm = 0
  for (const v of vec) norm += v * v
  norm = Math.sqrt(norm)
  return norm === 0 ? vec : vec.map((v) => v / norm)
}

/** Options for {@link OpenAIEmbeddingProvider}: an OpenAI-compatible embeddings endpoint. */
export interface OpenAIEmbeddingOptions {
  /** Endpoint base; the provider posts `<baseUrl>/embeddings`. */
  baseUrl: string
  /** Embedding model id sent as the request's `model`. */
  model: string
  /** Credential reference (environment-variable name) resolved per request; absent sends no bearer token. */
  apiKeyEnv?: string
}

/** Resolve one credential reference to its value; `undefined` when unset or the seam is absent. */
export type CredentialResolver = (ref: string) => Promise<string | undefined>

/**
 * API-backed embedder over an OpenAI-compatible `POST <baseUrl>/embeddings`:
 * batches all texts into one request, maps response rows back by their
 * `index`, and L2-normalizes so cosine stays comparable with local vectors.
 * Semantic quality far above the local n-gram hasher; needs a reachable
 * endpoint, so the local hasher stays the no-config default.
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly opts: OpenAIEmbeddingOptions,
    private readonly resolveCredential: CredentialResolver = async () => undefined,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (this.opts.apiKeyEnv !== undefined) {
      const key = await this.resolveCredential(this.opts.apiKeyEnv)
      if (key !== undefined) headers.authorization = `Bearer ${key}`
    }
    const res = await fetch(`${this.opts.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: this.opts.model, input: texts }),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200)
      throw new Error(`st-vector embeddings endpoint ${res.status}: ${detail}`)
    }
    // Model JSON is a wire boundary: index and embedding are validated here.
    const body = await res.json() as { data?: Array<{ index?: unknown; embedding?: unknown }> }
    // fill(undefined): sparse arrays would let some() skip unset slots.
    const rows: Array<number[] | undefined> = Array.from(
      { length: texts.length },
      (): number[] | undefined => undefined,
    )
    for (const item of body.data ?? []) {
      if (typeof item.index === 'number' && Array.isArray(item.embedding)) {
        rows[item.index] = l2normalize(item.embedding as number[])
      }
    }
    if (rows.some((row) => row === undefined)) {
      throw new Error('st-vector embeddings endpoint: response is missing rows for some inputs')
    }
    return rows as number[][]
  }
}

/** Cosine similarity of two L2-normalized vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) dot += a[i]! * b[i]!
  return dot
}

// ── Data Bank chunking ─────────────────────────────────────────────────────

/** ST's Data Bank chunk size ballpark: paragraph groups up to ~1k chars. */
export const DATA_BANK_CHUNK_CHARS = 1000

/**
 * Split a document into retrieval chunks: paragraphs accumulated up to
 * `size` characters; a longer paragraph stands as its own chunk. Chunk ids
 * are stable positions (`<file>#<index>`).
 */
export function chunkText(text: string, size: number = DATA_BANK_CHUNK_CHARS): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0)
  const chunks: string[] = []
  let current = ''
  for (const paragraph of paragraphs) {
    if (current.length > 0 && current.length + paragraph.length + 1 > size) {
      chunks.push(current)
      current = paragraph
    } else {
      current = current.length > 0 ? `${current}\n${paragraph}` : paragraph
    }
    if (current.length >= size) {
      chunks.push(current)
      current = ''
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

// ── Retrieval vocabulary ───────────────────────────────────────────────────

/** One scored retrieval row; `key` is `<world>#<uid>` or `<file>#<chunk>`. */
export interface VectorHit {
  key: string
  score: number
}

/** Search parameters. */
export interface VectorSearchOptions {
  /** Minimum cosine similarity (ST's vectorization score threshold). */
  threshold?: number
  /** Maximum rows returned. */
  topK?: number
}

// ── Service Definition ─────────────────────────────────────────────────────

declare module '@deepseek-ai/cordis' {
  interface Context {
    stVector: StVectorService
  }
}

/**
 * SillyTavern vector storage: embeddings for vectorized World Info entries
 * and Data Bank files, with cosine retrieval over a persisted index.
 */
export abstract class StVectorService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'stVector')
  }

  /** Embed texts through the configured provider. */
  abstract embed(texts: string[]): Promise<number[][]>

  /** (Re)index one World Info book's `vectorized` entries; returns the count. */
  abstract indexWorld(name: string, file: WorldInfoFile): Promise<number>

  /** Drop one book's entry index. */
  abstract forgetWorld(name: string): Promise<void>

  /** Retrieve similar vectorized entries as `<world>#<uid>` hits. */
  abstract searchWorld(query: string, options?: VectorSearchOptions): Promise<VectorHit[]>

  /** (Re)index one Data Bank document (chunked); returns the chunk count. */
  abstract indexFile(name: string, text: string): Promise<number>

  /** Drop one Data Bank document index. */
  abstract forgetFile(name: string): Promise<void>

  /** List indexed Data Bank document names. */
  abstract listFiles(): Promise<string[]>

  /** Retrieve similar document chunks as `<file>#<chunk>` hits with their text. */
  abstract searchFiles(
    query: string,
    options?: VectorSearchOptions,
  ): Promise<Array<VectorHit & { text: string }>>

  /** Data Bank root directory (ST layout: `<dataRoot>/user/files`). */
  abstract readonly filesDir: string
}

// ── Local provider ─────────────────────────────────────────────────────────

export interface Config {
  /** SillyTavern data root (vectors persist under `<dataRoot>/vectors/`). */
  dataRoot: string
  /** Embedding width of the local n-gram embedder. */
  dims?: number
  /**
   * API-backed embedder (OpenAI-compatible `POST <baseUrl>/embeddings`);
   * omitted uses the offline n-gram hasher. Switching providers changes
   * vector dimensions — re-index books and Data Bank files after switching.
   */
  embedding?: { baseUrl: string; model: string; apiKeyEnv?: string }
}

/** One persisted index row: key → vector, plus the chunk text for Data Bank rows. */
interface StoredRow {
  vector: number[]
  text?: string
}

/**
 * Local file-backed vector store: in-memory cosine search over vectors
 * persisted as JSON under `<dataRoot>/vectors/` (one file per world, one per
 * Data Bank document), embeddings from the configured {@link EmbeddingProvider}
 * (the offline n-gram hasher by default).
 */
class StVectorLocalProvider extends StVectorService {
  readonly filesDir: string
  private readonly vectorsDir: string
  private readonly embedder: EmbeddingProvider
  private readonly worlds = new Map<string, Map<string, StoredRow>>()
  private readonly bank = new Map<string, Map<string, StoredRow>>()

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.filesDir = resolve(config.dataRoot, 'user/files')
    this.vectorsDir = resolve(config.dataRoot, 'vectors')
    this.embedder = config.embedding === undefined
      ? new LocalNgramEmbedder(config.dims)
      : new OpenAIEmbeddingProvider(config.embedding, async (ref) => {
          // Per-operation resolution through the optional credential seam, the
          // raw environment as fallback when no provider is mounted.
          const credentials = ctx.get('credentials')
          if (credentials !== undefined) {
            const hit = await credentials.resolve(credentialRef(ref))
            if (hit !== undefined) return hit.value
          }
          return process.env[ref]
        })
  }

  private async loadIndex(scope: 'worlds' | 'bank', stem: string): Promise<Map<string, StoredRow>> {
    const path = join(this.vectorsDir, scope, `${sanitizeFilename(stem)}.json`)
    const map = new Map<string, StoredRow>()
    if (existsSync(path)) {
      const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, StoredRow>
      for (const [key, row] of Object.entries(parsed)) map.set(key, row)
    }
    return map
  }

  private async saveIndex(scope: 'worlds' | 'bank', stem: string, map: Map<string, StoredRow>): Promise<void> {
    const dir = join(this.vectorsDir, scope)
    await mkdir(dir, { recursive: true })
    const record: Record<string, StoredRow> = {}
    for (const [key, row] of map) record[key] = row
    await writeFile(join(dir, `${sanitizeFilename(stem)}.json`), JSON.stringify(record), 'utf8')
  }

  private async dropIndex(scope: 'worlds' | 'bank', stem: string): Promise<void> {
    const path = join(this.vectorsDir, scope, `${sanitizeFilename(stem)}.json`)
    if (existsSync(path)) await unlink(path)
  }

  /** Cosine top-k over one namespace of per-stem row maps; rows below `threshold` drop. */
  private search(
    queryVector: number[],
    namespace: Iterable<Map<string, StoredRow>>,
    threshold: number,
    topK: number,
  ): Array<VectorHit & { text?: string }> {
    const hits: Array<VectorHit & { text?: string }> = []
    for (const rows of namespace) {
      for (const [key, row] of rows) {
        // Mixing providers would silently truncate to the shorter vector;
        // a dimension clash means the index predates the current embedder.
        if (row.vector.length !== queryVector.length) {
          throw new Error(
            `st-vector: index row ${key} has ${row.vector.length} dims but the query has ${queryVector.length}; `
            + 're-index after switching the embedding provider',
          )
        }
        const score = cosineSimilarity(queryVector, row.vector)
        if (score < threshold) continue
        const hit: VectorHit & { text?: string } = { key, score }
        if (row.text !== undefined) hit.text = row.text
        hits.push(hit)
      }
    }
    hits.sort((a, b) => b.score - a.score)
    return hits.slice(0, topK)
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.embedder.embed(texts)
  }

  /** Embed one text through the configured provider (single-item convenience over the batch seam). */
  private async one(text: string): Promise<number[]> {
    return (await this.embedder.embed([text]))[0]!
  }

  async indexWorld(name: string, file: WorldInfoFile): Promise<number> {
    const items: Array<[key: string, content: string]> = []
    for (const entry of Object.values(file.entries)) {
      if (!entry.vectorized || entry.disable) continue
      const content = String(entry.content ?? '')
      if (content.trim().length === 0) continue
      items.push([`${name}#${entry.uid}`, content])
    }
    const vectors = await this.embedder.embed(items.map(([, content]) => content))
    const rows = new Map<string, StoredRow>()
    for (const [i, [key]] of items.entries()) rows.set(key, { vector: vectors[i]! })
    this.worlds.set(name, rows)
    await this.saveIndex('worlds', name, rows)
    return rows.size
  }

  async forgetWorld(name: string): Promise<void> {
    this.worlds.delete(name)
    await this.dropIndex('worlds', name)
  }

  async searchWorld(query: string, options: VectorSearchOptions = {}): Promise<VectorHit[]> {
    const queryVector = await this.one(query)
    // World indexes load lazily: a scan covers every persisted book, matching
    // ST's global Vector Storage namespace.
    for (const stem of await this.indexStems('worlds')) {
      if (!this.worlds.has(stem)) this.worlds.set(stem, await this.loadIndex('worlds', stem))
    }
    const hits = this.search(queryVector, this.worlds.values(), options.threshold ?? 0.35, options.topK ?? Number.POSITIVE_INFINITY)
    return hits.map(({ key, score }) => ({ key, score }))
  }

  async indexFile(name: string, text: string): Promise<number> {
    const chunks = chunkText(text)
    const vectors = await this.embedder.embed(chunks)
    const rows = new Map<string, StoredRow>()
    for (const [i, chunk] of chunks.entries()) {
      rows.set(`${name}#${i}`, { vector: vectors[i]!, text: chunk })
    }
    this.bank.set(name, rows)
    await this.saveIndex('bank', name, rows)
    return rows.size
  }

  async forgetFile(name: string): Promise<void> {
    this.bank.delete(name)
    await this.dropIndex('bank', name)
  }

  async listFiles(): Promise<string[]> {
    const dir = join(this.vectorsDir, 'bank')
    if (!existsSync(dir)) return []
    return (await readdir(dir))
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort((a, b) => a.localeCompare(b))
  }

  async searchFiles(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<Array<VectorHit & { text: string }>> {
    const queryVector = await this.one(query)
    for (const stem of await this.indexStems('bank')) {
      if (!this.bank.has(stem)) this.bank.set(stem, await this.loadIndex('bank', stem))
    }
    const hits = this.search(queryVector, this.bank.values(), options.threshold ?? 0.05, options.topK ?? 5)
    return hits.filter((h): h is VectorHit & { text: string } => typeof h.text === 'string')
  }

  /** Persisted index stems in one scope, creating nothing. */
  private async indexStems(scope: 'worlds' | 'bank'): Promise<string[]> {
    const dir = join(this.vectorsDir, scope)
    if (!existsSync(dir)) return []
    return (await readdir(dir))
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
  }
}

// ── Plugin entry ───────────────────────────────────────────────────────────

export const name = 'st-vector-local'

export default StVectorLocalProvider
