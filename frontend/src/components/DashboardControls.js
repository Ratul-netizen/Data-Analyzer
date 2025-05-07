import React, { useState } from 'react';

function DashboardControls({ 
  platforms, 
  selectedPlatforms, 
  onPlatformChange,
  onExportData,
  onRefreshData,
  autoRefresh,
  onAutoRefreshToggle
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="metric-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="auto-refresh-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshToggle(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span>Auto Refresh</span>
        </div>

        <div className="d-flex gap-2">
          <button className="refresh-button" onClick={onRefreshData}>
            <i className="fas fa-sync-alt me-2"></i>
            Refresh Now
          </button>

          <div className="export-dropdown">
            <button
              className="refresh-button"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <i className="fas fa-download me-2"></i>
              Export
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={() => {
                  onExportData('csv');
                  setShowExportMenu(false);
                }}>
                  Export as CSV
                </button>
                <button onClick={() => {
                  onExportData('json');
                  setShowExportMenu(false);
                }}>
                  Export as JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="platform-filter">
        {platforms.map(platform => (
          <button
            key={platform}
            className={`platform-badge ${selectedPlatforms.includes(platform) ? 'active' : ''}`}
            onClick={() => onPlatformChange(platform, !selectedPlatforms.includes(platform))}
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DashboardControls; 