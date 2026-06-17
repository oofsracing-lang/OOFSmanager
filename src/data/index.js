import season2 from './seasons/season2.json';
import season3_multiclass from './seasons/season3_multiclass.json';
import season3_sprint from './seasons/season3_sprint.json';
import season4_multiclass from './seasons/season4_multiclass.json';
import season4_sprint from './seasons/season4_sprint.json';
import season5_multiclass from './seasons/season5_multiclass.json';
import season5_sprint from './seasons/season5_sprint.json';

export const seasons = {
    "2": season2,
    "3": season3_multiclass,
    "s3-sprint": season3_sprint,
    "s4-multi": season4_multiclass,
    "s4-sprint": season4_sprint,
    "s5-multi": season5_multiclass,
    "s5-sprint": season5_sprint
};

// Default export for backward compatibility if needed, though we will switch to using the map
export const latestSeason = season5_multiclass;
