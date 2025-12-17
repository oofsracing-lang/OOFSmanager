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
