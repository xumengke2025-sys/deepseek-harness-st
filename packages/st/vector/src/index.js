/**
 * SillyTavern vector storage & Data Bank — embeddings plus cosine retrieval
 * for vectorized World Info entries and user files (ST's Vector Storage and
 * Data Bank surfaces).
 *
 * The embedding seam is a provider interface: the default local provider is a
 * deterministic offline n-gram hasher (no network, no model download), the
 * same contract an API-backed embedder (OpenAI-compatible /v1/embeddings)
 * would implement — swap via config once an embedding endpoint is reachable.
 * Vectorized entries activate by similarity threshold (ST's vectorization
 * score threshold), and grouped entries with `useGroupScoring` share the
 * group's best score during the activation scan (consumed by
 * dsh-st-lorebook's `vectorHits`).
 *
 * @module @deepseek-ai/dsh-st-vector
 */
import { Service } from '@deepseek-ai/cordis';
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { sanitizeFilename } from '@deepseek-ai/dsh-st-character';
/** LocalNgramEmbedder's fixed output width. */
export const LOCAL_EMBEDDING_DIMS = 512;
/** Deterministic 32-bit string hash (FNV-1a variant). */
function hash32(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}
/** Word tokens: lowercase runs of letters/digits, CJK-bearing words split into single characters. */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
function tokenize(text) {
    const tokens = [];
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
        if (CJK.test(word))
            tokens.push(...(word.match(/./gu) ?? []));
        else
            tokens.push(word);
    }
    return tokens;
}
/**
 * Offline n-gram hashing embedder: unigrams + bigrams hashed into a fixed
 * dense vector, term-frequency weighted, L2-normalized. Deterministic and
 * dependency-free, so vector activation works with no embedding endpoint;
 * semantic quality is far below a model embedder (recorded as a known
 * approximation, same slot an API provider fills).
 */
export class LocalNgramEmbedder {
    dims;
    /** @param dims output vector width */
    constructor(dims = LOCAL_EMBEDDING_DIMS) {
        this.dims = dims;
    }
    async embed(texts) {
        return texts.map((text) => this.one(text));
    }
    /** Embed one text into a fresh normalized vector. */
    one(text) {
        const vec = new Array(this.dims).fill(0);
        const tokens = tokenize(text);
        const grams = [...tokens];
        for (let i = 0; i + 1 < tokens.length; i++)
            grams.push(`${tokens[i]}_${tokens[i + 1]}`);
        for (const gram of grams)
            vec[hash32(gram) % this.dims] += 1;
        let norm = 0;
        for (const v of vec)
            norm += v * v;
        norm = Math.sqrt(norm);
        return norm === 0 ? vec : vec.map((v) => v / norm);
    }
}
/** Cosine similarity of two L2-normalized vectors. */
export function cosineSimilarity(a, b) {
    let dot = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++)
        dot += a[i] * b[i];
    return dot;
}
// ── Data Bank chunking ─────────────────────────────────────────────────────
/** ST's Data Bank chunk size ballpark: paragraph groups up to ~1k chars. */
export const DATA_BANK_CHUNK_CHARS = 1000;
/**
 * Split a document into retrieval chunks: paragraphs accumulated up to
 * `size` characters; a longer paragraph stands as its own chunk. Chunk ids
 * are stable positions (`<file>#<index>`).
 */
export function chunkText(text, size = DATA_BANK_CHUNK_CHARS) {
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
    const chunks = [];
    let current = '';
    for (const paragraph of paragraphs) {
        if (current.length > 0 && current.length + paragraph.length + 1 > size) {
            chunks.push(current);
            current = paragraph;
        }
        else {
            current = current.length > 0 ? `${current}\n${paragraph}` : paragraph;
        }
        if (current.length >= size) {
            chunks.push(current);
            current = '';
        }
    }
    if (current.length > 0)
        chunks.push(current);
    return chunks;
}
// ── Service Definition ─────────────────────────────────────────────────────
/**
 * SillyTavern vector storage: embeddings for vectorized World Info entries
 * and Data Bank files, with cosine retrieval over a persisted index.
 */
export class StVectorService extends Service {
    constructor(ctx) {
        super(ctx, 'stVector');
    }
}
/**
 * Local file-backed vector store: in-memory cosine search over vectors
 * persisted as JSON under `<dataRoot>/vectors/` (one file per world, one per
 * Data Bank document), embeddings from {@link LocalNgramEmbedder}.
 */
class StVectorLocalProvider extends StVectorService {
    filesDir;
    vectorsDir;
    embedder;
    worlds = new Map();
    bank = new Map();
    constructor(ctx, config) {
        super(ctx);
        this.filesDir = resolve(config.dataRoot, 'user/files');
        this.vectorsDir = resolve(config.dataRoot, 'vectors');
        this.embedder = new LocalNgramEmbedder(config.dims);
    }
    async loadIndex(scope, stem) {
        const path = join(this.vectorsDir, scope, `${sanitizeFilename(stem)}.json`);
        const map = new Map();
        if (existsSync(path)) {
            const parsed = JSON.parse(await readFile(path, 'utf8'));
            for (const [key, row] of Object.entries(parsed))
                map.set(key, row);
        }
        return map;
    }
    async saveIndex(scope, stem, map) {
        const dir = join(this.vectorsDir, scope);
        await mkdir(dir, { recursive: true });
        const record = {};
        for (const [key, row] of map)
            record[key] = row;
        await writeFile(join(dir, `${sanitizeFilename(stem)}.json`), JSON.stringify(record), 'utf8');
    }
    async dropIndex(scope, stem) {
        const path = join(this.vectorsDir, scope, `${sanitizeFilename(stem)}.json`);
        if (existsSync(path))
            await unlink(path);
    }
    /** Cosine top-k over one namespace of per-stem row maps; rows below `threshold` drop. */
    search(queryVector, namespace, threshold, topK) {
        const hits = [];
        for (const rows of namespace) {
            for (const [key, row] of rows) {
                const score = cosineSimilarity(queryVector, row.vector);
                if (score < threshold)
                    continue;
                const hit = { key, score };
                if (row.text !== undefined)
                    hit.text = row.text;
                hits.push(hit);
            }
        }
        hits.sort((a, b) => b.score - a.score);
        return hits.slice(0, topK);
    }
    async embed(texts) {
        return this.embedder.embed(texts);
    }
    async indexWorld(name, file) {
        const rows = new Map();
        for (const entry of Object.values(file.entries)) {
            if (!entry.vectorized || entry.disable)
                continue;
            const content = String(entry.content ?? '');
            if (content.trim().length === 0)
                continue;
            rows.set(`${name}#${entry.uid}`, { vector: this.embedder.one(content) });
        }
        this.worlds.set(name, rows);
        await this.saveIndex('worlds', name, rows);
        return rows.size;
    }
    async forgetWorld(name) {
        this.worlds.delete(name);
        await this.dropIndex('worlds', name);
    }
    async searchWorld(query, options = {}) {
        const queryVector = this.embedder.one(query);
        // World indexes load lazily: a scan covers every persisted book, matching
        // ST's global Vector Storage namespace.
        for (const stem of await this.indexStems('worlds')) {
            if (!this.worlds.has(stem))
                this.worlds.set(stem, await this.loadIndex('worlds', stem));
        }
        const hits = this.search(queryVector, this.worlds.values(), options.threshold ?? 0.35, options.topK ?? Number.POSITIVE_INFINITY);
        return hits.map(({ key, score }) => ({ key, score }));
    }
    async indexFile(name, text) {
        const chunks = chunkText(text);
        const rows = new Map();
        for (const [i, chunk] of chunks.entries()) {
            rows.set(`${name}#${i}`, { vector: this.embedder.one(chunk), text: chunk });
        }
        this.bank.set(name, rows);
        await this.saveIndex('bank', name, rows);
        return rows.size;
    }
    async forgetFile(name) {
        this.bank.delete(name);
        await this.dropIndex('bank', name);
    }
    async listFiles() {
        const dir = join(this.vectorsDir, 'bank');
        if (!existsSync(dir))
            return [];
        return (await readdir(dir))
            .filter((f) => f.toLowerCase().endsWith('.json'))
            .map((f) => f.slice(0, -'.json'.length))
            .sort((a, b) => a.localeCompare(b));
    }
    async searchFiles(query, options = {}) {
        const queryVector = this.embedder.one(query);
        for (const stem of await this.indexStems('bank')) {
            if (!this.bank.has(stem))
                this.bank.set(stem, await this.loadIndex('bank', stem));
        }
        const hits = this.search(queryVector, this.bank.values(), options.threshold ?? 0.05, options.topK ?? 5);
        return hits.filter((h) => typeof h.text === 'string');
    }
    /** Persisted index stems in one scope, creating nothing. */
    async indexStems(scope) {
        const dir = join(this.vectorsDir, scope);
        if (!existsSync(dir))
            return [];
        return (await readdir(dir))
            .filter((f) => f.toLowerCase().endsWith('.json'))
            .map((f) => f.slice(0, -'.json'.length));
    }
}
// ── Plugin entry ───────────────────────────────────────────────────────────
export const name = 'st-vector-local';
export default StVectorLocalProvider;
//# sourceMappingURL=index.js.map