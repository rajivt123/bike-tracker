// src/components/StatCard.jsx
import React from 'react';

const StatCard = ({ label, value, sub, colorClass, valueClass }) => (
  <div className={`p-4 rounded-2xl border ${colorClass} flex flex-col justify-center min-h-[110px] shadow-sm`}>
    <p className="text-xs uppercase font-bold opacity-70 mb-2 whitespace-normal leading-tight">{label}</p>
    <div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs opacity-60 font-medium mt-1">{sub}</p>}
    </div>
  </div>
);

export default StatCard;