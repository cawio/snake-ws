import type { Cell, Direction, GameState, WebSocketData } from './src/types/types';
import type { ServerWebSocket } from 'bun';

const gameTickInterval = 200;

class Game {
    size = 20;
    state: GameState;
    tickRate: number;
    timer: Timer | null = null;

    constructor(size: number, tickRate: number) {
        this.size = size;
        this.tickRate = tickRate;
        this.state = {
            players: new Map(),
            food: { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) },
        };

        console.log('Game created');
    }

    start() {
        if (!this.timer) {
            this.timer = setInterval(() => {
                this.tick();
                this.broadcast();
            }, this.tickRate);
            console.log('Game started');
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('Game stopped');
        }
    }

    addPlayer(ws: ServerWebSocket<WebSocketData>) {
        const initialPosition: Cell = { x: 10, y: 10 };
        this.state.players.set(ws, {
            snake: [initialPosition],
            direction: 'right',
            score: 0,
        });
        ws.send(JSON.stringify({ type: 'init', food: this.state.food, snake: [initialPosition] }));
        console.log('Player added:', ws.data.id);
        this.start();
    }

    removePlayer(ws: ServerWebSocket<WebSocketData>) {
        this.state.players.delete(ws);

        if (this.state.players.size === 0) {
            this.stop();
        }

        console.log('Player removed:', ws.data.id);
    }

    handleMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
        const playerState = this.state.players.get(ws);
        if (playerState && typeof message === 'string') {
            const input = JSON.parse(message) as { type: string; direction: Direction };
            if (input.type === 'direction' && this.isValidDirectionChange(playerState.direction, input.direction)) {
                playerState.direction = input.direction;
            }
        }
    }

    isValidDirectionChange(current: Direction, next: Direction) {
        const opposites: Record<Direction, Direction> = {
            up: 'down',
            down: 'up',
            left: 'right',
            right: 'left',
        };
        return next !== opposites[current];
    }

    broadcast() {
        const state = JSON.stringify({
            players: Array.from(this.state.players.entries()).map(([ws, player]) => ({
                id: ws.data.id,
                snake: player.snake,
                score: player.score,
            })),
            food: this.state.food,
        });

        this.state.players.forEach((_, ws) => {
            if (ws.readyState === 1) {
                ws.send(state);
            }
        });

        console.log('Broadcasted:', state);
    }

    tick() {
        this.state.players.forEach((playerState) => {
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
                this.state.players.size > 1 &&
                Array.from(this.state.players.values()).some((otherPlayer) => {
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

            if (newHead.x === this.state.food.x && newHead.y === this.state.food.y) {
                playerState.score++;
                this.state.food = this.spawnFood();
            } else {
                playerState.snake.pop();
            }
        });
    }

    spawnFood() {
        let food: Cell;
        do {
            food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
        } while (this.state.players.values().some((player) => player.snake.some((cell) => cell.x === food.x && cell.y === food.y)));
        return food;
    }
}

const game = new Game(20, gameTickInterval);

Bun.serve({
    fetch(req, server) {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return new Response('Client ID not found', { status: 400 });
        }

        const success = server.upgrade<WebSocketData>(req, { data: { id: id } });
        if (!success) {
            return new Response('Upgrade failed', { status: 500 });
        }
    },
    websocket: {
        open(ws: ServerWebSocket<WebSocketData>) {
            game.addPlayer(ws);
        },
        message(ws: ServerWebSocket<WebSocketData>, message) {
            if (typeof message === 'string') {
                game.handleMessage(ws, message);
            } else {
                console.error('Invalid message received:', message);
            }
        },
        close(ws, code, reason) {
            game.removePlayer(ws);
            console.log('Client disconnected:', code, reason);
        },
    },
});
