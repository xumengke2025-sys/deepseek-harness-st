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
/** How the next responding character is selected. */
export type ActivationStrategy = 'sequential' | 'random' | 'weighted' | 'narrator';
/** A group member configuration. */
export interface GroupMember {
    characterId: string;
    enabled: boolean;
    /** Weight for weighted activation (0-100). */
    weight: number;
}
/** A group chat definition. */
export interface Group {
    id: GroupId;
    name: string;
    avatarPath?: string;
    members: GroupMember[];
    activationStrategy: ActivationStrategy;
    /** Allow self-responses (character responds to their own message). */
    allowSelfResponses: boolean;
    /** Favourited groups appear at the top of the list. */
    favourited: boolean;
    chatId?: string;
    createDate: string;
    modifyDate: string;
    metadata: Record<string, unknown>;
}
/** Input for creating/updating a group. */
export interface GroupInput {
    name: string;
    members?: GroupMember[];
    activationStrategy?: ActivationStrategy;
    allowSelfResponses?: boolean;
    favourited?: boolean;
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
    abstract selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string): Promise<string | undefined>;
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
    selectNextSpeaker(groupId: GroupId, lastSpeakerId?: string): Promise<string | undefined>;
}
export declare const name = "st-group-file";
export interface Config extends FileGroupConfig {
}
export default FileGroupProvider;
//# sourceMappingURL=index.d.ts.map