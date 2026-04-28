import React, { ReactNode } from 'react';
import { OrderStatus, UrgencyLevel } from '../types';

// --- Card Component ---
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}
export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-5 ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
  >
    {children}
  </div>
);

// --- Badge Component ---
export const StatusBadge: React.FC<{ status: OrderStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    [OrderStatus.PENDING]: 'bg-amber-50 text-amber-600 border-amber-100',
    [OrderStatus.ACCEPTED]: 'bg-blue-50 text-blue-600 border-blue-100',
    [OrderStatus.PENDING_VISIT]: 'bg-blue-50 text-blue-600 border-blue-100',
    [OrderStatus.PROCESSING]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    [OrderStatus.DEPARTED]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    [OrderStatus.ARRIVED]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    [OrderStatus.IN_PROGRESS]: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    [OrderStatus.PENDING_ACCEPTANCE]: 'bg-amber-50 text-amber-600 border-amber-100',
    [OrderStatus.PENDING_PAYMENT]: 'bg-purple-50 text-purple-600 border-purple-100',
    [OrderStatus.REFUNDING]: 'bg-pink-50 text-pink-600 border-pink-100',
    [OrderStatus.CLOSED]: 'bg-slate-100 text-slate-600 border-slate-200',
    [OrderStatus.PENDING_REVIEW]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [OrderStatus.CANCELLED]: 'bg-red-50 text-red-600 border-red-100',
    [OrderStatus.RESTARTED]: 'bg-orange-50 text-orange-600 border-orange-100',
    [OrderStatus.ARCHIVED]: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const defaultStyle = 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

export const UrgencyBadge: React.FC<{ level: UrgencyLevel }> = ({ level }) => {
   const styles = {
    [UrgencyLevel.LOW]: 'bg-slate-100 text-slate-600',
    [UrgencyLevel.MEDIUM]: 'bg-blue-100 text-blue-600',
    [UrgencyLevel.HIGH]: 'bg-orange-100 text-orange-600',
    [UrgencyLevel.CRITICAL]: 'bg-red-100 text-red-600',
   };
   return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles[level]}`}>
      {level}
    </span>
   );
}

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  isLoading = false,
  className = '',
  ...props 
}) => {
  const base = "relative overflow-hidden rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2";
  const sizes = "py-3.5 px-6 text-sm";
  
  const variants = {
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700",
    secondary: "bg-white text-slate-800 shadow-md border border-slate-100 hover:bg-slate-50",
    outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
  };

  return (
    <button 
      className={`${base} ${sizes} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${isLoading ? 'opacity-80 cursor-wait' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
      ) : children}
    </button>
  );
};
