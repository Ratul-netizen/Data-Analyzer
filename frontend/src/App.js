import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/Dashboard.css';
import Dashboard from './components/Dashboard.js';
import PostAnalysis from './components/PostAnalysis.js';

function App() {
  const [posts, setPosts] = useState([]);
  
  const handlePostsUpdate = (updatedPosts) => {
    setPosts(updatedPosts);
  };

  return (
    <Router>
      <Routes>
        {/* Main dashboard - no authentication needed */}
        <Route 
          path="/" 
          element={<Dashboard onPostsUpdate={handlePostsUpdate} />} 
        />
        
        {/* Post analysis page */}
        <Route 
          path="/post/:postId" 
          element={<PostAnalysis posts={posts} />} 
        />
        
        {/* Redirect all other paths to dashboard */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App; 