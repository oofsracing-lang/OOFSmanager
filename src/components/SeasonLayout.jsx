
import { Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useChampionship } from '../context/ChampionshipContext';
import Sidebar from './Sidebar';

import multiclassBg from '../assets/multiclass_wec_bg.jpg';
import sprintBg from '../assets/gt3_sprint_wec_bg.png';

const bgCache = {};

const SeasonLayout = () => {
    const { seasonId } = useParams();
    const { currentSeasonId, changeSeason } = useChampionship();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [customBg, setCustomBg] = useState(null);

    // Synchronization: Ensure Context matches URL
    useEffect(() => {
        if (seasonId && seasonId !== currentSeasonId) {
            changeSeason(seasonId);
        }
    }, [seasonId, currentSeasonId, changeSeason]);

    // Determine Background (Firebase Storage Assets/ with bundled fallback)
    const isSprint = seasonId?.includes('sprint');
    const defaultBg = isSprint ? sprintBg : multiclassBg;

    useEffect(() => {
        const cacheKey = seasonId || (isSprint ? 'sprint' : 'endurance');
        if (bgCache[cacheKey]) {
            setCustomBg(bgCache[cacheKey]);
            return;
        }

        const candidates = isSprint
            ? [
                `Assets/${seasonId}_bg.png`,
                `Assets/${seasonId}_bg.jpg`,
                'Assets/sprint_bg.png',
                'Assets/sprint_bg.jpg',
                'Assets/gt3_sprint_wec_bg.png',
                'Assets/gt3_sprint_wec_bg.jpg',
                'assets/sprint_bg.png',
                'assets/sprint_bg.jpg'
            ]
            : [
                `Assets/${seasonId}_bg.png`,
                `Assets/${seasonId}_bg.jpg`,
                'Assets/endurance_bg.png',
                'Assets/endurance_bg.jpg',
                'Assets/multiclass_bg.png',
                'Assets/multiclass_bg.jpg',
                'Assets/multiclass_wec_bg.jpg',
                'Assets/multiclass_wec_bg.png',
                'assets/endurance_bg.png',
                'assets/endurance_bg.jpg',
                'assets/multiclass_bg.png',
                'assets/multiclass_bg.jpg'
            ];

        let active = true;
        (async () => {
            for (const path of candidates) {
                try {
                    const url = await getDownloadURL(ref(storage, path));
                    if (url && active) {
                        bgCache[cacheKey] = url;
                        setCustomBg(url);
                        return;
                    }
                } catch {
                    // Try next path
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [seasonId, isSprint]);

    const backgroundImage = customBg || defaultBg;

    const containerStyle = {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#0a0b10', // Theme dark background
        position: 'relative',
        overflowX: 'hidden'
    };

    const bgLayerStyle = {
        position: 'fixed',
        top: '-10vh',
        left: '-10vw',
        width: '120vw',
        height: '120vh',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Zoom out (scale 0.86) and move down (translateY 45px)
        // Since the div is 120% size, scaling to 0.86 makes the image content look zoomed out,
        // while the div size (120% * 0.86 = 103.2%) remains larger than the viewport, leaving ZERO black edges.
        transform: 'scale(0.86) translateY(45px)',
        zIndex: 0,
        pointerEvents: 'none'
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 10, 15, 0.85)', // Dark overlay for readability
        zIndex: 0,
        pointerEvents: 'none'
    };

    return (
        <div style={containerStyle} className={isSprint ? 'sprint-theme' : 'multiclass-theme'}>
            {/* Background Image Layer */}
            <div style={bgLayerStyle} />

            {/* Background Overlay */}
            <div style={overlayStyle} />

            {/* Mobile Menu Button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open Menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Mobile Backdrop */}
            <div
                className={`mobile-backdrop ${isSidebarOpen ? 'open' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="layout-main">
                <Outlet />
            </main>
        </div>
    );
};

export default SeasonLayout;
