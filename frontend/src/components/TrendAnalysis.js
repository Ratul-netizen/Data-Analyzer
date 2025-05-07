import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function TrendAnalysis({ data, startDate, endDate }) {
  const calculateTrends = () => {
    const trends = {
      engagement: {},
      sentiment: {},
      virality: {}
    };

    // Initialize data structure for each day in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
      trends.engagement[dateStr] = 0;
      trends.sentiment[dateStr] = 0;
      trends.virality[dateStr] = 0;
    }

    // Calculate daily metrics
    Object.values(data).forEach(platform => {
      platform.posts.forEach(post => {
        const postDate = new Date(post.timestamp).toISOString().split('T')[0];
        if (trends.engagement[postDate] !== undefined) {
          trends.engagement[postDate] += post.likes + post.comments_count + post.shares;
          trends.sentiment[postDate] += post.sentiment === 'positive' ? 1 : post.sentiment === 'negative' ? -1 : 0;
          trends.virality[postDate] += post.virality_score;
        }
      });
    });

    return {
      labels: dates,
      datasets: [
        {
          label: 'Total Engagement',
          data: Object.values(trends.engagement),
          borderColor: '#4caf50',
          tension: 0.1
        },
        {
          label: 'Sentiment Balance',
          data: Object.values(trends.sentiment),
          borderColor: '#2196f3',
          tension: 0.1
        },
        {
          label: 'Average Virality',
          data: Object.values(trends.virality),
          borderColor: '#f44336',
          tension: 0.1
        }
      ]
    };
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Trend Analysis'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Performance Trends</h5>
        <Line data={calculateTrends()} options={options} />
      </div>
    </div>
  );
}

export default TrendAnalysis; 