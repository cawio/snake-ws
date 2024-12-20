import type { ServerWebSocket } from 'bun';

export type Cell = {
    x: number;
    y: number;
};

export type Direction = 'up' | 'down' | 'left' | 'right';

export type PlayerState = {
    socketId: string;
    snake: Cell[];
    direction: Direction;
    score: number;
};

export type GameState = {
    players: Map<ServerWebSocket<WebSocketData>, PlayerState>;
    food: Cell;
};

export type WebSocketData = {
    clientId: string;
};
