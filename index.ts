import { gameState } from './src/game/gameState';
import { updateGameState } from './src/game/gameLoop';
import { isValidDirectionChange } from './src/utils/direction';
import type { Cell, Direction, WebSocketData } from './src/types/types';
import type { ServerWebSocket } from 'bun';
import { broadcastGameState } from './src/game/broadcast';

const gameTickInterval = 200;

Bun.serve({
    fetch(req, server) {
        const url = new URL(req.url);
        const clientId = url.searchParams.get('clientId');

        if (server.upgrade(req, { data: { clientId } })) return;
        return new Response('Upgrade failed', { status: 500 });
    },
    websocket: {
        open(ws: ServerWebSocket<WebSocketData>) {
            const initialPosition: Cell = { x: 10, y: 10 };
            gameState.players.set(ws, {
                socketId: ws.data.clientId,
                snake: [initialPosition],
                direction: 'right',
                score: 0,
            });
            ws.send(JSON.stringify({ type: 'init', food: gameState.food, snake: [initialPosition] }));
        },
        message(ws: ServerWebSocket<WebSocketData>, message) {
            const playerState = gameState.players.get(ws);
            if (playerState && typeof message === 'string') {
                const input = JSON.parse(message) as { type: string; direction: Direction };
                if (input.type === 'direction' && isValidDirectionChange(playerState.direction, input.direction)) {
                    playerState.direction = input.direction;
                }
            }
        },
        close(ws) {
            gameState.players.delete(ws);
        },
    },
});

setInterval(() => {
    updateGameState();
    broadcastGameState();
}, gameTickInterval);
