import React from 'react';

function Header({ data }) {
  const calculateTotalStats = () => {
    let totalPosts = 0;
    let totalEngagement = 0;
    let totalReach = 0;
    let positiveCount = 0;

    Object.values(data).forEach(platform => {
      platform.posts.forEach(post => {
        totalPosts++;
        totalEngagement += post.likes + post.comments_count + post.shares;
        totalReach += post.reach;
        if (post.sentiment === 'positive') positiveCount++;
      });
    });

    return {
      totalPosts,
      totalEngagement,
      totalReach,
      positivityRate: totalPosts ? ((positiveCount / totalPosts) * 100).toFixed(1) : 0
    };
  };

  const stats = calculateTotalStats();

  return (
    <div className="row mb-4">
      <div className="col-md-3">
        <div className="card bg-primary text-white">
          <div className="card-body">
            <h5 className="card-title">Total Posts</h5>
            <h2 className="card-text">{stats.totalPosts.toLocaleString()}</h2>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card bg-success text-white">
          <div className="card-body">
            <h5 className="card-title">Total Engagement</h5>
            <h2 className="card-text">{stats.totalEngagement.toLocaleString()}</h2>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card bg-info text-white">
          <div className="card-body">
            <h5 className="card-title">Total Reach</h5>
            <h2 className="card-text">{stats.totalReach.toLocaleString()}</h2>
          </div>
        </div>
      </div>
      <div className="col-md-3">
        <div className="card bg-warning text-white">
          <div className="card-body">
            <h5 className="card-title">Positivity Rate</h5>
            <h2 className="card-text">{stats.positivityRate}%</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header; 