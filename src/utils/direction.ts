import type { Direction } from '../types/types';

export function isValidDirectionChange(currentDirection: Direction, newDirection: Direction): boolean {
    const opposites: Record<Direction, Direction> = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left',
    };
    return newDirection !== opposites[currentDirection];
}
