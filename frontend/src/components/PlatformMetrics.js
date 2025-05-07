import React from 'react';
import { Bar } from 'react-chartjs-2';

function PlatformMetrics({ data }) {
  const calculatePlatformMetrics = () => {
    const metrics = {};
    
    Object.entries(data).forEach(([platform, platformData]) => {
      let totalEngagement = 0;
      let totalReach = 0;
      let avgViralityScore = 0;
      
      platformData.posts.forEach(post => {
        totalEngagement += post.likes + post.comments_count + post.shares;
        totalReach += post.reach;
        avgViralityScore += post.virality_score;
      });
      
      metrics[platform] = {
        totalEngagement,
        totalReach,
        avgViralityScore: (avgViralityScore / platformData.posts.length).toFixed(2),
        postCount: platformData.posts.length
      };
    });
    
    return metrics;
  };

  const metrics = calculatePlatformMetrics();
  
  const chartData = {
    labels: Object.keys(metrics).map(platform => platform.charAt(0).toUpperCase() + platform.slice(1)),
    datasets: [
      {
        label: 'Engagement Rate (%)',
        data: Object.values(metrics).map(m => ((m.totalEngagement / m.totalReach) * 100).toFixed(2)),
        backgroundColor: '#4caf50',
      },
      {
        label: 'Average Virality Score',
        data: Object.values(metrics).map(m => m.avgViralityScore),
        backgroundColor: '#2196f3',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Platform Performance Metrics'
      }
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Platform Performance</h5>
        <div className="row mb-4">
          {Object.entries(metrics).map(([platform, metric]) => (
            <div key={platform} className="col-md-4 mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </h6>
                  <div className="mt-3">
                    <p>Posts: {metric.postCount}</p>
                    <p>Total Engagement: {metric.totalEngagement.toLocaleString()}</p>
                    <p>Total Reach: {metric.totalReach.toLocaleString()}</p>
                    <p>Avg. Virality Score: {metric.avgViralityScore}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

export default PlatformMetrics; 