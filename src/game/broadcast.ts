import { gameState } from './gameState';

export function broadcastGameState(): void {
    const state = JSON.stringify({
        players: Array.from(gameState.players.values()).map((player) => ({
            socketId: player.socketId,
            snake: player.snake,
            score: player.score,
        })),
        food: gameState.food,
    });

    gameState.players.forEach((_, ws) => {
        if (ws.readyState === 1) {
            ws.send(state);
        }
    });
}
