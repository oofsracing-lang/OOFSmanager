
import { Outlet, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import Sidebar from './Sidebar';

import multiclassBg from '../assets/multiclass_wec_bg.png';
import sprintBg from '../assets/gt3_sprint_wec_bg.png';

const SeasonLayout = () => {
    const { seasonId } = useParams();
    const { currentSeasonId, changeSeason } = useChampionship();

    // Synchronization: Ensure Context matches URL
    useEffect(() => {
        if (seasonId && seasonId !== currentSeasonId) {
            console.log(`[SeasonLayout] Syncing URL season (${seasonId}) to Context`);
            changeSeason(seasonId);
        }
    }, [seasonId, currentSeasonId, changeSeason]);

    // Determine Background
    const isSprint = seasonId?.includes('sprint');
    const backgroundImage = isSprint ? sprintBg : multiclassBg;

    const styles = {
        container: {
            display: 'flex',
            minHeight: '100vh',
            background: `url(${backgroundImage}) center/cover fixed no-repeat`,
            position: 'relative'
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 15, 0.85)', // Dark overlay for readability
            zIndex: 0
        },
        main: {
            flex: 1,
            marginLeft: '250px', // Matches Sidebar width
            padding: '2rem',
            position: 'relative',
            zIndex: 1 // Ensure content is above overlay
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.overlay} />
            <Sidebar />
            <main style={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

export default SeasonLayout;
