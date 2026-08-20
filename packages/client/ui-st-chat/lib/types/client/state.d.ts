/**
 * The ST surface's cross-panel selection state: one observable source plus its
 * action set, created per plugin fiber in apply and handed to every ST slot
 * component through the {@link StFace} inject.
 */
import type { StUiActions, StUiSource } from './contract.ts';
export declare function createStUiState(): {
    source: StUiSource;
    actions: StUiActions;
};
//# sourceMappingURL=state.d.ts.map