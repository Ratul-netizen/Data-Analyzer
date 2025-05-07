// Convert data to CSV format
const convertToCSV = (data) => {
  const platforms = Object.keys(data);
  const rows = [];
  
  // Header row
  rows.push(['Platform', 'Post ID', 'Content', 'Sentiment', 'Likes', 'Comments', 'Shares', 'Reach', 'Virality Score'].join(','));
  
  // Data rows
  platforms.forEach(platform => {
    data[platform].posts.forEach(post => {
      rows.push([
        platform,
        post.post_id,
        `"${post.content.replace(/"/g, '""')}"`, // Escape quotes in content
        post.sentiment,
        post.likes,
        post.comments_count,
        post.shares,
        post.reach,
        post.virality_score
      ].join(','));
    });
  });
  
  return rows.join('\n');
};

// Export data as CSV file
export const exportAsCSV = (data) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, 'social_media_data.csv');
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = 'social_media_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Export data as JSON file
export const exportAsJSON = (data) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, 'social_media_data.json');
  } else {
    link.href = URL.createObjectURL(blob);
    link.download = 'social_media_data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}; 