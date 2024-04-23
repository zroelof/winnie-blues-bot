const capitalizeWords = (metricName) => {
    return metricName.replace(/_/g, ' ').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

function standardize(str) {
    // First escape regex special characters
    const escapedStr = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Then replace all non-alphanumeric characters with regex '.*'
    return escapedStr.replace(/[^a-z0-9\\]/gi, '.*').toLowerCase();
}

module.exports = {standardize, capitalizeWords}