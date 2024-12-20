import { gameState } from './gameState';
import { spawnFood } from '../utils/food';
import type { Cell, Direction } from '../types/types';

export function updateGameState(): void {
    gameState.players.forEach((playerState) => {
        const head = playerState.snake[0];
        let newHead: Cell;

        // Calculate the new head position
        switch (playerState.direction) {
            case 'up':
                newHead = { x: head.x - 1, y: head.y };
                break;
            case 'down':
                newHead = { x: head.x + 1, y: head.y };
                break;
            case 'left':
                newHead = { x: head.x, y: head.y - 1 };
                break;
            case 'right':
                newHead = { x: head.x, y: head.y + 1 };
                break;
        }

        // Check collisions
        const collisionWithPlayer =
            gameState.players.size > 1 &&
            Array.from(gameState.players.values()).some((otherPlayer) => {
                return otherPlayer.snake.some((cell) => cell.x === newHead.x && cell.y === newHead.y);
            });

        const outOfBounds = newHead.x < 0 || newHead.y < 0 || newHead.x >= 20 || newHead.y >= 20;
        if (collisionWithPlayer || outOfBounds) {
            playerState.snake = [{ x: 10, y: 10 }];
            do {
                playerState.snake[0] = {
                    x: Math.floor(Math.random() * 18) + 1,
                    y: Math.floor(Math.random() * 18) + 1,
                };
            } while (playerState.snake[0].x === 0 || playerState.snake[0].y === 0 || playerState.snake[0].x === 19 || playerState.snake[0].y === 19);
            playerState.score = 0;
            playerState.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)] as Direction;
            return;
        }

        // Update snake position
        playerState.snake.unshift(newHead);

        if (newHead.x === gameState.food.x && newHead.y === gameState.food.y) {
            playerState.score++;
            gameState.food = spawnFood();
        } else {
            playerState.snake.pop();
        }
    });
}
