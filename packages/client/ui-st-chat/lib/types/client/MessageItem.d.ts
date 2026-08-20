import type { StWireMessage } from './contract.ts';
/** Owner share passed by the chat panel to each message row. */
export interface MessageItemProps {
    message: StWireMessage;
    /** Display text after regex scripts; omitted renders the stored text. Editing always edits the stored text. */
    displayMes?: string | undefined;
    /** Character avatar image URL for non-user rows. */
    avatarUrl: string;
    /** Switch this row to swipe alternate `index` (ST: arrows move swipe_id). */
    onSwipe(index: number): void;
    /** Request a fresh alternate past the last swipe (ST: swipe-right at the end). */
    onNewSwipe(): void;
    onEdit(text: string): void;
    onDelete(): void;
    /** Delete the current swipe variant (keeping the message); omitted disables the button. */
    onDeleteSwipe?(): void;
    /** Branch the chat at this row into a new chat file (ST: "Branch from here"); omitted hides the button. */
    onBranch?(): void;
    /** Edit lock while a generation streams. */
    locked: boolean;
}
/**
 * One message row with edit-in-place and swipe controls.
 * @param props - row owner share.
 */
export declare function MessageItem(props: MessageItemProps): import("react").JSX.Element;
//# sourceMappingURL=MessageItem.d.ts.map