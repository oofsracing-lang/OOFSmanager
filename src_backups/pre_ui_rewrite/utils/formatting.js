/**
 * Format a driver's name for privacy.
 * "John Doe" -> "John D."
 * "John" -> "John"
 * "John Doe Smith" -> "John D." (Takes first char of last chunk)
 * 
 * @param {string} name 
 * @returns {string} Formatted name
 */
export const formatDriverName = (name) => {
    if (!name) return 'Unknown';

    const parts = name.trim().split(' ');
    if (parts.length < 2) return name; // Single name, return as is

    const firstName = parts[0];
    const lastName = parts[parts.length - 1]; // Support multi-part middle names by taking the last part

    return `${firstName} ${lastName.charAt(0)}.`;
};

/**
 * Format a team name.
 * 1. "OOFS Racing" -> "Privateer"
 * 2. Matches Driver Name -> Format like driver name
 * 3. Otherwise -> Return as is
 * 
 * @param {string} teamName 
 * @param {string} driverName 
 * @returns {string}
 */
export const formatTeamName = (teamName, driverName) => {
    if (!teamName) return '-';

    const lowerTeam = teamName.toLowerCase().trim();

    // 1. Handle Team Name == Driver Name
    if (driverName && lowerTeam === driverName.toLowerCase().trim()) {
        return formatDriverName(teamName);
    }

    // 2. Return original for real teams (e.g. "Red Bull", "OOFS Racing")
    return teamName;
};
