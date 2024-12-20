import type { Cell } from '../types/types';

export const gridSize = 20;

export function spawnFood(): Cell {
    return {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
    };
}
