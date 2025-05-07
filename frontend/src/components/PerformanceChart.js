import React from 'react';

const PerformanceChart = ({ data }) => {
  return (
    <div className="placeholder-chart">
      <p>Performance Chart</p>
      <p>Data: {JSON.stringify(data)}</p>
    </div>
  );
};

export default PerformanceChart; 