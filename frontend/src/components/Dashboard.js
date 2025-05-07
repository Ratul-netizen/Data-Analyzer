import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css';
import { Chart, registerables } from 'chart.js';
import ReactWordcloud from 'react-wordcloud';
import { exportAsCSV, exportAsJSON } from '../utils/exportUtils.js';
import { useNavigate } from 'react-router-dom';
import config from '../config.js';

Chart.register(...registerables);

const API_BASE_URL = config.API_BASE_URL;
const PLATFORMS = config.PLATFORMS;

// Robust platform info map for all platform codes
const PLATFORM_INFO_MAP = {
  F: { name: 'Facebook', color: '#4267B2', icon: 'fab fa-facebook' },
  I: { name: 'Instagram', color: '#E1306C', icon: 'fab fa-instagram' },
  X: { name: 'X', color: '#000000', icon: 'fab fa-x-twitter' },
  Y: { name: 'YouTube', color: '#FF0000', icon: 'fab fa-youtube' },
  T: { name: 'Telegram', color: '#229ED9', icon: 'fab fa-telegram' }
};
const DEFAULT_PLATFORM_INFO = { name: 'Unknown', color: '#888', icon: 'fas fa-question' };

// Sentiment analysis helper functions
const analyzeSentiment = (text) => {
  if (!text) return { score: 0, label: 'neutral' };
  
  // Simple sentiment analysis based on keywords
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'best', 'awesome', 'wonderful', 'perfect'];
  const negativeWords = ['bad', 'poor', 'terrible', 'horrible', 'hate', 'sad', 'worst', 'awful', 'disappointing', 'useless'];
  
  const words = text?.toLowerCase().split(/\s+/) || [];
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  let label = 'neutral';
  if (score > 0) label = 'positive';
  if (score < 0) label = 'negative';
  
  return { score, label };
};

// Extract keywords from text
const extractKeywords = (text) => {
  if (!text) return [];
  
  // Expanded stopwords list
  const stopWords = ['the', 'and', 'is', 'in', 'to', 'a', 'of', 'for', 'on', 'with', 'as', 'by', 'that', 'this', 'it', 'at', 'from', 'be', 'are', 'have', 'has', 'was', 'were', 'they', 'their', 'an', 'we', 'us', 'you', 'your', 'he', 'she', 'his', 'her', 'him', 'would', 'could', 'should', 'will', 'may', 'can', 'just', 'but', 'not', 'what', 'all', 'who', 'when', 'where', 'which', 'how', 'than', 'then', 'now', 'some', 'like', 'other', 'into', 'more', 'been', 'about', 'there', 'only', 'also', 'out', 'up', 'my', 'through', 'much', 'many', 'such', 'those', 'these', 'them', 'own', 'myself', 'yourself', 'himself', 'herself', 'itself', 'each', 'few', 'both', 'between', 'very', 'too', 'most', 'any', 'same', 'here', 'after', 'before', 'while', 'why', 'way', 'our', 'well', 'even', 'still', 'every', 'since', 'against', 'under', 'over', 'again', 'never', 'always', 'sometimes'];
  
  // Extract hashtags first
  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);
  const hashtags = matches ? [...matches].map(match => ({ text: match[1], type: 'hashtag', importance: 3 })) : [];
  
  // Detect important phrases first (2-3 word phrases)
  const phrases = [];
  const cleanText = text.toLowerCase().replace(/[^\w\s#]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleanText.split(' ');
  
  // Check for 2-3 word phrases that might be significant
  for (let i = 0; i < tokens.length - 1; i++) {
    // Skip if current word is a stopword
    if (stopWords.includes(tokens[i]) || tokens[i].length <= 3) continue;
    
    // Try 2-word phrases
    if (i < tokens.length - 1 && !stopWords.includes(tokens[i+1]) && tokens[i+1].length > 3) {
      const phrase = `${tokens[i]} ${tokens[i+1]}`;
      phrases.push({ text: phrase, type: 'phrase', importance: 2 });
    }
    
    // Try 3-word phrases
    if (i < tokens.length - 2 && !stopWords.includes(tokens[i+2]) && tokens[i+2].length > 3) {
      const phrase = `${tokens[i]} ${tokens[i+1]} ${tokens[i+2]}`;
      phrases.push({ text: phrase, type: 'phrase', importance: 2.5 });
    }
  }
  
  // Get individual keywords
  const words = cleanText
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word) && !word.startsWith('#'))
    .map(word => ({ text: word, type: 'keyword', importance: 1 }));
  
  // Add named entities if detected in text (capitalized terms that aren't at the start of sentences)
  const potentialEntities = text.match(/\b[A-Z][a-zA-Z']+\b(?!\.)(?<!^)/g) || [];
  const entities = potentialEntities
    .filter(entity => entity.length > 3 && !stopWords.includes(entity.toLowerCase()))
    .map(entity => ({ text: entity, type: 'entity', importance: 2 }));
  
  return [...hashtags, ...phrases, ...entities, ...words];
};

// Categorize keywords
const categorizeKeyword = (keyword) => {
  // Define category patterns with expanded keywords
  const categories = {
    'Politics': ['politics', 'government', 'election', 'policy', 'president', 'vote', 'candidate', 'political', 'campaign', 'senate', 'congress', 'democrat', 'republican', 'liberal', 'conservative', 'legislation', 'ballot', 'parliament', 'referendum', 'constitution', 'democracy', 'diplomatic', 'minister', 'governor', 'administration', 'law', 'bill', 'council', 'judiciary', 'court', 'rights', 'mayor', 'lawmaker', 'official', 'senator', 'representative', 'politician', 'corruption', 'scandal', 'cabinet', 'embassy', 'protest', 'reform'],
    
    'Crime': ['crime', 'criminal', 'police', 'arrest', 'murder', 'theft', 'robbery', 'assault', 'investigation', 'detective', 'suspect', 'victim', 'prosecution', 'prison', 'jail', 'sentence', 'convict', 'felony', 'misdemeanor', 'violence', 'homicide', 'burglary', 'fraud', 'kidnap', 'smuggling', 'trafficking', 'bribery', 'corruption', 'lawsuit', 'custody', 'forensic', 'evidence', 'verdict', 'justice', 'trial', 'court', 'witness', 'testimony', 'offense', 'violation', 'warrant', 'illegal', 'fugitive', 'shooting', 'attorney', 'judge', 'report', 'arson'],
    
    'Technology': ['tech', 'digital', 'software', 'app', 'online', 'website', 'internet', 'computer', 'mobile', 'phone', 'device', 'electronic', 'smart', 'virtual', 'cyber', 'network', 'system', 'data', 'code', 'program', 'hardware', 'gaming', 'innovation', 'algorithm', 'interface', 'automation', 'robot', 'artificial intelligence', 'machine learning', 'blockchain', 'cloud', 'server', 'gadget', 'sensor', 'processor', 'connectivity', 'wifi', 'streaming', 'email', 'browser', 'platform', 'startup', 'privacy', 'security', 'encryption', 'development', 'programming', 'coding', 'database', 'framework', 'update', 'version', 'release', 'prototype', 'beta', 'analytics', 'engineering'],
    
    'Business': ['business', 'company', 'corporate', 'market', 'industry', 'brand', 'startup', 'entrepreneur', 'finance', 'money', 'investment', 'economy', 'trade', 'commerce', 'profit', 'revenue', 'sales', 'retail', 'wholesale', 'product', 'service', 'customer', 'client', 'consumer', 'vendor', 'supplier', 'transaction', 'capital', 'asset', 'liability', 'equity', 'stock', 'share', 'dividend', 'merger', 'acquisition', 'partnership', 'corporation', 'enterprise', 'franchise', 'commercial', 'management', 'executive', 'strategy', 'growth', 'expansion', 'bankruptcy', 'inflation', 'recession', 'economic', 'financial', 'budget', 'forecast', 'investor', 'wealth', 'banking'],
    
    'Health': ['health', 'medical', 'doctor', 'hospital', 'patient', 'disease', 'medicine', 'treatment', 'diagnosis', 'symptom', 'illness', 'wellness', 'fitness', 'diet', 'nutrition', 'exercise', 'therapy', 'vaccine', 'virus', 'bacteria', 'mental', 'psychology', 'surgery', 'emergency', 'pandemic', 'epidemic', 'outbreak', 'infection', 'immunity', 'healthcare', 'pharmaceutical', 'pharmacy', 'clinic', 'physician', 'nurse', 'specialist', 'cancer', 'diabetes', 'asthma', 'obesity', 'depression', 'anxiety', 'addiction', 'rehabilitation', 'anatomy', 'physiology', 'genetic', 'prescription', 'remedy', 'recovery', 'aid', 'vitamin', 'supplement', 'prevention', 'protocol'],
    
    'Environment': ['environment', 'climate', 'green', 'sustainable', 'ecology', 'nature', 'conservation', 'renewable', 'pollution', 'emission', 'carbon', 'recycling', 'biodiversity', 'wildlife', 'fossil', 'solar', 'wind', 'energy', 'resource', 'natural', 'organic', 'planet', 'earth', 'waste', 'habitat', 'ecosystem', 'endangered', 'extinction', 'deforestation', 'glacier', 'ocean', 'sea', 'river', 'forest', 'desert', 'mountain', 'agriculture', 'farming', 'harvest', 'crop', 'sustainability', 'plastic', 'toxic', 'clean', 'protection', 'preservation', 'restoration', 'weather', 'storm', 'hurricane', 'flood', 'drought', 'wildfire'],
    
    'Social Media': ['social', 'media', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'platform', 'followers', 'post', 'share', 'like', 'comment', 'viral', 'trending', 'hashtag', 'influencer', 'content', 'creator', 'stream', 'live', 'profile', 'story', 'feed', 'notification', 'engagement', 'audience', 'subscribe', 'follow', 'mention', 'tag', 'algorithm', 'filter', 'timeline', 'thread', 'viral', 'meme', 'community', 'group', 'connection', 'network', 'status', 'update', 'messaging', 'privacy', 'setting', 'account', 'user', 'handle'],
    
    'Entertainment': ['entertainment', 'movie', 'film', 'music', 'show', 'performance', 'television', 'tv', 'series', 'actor', 'actress', 'celebrity', 'channel', 'stream', 'video', 'youtube', 'podcast', 'broadcast', 'studio', 'producer', 'director', 'script', 'scene', 'documentary', 'drama', 'comedy', 'thriller', 'action', 'horror', 'romance', 'fantasy', 'sci-fi', 'genre', 'album', 'song', 'artist', 'band', 'concert', 'festival', 'theater', 'stage', 'audience', 'award', 'nominee', 'winner', 'premiere', 'trailer', 'teaser', 'release', 'box office', 'critic', 'review', 'rating', 'streaming', 'subscription', 'media'],
    
    'Sports': ['sports', 'game', 'play', 'team', 'player', 'match', 'tournament', 'competition', 'championship', 'score', 'ball', 'win', 'lose', 'victory', 'defeat', 'soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis', 'golf', 'swimming', 'track', 'field', 'olympic', 'medal', 'athlete', 'coach', 'manager', 'stadium', 'arena', 'court', 'field', 'league', 'division', 'season', 'playoff', 'final', 'qualifying', 'fan', 'supporter', 'fitness', 'training', 'practice', 'performance', 'record', 'title', 'champion', 'amateur', 'professional', 'referee', 'umpire', 'penalty', 'foul', 'strategy', 'tactics', 'highlight'],
    
    'Education': ['education', 'school', 'student', 'learn', 'teaching', 'academic', 'university', 'college', 'class', 'course', 'lecture', 'study', 'research', 'knowledge', 'professor', 'teacher', 'instructor', 'curriculum', 'syllabus', 'assignment', 'homework', 'exam', 'test', 'grade', 'degree', 'diploma', 'certificate', 'graduate', 'undergraduate', 'major', 'minor', 'thesis', 'dissertation', 'semester', 'quarter', 'campus', 'faculty', 'department', 'administration', 'education', 'scholarship', 'tuition', 'admission', 'enrollment', 'distance learning', 'online learning', 'remote learning', 'workshop', 'seminar', 'conference', 'training', 'skill', 'literacy', 'tutor', 'mentor'],
    
    'Travel': ['travel', 'tourism', 'vacation', 'holiday', 'trip', 'journey', 'adventure', 'destination', 'tourist', 'hotel', 'resort', 'accommodation', 'booking', 'reservation', 'flight', 'airport', 'airline', 'cruise', 'ship', 'beach', 'mountain', 'hiking', 'camping', 'exploration', 'sightseeing', 'excursion', 'tour', 'guide', 'itinerary', 'passport', 'visa', 'luggage', 'backpack', 'souvenir', 'photography', 'landscape', 'international', 'domestic', 'local', 'foreign', 'exotic', 'tropical', 'island', 'city', 'urban', 'rural', 'resort', 'map', 'navigation', 'transport', 'road trip', 'backpacking', 'landmark', 'monument', 'attraction']
  };
  
  // Check for exact match first - the full keyword might be a meaningful concept
  const keywordLower = keyword.toLowerCase();
  for (const [category, patterns] of Object.entries(categories)) {
    if (patterns.includes(keywordLower)) {
      return category;
    }
  }
  
  // Check if any pattern is contained within the keyword (useful for phrases)
  for (const [category, patterns] of Object.entries(categories)) {
    for (const pattern of patterns) {
      if (keywordLower.includes(pattern)) {
        return category;
      }
    }
  }
  
  // Check if keyword contains any pattern (less precise match)
  for (const [category, patterns] of Object.entries(categories)) {
    if (patterns.some(pattern => keywordLower.includes(pattern))) {
      return category;
    }
  }
  
  // Default category
  return 'General';
};

// Calculate engagement rate
const calculateEngagementRate = (post) => {
  const totalEngagement = post.reactions.total + post.comments + post.shares;
  const viewsOrFollowers = post.views > 0 ? post.views : 1000; // Fallback to 1000 if no views data
  
  return (totalEngagement / viewsOrFollowers) * 100;
};

const Dashboard = (props) => {
  // State declarations
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  // Add navigate hook right after the existing state declarations
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [sortBy, setSortBy] = useState('vitality');
  const [darkMode, setDarkMode] = useState(false);
  const [timeFrame, setTimeFrame] = useState('daily');
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [minEngagementFilter, setMinEngagementFilter] = useState(0);
  const [rankingMetric, setRankingMetric] = useState('engagementRate');
  const [keywords, setKeywords] = useState([]);
  const [sentimentData, setSentimentData] = useState({ positive: 0, neutral: 0, negative: 0 });
  const [sentimentTimeline, setSentimentTimeline] = useState({});
  const [topicDistribution, setTopicDistribution] = useState([]);
  const [interactionMap, setInteractionMap] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);
  
  // Chart refs
  const reactionsChartRef = useRef(null);
  const performanceChartRef = useRef(null);
  const platformDistributionRef = useRef(null);
  const timeSeriesChartRef = useRef(null);
  const postTypeEngagementRef = useRef(null);
  const bubbleChartRef = useRef(null);
  const heatmapChartRef = useRef(null);
  const platformComparisonRef = useRef(null);
  const sentimentChartRef = useRef(null);
  const engagementRateChartRef = useRef(null);
  const hourlyHeatmapRef = useRef(null);
  const sentimentTimelineRef = useRef(null);
  const topicDistributionRef = useRef(null);
  const interactionMapRef = useRef(null);
  const correlationChartRef = useRef(null);
  
  // Add keyword filter state variable
  const [keywordFilter, setKeywordFilter] = useState(null);
  const [keywordCategories, setKeywordCategories] = useState({});
  const [filteredPostsByKeyword, setFilteredPostsByKeyword] = useState([]);
  // Add state for tracking keyword to post mapping
  const [keywordPostMap, setKeywordPostMap] = useState({});
  // Add state for export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Add a click outside handler to close the export menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    
    // Add event listener when the export menu is open
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);
  
  useEffect(() => {
    fetchData();
    
    // Check system preference for dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
    
    // Set up real-time updates for posts
    const postUpdateInterval = setInterval(() => {
      if (!loading && posts.length > 0) {
        // Simulate new post data coming in
        const simulateNewPost = () => {
          // 25% chance of adding a new simulated post
          if (Math.random() > 0.75) {
            // Generate a new post with current timestamp
            const platforms = Object.keys(PLATFORMS);
            const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
            
            // Sample content for new posts
            const sampleContents = [
              "Just launched our new product! Check it out at our website. #innovation #newproduct",
              "Exciting news! We've reached 10,000 followers today. Thank you for your support! #milestone",
              "Our team is attending the annual tech conference this week. Stop by our booth! #conference #networking",
              "New blog post: '10 Tips for Social Media Success' - read now on our website! #socialmedia #tips",
              "Flash sale! 25% off all products for the next 24 hours. Use code: FLASH25 #sale #discount"
            ];
            
            const newContent = sampleContents[Math.floor(Math.random() * sampleContents.length)];
            const sentiment = analyzeSentiment(newContent);
            
            const newPost = {
              id: `post-${Date.now()}`,
              platform: randomPlatform,
              platformInfo: PLATFORMS[randomPlatform],
              platforms: [PLATFORMS[randomPlatform].name],
              platformsInfo: [PLATFORMS[randomPlatform]],
              content: newContent,
              postUrl: '#',
              webUrl: '#',
              reactions: {
                love: Math.floor(Math.random() * 5),
                sad: Math.floor(Math.random() * 3),
                like: Math.floor(Math.random() * 20),
                haha: Math.floor(Math.random() * 4),
                wow: Math.floor(Math.random() * 3),
                angry: Math.floor(Math.random() * 2),
                care: Math.floor(Math.random() * 3),
                total: Math.floor(Math.random() * 30)
              },
              shares: Math.floor(Math.random() * 5),
              comments: Math.floor(Math.random() * 8),
              views: Math.floor(Math.random() * 100),
              vitalityScore: (Math.random() * 5) + 5,
              featuredImage: null,
              screenshot: null,
              sources: [PLATFORMS[randomPlatform].name],
              sourceId: '',
              entities: [],
              postedAt: new Date().toISOString(),
              postType: 'text',
              sentiment: sentiment.label,
              sentimentScore: sentiment.score,
              author: {
                name: 'Social Media Team',
                followers: Math.floor(Math.random() * 10000)
              },
              engagementRate: Math.random() * 5 + 1 // 1-6%
            };
            
            // Add the new post to the posts array
            setPosts(prevPosts => [newPost, ...prevPosts]);
            
            // Show notification for new post
            const notification = document.createElement('div');
            notification.className = 'post-notification';
            notification.innerHTML = `
              <div class="notification-platform" style="background-color: ${PLATFORMS[randomPlatform].color}">
                <i class="${PLATFORMS[randomPlatform].icon}"></i>
              </div>
              <div class="notification-content">
                <div class="notification-title">New Post</div>
                <div class="notification-text">${newContent.substring(0, 60)}${newContent.length > 60 ? '...' : ''}</div>
              </div>
            `;
            
            document.body.appendChild(notification);
            
            // Remove the notification after 5 seconds
            setTimeout(() => {
              notification.classList.add('hide');
              setTimeout(() => {
                document.body.removeChild(notification);
              }, 500);
            }, 5000);
          }
        };
        
        // Update existing post metrics (simulating real-time changes)
        const updatedPosts = posts.map(post => {
          // 30% chance of updating a post's metrics
          if (Math.random() > 0.7) {
            return {
              ...post,
              reactions: {
                ...post.reactions,
                like: post.reactions.like + Math.floor(Math.random() * 3),
                total: post.reactions.total + Math.floor(Math.random() * 3)
              },
              comments: post.comments + (Math.random() > 0.8 ? 1 : 0),
              shares: post.shares + (Math.random() > 0.9 ? 1 : 0),
              views: post.views + Math.floor(Math.random() * 5)
            };
          }
          return post;
        });
        
        setPosts(updatedPosts);
        simulateNewPost();
        updateLatestPosts();

        // Update selected post if it exists
        if (selectedPost) {
          const updatedSelectedPost = updatedPosts.find(p => p.id === selectedPost.id);
          if (updatedSelectedPost) {
            setSelectedPost(updatedSelectedPost);
          }
        }
      }
    }, 60000); // Update every minute
    
    return () => {
      clearInterval(postUpdateInterval);
    };
  }, []);
  
  useEffect(() => {
    if (selectedPost) {
      renderPostCharts(selectedPost);
    }
  }, [selectedPost, darkMode]);
  
  useEffect(() => {
    if (!loading && posts.length > 0) {
      renderDashboardCharts();
      analyzePostsContent();
      generateSentimentTimeline();
      generateTopicDistribution();
      generateInteractionMap();
      updateLatestPosts();
    }
  }, [posts, darkMode, timeFrame, postTypeFilter]);
  
  const analyzePostsContent = () => {
    // Extract and analyze keywords from all posts
    const allKeywords = posts.flatMap(post => extractKeywords(post.content));
    
    // Combine duplicate keywords and sum their values
    const keywordMap = {};
    const keywordPostMap = {}; // Track which posts contain each keyword
    
    allKeywords.forEach(item => {
      const keywordKey = item.text.toLowerCase();
      
      if (keywordMap[keywordKey]) {
        keywordMap[keywordKey].value += item.importance || 1;
      } else {
        keywordMap[keywordKey] = { 
          text: item.text, 
          value: item.importance || 1, 
          type: item.type 
        };
      }
      
      // Track posts containing this keyword for filtering
      if (!keywordPostMap[keywordKey]) {
        keywordPostMap[keywordKey] = new Set();
      }
    });
    
    // Add post tracking
    posts.forEach(post => {
      if (!post.content) return;
      
      const postKeywords = extractKeywords(post.content)
        .map(k => k.text.toLowerCase());
      
      postKeywords.forEach(keyword => {
        if (keywordPostMap[keyword]) {
          keywordPostMap[keyword].add(post.id);
        }
      });
    });
    
    // Categorize keywords and format for word cloud
    const categorizedKeywords = {};
    const formattedKeywords = Object.values(keywordMap)
      .map(keyword => {
        const category = categorizeKeyword(keyword.text);
        keyword.category = category;
        
        // Track keywords by category
        if (!categorizedKeywords[category]) {
          categorizedKeywords[category] = [];
        }
        categorizedKeywords[category].push(keyword);
        
        return keyword;
      })
      .sort((a, b) => {
        // Sort by value (frequency) first, but give higher importance to phrases and entities
        return b.value - a.value;
      })
      .slice(0, 150); // Get top 150 keywords for a more comprehensive analysis
    
    setKeywords(formattedKeywords);
    setKeywordCategories(categorizedKeywords);
    
    // Save keyword to post mapping
    const formattedKeywordPostMap = {};
    Object.entries(keywordPostMap).forEach(([keyword, postIds]) => {
      formattedKeywordPostMap[keyword] = Array.from(postIds);
    });
    setKeywordPostMap(formattedKeywordPostMap);
    
    // Analyze sentiment of all posts
    const sentiments = {
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    posts.forEach(post => {
      const sentiment = analyzeSentiment(post.content);
      sentiments[sentiment.label]++;
    });
    
    setSentimentData(sentiments);
    renderSentimentChart(sentiments);
    renderEngagementRateChart();
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      
      const platformResponses = await Promise.all(
        Object.keys(PLATFORMS).map(platform => 
          axios.get(`${API_BASE_URL}/post/list/?platform=${PLATFORMS[platform].key}`)
        )
      );
      // Check if any responses failed
      const failedResponses = platformResponses.filter(response => !response.data);
      if (failedResponses.length > 0) {
        console.error('Some platform data fetch failed:', failedResponses);
        setError('Failed to fetch data from some platforms');
        setLoading(false);
        return;
      }

      // Validate API endpoint responses
      platformResponses.forEach((response, index) => {
        const platform = Object.keys(PLATFORMS)[index];
        if (!response.data) {
          console.error(`No data received from ${platform} API`);
          return;
        }
        
        // Log successful response for debugging
        console.log(`${platform} API response:`, response.data);
      });
      console.log(platformResponses);
      
      const allPosts = [];
      const postContentMap = new Map();
      
      platformResponses.forEach((response, index) => {
        const platform = Object.keys(PLATFORMS)[index];
        // Ensure platformData is always an array
        const platformData = Array.isArray(response.data) ? response.data.slice(0, 100) : [];
        
        platformData.forEach(post => {
          // Robust platform key and info lookup
          const platformKey = (post.platform || platform || '').toUpperCase();
          const platformInfo = PLATFORM_INFO_MAP[platformKey] || DEFAULT_PLATFORM_INFO;
          // Check if this is a duplicate post across platforms (same content/URL)
          const contentKey = post.post_text ? post.post_text.substring(0, 100) : post.post_url;
          let existingPost = postContentMap.get(contentKey);
          
          if (existingPost) {
            // This is a cross-platform post, add the platform and source
            if (!existingPost.platforms.includes(platformInfo.name)) {
              existingPost.platforms.push(platformInfo.name);
              existingPost.platformsInfo.push(platformInfo);
            }
            
            if (post.source && !existingPost.sources.includes(post.source)) {
              existingPost.sources.push(post.source);
            }
            
            // Update engagement metrics (take the highest values)
            existingPost.reactions.total = Math.max(existingPost.reactions.total, post.reactions?.Total || post.total_reactions || 0);
            existingPost.comments = Math.max(existingPost.comments, post.total_comments || 0);
            existingPost.shares = Math.max(existingPost.shares, post.total_shares || 0);
            existingPost.views = Math.max(existingPost.views, post.total_views || 0);
            existingPost.vitalityScore = Math.max(existingPost.vitalityScore, post.vitality_score || 0);
            
            // Take new image if available
            if (!existingPost.featuredImage && post.featured_image && post.featured_image.length > 0) {
              existingPost.featuredImage = post.featured_image[0];
            }
            if (!existingPost.screenshot && post.url_screenshot) {
              existingPost.screenshot = post.url_screenshot;
            }
          } else {
            // Determine post type
            let postType = 'text';
            if (post.featured_image && post.featured_image.length > 0) {
              postType = 'image';
            } else if (post.post_text && (post.post_text.includes('youtu.be') || post.post_text.includes('youtube.com'))) {
              postType = 'video';
            }
            
            // Analyze sentiment
            const sentiment = analyzeSentiment(post.post_text);
            
            // Create new post
            const newPost = {
              id: post._id || post.id || `post-${Math.random().toString(36).substr(2, 9)}`,
              platform: platformKey,
              platformInfo: platformInfo,
              platforms: [platformInfo.name],
              platformsInfo: [platformInfo],
              content: post.post_text || '',
              postUrl: post.post_url || '#',
              webUrl: post.post_url_web || post.post_url || '#',
              reactions: {
                love: post.reactions?.Love ?? post.reactions?.love ?? 0,
                sad: post.reactions?.Sad ?? post.reactions?.sad ?? 0,
                like: post.reactions?.Like ?? post.reactions?.like ?? 0,
                haha: post.reactions?.Haha ?? post.reactions?.haha ?? 0,
                wow: post.reactions?.Wow ?? post.reactions?.wow ?? 0,
                angry: post.reactions?.Angry ?? post.reactions?.angry ?? 0,
                care: post.reactions?.Care ?? post.reactions?.care ?? 0,
                total: post.reactions?.Total ?? post.reactions?.total ?? post.total_reactions ?? 0
              },
              shares: post.total_shares ?? 0,
              comments: post.total_comments ?? 0,
              views: post.total_views ?? 0,
              vitalityScore: post.vitality_score ?? 0,
              featuredImage: (post.featured_image && post.featured_image.length > 0) ? post.featured_image[0] : null,
              screenshot: post.url_screenshot || null,
              sources: post.source ? [post.source] : [platformInfo.name],
              sourceId: post.source_id || '',
              entities: post.ner || [],
              postedAt: post.posted_at || new Date().toISOString(),
              postType: postType,
              sentiment: sentiment.label,
              sentimentScore: sentiment.score,
              author: post.author || {
                name: post.source || 'Unknown',
                followers: 0
              },
              engagementRate: 0 // Will be calculated later
            };
            
            // Calculate engagement rate
            newPost.engagementRate = calculateEngagementRate(newPost);
            
            allPosts.push(newPost);
            postContentMap.set(contentKey, newPost);
          }
        });
      });
      
      // Sort posts by vitality score
      const sortedPosts = allPosts.sort((a, b) => b.vitalityScore - a.vitalityScore);
      setPosts(sortedPosts);
      console.log('Fetched posts:', sortedPosts);
      
      // Add these lines to pass posts data to parent component
      if (props.onPostsUpdate) {
        props.onPostsUpdate(sortedPosts);
      }
      
      // Set the first post as selected by default
      if (sortedPosts.length > 0) {
        setSelectedPost(sortedPosts[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderPostCharts = (post) => {
    renderReactionsChart(post);
    renderPerformanceMetricsChart(post);
  };
  
  const renderDashboardCharts = () => {
    renderPlatformDistributionChart();
    renderTimeSeriesChart();
    renderPostTypeEngagementChart();
    renderBubbleChart();
    renderPlatformComparisonChart();
    renderEngagementHeatmap();
    renderHourlyHeatmap();
    renderCorrelationChart();
  };
  
  // Chart renderers
  const renderSentimentChart = (sentimentData) => {
    if (!sentimentChartRef.current) return;
    
    const ctx = sentimentChartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (sentimentChartRef.current.chart) {
      sentimentChartRef.current.chart.destroy();
    }
    
    // Prepare data
    const labels = ['Positive', 'Neutral', 'Negative'];
    const data = [
      sentimentData.positive,
      sentimentData.neutral,
      sentimentData.negative
    ];
    
    // Create chart
    sentimentChartRef.current.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',  // Green for positive
            'rgba(107, 114, 128, 0.8)', // Gray for neutral
            'rgba(239, 68, 68, 0.8)'    // Red for negative
          ],
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
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 11
              }
            }
          },
          title: {
            display: true,
            text: 'Post Sentiment Analysis',
            color: darkMode ? '#f8fafc' : '#18181b',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} posts (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  };
  
  const renderEngagementRateChart = () => {
    if (!engagementRateChartRef.current) return;
    
    const ctx = engagementRateChartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (engagementRateChartRef.current.chart) {
      engagementRateChartRef.current.chart.destroy();
    }
    
    // Get top 10 posts by engagement rate
    const topPosts = [...posts]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10);
    
    // Prepare data
    const labels = topPosts.map(post => {
      const content = post.content || 'No content';
      return content.length > 20 ? content.substring(0, 20) + '...' : content;
    });
    
    const data = topPosts.map(post => post.engagementRate.toFixed(2));
    const platformColors = topPosts.map(post => post.platformInfo.color);
    
    // Create chart
    engagementRateChartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Engagement Rate (%)',
          data: data,
          backgroundColor: platformColors,
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: darkMode ? '#f8fafc' : '#18181b'
            },
            title: {
              display: true,
              text: 'Engagement Rate (%)',
              color: darkMode ? '#f8fafc' : '#18181b'
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: darkMode ? '#f8fafc' : '#18181b'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top Posts by Engagement Rate',
            color: darkMode ? '#f8fafc' : '#18181b',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                return topPosts[index].content;
              },
              label: function(context) {
                const post = topPosts[context.dataIndex];
                return [
                  `Engagement Rate: ${post.engagementRate.toFixed(2)}%`,
                  `Platform: ${post.platformInfo.name}`,
                  `Reactions: ${post.reactions.total}`,
                  `Comments: ${post.comments}`,
                  `Shares: ${post.shares}`
                ];
              }
            }
          }
        }
      }
    });
  };
  
  const renderReactionsChart = (post) => {
    if (!reactionsChartRef.current) return;
    const ctx = reactionsChartRef.current.getContext('2d');
    if (!ctx) return;
    
    if (reactionsChartRef.current.chart) {
      reactionsChartRef.current.chart.destroy();
    }
    
    // Prepare data for reactions
    const labels = ['Love', 'Like', 'Sad', 'Haha', 'Wow', 'Angry', 'Care'];
    const data = [
      post.reactions.love || 0,
      post.reactions.like || 0,
      post.reactions.sad || 0,
      post.reactions.haha || 0,
      post.reactions.wow || 0,
      post.reactions.angry || 0,
      post.reactions.care || 0
    ];
    
    // Colors for each reaction type - brightened for better visibility
    const colors = [
      '#ff5a6e', // Love (bright red)
      '#4c7dff', // Like (bright blue)
      '#8f9bab', // Sad (light gray)
      '#ffeb7f', // Haha (bright yellow)
      '#61ffda', // Wow (bright teal)
      '#ff6b7f', // Angry (bright red-pink)
      '#ffccd5'  // Care (bright pink)
    ];
    
    reactionsChartRef.current.chart = new Chart(ctx, {
      type: 'doughnut', // Changed to doughnut for better appearance
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: darkMode ? '#1e293b' : '#ffffff',
          borderWidth: 2,
          borderRadius: 4,
          spacing: 2, // Add spacing between segments
          hoverOffset: 10 // Increase offset on hover
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%', // Set cutout percentage for doughnut
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 10
          }
        },
        plugins: {
          legend: {
            position: 'right',
            align: 'start',
            labels: {
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 12,
                weight: '500'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: darkMode ? '#f8fafc' : '#18181b',
            bodyColor: darkMode ? '#f8fafc' : '#18181b',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            boxPadding: 4,
            titleFont: {
              weight: 'bold'
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  };

  const renderPerformanceMetricsChart = (post) => {
    if (!performanceChartRef.current) return;
    const ctx = performanceChartRef.current.getContext('2d');
    if (!ctx) return;
    
    if (performanceChartRef.current.chart) {
      performanceChartRef.current.chart.destroy();
    }
    
    // Performance metrics data
    const labels = ['Reactions', 'Comments', 'Shares', 'Views'];
    const data = [
      post.reactions.total,
      post.comments,
      post.shares,
      post.views
    ];
    
    // Custom colors for better visibility in dark mode
    const chartColor = darkMode ? 'rgba(99, 102, 241, 0.8)' : 'rgba(79, 70, 229, 0.8)';
    const chartBgColor = darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.2)';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    performanceChartRef.current.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Performance Metrics',
          data: data,
          backgroundColor: chartBgColor,
          borderColor: chartColor,
          borderWidth: 2,
          pointBackgroundColor: chartColor,
          pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
          pointHoverBackgroundColor: darkMode ? '#1e293b' : '#ffffff',
          pointHoverBorderColor: chartColor,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 15,
            right: 15,
            bottom: 15,
            left: 15
          }
        },
        scales: {
          r: {
            angleLines: {
              color: gridColor
            },
            grid: {
              color: gridColor,
              circular: true
            },
            pointLabels: {
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 12,
                weight: '500'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            },
            ticks: {
              backdropColor: darkMode ? '#1e293b' : '#ffffff',
              color: darkMode ? '#f8fafc' : '#18181b',
              showLabelBackdrop: false,
              z: 100,
              padding: 5,
              font: {
                size: 10
              },
              stepSize: Math.ceil(Math.max(...data) / 5)
            },
            min: 0,
            suggestedMax: Math.max(...data) * 1.1,
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: darkMode ? '#f8fafc' : '#18181b',
            bodyColor: darkMode ? '#f8fafc' : '#18181b',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            titleFont: {
              weight: 'bold'
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                const value = context.raw;
                return `Value: ${value.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  };

  const renderPlatformDistributionChart = () => {
    if (!platformDistributionRef.current) return;
    const ctx = platformDistributionRef.current.getContext('2d');
    if (!ctx || platformDistributionRef.current.chart) return;
    
    // Count posts by platform
    const platformCounts = {};
    posts.forEach(post => {
      if (platformCounts[post.platform]) {
        platformCounts[post.platform]++;
      } else {
        platformCounts[post.platform] = 1;
      }
    });
    
    // Prepare chart data
    const labels = Object.keys(platformCounts).map(key => PLATFORM_INFO_MAP[key].name);
    const data = Object.keys(platformCounts).map(key => platformCounts[key]);
    const colors = Object.keys(platformCounts).map(key => PLATFORM_INFO_MAP[key].color);
    
    platformDistributionRef.current.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          title: {
            display: true,
            text: 'Posts by Platform',
            color: darkMode ? '#f8fafc' : '#18181b'
          }
        }
      }
    });
  };

  const renderTimeSeriesChart = () => {
    if (!timeSeriesChartRef.current) return;
    const ctx = timeSeriesChartRef.current.getContext('2d');
    if (!ctx) return;
    
    if (timeSeriesChartRef.current.chart) {
      timeSeriesChartRef.current.chart.destroy();
    }
    
    // Group posts by date
    const dateFormat = timeFrame === 'daily' ? 'YYYY-MM-DD' : 
                      timeFrame === 'weekly' ? 'YYYY-[W]WW' : 'YYYY-MM';
    
    const groupedData = {};
    posts.forEach(post => {
      const date = new Date(post.postedAt);
      let key;
      
      if (timeFrame === 'daily') {
        key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      } else if (timeFrame === 'weekly') {
        // Simple week calculation
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { reactions: 0, comments: 0, shares: 0 };
      }
      
      groupedData[key].reactions += post.reactions.total;
      groupedData[key].comments += post.comments;
      groupedData[key].shares += post.shares;
    });
    
    // Sort dates
    const sortedDates = Object.keys(groupedData).sort();
    
    // Create datasets
    const datasets = [
      {
        label: 'Reactions',
        data: sortedDates.map(date => groupedData[date].reactions),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true
      },
      {
        label: 'Comments',
        data: sortedDates.map(date => groupedData[date].comments),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true
      },
      {
        label: 'Shares',
        data: sortedDates.map(date => groupedData[date].shares),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
        fill: true
      }
    ];
    
    timeSeriesChartRef.current.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          }
        },
        plugins: {
          legend: {
            labels: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  };

  const renderPostTypeEngagementChart = () => {
    if (!postTypeEngagementRef.current) return;
    const ctx = postTypeEngagementRef.current.getContext('2d');
    if (!ctx) return;
    
    if (postTypeEngagementRef.current.chart) {
      postTypeEngagementRef.current.chart.destroy();
    }
    
    // Group posts by type
    const postTypes = {
      'text': { count: 0, reactions: 0, comments: 0, shares: 0 },
      'image': { count: 0, reactions: 0, comments: 0, shares: 0 },
      'video': { count: 0, reactions: 0, comments: 0, shares: 0 }
    };
    
    posts.forEach(post => {
      const type = post.postType || 'text';
      postTypes[type].count++;
      postTypes[type].reactions += post.reactions.total;
      postTypes[type].comments += post.comments;
      postTypes[type].shares += post.shares;
    });
    
    // Calculate average engagement per type
    Object.keys(postTypes).forEach(type => {
      if (postTypes[type].count > 0) {
        postTypes[type].avgReactions = postTypes[type].reactions / postTypes[type].count;
        postTypes[type].avgComments = postTypes[type].comments / postTypes[type].count;
        postTypes[type].avgShares = postTypes[type].shares / postTypes[type].count;
      }
    });
    
    // Prepare chart data
    const labels = ['Text Posts', 'Image Posts', 'Video Posts'];
    
    postTypeEngagementRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Avg. Reactions',
            data: [
              postTypes.text.avgReactions || 0,
              postTypes.image.avgReactions || 0,
              postTypes.video.avgReactions || 0
            ],
            backgroundColor: 'rgba(79, 70, 229, 0.8)',
            borderRadius: 4
          },
          {
            label: 'Avg. Comments',
            data: [
              postTypes.text.avgComments || 0,
              postTypes.image.avgComments || 0,
              postTypes.video.avgComments || 0
            ],
            backgroundColor: 'rgba(22, 163, 74, 0.8)',
            borderRadius: 4
          },
          {
            label: 'Avg. Shares',
            data: [
              postTypes.text.avgShares || 0,
              postTypes.image.avgShares || 0,
              postTypes.video.avgShares || 0
            ],
            backgroundColor: 'rgba(234, 88, 12, 0.8)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          }
        },
        plugins: {
          legend: {
            labels: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          title: {
            display: true,
            text: 'Average Engagement by Post Type',
            color: darkMode ? '#f8fafc' : '#18181b'
          }
        }
      }
    });
  };

  const renderBubbleChart = () => {
    if (!bubbleChartRef.current) return;
    const ctx = bubbleChartRef.current.getContext('2d');
    if (!ctx) return;
    
    if (bubbleChartRef.current.chart) {
      bubbleChartRef.current.chart.destroy();
    }
    
    // Prepare bubble chart data
    const bubbleData = posts.slice(0, 50).map(post => ({
      x: post.views,
      y: post.comments,
      r: Math.sqrt(post.reactions.total) / 2 + 5, // Scale radius based on reactions
      post: post
    }));
    
    bubbleChartRef.current.chart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [
          {
            label: 'Posts',
            data: bubbleData,
            backgroundColor: bubbleData.map(item => item.post.platformInfo.color + '80'),
            borderColor: bubbleData.map(item => item.post.platformInfo.color),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Views',
              color: darkMode ? '#f8fafc' : '#18181b'
            },
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          y: {
            title: {
              display: true,
              text: 'Comments',
              color: darkMode ? '#f8fafc' : '#18181b'
            },
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const post = context.raw.post;
                return [
                  `Platform: ${post.platformInfo.name}`,
                  `Views: ${post.views}`,
                  `Comments: ${post.comments}`,
                  `Reactions: ${post.reactions.total}`
                ];
              }
            }
          }
        }
      }
    });
  };

  const renderPlatformComparisonChart = () => {
    if (!platformComparisonRef.current) return;
    const ctx = platformComparisonRef.current.getContext('2d');
    if (!ctx) return;
    
    if (platformComparisonRef.current.chart) {
      platformComparisonRef.current.chart.destroy();
    }
    
    // Group metrics by platform
    const platformMetrics = {};
    
    Object.keys(PLATFORM_INFO_MAP).forEach(platform => {
      platformMetrics[platform] = {
        reactions: 0,
        comments: 0,
        shares: 0,
        posts: 0
      };
    });
    
    posts.forEach(post => {
      platformMetrics[post.platform].reactions += post.reactions.total;
      platformMetrics[post.platform].comments += post.comments;
      platformMetrics[post.platform].shares += post.shares;
      platformMetrics[post.platform].posts++;
    });
    
    // Calculate average per post for fair comparison
    Object.keys(platformMetrics).forEach(platform => {
      if (platformMetrics[platform].posts > 0) {
        platformMetrics[platform].avgReactions = platformMetrics[platform].reactions / platformMetrics[platform].posts;
        platformMetrics[platform].avgComments = platformMetrics[platform].comments / platformMetrics[platform].posts;
        platformMetrics[platform].avgShares = platformMetrics[platform].shares / platformMetrics[platform].posts;
      }
    });
    
    // Prepare chart data
    const labels = Object.keys(PLATFORM_INFO_MAP).map(key => PLATFORM_INFO_MAP[key].name);
    
    platformComparisonRef.current.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Avg. Reactions per Post',
            data: Object.keys(PLATFORM_INFO_MAP).map(key => platformMetrics[key].avgReactions || 0),
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            borderColor: 'rgba(79, 70, 229, 0.8)',
            pointBackgroundColor: 'rgba(79, 70, 229, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(79, 70, 229, 1)'
          },
          {
            label: 'Avg. Comments per Post',
            data: Object.keys(PLATFORM_INFO_MAP).map(key => platformMetrics[key].avgComments || 0),
            backgroundColor: 'rgba(22, 163, 74, 0.2)',
            borderColor: 'rgba(22, 163, 74, 0.8)',
            pointBackgroundColor: 'rgba(22, 163, 74, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(22, 163, 74, 1)'
          },
          {
            label: 'Avg. Shares per Post',
            data: Object.keys(PLATFORM_INFO_MAP).map(key => platformMetrics[key].avgShares || 0),
            backgroundColor: 'rgba(234, 88, 12, 0.2)',
            borderColor: 'rgba(234, 88, 12, 0.8)',
            pointBackgroundColor: 'rgba(234, 88, 12, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(234, 88, 12, 1)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: {
              color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            },
            pointLabels: {
              color: darkMode ? '#f8fafc' : '#18181b'
            },
            ticks: {
              backdropColor: darkMode ? '#1e293b' : '#ffffff',
              color: darkMode ? '#f8fafc' : '#18181b'
            }
          }
        },
        plugins: {
          legend: {
            labels: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          title: {
            display: true,
            text: 'Platform Performance Comparison',
            color: darkMode ? '#f8fafc' : '#18181b'
          }
        }
      }
    });
  };

  const renderEngagementHeatmap = () => {
    if (!heatmapChartRef.current) return;
    const ctx = heatmapChartRef.current.getContext('2d');
    if (!ctx) return;
    
    if (heatmapChartRef.current.chart) {
      heatmapChartRef.current.chart.destroy();
    }
    
    // Create day of week data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayEngagement = daysOfWeek.map(day => ({ day, count: 0, total: 0 }));
    
    posts.forEach(post => {
      if (post.postedAt) {
        const dayOfWeek = new Date(post.postedAt).getDay();
        dayEngagement[dayOfWeek].count++;
        dayEngagement[dayOfWeek].total += post.reactions.total + post.comments + post.shares;
      }
    });
    
    // Calculate average engagement per day
    const avgEngagement = dayEngagement.map(d => d.count > 0 ? d.total / d.count : 0);
    
    heatmapChartRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: daysOfWeek,
        datasets: [{
          label: 'Avg. Engagement per Post',
          data: avgEngagement,
          backgroundColor: function(context) {
            const value = context.dataset.data[context.dataIndex];
            const max = Math.max(...context.dataset.data);
            const intensity = value / max;
            return `rgba(234, 88, 12, ${0.2 + intensity * 0.8})`;
          },
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Best Days for Posting',
            color: darkMode ? '#f8fafc' : '#18181b'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                const count = dayEngagement[context.dataIndex].count;
                return [
                  `Avg. Engagement: ${value.toFixed(1)}`,
                  `Posts Count: ${count}`
                ];
              }
            }
          }
        }
      }
    });
  };
  
  const renderHourlyHeatmap = () => {
    if (!hourlyHeatmapRef.current) return;
    const ctx = hourlyHeatmapRef.current.getContext('2d');
    if (!ctx) return;
    
    if (hourlyHeatmapRef.current.chart) {
      hourlyHeatmapRef.current.chart.destroy();
    }
    
    // Group engagement by hour
    const hourlyEngagement = Array(24).fill().map(() => ({ count: 0, total: 0 }));
    
    posts.forEach(post => {
      if (post.postedAt) {
        const hour = new Date(post.postedAt).getHours();
        hourlyEngagement[hour].count++;
        hourlyEngagement[hour].total += post.reactions.total + post.comments + post.shares;
      }
    });
    
    // Calculate average engagement per hour
    const averageEngagement = hourlyEngagement.map(h => h.count > 0 ? h.total / h.count : 0);
    
    // Create labels for hours
    const hourLabels = Array(24).fill().map((_, i) => {
      const hour = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      return `${hour} ${ampm}`;
    });
    
    hourlyHeatmapRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hourLabels,
        datasets: [{
          label: 'Avg. Engagement',
          data: averageEngagement,
          backgroundColor: function(context) {
            const value = context.dataset.data[context.dataIndex];
            const max = Math.max(...context.dataset.data);
            const intensity = value / max;
            return `rgba(79, 70, 229, ${0.2 + intensity * 0.8})`;
          },
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: darkMode ? '#f8fafc' : '#18181b' }
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Best Time of Day for Engagement',
            color: darkMode ? '#f8fafc' : '#18181b'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 10,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            displayColors: false,
            callbacks: {
              title: function(context) {
                const index = context[0].dataIndex;
                const hour = index % 12 === 0 ? 12 : index % 12;
                const ampm = index < 12 ? 'AM' : 'PM';
                return `${hour}:00 ${ampm}`;
              },
              label: function(context) {
                const index = context.dataIndex;
                const value = averageEngagement[index];
                const engagementValue = Math.round(value * 10) / 10; // Round to 1 decimal
                
                // Compare to average to provide context
                const avgOfAll = averageEngagement.reduce((sum, val) => sum + val, 0) / averageEngagement.length;
                let pctDiff = 0;
                if (avgOfAll > 0) {
                  pctDiff = Math.round(((value - avgOfAll) / avgOfAll) * 100);
                }
                
                const comparisonText = value > avgOfAll 
                  ? `${pctDiff}% above average`
                  : `${Math.abs(pctDiff)}% below average`;
                
                return [
                  `Engagement: ${engagementValue}`,
                  `Posts: ${hourlyEngagement[index].count}`,
                  `${comparisonText}`
                ];
              }
            }
          }
        }
      }
    });
  };
  
  // Generate sentiment timeline data
  const generateSentimentTimeline = () => {
    const timelineData = {};
    
    // Group posts by date and sentiment
    posts.forEach(post => {
      const date = new Date(post.postedAt);
      let key;
      
      if (timeFrame === 'daily') {
        key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      } else if (timeFrame === 'weekly') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}`;
      }
      
      if (!timelineData[key]) {
        timelineData[key] = { positive: 0, neutral: 0, negative: 0 };
      }
      
      timelineData[key][post.sentiment]++;
    });
    
    setSentimentTimeline(timelineData);
    renderSentimentTimeline(timelineData);
  };
  
  // Generate topic distribution data
  const generateTopicDistribution = () => {
    // Simple topic categorization based on keywords
    const topics = {
      'Technology': ['tech', 'technology', 'digital', 'app', 'software', 'gadget', 'innovation'],
      'Business': ['business', 'entrepreneur', 'startup', 'commerce', 'market', 'finance'],
      'Entertainment': ['entertainment', 'movie', 'music', 'celebrity', 'festival', 'concert'],
      'Health': ['health', 'wellness', 'fitness', 'medical', 'diet', 'exercise'],
      'Politics': ['politics', 'government', 'election', 'policy', 'president', 'vote'],
      'Sports': ['sports', 'game', 'athlete', 'tournament', 'championship', 'team'],
      'Fashion': ['fashion', 'style', 'trend', 'clothing', 'design', 'beauty'],
      'Food': ['food', 'recipe', 'cook', 'restaurant', 'cuisine', 'dish'],
      'Travel': ['travel', 'trip', 'vacation', 'tourism', 'destination', 'adventure'],
      'Education': ['education', 'learning', 'student', 'school', 'course', 'teach']
    };
    
    const topicCounts = Object.keys(topics).reduce((acc, topic) => {
      acc[topic] = { count: 0, engagement: 0 };
      return acc;
    }, {});
    
    // Count posts by topic
    posts.forEach(post => {
      const content = post.content.toLowerCase();
      let matched = false;
      
      Object.entries(topics).forEach(([topic, keywords]) => {
        if (!matched && keywords.some(keyword => content.includes(keyword))) {
          topicCounts[topic].count++;
          topicCounts[topic].engagement += post.reactions.total + post.comments + post.shares;
          matched = true; // Only count each post once for the most relevant topic
        }
      });
      
      // If no topic matched, add to "Other"
      if (!matched) {
        if (!topicCounts['Other']) {
          topicCounts['Other'] = { count: 0, engagement: 0 };
        }
        topicCounts['Other'].count++;
        topicCounts['Other'].engagement += post.reactions.total + post.comments + post.shares;
      }
    });
    
    // Format data for visualization
    const formattedData = Object.entries(topicCounts)
      .filter(([_, data]) => data.count > 0)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        engagement: data.engagement,
        averageEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0
      }));
    
    setTopicDistribution(formattedData);
    renderTopicDistributionChart(formattedData);
  };
  
  // Generate user interaction heatmap data
  const generateInteractionMap = () => {
    // Create day/hour heatmap data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Initialize empty heatmap data
    const heatmapData = daysOfWeek.map(day => ({
      day,
      hourlyData: Array(24).fill().map(() => ({ count: 0, engagement: 0 }))
    }));
    
    // Populate heatmap data
    posts.forEach(post => {
      if (post.postedAt) {
        const date = new Date(post.postedAt);
        const dayOfWeek = date.getDay(); // 0-6
        const hour = date.getHours(); // 0-23
        
        heatmapData[dayOfWeek].hourlyData[hour].count++;
        heatmapData[dayOfWeek].hourlyData[hour].engagement += 
          post.reactions.total + post.comments + post.shares;
      }
    });
    
    setInteractionMap(heatmapData);
    renderInteractionHeatmap(heatmapData);
  };
  
  // Render sentiment timeline chart
  const renderSentimentTimeline = (timelineData) => {
    if (!sentimentTimelineRef.current) return;
    const ctx = sentimentTimelineRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (sentimentTimelineRef.current.chart) {
      sentimentTimelineRef.current.chart.destroy();
    }
    
    // Sort dates
    const sortedDates = Object.keys(timelineData).sort();
    
    // Prepare datasets with improved colors for dark mode visibility
    const datasets = [
      {
        label: 'Positive',
        data: sortedDates.map(date => timelineData[date].positive),
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        borderColor: 'rgba(16, 185, 129, 0.9)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5
      },
      {
        label: 'Neutral',
        data: sortedDates.map(date => timelineData[date].neutral),
        backgroundColor: 'rgba(107, 114, 128, 0.25)',
        borderColor: 'rgba(107, 114, 128, 0.9)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(107, 114, 128, 1)',
        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5
      },
      {
        label: 'Negative',
        data: sortedDates.map(date => timelineData[date].negative),
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        borderColor: 'rgba(239, 68, 68, 0.9)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5
      }
    ];
    
    // Create chart
    sentimentTimelineRef.current.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            right: 25,
            bottom: 10,
            left: 10
          }
        },
        scales: {
          x: {
            grid: { 
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              tickLength: 8
            },
            ticks: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 11
              },
              maxRotation: 45,
              minRotation: 45
            },
            title: {
              display: true,
              text: timeFrame === 'daily' ? 'Date' : timeFrame === 'weekly' ? 'Week' : 'Month',
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                weight: 'bold'
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: { 
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' 
            },
            ticks: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              precision: 0,
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Number of Posts',
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                weight: 'bold'
              }
            }
          }
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: darkMode ? '#f8fafc' : '#18181b',
            bodyColor: darkMode ? '#f8fafc' : '#18181b',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            titleFont: {
              weight: 'bold'
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.raw} posts`;
              }
            }
          },
          legend: {
            position: 'top',
            align: 'center',
            labels: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Sentiment Trends Over Time',
            color: darkMode ? '#f8fafc' : '#18181b',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          }
        }
      }
    });
  };
  
  // Render topic distribution chart
  const renderTopicDistributionChart = (topicData) => {
    if (!topicDistributionRef.current) return;
    const ctx = topicDistributionRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (topicDistributionRef.current.chart) {
      topicDistributionRef.current.chart.destroy();
    }
    
    // Sort topics by post count
    const sortedTopics = [...topicData].sort((a, b) => b.count - a.count);
    
    // Prepare data
    const labels = sortedTopics.map(item => item.topic);
    const postCounts = sortedTopics.map(item => item.count);
    const avgEngagement = sortedTopics.map(item => item.averageEngagement);
    
    // Generate vibrant colors for each topic for better visibility in dark mode
    const backgroundColors = [
      '#4f46e5', // Indigo
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f97316', // Orange
      '#14b8a6', // Teal
      '#a855f7', // Purple
      '#84cc16', // Lime
      '#06aed4'  // More Cyan
    ];
    
    // Create chart
    topicDistributionRef.current.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Number of Posts',
            data: postCounts,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderColor: darkMode ? '#1e293b' : '#ffffff',
            borderWidth: 1,
            borderRadius: 6,
            order: 1,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Avg. Engagement per Post',
            data: avgEngagement,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 3,
            type: 'line',
            order: 0,
            yAxisID: 'y1',
            tension: 0.4,
            pointStyle: 'circle',
            pointRadius: 5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: darkMode ? '#1e293b' : '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: darkMode ? '#1e293b' : '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            right: 25,
            bottom: 10,
            left: 10
          }
        },
        scales: {
          x: {
            grid: { 
              display: false 
            },
            ticks: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 11,
                weight: '500'
              },
              maxRotation: 45,
              minRotation: 45,
              autoSkip: false
            }
          },
          y: {
            beginAtZero: true,
            grid: { 
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              precision: 0,
              font: {
                size: 11
              }
            },
            title: {
              display: true,
              text: 'Number of Posts',
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: { 
              color: darkMode ? '#10b981' : '#10b981',
              font: {
                size: 11,
                weight: '500'
              }
            },
            title: {
              display: true,
              text: 'Avg. Engagement',
              color: darkMode ? '#10b981' : '#10b981',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          }
        },
        plugins: {
          legend: {
            labels: { 
              color: darkMode ? '#f8fafc' : '#18181b',
              padding: 20,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: darkMode ? '#f8fafc' : '#18181b',
            bodyColor: darkMode ? '#f8fafc' : '#18181b',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            titleFont: {
              weight: 'bold'
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              }
            }
          },
          title: {
            display: true,
            text: 'Content Topic Distribution & Engagement',
            color: darkMode ? '#f8fafc' : '#18181b',
            font: {
              size: 14,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          }
        }
      }
    });
  };
  
  // Render interaction heatmap
  const renderInteractionHeatmap = (heatmapData) => {
    if (!interactionMapRef.current) return;
    const ctx = interactionMapRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (interactionMapRef.current.chart) {
      interactionMapRef.current.chart.destroy();
    }
    
    // Prepare data
    const days = heatmapData.map(d => d.day);
    
    // Format hours in 12-hour format with AM/PM
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      return `${hour}${ampm}`;
    });
    
    // Get engagement data for each hour/day combination
    const data = [];
    heatmapData.forEach((dayData, dayIndex) => {
      dayData.hourlyData.forEach((hourData, hourIndex) => {
        data.push({
          x: hourIndex,
          y: dayIndex,
          v: hourData.count > 0 ? hourData.engagement / hourData.count : 0
        });
      });
    });
    
    // Calculate max value for color scaling
    const maxValue = Math.max(...data.map(d => d.v));
    
    // Create a custom Chart.js plugin for the heatmap
    const plugin = {
      id: 'heatmapPlugin',
      beforeDraw: (chart) => {
        const { ctx, chartArea, scales } = chart;
        const { top, left, width, height } = chartArea;
        const cellWidth = width / 24;
        const cellHeight = height / 7;
        
        // Draw heatmap cells
        data.forEach(point => {
          const x = scales.x.getPixelForValue(point.x);
          const y = scales.y.getPixelForValue(point.y);
          
          // Calculate color intensity based on value
          const normalizedValue = point.v / maxValue;
          const intensity = Math.min(0.9, 0.1 + normalizedValue * 0.8);
          
          // Use a better color scale - from light blue to dark blue
          ctx.fillStyle = `rgba(65, 105, 225, ${intensity})`;
          
          // Draw cell with rounded corners for better appearance
          const radius = 2;
          const cellW = cellWidth - 2;
          const cellH = cellHeight - 2;
          ctx.beginPath();
          ctx.moveTo(x - cellW/2 + radius, y - cellH/2);
          ctx.lineTo(x + cellW/2 - radius, y - cellH/2);
          ctx.quadraticCurveTo(x + cellW/2, y - cellH/2, x + cellW/2, y - cellH/2 + radius);
          ctx.lineTo(x + cellW/2, y + cellH/2 - radius);
          ctx.quadraticCurveTo(x + cellW/2, y + cellH/2, x + cellW/2 - radius, y + cellH/2);
          ctx.lineTo(x - cellW/2 + radius, y + cellH/2);
          ctx.quadraticCurveTo(x - cellW/2, y + cellH/2, x - cellW/2, y + cellH/2 - radius);
          ctx.lineTo(x - cellW/2, y - cellH/2 + radius);
          ctx.quadraticCurveTo(x - cellW/2, y - cellH/2, x - cellW/2 + radius, y - cellH/2);
          ctx.closePath();
          ctx.fill();
          
          // Don't show numbers in cells, they'll be in tooltips instead
        });
        
        // Add a legend to explain color intensity
        const legendWidth = 150;
        const legendHeight = 15;
        const legendX = width - legendWidth - 20;
        const legendY = height + 30;
        
        // Draw gradient bar for legend
        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, 'rgba(65, 105, 225, 0.1)');
        gradient.addColorStop(1, 'rgba(65, 105, 225, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
        
        // Add legend border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
        
        // Add legend labels
        ctx.fillStyle = darkMode ? '#f8fafc' : '#18181b';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Low Engagement', legendX, legendY - 5);
        ctx.fillText('High Engagement', legendX + legendWidth, legendY - 5);
      }
    };
    
    // Create chart
    interactionMapRef.current.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        labels: hours,
        datasets: [{
          data: data,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: -0.5,
            max: 23.5,
            ticks: {
              stepSize: 3, // Show fewer hour labels for readability
              callback: function(value) {
                if (value % 3 === 0) { // Show every 3rd hour
                  const hour = value % 12 || 12;
                  const ampm = value < 12 ? 'AM' : 'PM';
                  return `${hour}${ampm}`;
                }
                return '';
              },
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 11
              }
            },
            grid: {
              display: true,
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: 'Hour of Day',
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          },
          y: {
            type: 'linear',
            min: -0.5,
            max: 6.5,
            ticks: {
              stepSize: 1,
              callback: function(value) {
                return days[value];
              },
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 11,
                weight: 'bold'
              }
            },
            grid: {
              display: true,
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: 'Day of Week',
              color: darkMode ? '#f8fafc' : '#18181b',
              font: {
                size: 12,
                weight: 'bold'
              }
            }
          }
        },
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 10,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            displayColors: false,
            callbacks: {
              title: function(context) {
                // Get the corresponding data point
                const dataIndex = context[0].dataIndex;
                const point = data[dataIndex];
                
                const hour = point.x % 12 || 12;
                const ampm = point.x < 12 ? 'AM' : 'PM';
                return `${days[point.y]} at ${hour}:00 ${ampm}`;
              },
              label: function(context) {
                // Get the corresponding data point
                const dataIndex = context.dataIndex;
                const point = data[dataIndex];
                
                const engagementValue = Math.round(point.v * 10) / 10; // Round to 1 decimal
                
                // Get the original hour/day data
                const dayData = heatmapData[point.y];
                const hourData = dayData.hourlyData[point.x];
                
                // Compare to average to provide context
                const avgEngagement = data.reduce((sum, d) => sum + d.v, 0) / data.length;
                let pctDiff = 0;
                if (avgEngagement > 0) {
                  pctDiff = Math.round(((point.v - avgEngagement) / avgEngagement) * 100);
                }
                
                const comparisonText = point.v > avgEngagement 
                  ? `${pctDiff}% above average`
                  : `${Math.abs(pctDiff)}% below average`;
                
                return [
                  `Engagement: ${engagementValue}`,
                  `Posts: ${hourData.count}`,
                  `${comparisonText}`
                ];
              }
            }
          },
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Best Time to Post for Highest Engagement',
            color: darkMode ? '#f8fafc' : '#18181b',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          subtitle: {
            display: true,
            text: 'Color intensity indicates average engagement level per post',
            color: darkMode ? '#94a3b8' : '#64748b',
            font: {
              size: 12,
              style: 'italic'
            },
            padding: {
              bottom: 10
            }
          }
        }
      },
      plugins: [plugin]
    });
  };
  
  // Render correlation scatter plot
  const renderCorrelationChart = () => {
    if (!correlationChartRef.current) return;
    const ctx = correlationChartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear any existing chart
    if (correlationChartRef.current.chart) {
      correlationChartRef.current.chart.destroy();
    }
    
    // Prepare data points for the scatter plot
    const dataPoints = posts.map(post => ({
      x: post.views, // Views on X-axis
      y: post.reactions.total + post.comments + post.shares, // Total engagement on Y-axis
      r: Math.sqrt(post.engagementRate) * 4 + 3, // Increase bubble size for better visibility
      post: post // Store the original post for reference in tooltips
    }));
    
    // Color based on sentiment instead of platform
    const colors = posts.map(post => {
      if (post.sentiment === 'positive') return 'rgba(16, 185, 129, 0.7)'; // Brighter green
      if (post.sentiment === 'negative') return 'rgba(239, 68, 68, 0.7)'; // Brighter red
      return 'rgba(107, 114, 128, 0.7)'; // Brighter gray for neutral
    });
    
    // Calculate max values for quadrant division
    const maxViews = Math.max(...dataPoints.map(p => p.x)) || 1;
    const maxEngagement = Math.max(...dataPoints.map(p => p.y)) || 1;
    
    correlationChartRef.current.chart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Posts',
          data: dataPoints,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.7', '0.9')),
          borderWidth: 1.5,
          hoverBorderWidth: 3,
          hoverBorderColor: colors.map(c => c.replace('0.7', '1')),
          hoverBackgroundColor: colors.map(c => c.replace('0.7', '0.8')),
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            right: 25,
            bottom: 25,
            left: 10
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: darkMode ? '#f8fafc' : '#1e293b',
            bodyColor: darkMode ? '#f8fafc' : '#1e293b',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            boxPadding: 5,
            titleFont: {
              weight: '600',
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              title: function(context) {
                const post = context[0].raw.post;
                return `${post.platformInfo.name} Post`;
              },
              label: function(context) {
                const post = context.raw.post;
                const totalEngagement = post.reactions.total + post.comments + post.shares;
                
                // Determine performance quadrant
                let quadrant = "";
                let quadrantColor = "";
                if (post.views > maxViews / 2) {
                  if (totalEngagement > maxEngagement / 2) {
                    quadrant = "High Reach, High Engagement (Optimal)";
                    quadrantColor = "#10b981"; // Green
                  } else {
                    quadrant = "High Reach, Low Engagement";
                    quadrantColor = "#f59e0b"; // Amber
                  }
                } else {
                  if (totalEngagement > maxEngagement / 2) {
                    quadrant = "Low Reach, High Engagement";
                    quadrantColor = "#3b82f6"; // Blue
                  } else {
                    quadrant = "Low Reach, Low Engagement";
                    quadrantColor = "#ef4444"; // Red
                  }
                }
                
                const contentPreview = post.content && post.content.length > 30 
                  ? post.content.substring(0, 30) + '...' 
                  : post.content || 'No content available';
                  
                return [
                  `Content: ${contentPreview}`,
                  `Views: ${post.views.toLocaleString()}`,
                  `Engagement: ${totalEngagement.toLocaleString()}`,
                  `Engagement Rate: ${post.engagementRate.toFixed(2)}%`,
                  `Sentiment: ${post.sentiment.charAt(0).toUpperCase() + post.sentiment.slice(1)}`,
                  `Quadrant: ${quadrant}`
                ];
              },
              labelTextColor: function(context) {
                return darkMode ? '#f8fafc' : '#1e293b';
              }
            }
          },
          title: {
            display: false // We have our own title
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Views',
              color: darkMode ? '#94a3b8' : '#64748b',
              font: {
                size: 13,
                weight: '500'
              },
              padding: {
                top: 15
              }
            },
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              tickLength: 8,
              drawBorder: false
            },
            ticks: {
              color: darkMode ? '#94a3b8' : '#64748b',
              font: {
                size: 11
              },
              maxRotation: 0,
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            beginAtZero: true
          },
          y: {
            title: {
              display: true,
              text: 'Total Engagement',
              color: darkMode ? '#94a3b8' : '#64748b',
              font: {
                size: 13,
                weight: '500'
              },
              padding: {
                bottom: 10
              }
            },
            grid: {
              color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              tickLength: 8,
              drawBorder: false
            },
            ticks: {
              color: darkMode ? '#94a3b8' : '#64748b',
              font: {
                size: 11
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            beginAtZero: true
          }
        },
        // Add annotation plugin to indicate quadrants
        plugins: [{
          id: 'quadrants',
          beforeDraw: (chart) => {
            const {ctx, chartArea, scales} = chart;
            const {top, left, width, height} = chartArea;
            
            const midX = left + width / 2;
            const midY = top + height / 2;
            
            // Draw quadrant dividing lines
            ctx.save();
            ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            
            // Vertical divider
            ctx.beginPath();
            ctx.moveTo(midX, top);
            ctx.lineTo(midX, top + height);
            ctx.stroke();
            
            // Horizontal divider
            ctx.beginPath();
            ctx.moveTo(left, midY);
            ctx.lineTo(left + width, midY);
            ctx.stroke();
            
            // Add quadrant labels with subtle backgrounds
            const fontSize = 11;
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            
            // Top-right - High reach, high engagement
            ctx.fillStyle = darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)';
            const tr = {
              x: midX + (width / 4),
              y: top + (height / 4) - 15,
              text: 'Optimal Performance',
              w: 130,
              h: 20
            };
            ctx.fillRect(tr.x - tr.w/2, tr.y - tr.h/2, tr.w, tr.h);
            ctx.fillStyle = '#10b981';
            ctx.fillText(tr.text, tr.x, tr.y + 4);
            
            // Top-left - Low reach, high engagement
            ctx.fillStyle = darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';
            const tl = {
              x: midX - (width / 4),
              y: top + (height / 4) - 15,
              text: 'High Engagement',
              w: 120,
              h: 20
            };
            ctx.fillRect(tl.x - tl.w/2, tl.y - tl.h/2, tl.w, tl.h);
            ctx.fillStyle = '#3b82f6';
            ctx.fillText(tl.text, tl.x, tl.y + 4);
            
            // Bottom-right - High reach, low engagement
            ctx.fillStyle = darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)';
            const br = {
              x: midX + (width / 4),
              y: top + (height * 3/4) + 15,
              text: 'High Reach',
              w: 90,
              h: 20
            };
            ctx.fillRect(br.x - br.w/2, br.y - br.h/2, br.w, br.h);
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(br.text, br.x, br.y + 4);
            
            // Bottom-left - Low reach, low engagement
            ctx.fillStyle = darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';
            const bl = {
              x: midX - (width / 4),
              y: top + (height * 3/4) + 15,
              text: 'Low Performance',
              w: 120,
              h: 20
            };
            ctx.fillRect(bl.x - bl.w/2, bl.y - bl.h/2, bl.w, bl.h);
            ctx.fillStyle = '#ef4444';
            ctx.fillText(bl.text, bl.x, bl.y + 4);
            
            ctx.restore();
          }
        }]
      }
    });
  };
  
  const handlePostSelect = (post) => {
    setSelectedPost(post);
    navigate(`/post/${post.id}`);
  };
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };
  
  const getFilteredPosts = () => {
    // If keyword filter is active, use already filtered posts
    if (keywordFilter && filteredPostsByKeyword.length > 0) {
      return filteredPostsByKeyword.filter(post => {
        if (filterPlatform !== 'all' && post.platform !== filterPlatform) {
          return false;
        }
        
        if (postTypeFilter !== 'all' && post.postType !== postTypeFilter) {
          return false;
        }
        
        // New sentiment filter
        if (sentimentFilter !== 'all' && post.sentiment !== sentimentFilter) {
          return false;
        }
        
        // New minimum engagement filter
        const engagementRate = post.engagementRate || 0;
        if (engagementRate < minEngagementFilter) {
          return false;
        }
        
        // Date range filtering
        if (dateRange !== 'all') {
          const postDate = new Date(post.postedAt);
          const now = new Date();
          let cutoffDate;
          
          if (dateRange === '7days') {
            cutoffDate = new Date(now.setDate(now.getDate() - 7));
          } else if (dateRange === '30days') {
            cutoffDate = new Date(now.setDate(now.getDate() - 30));
          } else if (dateRange === '90days') {
            cutoffDate = new Date(now.setDate(now.getDate() - 90));
          }
          
          if (postDate < cutoffDate) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // Otherwise use normal filtering
    return posts.filter(post => {
      if (filterPlatform !== 'all' && post.platform !== filterPlatform) {
        return false;
      }
      
      if (postTypeFilter !== 'all' && post.postType !== postTypeFilter) {
        return false;
      }
      
      // New sentiment filter
      if (sentimentFilter !== 'all' && post.sentiment !== sentimentFilter) {
        return false;
      }
      
      // New minimum engagement filter
      const engagementRate = post.engagementRate || 0;
      if (engagementRate < minEngagementFilter) {
        return false;
      }
      
      // Date range filtering
      if (dateRange !== 'all') {
        const postDate = new Date(post.postedAt);
        const now = new Date();
        let cutoffDate;
        
        if (dateRange === '7days') {
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
        } else if (dateRange === '30days') {
          cutoffDate = new Date(now.setDate(now.getDate() - 30));
        } else if (dateRange === '90days') {
          cutoffDate = new Date(now.setDate(now.getDate() - 90));
        }
        
        if (postDate < cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  const getSortedPosts = () => {
    const filtered = getFilteredPosts();
    
    switch (sortBy) {
      case 'engagement':
        return [...filtered].sort((a, b) => 
          (b.reactions.total + b.comments + b.shares) - 
          (a.reactions.total + a.comments + a.shares)
        );
      case 'engagementRate':
        return [...filtered].sort((a, b) => b.engagementRate - a.engagementRate);
      case 'views':
        return [...filtered].sort((a, b) => b.views - a.views);
      case 'recent':
        return [...filtered].sort((a, b) => 
          new Date(b.postedAt) - new Date(a.postedAt)
        );
      case 'vitality':
      default:
        return [...filtered].sort((a, b) => b.vitalityScore - a.vitalityScore);
    }
  };
  
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Update latest posts
  const updateLatestPosts = () => {
    // Sort posts by date (newest first)
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(b.postedAt) - new Date(a.postedAt)
    );
    
    // Take top 10 most recent posts
    setLatestPosts(sortedPosts.slice(0, 10));
  };
  
  // Add handler for keyword selection
  const handleKeywordSelect = (word) => {
    // If already selected, clear the filter
    if (keywordFilter && keywordFilter.text === word.text) {
      setKeywordFilter(null);
      setFilteredPostsByKeyword([]);
      return;
    }
    
    // Set the selected keyword
    setKeywordFilter(word);
    
    // Filter posts containing this keyword
    const keywordLower = word.text.toLowerCase();
    const relatedPosts = posts.filter(post => 
      post.content && post.content.toLowerCase().includes(keywordLower)
    );
    
    setFilteredPostsByKeyword(relatedPosts);
    
    // Scroll to posts section to show filtered results
    document.getElementById('posts-overview-section')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };
  
  // Add exportData function
  const exportData = (format) => {
    // Transform posts data to match expected format for export utilities
    const exportData = {};
    
    // Group posts by platform
    posts.forEach(post => {
      const platform = post.platformInfo.name;
      
      if (!exportData[platform]) {
        exportData[platform] = { posts: [] };
      }
      
      exportData[platform].posts.push({
        post_id: post.id,
        content: post.content,
        sentiment: post.sentiment,
        likes: post.reactions.total,
        comments_count: post.comments,
        shares: post.shares,
        reach: post.views,
        virality_score: post.vitalityScore
      });
    });
    
    // Export based on selected format
    if (format === 'csv') {
      exportAsCSV(exportData);
    } else if (format === 'json') {
      exportAsJSON(exportData);
    }
    
    // Hide export menu after export
    setShowExportMenu(false);
  };
  
  // Add this function to get top posts by the currently selected ranking metric
  const getTopPosts = () => {
    let sortedPosts = [...posts];
    
    switch (rankingMetric) {
      case 'reactions':
        sortedPosts.sort((a, b) => b.reactions.total - a.reactions.total);
        break;
      case 'views':
        sortedPosts.sort((a, b) => b.views - a.views);
        break;
      case 'engagementRate':
      default:
        sortedPosts.sort((a, b) => b.engagementRate - a.engagementRate);
        break;
    }
    
    // Return top 5 posts
    return sortedPosts.slice(0, 5);
  };
  
  // Update charts when rankingMetric changes
  useEffect(() => {
    if (!loading && posts.length > 0) {
      // No need to re-render all charts, just force a re-render of the component
      // when rankingMetric changes
    }
  }, [rankingMetric]);
  
  if (loading) {
    return (
      <div className={`social-dashboard ${darkMode ? 'dark-mode' : ''}`}>
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`social-dashboard ${darkMode ? 'dark-mode' : ''}`}>
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }
  
  const displayPosts = getSortedPosts();

  return (
    <div className={`social-dashboard ${darkMode ? 'dark-mode' : ''}`}>
      <header className="dashboard-header">
        <div className="logo-container">
          <div className="logo-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <h1>SIMS Data Analyzer</h1>
        </div>
        
        <div className="header-controls">
          <div className="filter-group" style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px',
            alignItems: 'center'
          }}>
            <select 
              value={filterPlatform} 
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="filter-select"
              style={{
                minWidth: '130px',
                height: '38px',
                borderRadius: '6px',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                padding: '0 10px',
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                color: darkMode ? '#f8fafc' : '#1e293b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <option value="all">All Platforms</option>
              {Object.entries(PLATFORM_INFO_MAP).map(([key, platform]) => (
                <option key={key} value={key}>{platform.name}</option>
              ))}
            </select>
            
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
              style={{
                minWidth: '130px',
                height: '38px',
                borderRadius: '6px',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                padding: '0 10px',
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                color: darkMode ? '#f8fafc' : '#1e293b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
              style={{
                minWidth: '130px',
                height: '38px',
                borderRadius: '6px',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                padding: '0 10px',
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                color: darkMode ? '#f8fafc' : '#1e293b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <option value="vitality">Vitality Score</option>
              <option value="engagement">Total Engagement</option>
              <option value="engagementRate">Engagement Rate</option>
              <option value="views">Views</option>
              <option value="recent">Most Recent</option>
            </select>

            <div className="filter-dropdown" style={{ position: 'relative' }}>
              <button 
                className="filter-button"
                onClick={() => document.getElementById('advanced-filters').classList.toggle('show')}
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  color: darkMode ? '#f8fafc' : '#1e293b',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <i className="fas fa-filter" style={{ marginRight: '8px' }}></i>
                Advanced Filters
              </button>
              <div 
                id="advanced-filters" 
                className="dropdown-content"
                style={{
                  display: 'none',
                  position: 'absolute',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  minWidth: '250px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  borderRadius: '8px',
                  marginTop: '4px',
                  padding: '12px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>Post Type</label>
                  <select 
                    value={postTypeFilter} 
                    onChange={(e) => setPostTypeFilter(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      padding: '0 10px',
                      backgroundColor: darkMode ? '#111827' : '#ffffff',
                      color: darkMode ? '#f8fafc' : '#1e293b'
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>Sentiment</label>
                  <select 
                    value={sentimentFilter} 
                    onChange={(e) => setSentimentFilter(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '6px',
                      border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      padding: '0 10px',
                      backgroundColor: darkMode ? '#111827' : '#ffffff',
                      color: darkMode ? '#f8fafc' : '#1e293b'
                    }}
                  >
                    <option value="all">All Sentiment</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>Min Engagement: {minEngagementFilter}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minEngagementFilter}
                      onChange={(e) => setMinEngagementFilter(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: '#4f46e5'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="action-group" style={{
            display: 'flex',
            gap: '8px',
            marginLeft: '12px'
          }}>
            <button onClick={fetchData} className="btn-icon" title="Refresh Data" style={{
              width: '38px',
              height: '38px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              color: darkMode ? '#f8fafc' : '#1e293b',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <i className="fas fa-sync-alt"></i>
            </button>
            <button onClick={toggleTheme} className="btn-icon" title="Toggle Dark Mode" style={{
              width: '38px',
              height: '38px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              color: darkMode ? '#f8fafc' : '#1e293b',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <i className={`fas fa-${darkMode ? 'sun' : 'moon'}`}></i>
            </button>
            <div className="export-dropdown" ref={exportMenuRef} style={{ position: 'relative' }}>
              <button 
                className="btn-icon" 
                title="Export Data"
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                  color: darkMode ? '#f8fafc' : '#1e293b',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <i className="fas fa-download"></i>
              </button>
              {showExportMenu && (
                <div className="export-menu" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 0',
                  zIndex: 10,
                  minWidth: '120px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                }}>
                  <button onClick={() => exportData('csv')} style={{
                    display: 'block',
                    padding: '8px 12px',
                    width: '100%',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    cursor: 'pointer'
                  }}>
                    Export as CSV
                  </button>
                  <button onClick={() => exportData('json')} style={{
                    display: 'block',
                    padding: '8px 12px',
                    width: '100%',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    cursor: 'pointer'
                  }}>
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="dashboard-main">
        {/* Dashboard Summary */}
        <div className="dashboard-summary">
          <div className="summary-card total-posts">
            <i className="fas fa-file-alt"></i>
            <div className="summary-data">
              <div className="summary-value">{posts.length}</div>
              <div className="summary-label">Total Posts</div>
            </div>
          </div>
          
          <div className="summary-card total-engagement">
            <i className="fas fa-comments"></i>
            <div className="summary-data">
              <div className="summary-value">
                {formatNumber(posts.reduce((sum, post) => sum + post.reactions.total + post.comments + post.shares, 0))}
              </div>
              <div className="summary-label">Total Engagement</div>
            </div>
          </div>
          
          <div className="summary-card total-views">
            <i className="fas fa-eye"></i>
            <div className="summary-data">
              <div className="summary-value">
                {formatNumber(posts.reduce((sum, post) => sum + post.views, 0))}
              </div>
              <div className="summary-label">Total Views</div>
            </div>
          </div>
          
          <div className="summary-card avg-engagement-rate">
            <i className="fas fa-percentage"></i>
            <div className="summary-data">
              <div className="summary-value">
                {(posts.reduce((sum, post) => sum + post.engagementRate, 0) / (posts.length || 1)).toFixed(2)}%
              </div>
              <div className="summary-label">Avg. Engagement Rate</div>
            </div>
          </div>
        </div>
        
        {/* New KPI Summary Cards with more visual information */}
        <div className="kpi-summary">
          {/* Removing these boxes since they've been moved elsewhere */}
        </div>
        
        {/* Analytics Overview Section */}
        <div className="analytics-overview">
          <div className="overview-charts-container">
            {/* Latest Posts Table */}
            <div className="overview-card latest-posts-table">
              <div className="latest-posts-header">
                <h2>Latest Posts</h2>
                <div className="latest-posts-timestamp">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </div>
              <div className="table-container">
                <table className="latest-posts-table">
                  <thead>
                    <tr>
                      <th className="text-center">Platform</th>
                      <th className="text-center">Posted</th>
                      <th className="text-center">Content</th>
                      <th className="text-center">Reactions</th>
                      <th className="text-center">Comments</th>
                      <th className="text-center">Shares</th>
                      <th className="text-center">Engagement</th>
                      <th className="text-center">Sentiment</th>
                      <th className="text-center">Post Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestPosts.map(post => (
                      <tr 
                        key={post.id} 
                        onClick={() => handlePostSelect(post)} 
                        className={`post-row ${
                          keywordFilter && post.content && post.content.toLowerCase().includes(keywordFilter.text.toLowerCase()) ? 'keyword-match' : ''
                        }`}
                      >
                        <td className="text-center">
                          <div 
                            className="table-platform-badge" 
                            style={{ backgroundColor: post.platformInfo.color }}
                          >
                            <i className={post.platformInfo.icon}></i>
                            {post.platformInfo.name}
                          </div>
                        </td>
                        <td className="text-center">{new Date(post.postedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</td>
                        <td className="post-content-cell text-center">
                          {post.content && post.content.length > 60 
                            ? post.content.substring(0, 60) + '...' 
                            : post.content || 'No content available'}
                        </td>
                        <td className="numeric-cell text-center">{formatNumber(post.reactions.total)}</td>
                        <td className="numeric-cell text-center">{formatNumber(post.comments)}</td>
                        <td className="numeric-cell text-center">{formatNumber(post.shares)}</td>
                        <td className="numeric-cell text-center">{post.engagementRate.toFixed(2)}%</td>
                        <td className="text-center">
                          <span className={`sentiment-badge ${post.sentiment}`}>
                            <i className={`fas fa-${
                              post.sentiment === 'positive' ? 'smile' : 
                              post.sentiment === 'negative' ? 'frown' : 'meh'
                            }`}></i>
                            {post.sentiment}
                          </span>
                        </td>
                        <td className="text-center">
                          <a 
                            href={post.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="view-post-link"
                            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the link
                          >
                            <i className="fas fa-external-link-alt"></i> <span>View</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {latestPosts.length === 0 && (
                  <div className="no-data-message">No posts found</div>
                )}
              </div>
            </div>
            
            {/* REARRANGED: Posts Overview Section moved here */}
            <div className="overview-card posts-overview-section">
              <div className="section-header">
                <h2>Posts Overview</h2>
                <div className="post-count">
                  {displayPosts.length} posts found
                </div>
              </div>
              
              <div className="posts-grid">
                {displayPosts.slice(0, 12).map(post => (
                  <div 
                    key={post.id} 
                    className={`post-card ${selectedPost?.id === post.id ? 'selected' : ''} ${
                      keywordFilter && post.content && post.content.toLowerCase().includes(keywordFilter.text.toLowerCase()) ? 'keyword-match' : ''
                    }`}
                    onClick={() => handlePostSelect(post)}
                    style={{ display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', borderRadius: 14, background: '#fff', transition: 'box-shadow 0.2s, transform 0.2s' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px 0 18px' }}>
                      <div className="platform-badge" style={{ backgroundColor: post.platformInfo.color, color: '#fff', fontWeight: 600, borderRadius: 18, padding: '6px 14px', fontSize: 15, display: 'flex', alignItems: 'center' }}>
                        <i className={post.platformInfo.icon} style={{ marginRight: 8 }}></i>
                        {post.platformInfo.name}
                      </div>
                      <div className="vitality-score" title="Vitality Score" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: '#f59e0b', fontSize: 18 }}>
                        <i className="fas fa-bolt" style={{ marginRight: 6 }}></i>
                        <span>{parseFloat(post.vitalityScore).toFixed(1)}</span>
                      </div>
                    </div>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#f3f4f6', marginTop: 12, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(post.featuredImage || post.screenshot) ? (
                        <img src={post.featuredImage || post.screenshot} alt="Post thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#bbb', fontSize: 18, textAlign: 'center', width: '100%' }}>No content available</div>
                      )}
                    </div>
                    <div style={{ padding: '16px 18px 0 18px', flex: 1, minHeight: 60 }}>
                      <div style={{ fontSize: 15, color: '#222', marginBottom: 8, fontWeight: 500, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {post.content && post.content.length > 120 ? post.content.substring(0, 120) + '...' : post.content || 'No content available'}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', marginTop: 16, padding: '12px 18px 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 18, fontSize: 15, color: '#64748b', fontWeight: 500 }}>
                        <span title="Reactions"><i className="fas fa-heart" style={{ marginRight: 4, color: '#ef4444' }}></i>{formatNumber(post.reactions.total)}</span>
                        <span title="Comments"><i className="fas fa-comment" style={{ marginRight: 4, color: '#10b981' }}></i>{formatNumber(post.comments)}</span>
                        <span title="Shares"><i className="fas fa-share" style={{ marginRight: 4, color: '#4f46e5' }}></i>{formatNumber(post.shares)}</span>
                        <span title="Views"><i className="fas fa-eye" style={{ marginRight: 4, color: '#f59e0b' }}></i>{formatNumber(post.views)}</span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 18px 16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                      <span>{formatDate(post.postedAt)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {post.sources.join(', ')}
                        <span className={`sentiment-badge ${post.sentiment}`} style={{ marginLeft: 10, background: '#f1f5f9', borderRadius: 16, padding: '4px 12px', fontWeight: 600, color: post.sentiment === 'positive' ? '#10b981' : post.sentiment === 'negative' ? '#ef4444' : '#64748b', display: 'flex', alignItems: 'center', fontSize: 14 }}>
                          <i className={`fas fa-${post.sentiment === 'positive' ? 'smile' : post.sentiment === 'negative' ? 'frown' : 'meh'}`} style={{ marginRight: 6 }}></i>
                          {post.sentiment}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {displayPosts.length > 12 && (
                <div className="load-more">
                  <button className="btn-secondary">Load More Posts</button>
                </div>
              )}
            </div>
            
            {/* REARRANGED: Word Cloud (Trending Keywords & Hashtags) moved here */}
            <div className="overview-card keywords-cloud" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '18px',
              background: '#fff',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>
                Trending Keywords
              </div>
              <div style={{ width: '100%', height: 350 }}>
                <ReactWordcloud
                  words={keywords.slice(0, 50)} // Show top 50 keywords
                  options={{
                    rotations: 3,
                    rotationAngles: [0, 0, 90],
                    fontSizes: [18, 38],
                    fontFamily: 'inherit',
                    padding: 3,
                    scale: 'sqrt',
                    spiral: 'archimedean',
                    deterministic: false,
                    transitionDuration: 500,
                    enableTooltip: true,
                    colors: [
                      '#00897b', '#43a047', '#f9a825', '#f4511e', '#6d4c41',
                      '#3949ab', '#0288d1', '#c62828', '#ad1457', '#7b1fa2'
                    ]
                  }}
                />
              </div>
              <div style={{
                marginTop: 12,
                fontSize: '0.95rem',
                color: '#666',
                textAlign: 'center'
              }}>
                Top 50 keywords by importance
              </div>
            </div>
            
            <div className="overview-card time-series">
              <div className="time-series-header">
                <h2>Post Performance Over Time</h2>
                <div className="time-controls">
                  <button 
                    className={`time-btn ${timeFrame === 'daily' ? 'active' : ''}`} 
                    onClick={() => setTimeFrame('daily')}
                  >
                    Daily
                  </button>
                  <button 
                    className={`time-btn ${timeFrame === 'weekly' ? 'active' : ''}`} 
                    onClick={() => setTimeFrame('weekly')}
                  >
                    Weekly
                  </button>
                  <button 
                    className={`time-btn ${timeFrame === 'monthly' ? 'active' : ''}`} 
                    onClick={() => setTimeFrame('monthly')}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              <div className="chart-container time-series-chart">
                <canvas ref={timeSeriesChartRef}></canvas>
              </div>
            </div>
            
            <div className="chart-row">
              <div className="overview-card platform-distribution">
                <h2>Platform Distribution</h2>
                <div className="chart-container">
                  <canvas ref={platformDistributionRef}></canvas>
                </div>
              </div>
              
              <div className="overview-card post-type-engagement">
                <h2>Engagement by Post Type</h2>
                <div className="chart-container">
                  <canvas ref={postTypeEngagementRef}></canvas>
                </div>
              </div>
            </div>
            
            <div className="chart-row">
              <div className="overview-card sentiment-analysis">
                <h2>Sentiment Analysis</h2>
                <div className="chart-container">
                  <canvas ref={sentimentChartRef}></canvas>
                </div>
              </div>
              
              <div className="overview-card engagement-rate">
                <h2>Top Posts by Engagement Rate</h2>
                <div className="chart-container">
                  <canvas ref={engagementRateChartRef}></canvas>
                </div>
              </div>
            </div>
            
            <div className="chart-row">
              <div className="overview-card views-comments-bubble">
                <h2>Views vs. Comments</h2>
                <div className="chart-container">
                  <canvas ref={bubbleChartRef}></canvas>
                </div>
              </div>
              
              <div className="overview-card platform-comparison">
                <h2>Platform Comparison</h2>
                <div className="chart-container">
                  <canvas ref={platformComparisonRef}></canvas>
                </div>
              </div>
            </div>
            
            <div className="chart-row">
              <div className="overview-card engagement-heatmap">
                <h2>Post Timing Analysis</h2>
                <div className="chart-container">
                  <canvas ref={heatmapChartRef}></canvas>
                </div>
              </div>
              
              <div className="overview-card hourly-performance">
                <h2>Time-of-Day Performance</h2>
                <div className="chart-container">
                  <canvas ref={hourlyHeatmapRef}></canvas>
                </div>
              </div>
            </div>
            
            {/* New charts - Sentiment Timeline */}
            <div className="overview-card sentiment-timeline">
              <h2>Sentiment Trends Over Time</h2>
              <div className="chart-container">
                <canvas ref={sentimentTimelineRef}></canvas>
              </div>
            </div>
            
            {/* New charts row - Topic Distribution and Interaction Heatmap */}
            <div className="chart-row">
              <div className="overview-card topic-distribution">
                <h2>Content Topic Analysis</h2>
                <div className="chart-container">
                  <canvas ref={topicDistributionRef}></canvas>
                </div>
              </div>
              
              <div className="overview-card interaction-heatmap">
                <h2>Engagement Timing Analysis</h2>
                <div className="chart-container">
                  <canvas ref={interactionMapRef}></canvas>
                </div>
              </div>
            </div>
            
            {/* KPI boxes moved here, before correlation chart */}
            <div className="dashboard-insights" style={{ 
              marginTop: '30px', 
              marginBottom: '30px', 
              backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ 
                marginBottom: '24px', 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                color: darkMode ? '#f8fafc' : '#1e293b',
                borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                paddingBottom: '12px'
              }}>
                <i className="fas fa-chart-line" style={{ marginRight: '10px' }}></i>
                Performance Insights
              </h2>
              
              {/* Sentiment Distribution */}
              <div className="kpi-card sentiment-distribution" style={{ 
                marginBottom: '24px', 
                backgroundColor: darkMode ? '#111827' : '#ffffff',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="kpi-header" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '600',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    margin: 0
                  }}>Sentiment Distribution</h3>
                  <div className="kpi-icon" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}>
                    <i className="fas fa-smile"></i>
                  </div>
                </div>
                <div className="kpi-content">
                  <div className="sentiment-bars" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    gap: '24px'
                  }}>
                    <div className="sentiment-bar-group" style={{ flex: 1 }}>
                      <div className="sentiment-label" style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontWeight: '500',
                        color: darkMode ? '#10b981' : '#10b981'
                      }}>
                        <i className="fas fa-smile" style={{ marginRight: '8px' }}></i>
                        Positive
                      </div>
                      <div className="sentiment-bar-container" style={{
                        height: '12px',
                        backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div 
                          className="sentiment-bar positive" 
                          style={{ 
                            width: `${(sentimentData.positive / (posts.length || 1)) * 100}%`,
                            height: '100%',
                            backgroundColor: '#10b981',
                            borderRadius: '6px'
                          }}
                        ></div>
                      </div>
                      <div className="sentiment-value" style={{
                        fontSize: '0.9rem',
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>{sentimentData.positive} posts</div>
                    </div>
                    <div className="sentiment-bar-group" style={{ flex: 1 }}>
                      <div className="sentiment-label" style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontWeight: '500',
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>
                        <i className="fas fa-meh" style={{ marginRight: '8px' }}></i>
                        Neutral
                      </div>
                      <div className="sentiment-bar-container" style={{
                        height: '12px',
                        backgroundColor: darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div 
                          className="sentiment-bar neutral" 
                          style={{ 
                            width: `${(sentimentData.neutral / (posts.length || 1)) * 100}%`,
                            height: '100%',
                            backgroundColor: '#94a3b8',
                            borderRadius: '6px'
                          }}
                        ></div>
                      </div>
                      <div className="sentiment-value" style={{
                        fontSize: '0.9rem',
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>{sentimentData.neutral} posts</div>
                    </div>
                    <div className="sentiment-bar-group" style={{ flex: 1 }}>
                      <div className="sentiment-label" style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontWeight: '500',
                        color: darkMode ? '#ef4444' : '#ef4444'
                      }}>
                        <i className="fas fa-frown" style={{ marginRight: '8px' }}></i>
                        Negative
                      </div>
                      <div className="sentiment-bar-container" style={{
                        height: '12px',
                        backgroundColor: darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div 
                          className="sentiment-bar negative" 
                          style={{ 
                            width: `${(sentimentData.negative / (posts.length || 1)) * 100}%`,
                            height: '100%',
                            backgroundColor: '#ef4444',
                            borderRadius: '6px'
                          }}
                        ></div>
                      </div>
                      <div className="sentiment-value" style={{
                        fontSize: '0.9rem',
                        color: darkMode ? '#94a3b8' : '#64748b'
                      }}>{sentimentData.negative} posts</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Platform Breakdown */}
              <div className="kpi-card platform-breakdown" style={{ 
                marginBottom: '24px',
                backgroundColor: darkMode ? '#111827' : '#ffffff',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="kpi-header" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '600',
                    color: darkMode ? '#f8fafc' : '#1e293b',
                    margin: 0
                  }}>Platform Breakdown</h3>
                  <div className="kpi-icon" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}>
                    <i className="fas fa-share-alt"></i>
                  </div>
                </div>
                <div className="kpi-content">
                  <div className="platform-pills" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    {Object.entries(posts.reduce((acc, post) => {
                      const platform = post.platform;
                      acc[platform] = (acc[platform] || 0) + 1;
                      return acc;
                    }, {})).sort((a, b) => b[1] - a[1]).map(([platform, count]) => {
                      const totalPosts = posts.length || 1;
                      const percentage = ((count / totalPosts) * 100).toFixed(1);
                      
                      return (
                        <div 
                          key={platform} 
                          className="platform-pill" 
                          style={{ 
                            backgroundColor: PLATFORM_INFO_MAP[platform].color,
                            borderRadius: '8px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#ffffff',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <i className={PLATFORM_INFO_MAP[platform].icon} style={{ marginRight: '8px', fontSize: '1.1rem' }}></i>
                          <span>{PLATFORM_INFO_MAP[platform].name}</span>
                          <div className="platform-count" style={{
                            marginLeft: '10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.8rem'
                          }}>{count} ({percentage}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Post Type and Engagement Distribution */}
              <div className="kpi-summary-row" style={{ 
                display: 'flex', 
                gap: '24px', 
                marginBottom: '20px'
              }}>
                <div className="kpi-card post-type-distribution" style={{ 
                  flex: 1,
                  backgroundColor: darkMode ? '#111827' : '#ffffff',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <div className="kpi-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: '600',
                      color: darkMode ? '#f8fafc' : '#1e293b',
                      margin: 0
                    }}>Post Type Distribution</h3>
                    <div className="kpi-icon" style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8'
                    }}>
                      <i className="fas fa-th-large"></i>
                    </div>
                  </div>
                  <div className="kpi-content">
                    <div className="type-percentage-bars" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {Object.entries(posts.reduce((acc, post) => {
                        const type = post.postType || 'text';
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})).map(([type, count]) => {
                        const percent = (count / (posts.length || 1)) * 100;
                        
                        // Define colors for each type
                        const typeColors = {
                          text: { bg: '#4f46e5', light: 'rgba(79, 70, 229, 0.15)' },
                          image: { bg: '#10b981', light: 'rgba(16, 185, 129, 0.15)' },
                          video: { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' }
                        };
                        
                        const typeColor = typeColors[type] || typeColors.text;
                        
                        return (
                          <div key={type} className="type-percentage-group">
                            <div className="type-label" style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginBottom: '8px',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <i className={`fas fa-${
                                  type === 'image' ? 'image' : 
                                  type === 'video' ? 'video' : 'file-alt'
                                }`} style={{ 
                                  marginRight: '8px',
                                  color: typeColor.bg,
                                  width: '20px'
                                }}></i>
                                <span style={{ 
                                  fontWeight: '500',
                                  color: darkMode ? '#f8fafc' : '#1e293b' 
                                }}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                              </div>
                              <span className="type-percent" style={{
                                fontWeight: '600',
                                color: typeColor.bg
                              }}>{percent.toFixed(1)}%</span>
                            </div>
                            <div className="type-bar-container" style={{
                              height: '10px',
                              backgroundColor: typeColor.light,
                              borderRadius: '5px',
                              overflow: 'hidden'
                            }}>
                              <div 
                                className={`type-bar ${type}`} 
                                style={{ 
                                  width: `${percent}%`,
                                  height: '100%',
                                  backgroundColor: typeColor.bg,
                                  borderRadius: '5px'
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="kpi-card engagement-metrics" style={{ 
                  flex: 1,
                  backgroundColor: darkMode ? '#111827' : '#ffffff',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <div className="kpi-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: '600',
                      color: darkMode ? '#f8fafc' : '#1e293b',
                      margin: 0
                    }}>Engagement Breakdown</h3>
                    <div className="kpi-icon" style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: darkMode ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8'
                    }}>
                      <i className="fas fa-chart-pie"></i>
                    </div>
                  </div>
                  <div className="kpi-content">
                    <div className="engagement-stats" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {(() => {
                        const totalReactions = posts.reduce((sum, post) => sum + post.reactions.total, 0);
                        const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
                        const totalShares = posts.reduce((sum, post) => sum + post.shares, 0);
                        const total = totalReactions + totalComments + totalShares || 1;
                        
                        // Define engagement type colors and icons
                        const engagementTypes = [
                          { 
                            label: 'Reactions',
                            value: totalReactions,
                            percent: ((totalReactions / total) * 100).toFixed(1),
                            icon: 'fas fa-heart',
                            color: '#ef4444',
                            lightColor: 'rgba(239, 68, 68, 0.1)'
                          },
                          { 
                            label: 'Comments',
                            value: totalComments,
                            percent: ((totalComments / total) * 100).toFixed(1),
                            icon: 'fas fa-comment',
                            color: '#10b981',
                            lightColor: 'rgba(16, 185, 129, 0.1)'
                          },
                          { 
                            label: 'Shares',
                            value: totalShares,
                            percent: ((totalShares / total) * 100).toFixed(1),
                            icon: 'fas fa-share',
                            color: '#4f46e5',
                            lightColor: 'rgba(79, 70, 229, 0.1)'
                          }
                        ];
                        
                        return (
                          <>
                            {engagementTypes.map((type, index) => (
                              <div className="stat-item" key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                              }}>
                                <div className="stat-icon" style={{
                                  width: '50px',
                                  height: '50px',
                                  borderRadius: '12px',
                                  backgroundColor: type.lightColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.2rem',
                                  color: type.color,
                                  flexShrink: 0
                                }}>
                                  <i className={type.icon}></i>
                                </div>
                                <div className="stat-info" style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  flex: 1
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    marginBottom: '4px'
                                  }}>
                                    <div className="stat-label" style={{
                                      color: darkMode ? '#94a3b8' : '#64748b',
                                      fontSize: '0.9rem'
                                    }}>{type.label}</div>
                                    <div className="stat-percent" style={{
                                      fontWeight: '600',
                                      color: type.color,
                                      fontSize: '0.9rem'
                                    }}>{type.percent}%</div>
                                  </div>
                                  <div className="stat-value" style={{
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem',
                                    color: darkMode ? '#f8fafc' : '#1e293b'
                                  }}>{formatNumber(type.value)}</div>
                                  <div className="progress-bar" style={{
                                    height: '6px',
                                    backgroundColor: type.lightColor,
                                    borderRadius: '3px',
                                    marginTop: '8px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${type.percent}%`,
                                      backgroundColor: type.color,
                                      borderRadius: '3px'
                                    }}></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* New charts - Correlation Scatter Plot */}
            <div className="overview-card correlation-scatter" style={{
              backgroundColor: darkMode ? '#111827' : '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              margin: '20px 0 30px 0'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                color: darkMode ? '#f8fafc' : '#1e293b'
              }}>
                <i className="fas fa-chart-scatter" style={{ marginRight: '10px', color: '#4f46e5' }}></i>
                Correlation: Views vs. Engagement
                <div style={{ 
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  color: darkMode ? '#94a3b8' : '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(16, 185, 129, 0.7)',
                      display: 'inline-block'
                    }}></span>
                    <span>Positive</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(107, 114, 128, 0.7)',
                      display: 'inline-block'
                    }}></span>
                    <span>Neutral</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(239, 68, 68, 0.7)',
                      display: 'inline-block'
                    }}></span>
                    <span>Negative</span>
                  </div>
                </div>
              </h2>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '15px',
                padding: '0 10px'
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ 
                    padding: '8px 12px',
                    backgroundColor: darkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}>
                    <span style={{ 
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      color: '#4f46e5'
                    }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      Bubble size indicates engagement rate
                    </span>
                  </div>
                </div>
              </div>
              <div className="chart-container" style={{ 
                height: '450px',
                backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(249, 250, 251, 0.5)',
                borderRadius: '8px',
                padding: '15px',
                border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
              }}>
                <canvas ref={correlationChartRef}></canvas>
              </div>
              <div style={{ 
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 15px'
              }}>
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontSize: '0.8rem',
                    color: darkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '3px'
                  }}>Low Views</span>
                  <i className="fas fa-arrow-right" style={{ 
                    color: darkMode ? '#94a3b8' : '#64748b',
                    fontSize: '0.9rem'
                  }}></i>
                </div>
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontSize: '0.8rem',
                    color: darkMode ? '#94a3b8' : '#64748b',
                    marginBottom: '3px'
                  }}>High Views</span>
                  <i className="fas fa-arrow-right" style={{ 
                    color: darkMode ? '#94a3b8' : '#64748b',
                    fontSize: '0.9rem'
                  }}></i>
                </div>
              </div>
            </div>
            
            {/* New component - Post Performance Rankings */}
            <div className="overview-card post-rankings" style={{
              backgroundColor: darkMode ? '#111827' : '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              margin: '20px 0 30px 0'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                color: darkMode ? '#f8fafc' : '#1e293b'
              }}>
                <i className="fas fa-trophy" style={{ marginRight: '10px', color: '#f59e0b' }}></i>
                Top Performing Posts
              </h2>
              
              <div className="ranking-header" style={{
                marginBottom: '20px'
              }}>
                <div className="tabs" style={{
                  display: 'flex',
                  backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.5)',
                  borderRadius: '8px',
                  padding: '4px',
                  marginBottom: '15px',
                  maxWidth: '500px'
                }}>
                  <button 
                    className={`tab-btn ${rankingMetric === 'engagementRate' ? 'active' : ''}`}
                    onClick={() => setRankingMetric('engagementRate')}
                    style={{
                      flex: '1',
                      padding: '10px 15px',
                      border: 'none',
                      background: rankingMetric === 'engagementRate' ? 
                        (darkMode ? '#4f46e5' : '#4f46e5') : 
                        'transparent',
                      borderRadius: '6px',
                      color: rankingMetric === 'engagementRate' ? 
                        '#ffffff' : 
                        (darkMode ? '#94a3b8' : '#64748b'),
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-percentage"></i> Engagement Rate
                  </button>
                  <button 
                    className={`tab-btn ${rankingMetric === 'reactions' ? 'active' : ''}`}
                    onClick={() => setRankingMetric('reactions')}
                    style={{
                      flex: '1',
                      padding: '10px 15px',
                      border: 'none',
                      background: rankingMetric === 'reactions' ? 
                        (darkMode ? '#4f46e5' : '#4f46e5') : 
                        'transparent',
                      borderRadius: '6px',
                      color: rankingMetric === 'reactions' ? 
                        '#ffffff' : 
                        (darkMode ? '#94a3b8' : '#64748b'),
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center', 
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-heart"></i> Reactions
                  </button>
                  <button 
                    className={`tab-btn ${rankingMetric === 'views' ? 'active' : ''}`}
                    onClick={() => setRankingMetric('views')}
                    style={{
                      flex: '1',
                      padding: '10px 15px',
                      border: 'none',
                      background: rankingMetric === 'views' ? 
                        (darkMode ? '#4f46e5' : '#4f46e5') : 
                        'transparent',
                      borderRadius: '6px',
                      color: rankingMetric === 'views' ? 
                        '#ffffff' : 
                        (darkMode ? '#94a3b8' : '#64748b'),
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      cursor: 'pointer', 
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-eye"></i> Views
                  </button>
                </div>
                
                <div className="ranking-info" style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div className="info-tooltip" style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: darkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    color: darkMode ? '#a5b4fc' : '#4f46e5',
                    position: 'relative'
                  }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Shows top 5 posts based on selected metric</span>
                  </div>
                </div>
              </div>
              
              <div className="ranking-table-container" style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <table className="ranking-table" style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.5)',
                      color: darkMode ? '#f8fafc' : '#1e293b'
                    }}>
                      <th width="50" style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>Rank</th>
                      <th width="100" style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>Platform</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>Content</th>
                      <th width="120" className="metric-cell" style={{
                        padding: '12px 15px',
                        textAlign: 'right',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>
                        {rankingMetric === 'engagementRate' && 'Eng. Rate'}
                        {rankingMetric === 'reactions' && 'Reactions'}
                        {rankingMetric === 'views' && 'Views'}
                      </th>
                      <th width="100" style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>Date</th>
                      <th width="80" style={{
                        padding: '12px 15px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTopPosts().map((post, index) => (
                      <tr 
                        key={post.id} 
                        className={selectedPost?.id === post.id ? 'selected' : ''}
                        style={{
                          backgroundColor: selectedPost?.id === post.id ? 
                            (darkMode ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)') : 
                            'transparent',
                          transition: 'background-color 0.2s ease',
                          borderLeft: selectedPost?.id === post.id ? 
                            '3px solid #4f46e5' : 
                            'none'
                        }}
                      >
                        <td className="rank-cell" style={{
                          padding: '15px',
                          textAlign: 'center',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <div className="rank-badge" style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            borderRadius: '50%',
                            backgroundColor: index <= 2 ? 
                              'rgba(79, 70, 229, 0.1)' : 
                              (darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.5)'),
                            color: index <= 2 ? '#4f46e5' : (darkMode ? '#94a3b8' : '#64748b')
                          }}>
                            {index === 0 && <i className="fas fa-trophy" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i>}
                            {index === 1 && <i className="fas fa-medal" style={{ color: '#94a3b8', fontSize: '1.1rem' }}></i>}
                            {index === 2 && <i className="fas fa-award" style={{ color: '#b45309', fontSize: '1.1rem' }}></i>}
                            {index > 2 && <span style={{ fontWeight: '600' }}>#{index + 1}</span>}
                          </div>
                        </td>
                        <td style={{
                          padding: '15px',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <div 
                            className="table-platform-badge" 
                            style={{ 
                              backgroundColor: post.platformInfo.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}
                          >
                            <i className={post.platformInfo.icon}></i>
                            {post.platformInfo.name}
                          </div>
                        </td>
                        <td className="content-cell" style={{
                          padding: '15px',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <div className="post-preview" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div className="post-text" style={{
                              fontSize: '0.9rem',
                              lineHeight: '1.4',
                              color: darkMode ? '#f8fafc' : '#1e293b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 340,
                              cursor: post.content && post.content.length > 120 ? 'pointer' : 'default'
                            }}
                              title={post.content || 'No content available'}
                            >
                              {post.content && post.content.length > 120
                                ? post.content.substring(0, 120) + '...'
                                : post.content || 'No content available'}
                            </div>
                            <div className={`sentiment-indicator ${post.sentiment}`} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              maxWidth: 'fit-content',
                              backgroundColor: post.sentiment === 'positive' ? 
                                'rgba(16, 185, 129, 0.1)' : 
                                post.sentiment === 'negative' ? 
                                  'rgba(239, 68, 68, 0.1)' : 
                                  'rgba(107, 114, 128, 0.1)',
                              color: post.sentiment === 'positive' ? 
                                '#10b981' : 
                                post.sentiment === 'negative' ? 
                                  '#ef4444' : 
                                  '#6b7280'
                            }}>
                              <i className={`fas fa-${
                                post.sentiment === 'positive' ? 'smile' : 
                                post.sentiment === 'negative' ? 'frown' : 'meh'
                              }`}></i>
                            </div>
                          </div>
                        </td>
                        <td className="metric-cell" style={{
                          padding: '15px',
                          textAlign: 'right',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                          fontWeight: '600'
                        }}>
                          <div className="metric-value" style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            display: 'inline-block',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            color: '#4f46e5'
                          }}>
                            {rankingMetric === 'engagementRate' && 
                              <span className="engagement-rate">{post.engagementRate.toFixed(2)}%</span>
                            }
                            {rankingMetric === 'reactions' && 
                              <span className="reactions">{formatNumber(post.reactions.total)}</span>
                            }
                            {rankingMetric === 'views' && 
                              <span className="views">{formatNumber(post.views)}</span>
                            }
                          </div>
                        </td>
                        <td className="date-cell" style={{
                          padding: '15px',
                          textAlign: 'center',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
                          color: darkMode ? '#94a3b8' : '#64748b',
                          fontSize: '0.85rem'
                        }}>{new Date(post.postedAt).toLocaleDateString()}</td>
                        <td style={{
                          padding: '15px',
                          textAlign: 'center',
                          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <button 
                            className="btn-view" 
                            onClick={() => handlePostSelect(post)}
                            title="View detailed analytics"
                            style={{
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <i className="fas fa-chart-line"></i> <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="dashboard-footer">
        <div className="footer-text">
          SIMS Data Analyzer • Social Media Post Analysis Dashboard
        </div>
        <div className="footer-timestamp">
          Last updated: {new Date().toLocaleString()}
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;