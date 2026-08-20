/**
 * Browser HTTP client over the st-api route table (`/api/st/...`), same-origin
 * with the host webServer. Route names and body shapes mirror the server's
 * route table; SSE generation is parsed from the raw stream.
 */
import type { StApi } from './contract.ts';
/** The shared client instance; pure functions over fetch, no plugin state. */
export declare const stApi: StApi;
//# sourceMappingURL=api.d.ts.map