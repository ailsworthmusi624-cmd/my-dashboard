import React from 'react';

export default function KpiCard({ title, value, subValue, color, bg, textInverse }) {
  return (
    <div className={`${bg || 'glass-card'} p-5 md:p-6`}>
      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${textInverse ? 'text-white/70' : 'text-on-surface-variant/70'}`}>
        {title}
      </div>
      <div className={`font-bold truncate ${textInverse ? 'text-white' : color || 'text-on-surface'}`} style={{fontSize: 'clamp(14px, 4vw, 24px)'}}>
        {value}
      </div>
      {subValue && (
        <div className={`text-[11px] mt-1.5 font-medium ${textInverse ? 'text-white/70' : 'text-on-surface-variant/60'}`}>
          {subValue}
        </div>
      )}
    </div>
  );
}
