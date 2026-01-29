import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  gradient?: 'blue' | 'green' | 'purple' | 'pink' | 'orange';
}

export default function Card({ children, className, onClick, gradient }: CardProps) {
  const gradients = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
    pink: 'bg-gradient-to-r from-pink-500 to-pink-600',
    orange: 'bg-gradient-to-r from-orange-500 to-orange-600'
  };

  const baseStyles = cn(
    'rounded-2xl p-6 transition-all duration-300',
    gradient ? `${gradients[gradient]} text-white shadow-lg` : 'bg-white shadow-sm border border-gray-100',
    onClick && 'cursor-pointer hover:shadow-xl hover:-translate-y-1',
    className
  );

  return (
    <div className={baseStyles} onClick={onClick}>
      {children}
    </div>
  );
}