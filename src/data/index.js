import season2 from './seasons/season2.json';
import season3 from './seasons/season3.json';

export const seasons = {
    2: season2,
    3: season3
};

// Default expert for backward compatibility if needed, though we will switch to using the map
export const latestSeason = season2;
