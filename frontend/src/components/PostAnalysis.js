import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import '../styles/PostAnalysis.css';

// Register Chart.js components
Chart.register(...registerables);

// Platform configuration
const PLATFORMS = {
  F: { name: 'Facebook', color: '#4267B2', icon: 'fab fa-facebook' },
  I: { name: 'Instagram', color: '#E1306C', icon: 'fab fa-instagram' },
  X: { name: 'X', color: '#1DA1F2', icon: 'fab fa-twitter' },
  Y: { name: 'YouTube', color: '#FF0000', icon: 'fab fa-youtube' },
  T: { name: 'Telegram', color: '#0088cc', icon: 'fab fa-telegram' }
};

// Mock comments analysis data for demonstration
const mockCommentsAnalysis = {
  total_comments_analyzed: 175,
  themes: [
    {
      theme: 'Pro‑Pakistan Slogans',
      percentage: 39,
      description: 'Frequent use of "পাকিস্তান জিন্দাবাদ" ("Long live Pakistan") signals strong in‑group solidarity.'
    },
    {
      theme: 'Anti‑War / Peace Appeals',
      percentage: 20,
      description: 'Comments calling for an end to hostilities, e.g. "যুদ্ধ কখনো শান্তি বয়ে আনে না" ("War never brings peace").'
    },
    {
      theme: 'Hostile / Insulting Language',
      percentage: 25,
      description: 'Personal insults directed at Indian figures and communities, often employing profanity in Bengali.'
    },
    {
      theme: 'Geopolitical Alignments',
      percentage: 16,
      description: 'References to regional alliances ("চীন, রাশিয়া, তুরস্ক" vs. "আওয়ামীলীগ"), viewing the conflict in broader terms.'
    }
  ],
  sentiment_distribution: {
    negative_hostile: 45,
    positive_toward_pakistan: 39,
    neutral_reflective: 16
  }
};

const PostAnalysis = ({ posts }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Chart references
  const reactionsChartRef = useRef(null);
  const performanceChartRef = useRef(null);
  
  useEffect(() => {
    if (posts && posts.length > 0) {
      const selectedPost = posts.find(p => p.id === postId);
      if (selectedPost) {
        setPost(selectedPost);
        setLoading(false);
      } else {
        // Post not found, redirect back to dashboard
        navigate('/');
      }
    }
  }, [postId, posts, navigate]);
  
  useEffect(() => {
    if (post && !loading) {
      renderReactionsChart();
      renderPerformanceMetricsChart();
    }
  }, [post, loading]);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };
  
  const renderReactionsChart = () => {
    if (!post || !reactionsChartRef.current) return;
    
    const ctx = reactionsChartRef.current.getContext('2d');
    
    // Clean up previous chart instance
    if (reactionsChartRef.current.chart) {
      reactionsChartRef.current.chart.destroy();
    }
    
    const reactionLabels = ['Like', 'Love', 'Haha', 'Wow', 'Sad', 'Angry', 'Care'];
    const reactionValues = [
      post.reactions.like || 0,
      post.reactions.love || 0,
      post.reactions.haha || 0,
      post.reactions.wow || 0,
      post.reactions.sad || 0,
      post.reactions.angry || 0,
      post.reactions.care || 0
    ];
    
    const colors = [
      '#3b5998', // like - blue
      '#ED5167', // love - red
      '#FFDA6A', // haha - yellow
      '#54C7EC', // wow - light blue
      '#F6B849', // sad - orange
      '#E91E63', // angry - pink
      '#F79B74'  // care - peach
    ];
    
    reactionsChartRef.current.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: reactionLabels,
        datasets: [{
          data: reactionValues,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = reactionValues.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${formatNumber(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  };
  
  const renderPerformanceMetricsChart = () => {
    if (!post || !performanceChartRef.current) return;
    
    const ctx = performanceChartRef.current.getContext('2d');
    
    // Clean up previous chart instance
    if (performanceChartRef.current.chart) {
      performanceChartRef.current.chart.destroy();
    }
    
    const metrics = [
      { label: 'Reactions', value: post.reactions.total },
      { label: 'Comments', value: post.comments },
      { label: 'Shares', value: post.shares },
      { label: 'Views', value: post.views }
    ];
    
    performanceChartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: metrics.map(m => m.label),
        datasets: [{
          label: 'Post Performance',
          data: metrics.map(m => m.value),
          backgroundColor: [
            'rgba(66, 103, 178, 0.8)',  // Facebook blue for reactions
            'rgba(75, 192, 192, 0.8)',  // Teal for comments
            'rgba(255, 159, 64, 0.8)',  // Orange for shares
            'rgba(153, 102, 255, 0.8)'  // Purple for views
          ],
          borderColor: [
            'rgba(66, 103, 178, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => formatNumber(value)
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: ${formatNumber(value)}`;
              }
            }
          }
        }
      }
    });
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading post analysis...</p>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="error-container">
        <h2>Post not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  const platform = PLATFORMS[post.platform] || { name: 'Unknown', color: '#999', icon: 'fas fa-globe' };
  
  return (
    <div className="post-analysis-page">
      <div className="post-analysis-header">
        <h1>Post Analysis</h1>
        <button className="btn btn-outline-primary back-button" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        {post.webUrl && post.webUrl !== '#' && (
          <a 
            href={post.webUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary view-original"
          >
            <i className="fas fa-external-link-alt"></i> View Original
          </a>
        )}
      </div>
      
      <div className="post-analysis-container">
        <div className="post-details-card">
          <div className="platform-badge" style={{ backgroundColor: platform.color }}>
            <i className={platform.icon}></i> {platform.name}
          </div>
          {/* Show all platforms if cross-platform */}
          {post.platformsInfo && post.platformsInfo.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {post.platformsInfo.map((p, idx) => (
                <span key={idx} className="platform-badge" style={{ backgroundColor: p.color, fontSize: 13, padding: '4px 10px', borderRadius: 16, color: '#fff', display: 'inline-flex', alignItems: 'center' }}>
                  <i className={p.icon} style={{ marginRight: 6 }}></i>{p.name}
                </span>
              ))}
            </div>
          )}
          {/* Show all sources if multiple */}
          {post.sources && post.sources.length > 1 && (
            <div style={{ marginBottom: 10, color: '#64748b', fontSize: 14 }}>
              <strong>Sources:</strong> {post.sources.join(', ')}
            </div>
          )}
          <div className="post-date">
            Posted: {formatDate(post.postedAt)}
          </div>
          
          {post.featuredImage && (
            <div className="post-image">
              <img src={post.featuredImage} alt="Post content" />
            </div>
          )}
          
          {post.content && (
            <div className="post-content">
              <p>{post.content}</p>
            </div>
          )}
          
          {post.screenshot && (
            <div className="post-screenshot">
              <img src={post.screenshot} alt="Post screenshot" />
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <div className="analysis-card vitality-score" style={{ flex: 1 }}>
            <div className="card-header">
              <h3>Vitality Score</h3>
            </div>
            <div className="card-content">
              <div className="vitality-score-number">{post.vitalityScore.toFixed(1)}</div>
              <div className="vitality-score-bar">
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ 
                      width: `${Math.min(post.vitalityScore * 10, 100)}%`,
                      backgroundColor: post.vitalityScore > 7 ? '#28a745' : post.vitalityScore > 4 ? '#ffc107' : '#dc3545'
                    }} 
                    aria-valuenow={post.vitalityScore}
                    aria-valuemin="0" 
                    aria-valuemax="10"
                  ></div>
                </div>
                <div className="vitality-score-scale">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>
          <div className="analysis-card engagement-metrics" style={{ flex: 1 }}>
            <div className="card-header">
              <h3>Engagement Metrics</h3>
            </div>
            <div className="card-content">
              <div className="metrics-grid">
                <div className="metric">
                  <div className="metric-icon" style={{ backgroundColor: 'rgba(66, 103, 178, 0.1)' }}>
                    <i className="fas fa-heart"></i>
                  </div>
                  <div className="metric-value">{formatNumber(post.reactions.total)}</div>
                  <div className="metric-name">Total Reactions</div>
                </div>
                <div className="metric">
                  <div className="metric-icon" style={{ backgroundColor: 'rgba(75, 192, 192, 0.1)' }}>
                    <i className="fas fa-comment"></i>
                  </div>
                  <div className="metric-value">{formatNumber(post.comments)}</div>
                  <div className="metric-name">Comments</div>
                </div>
                <div className="metric">
                  <div className="metric-icon" style={{ backgroundColor: 'rgba(255, 159, 64, 0.1)' }}>
                    <i className="fas fa-share-alt"></i>
                  </div>
                  <div className="metric-value">{formatNumber(post.shares)}</div>
                  <div className="metric-name">Shares</div>
                </div>
                <div className="metric">
                  <div className="metric-icon" style={{ backgroundColor: 'rgba(153, 102, 255, 0.1)' }}>
                    <i className="fas fa-eye"></i>
                  </div>
                  <div className="metric-value">{formatNumber(post.views)}</div>
                  <div className="metric-name">Views</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="analysis-card reactions-breakdown">
          <div className="card-header">
            <h3>Reactions Breakdown</h3>
          </div>
          <div className="card-content chart-container">
            <canvas ref={reactionsChartRef}></canvas>
          </div>
        </div>
        
        <div className="analysis-card performance-chart">
          <div className="card-header">
            <h3>Performance Metrics</h3>
          </div>
          <div className="card-content chart-container">
            <canvas ref={performanceChartRef}></canvas>
          </div>
        </div>
        
        {post.entities && post.entities.length > 0 && (
          <div className="analysis-card entity-analysis">
            <div className="card-header">
              <h3>Named Entities</h3>
            </div>
            <div className="card-content">
              <div className="entity-list">
                {post.entities.map((entity, index) => (
                  <div key={index} className="entity-tag">
                    {entity.text || entity}
                    {entity.label && <span className="entity-type">{entity.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Post summary and sentiment */}
        <div className="analysis-card post-summary-sentiment">
          <div className="card-header">
            <h3>Post Summary & Sentiment</h3>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: 12 }}>
              <strong>Summary:</strong>
              <div style={{ marginTop: 6 }}>{post.summary || 'No summary available.'}</div>
            </div>
            <div>
              <strong>Overall Sentiment:</strong>
              <span className={`sentiment-badge ${post.sentiment || 'neutral'}`} style={{ marginLeft: 10 }}>
                <i className={`fas fa-${post.sentiment === 'positive' ? 'smile' : post.sentiment === 'negative' ? 'frown' : 'meh'}`}></i>
                {post.sentiment || 'neutral'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Comments analysis */}
        <div className="analysis-card comments-analysis">
          <div className="card-header">
            <h3>Comments Analysis</h3>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: 12 }}>
              <strong>Total Comments Analyzed:</strong> {mockCommentsAnalysis.total_comments_analyzed}
            </div>
            <div style={{ marginBottom: 18 }}>
              <strong>Thematic Breakdown:</strong>
              <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '0.95rem' }}>Theme</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '0.95rem' }}>%</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '0.95rem' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCommentsAnalysis.themes.map((theme, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{theme.theme}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{theme.percentage}%</td>
                      <td style={{ padding: '6px 8px', color: '#555' }}>{theme.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <strong>Sentiment Distribution:</strong>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                <div style={{ width: 120, height: 120, marginRight: 18 }}>
                  {/* Simple pie chart using SVG for now */}
                  <svg width="120" height="120" viewBox="0 0 32 32">
                    {(() => {
                      const dist = mockCommentsAnalysis.sentiment_distribution;
                      const total = Object.values(dist).reduce((a, b) => a + b, 0);
                      const colors = ['#ef4444', '#10b981', '#64748b'];
                      let startAngle = 0;
                      return Object.entries(dist).map(([key, value], i) => {
                        const angle = (value / total) * 360;
                        const large = angle > 180 ? 1 : 0;
                        const x1 = 16 + 16 * Math.cos((Math.PI / 180) * startAngle);
                        const y1 = 16 + 16 * Math.sin((Math.PI / 180) * startAngle);
                        const x2 = 16 + 16 * Math.cos((Math.PI / 180) * (startAngle + angle));
                        const y2 = 16 + 16 * Math.sin((Math.PI / 180) * (startAngle + angle));
                        const path = `M16,16 L${x1},${y1} A16,16 0 ${large},1 ${x2},${y2} Z`;
                        startAngle += angle;
                        return <path key={key} d={path} fill={colors[i % colors.length]} />;
                      });
                    })()}
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ color: '#ef4444', fontWeight: 500 }}>
                    Negative/Hostile: {mockCommentsAnalysis.sentiment_distribution.negative_hostile}%
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 500 }}>
                    Positive Toward Pakistan: {mockCommentsAnalysis.sentiment_distribution.positive_toward_pakistan}%
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>
                    Neutral/Reflective: {mockCommentsAnalysis.sentiment_distribution.neutral_reflective}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostAnalysis; 