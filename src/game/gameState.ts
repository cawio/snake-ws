import type { GameState } from '../types/types';
import { spawnFood } from '../utils/food';

export const gameState: GameState = {
    players: new Map(),
    food: spawnFood(),
};
