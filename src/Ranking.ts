const enum Level {
    beginner = 'beginner',
    intermediate = 'intermediate',
    expert = 'expert',
}

export interface Ranking {
    name: string;
    level: Level;
    score: number;
    timestamp: number;
}
