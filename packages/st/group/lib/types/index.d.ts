/**
 * SillyTavern group chat management service.
 *
 * Groups allow multiple characters to participate in a single conversation
 * with configurable activation strategies determining which character
 * responds next.
 *
 * @module @deepseek-ai/dsh-st-group
 */
import { Service, type Context } from '@deepseek-ai/cordis';
export type GroupId = string & {
    readonly __brand: 'GroupId';
};
/**
 * How the next responding character is selected.
 * Mirror of ST's `activation_strategy` numeric enum (0/1/2/3).
 */
export type ActivationStrategy = 0 | 1 | 2 | 3;
/**
 * Group generation handling mode.
 * Mirror of ST's `generation_mode` numeric enum (0/1/2).
 */
export type GenerationMode = 0 | 1 | 2;
/** A group member configuration (mirror of ST's member shape). */
export interface GroupMember {
    character_id: string;
    enabled: boolean;
    /** Weight for weighted activation (0-100). */
    weight: number;
}
/** A group chat definition (mirror of ST's group JSON shape). */
export interface Group {
    id: GroupId;
    name: string;
    members: GroupMember[];
    avatar_url?: string;
    allow_self_responses: boolean;
    activation_strategy: ActivationStrategy;
    generation_mode: GenerationMode;
    disabled_members: string[];
    fav: boolean;
    chat_id?: string;
    chats: string[];
    auto_mode_delay: number;
    generation_mode_join_prefix: string;
    generation_mode_join_suffix: string;
    create_date: string;
    modify_date: string;
    metadata: Record<string, unknown>;
}
/** Input for creating/updating a group. */
export interface GroupInput {
    name: string;
    members?: GroupMember[];
    avatar_url?: string;
    activation_strategy?: ActivationStrategy;
    generation_mode?: GenerationMode;
    disabled_members?: string[];
    allow_self_responses?: boolean;
    fav?: boolean;
    chat_id?: string;
    chats?: string[];
    auto_mode_delay?: number;
    generation_mode_join_prefix?: string;
    generation_mode_join_suffix?: string;
    metadata?: Record<string, unknown>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        stGroup: StGroupService;
    }
}
/**
 * Group chat management service.
 *
 * Provides CRUD for multi-character groups and the activation strategy
 * engine that determines which character responds next in a group chat.
 */
export declare abstract class StGroupService extends Service {
    constructor(ctx: Context);
    abstract list(): Promise<Group[]>;
    abstract get(id: GroupId): Promise<Group | undefined>;
    abstract create(input: GroupInput): Promise<GroupId>;
    abstract update(id: GroupId, input: Partial<GroupInput>): Promise<void>;
    abstract delete(id: GroupId): Promise<void>;
    /** Determine the next character to respond in a group, given the chat history. */
    abstract selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string, chatMessages?: Array<{
        name: string;
        is_user: boolean;
    }>): Promise<string | undefined>;
}
export interface FileGroupConfig {
    root: string;
}
declare class FileGroupProvider extends StGroupService {
    private readonly root;
    constructor(ctx: Context, config: FileGroupConfig);
    private ensureRoot;
    private groupPath;
    list(): Promise<Group[]>;
    get(id: GroupId): Promise<Group | undefined>;
    create(input: GroupInput): Promise<GroupId>;
    update(id: GroupId, input: Partial<GroupInput>): Promise<void>;
    delete(id: GroupId): Promise<void>;
    selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string, chatMessages?: Array<{
        name: string;
        is_user: boolean;
    }>): Promise<string | undefined>;
    /** Pick one member weighted by ST's talkativeness (0..1 → probability of activation). */
    private talkativenessPick;
}
export declare const name = "st-group-file";
export interface Config extends FileGroupConfig {
}
export default FileGroupProvider;
//# sourceMappingURL=index.d.ts.map