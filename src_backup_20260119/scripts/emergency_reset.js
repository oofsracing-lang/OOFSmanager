
(function () {
    try {
        console.log("Attempting to clear corrupted SIM Racing Manager data...");
        const keys = Object.keys(localStorage);
        let cleared = 0;
        keys.forEach(k => {
            if (k.startsWith('srm_')) {
                localStorage.removeItem(k);
                cleared++;
            }
        });
        console.log(`Cleared ${cleared} SRM keys from localStorage.`);
        alert(`Emergency Reset Complete.\nCleared ${cleared} data keys.\nPlease refresh the page now.`);
    } catch (e) {
        console.error("Failed to clear storage", e);
        alert("Failed to clear storage: " + e.message);
    }
})();
