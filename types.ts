import type { ServerWebSocket } from 'bun';

export type Cell = {
    x: number;
    y: number;
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Player = {
    name: string | undefined;
    state: PlayerState;
    snake: Cell[];
    direction: Direction;
    score: number;
};

export enum PlayerState {
    ALIVE,
    DEAD,
}

export type GameState = {
    players: Map<ServerWebSocket<WebSocketData>, Player>;
    food: Cell;
};

export type WebSocketData = {
    id: string;
};

export type MessageType = 'join' | 'leave' | 'move' | 'state-update';

export type Message<T> = {
    type: MessageType;
    data: T;
};

export type JoinMessageData = {
    username: string;
};

export type MoveMessageData = {
    direction: Direction;
};

export type StateUpdateMessageData = {
    players: Array<PlayerMessageData>;
    food: Cell;
};

export type PlayerMessageData = {
    id: string;
    username: string | undefined;
    state: PlayerState;
    snake: Cell[];
    score: number;
};
