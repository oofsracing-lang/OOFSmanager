import season2 from './seasons/season2.json';
import season3_multiclass from './seasons/season3_multiclass.json';
import season3_sprint from './seasons/season3_sprint.json';

export const seasons = {
    "2": season2,
    "s3-mc": season3_multiclass,
    "s3-sprint": season3_sprint
};

// Default expert for backward compatibility if needed, though we will switch to using the map
export const latestSeason = season3_multiclass;
