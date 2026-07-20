import React from 'react';

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-line skeleton-header"></div>
    <div className="skeleton-line skeleton-value"></div>
    <div className="skeleton-line skeleton-sub"></div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="table-container" style={{ padding: '20px' }}>
    <div className="skeleton-line skeleton-header" style={{ width: '40%', marginBottom: '20px' }}></div>
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="skeleton-line skeleton-row"></div>
    ))}
  </div>
);

export default SkeletonCard;
