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
import { Service, type Context } from '@deepseek-ai/cordis';
import type { WorldInfoFile } from '@deepseek-ai/dsh-st-lorebook';
/** Produces one L2-normalized dense vector per input text. */
export interface EmbeddingProvider {
    embed(texts: string[]): Promise<number[][]>;
}
/** LocalNgramEmbedder's fixed output width. */
export declare const LOCAL_EMBEDDING_DIMS = 512;
/**
 * Offline n-gram hashing embedder: unigrams + bigrams hashed into a fixed
 * dense vector, term-frequency weighted, L2-normalized. Deterministic and
 * dependency-free, so vector activation works with no embedding endpoint;
 * semantic quality is far below a model embedder (recorded as a known
 * approximation, same slot an API provider fills).
 */
export declare class LocalNgramEmbedder implements EmbeddingProvider {
    readonly dims: number;
    /** @param dims output vector width */
    constructor(dims?: number);
    embed(texts: string[]): Promise<number[][]>;
    /** Embed one text into a fresh normalized vector. */
    one(text: string): number[];
}
/** Options for {@link OpenAIEmbeddingProvider}: an OpenAI-compatible embeddings endpoint. */
export interface OpenAIEmbeddingOptions {
    /** Endpoint base; the provider posts `<baseUrl>/embeddings`. */
    baseUrl: string;
    /** Embedding model id sent as the request's `model`. */
    model: string;
    /** Credential reference (environment-variable name) resolved per request; absent sends no bearer token. */
    apiKeyEnv?: string;
}
/** Resolve one credential reference to its value; `undefined` when unset or the seam is absent. */
export type CredentialResolver = (ref: string) => Promise<string | undefined>;
/**
 * API-backed embedder over an OpenAI-compatible `POST <baseUrl>/embeddings`:
 * batches all texts into one request, maps response rows back by their
 * `index`, and L2-normalizes so cosine stays comparable with local vectors.
 * Semantic quality far above the local n-gram hasher; needs a reachable
 * endpoint, so the local hasher stays the no-config default.
 */
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private readonly opts;
    private readonly resolveCredential;
    constructor(opts: OpenAIEmbeddingOptions, resolveCredential?: CredentialResolver);
    embed(texts: string[]): Promise<number[][]>;
}
/** Cosine similarity of two L2-normalized vectors. */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/** ST's Data Bank chunk size ballpark: paragraph groups up to ~1k chars. */
export declare const DATA_BANK_CHUNK_CHARS = 1000;
/**
 * Split a document into retrieval chunks: paragraphs accumulated up to
 * `size` characters; a longer paragraph stands as its own chunk. Chunk ids
 * are stable positions (`<file>#<index>`).
 */
export declare function chunkText(text: string, size?: number): string[];
/** One scored retrieval row; `key` is `<world>#<uid>` or `<file>#<chunk>`. */
export interface VectorHit {
    key: string;
    score: number;
}
/** Search parameters. */
export interface VectorSearchOptions {
    /** Minimum cosine similarity (ST's vectorization score threshold). */
    threshold?: number;
    /** Maximum rows returned. */
    topK?: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        stVector: StVectorService;
    }
}
/**
 * SillyTavern vector storage: embeddings for vectorized World Info entries
 * and Data Bank files, with cosine retrieval over a persisted index.
 */
export declare abstract class StVectorService extends Service {
    constructor(ctx: Context);
    /** Embed texts through the configured provider. */
    abstract embed(texts: string[]): Promise<number[][]>;
    /** (Re)index one World Info book's `vectorized` entries; returns the count. */
    abstract indexWorld(name: string, file: WorldInfoFile): Promise<number>;
    /** Drop one book's entry index. */
    abstract forgetWorld(name: string): Promise<void>;
    /** Retrieve similar vectorized entries as `<world>#<uid>` hits. */
    abstract searchWorld(query: string, options?: VectorSearchOptions): Promise<VectorHit[]>;
    /** (Re)index one Data Bank document (chunked); returns the chunk count. */
    abstract indexFile(name: string, text: string): Promise<number>;
    /** Drop one Data Bank document index. */
    abstract forgetFile(name: string): Promise<void>;
    /** List indexed Data Bank document names. */
    abstract listFiles(): Promise<string[]>;
    /** Retrieve similar document chunks as `<file>#<chunk>` hits with their text. */
    abstract searchFiles(query: string, options?: VectorSearchOptions): Promise<Array<VectorHit & {
        text: string;
    }>>;
    /** Data Bank root directory (ST layout: `<dataRoot>/user/files`). */
    abstract readonly filesDir: string;
}
export interface Config {
    /** SillyTavern data root (vectors persist under `<dataRoot>/vectors/`). */
    dataRoot: string;
    /** Embedding width of the local n-gram embedder. */
    dims?: number;
    /**
     * API-backed embedder (OpenAI-compatible `POST <baseUrl>/embeddings`);
     * omitted uses the offline n-gram hasher. Switching providers changes
     * vector dimensions — re-index books and Data Bank files after switching.
     */
    embedding?: {
        baseUrl: string;
        model: string;
        apiKeyEnv?: string;
    };
}
/**
 * Local file-backed vector store: in-memory cosine search over vectors
 * persisted as JSON under `<dataRoot>/vectors/` (one file per world, one per
 * Data Bank document), embeddings from the configured {@link EmbeddingProvider}
 * (the offline n-gram hasher by default).
 */
declare class StVectorLocalProvider extends StVectorService {
    readonly filesDir: string;
    private readonly vectorsDir;
    private readonly embedder;
    private readonly worlds;
    private readonly bank;
    constructor(ctx: Context, config: Config);
    private loadIndex;
    private saveIndex;
    private dropIndex;
    /** Cosine top-k over one namespace of per-stem row maps; rows below `threshold` drop. */
    private search;
    embed(texts: string[]): Promise<number[][]>;
    /** Embed one text through the configured provider (single-item convenience over the batch seam). */
    private one;
    indexWorld(name: string, file: WorldInfoFile): Promise<number>;
    forgetWorld(name: string): Promise<void>;
    searchWorld(query: string, options?: VectorSearchOptions): Promise<VectorHit[]>;
    indexFile(name: string, text: string): Promise<number>;
    forgetFile(name: string): Promise<void>;
    listFiles(): Promise<string[]>;
    searchFiles(query: string, options?: VectorSearchOptions): Promise<Array<VectorHit & {
        text: string;
    }>>;
    /** Persisted index stems in one scope, creating nothing. */
    private indexStems;
}
export declare const name = "st-vector-local";
export default StVectorLocalProvider;
//# sourceMappingURL=index.d.ts.map