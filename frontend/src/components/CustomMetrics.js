import React from 'react';
import { Bar } from 'react-chartjs-2';

function CustomMetrics({ data }) {
  const calculateCustomMetrics = () => {
    const metrics = {};
    
    Object.entries(data).forEach(([platform, platformData]) => {
      let totalEngagement = 0;
      let totalReach = 0;
      let positiveCount = 0;
      let totalPosts = platformData.posts.length;
      
      platformData.posts.forEach(post => {
        totalEngagement += post.likes + post.comments_count + post.shares;
        totalReach += post.reach;
        if (post.sentiment === 'positive') positiveCount++;
      });
      
      metrics[platform] = {
        engagementRate: (totalEngagement / totalReach * 100).toFixed(2),
        viralityRate: (platformData.posts.filter(p => p.virality_score > 0.7).length / totalPosts * 100).toFixed(2),
        positivityRate: (positiveCount / totalPosts * 100).toFixed(2),
        avgEngagementPerPost: (totalEngagement / totalPosts).toFixed(2)
      };
    });
    
    return metrics;
  };

  const metrics = calculateCustomMetrics();
  
  const chartData = {
    labels: Object.keys(metrics).map(platform => platform.charAt(0).toUpperCase() + platform.slice(1)),
    datasets: [
      {
        label: 'Engagement Rate (%)',
        data: Object.values(metrics).map(m => m.engagementRate),
        backgroundColor: '#4caf50',
      },
      {
        label: 'Virality Rate (%)',
        data: Object.values(metrics).map(m => m.viralityRate),
        backgroundColor: '#2196f3',
      },
      {
        label: 'Positivity Rate (%)',
        data: Object.values(metrics).map(m => m.positivityRate),
        backgroundColor: '#f44336',
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Percentage (%)'
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Custom Performance Metrics by Platform'
      }
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Custom Performance Metrics</h5>
        <div className="row mb-4">
          {Object.entries(metrics).map(([platform, metric]) => (
            <div key={platform} className="col-md-4 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </h6>
                  <div className="mt-3">
                    <p>Engagement Rate: {metric.engagementRate}%</p>
                    <p>Virality Rate: {metric.viralityRate}%</p>
                    <p>Positivity Rate: {metric.positivityRate}%</p>
                    <p>Avg. Engagement/Post: {metric.avgEngagementPerPost}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

export default CustomMetrics; 