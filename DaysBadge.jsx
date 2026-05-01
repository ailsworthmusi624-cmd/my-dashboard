import React from 'react';

const DaysBadge = ({ days }) => (
  <span className={`px-2 py-1 rounded text-xs ${days < 7 ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>
    {days} дн.
  </span>
);

export default DaysBadge;