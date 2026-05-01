import React from 'react';
import DaysBadge from '../components/DaysBadge';
import { formatCurrency } from '../utils/finance';

const Dashboard = ({ debts }) => {
  return (
    <div className="p-4">
      {debts.map(debt => (
        <div key={debt.id}>{debt.name}: {formatCurrency(debt.amount)} <DaysBadge days={debt.daysLeft} /></div>
      ))}
    </div>
  );
};

export default Dashboard;