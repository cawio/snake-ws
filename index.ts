import {
    PlayerState,
    type Cell,
    type Direction,
    type GameState,
    type JoinMessageData,
    type Message,
    type MessageType,
    type MoveMessageData,
    type StateUpdateMessageData,
    type WebSocketData,
} from './types';
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
        const alivePlayers = Array.from(this.state.players.values()).filter((player) => player.state === PlayerState.ALIVE);
        if (!this.timer && alivePlayers.length > 0) {
            this.timer = setInterval(() => {
                this.tick();
                this.broadcast();
            }, this.tickRate);
            console.log('Game started');
        }
    }

    stop() {
        const alivePlayers = Array.from(this.state.players.values()).filter((player) => player.state === PlayerState.ALIVE);
        if (this.timer && alivePlayers.length === 0) {
            clearInterval(this.timer);
            this.timer = null;
            this.broadcast();
            console.log('Game stopped');
        }
    }

    addPlayer(ws: ServerWebSocket<WebSocketData>) {
        this.state.players.set(ws, {
            name: undefined,
            state: PlayerState.DEAD,
            snake: [],
            direction: 'right',
            score: 0,
        });
        console.log('Player added:', ws.data.id);
        this.start();
    }

    removePlayer(ws: ServerWebSocket<WebSocketData>) {
        const player = this.state.players.get(ws);
        this.state.players.delete(ws);

        if (this.state.players.size === 0) {
            this.stop();
        }

        console.log('Player removed:', ws.data.id, player?.name);
    }

    handleMessage(ws: ServerWebSocket<WebSocketData>, message: string) {
        const playerState = this.state.players.get(ws);
        if (!playerState) {
            return;
        }
        const type = JSON.parse(message).type as MessageType;
        switch (type) {
            case 'join': {
                const input = JSON.parse(message) as Message<JoinMessageData>;
                playerState.name = input.data.username;
                playerState.state = PlayerState.ALIVE;
                playerState.snake = [{ x: 10, y: 10 }];
                game.start();
                break;
            }
            case 'leave': {
                playerState.state = PlayerState.DEAD;
                playerState.snake = [];
                game.stop();
                break;
            }
            case 'move': {
                const input = JSON.parse(message) as Message<MoveMessageData>;
                if (this.isValidDirectionChange(playerState.direction, input.data.direction)) {
                    playerState.direction = input.data.direction;
                }
                break;
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
        const playerMessages = Array.from(this.state.players.entries()).map(([ws, player]) => ({
            id: ws.data.id,
            username: player.name,
            state: player.state,
            snake: player.snake,
            score: player.score,
        }));

        this.state.players.forEach((_, ws) => {
            const message: Message<StateUpdateMessageData> = {
                type: 'state-update',
                data: {
                    players: playerMessages,
                    food: this.state.food,
                },
            };

            if (ws.readyState === 1) {
                ws.send(JSON.stringify(message));
            }
        });

        console.log(
            `Broadcasted to ${this.state.players.size} clients (Alive: ${
                Array.from(this.state.players.values()).filter((p) => p.state === PlayerState.ALIVE).length
            }, Dead: ${Array.from(this.state.players.values()).filter((p) => p.state === PlayerState.DEAD).length})`
        );
    }

    tick() {
        this.state.players
            .entries()
            .map(([_, player]) => player)
            .filter((p) => p.state === PlayerState.ALIVE)
            .forEach((player) => {
                const head = player.snake[0];
                let newHead: Cell;

                // Calculate the new head position
                switch (player.direction) {
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
                    player.snake = [{ x: 10, y: 10 }];
                    do {
                        player.snake[0] = {
                            x: Math.floor(Math.random() * 18) + 1,
                            y: Math.floor(Math.random() * 18) + 1,
                        };
                    } while (player.snake[0].x === 0 || player.snake[0].y === 0 || player.snake[0].x === 19 || player.snake[0].y === 19);
                    player.score = 0;
                    player.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)] as Direction;
                    return;
                }

                // Update snake position
                player.snake.unshift(newHead);

                if (newHead.x === this.state.food.x && newHead.y === this.state.food.y) {
                    player.score++;
                    this.state.food = this.spawnFood();
                } else {
                    player.snake.pop();
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
        message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
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
