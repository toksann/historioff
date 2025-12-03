import React from 'react';
import './CostCurveChart.css';

const CostCurveChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.count), 0);

  return (
    <div className="cost-curve-chart">
      {data.map((item, index) => (
        <div key={index} className="chart-bar-container">
          <div className="chart-bar">
            <div 
              className="chart-bar-fill" 
              style={{ height: `${maxValue > 0 ? (item.count / maxValue) * 100 : 0}%` }}
            >
              <span className="chart-bar-label-count">{item.count > 0 ? item.count : ''}</span>
            </div>
          </div>
          <span className="chart-bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CostCurveChart;
