import React from 'react';

function DateRangeFilter({ startDate, endDate, onDateChange }) {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Date Range</h5>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="startDate" className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                id="startDate"
                value={startDate}
                onChange={(e) => onDateChange('start', e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="endDate" className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                id="endDate"
                value={endDate}
                onChange={(e) => onDateChange('end', e.target.value)}
                min={startDate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DateRangeFilter; 