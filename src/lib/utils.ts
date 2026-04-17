import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

export function getStatusColor(status: string) {
  const s = status.toUpperCase();
  switch (s) {
    case 'NEW': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'RESOLVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'CRITICAL': return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'CLOSED': return 'bg-slate-50 text-slate-600 border-slate-100';
    case 'ARCHIVED': return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-100';
  }
}

export function getStatusLabel(status: string) {
  const s = status.toUpperCase();
  switch (s) {
    case 'NEW': return 'Новая';
    case 'IN_PROGRESS': return 'В работе';
    case 'PENDING': return 'Ожидание';
    case 'RESOLVED': return 'Решено';
    case 'CRITICAL': return 'Критично';
    case 'CLOSED': return 'Закрыто';
    case 'ARCHIVED': return 'Архив';
    default: return status;
  }
}

export function getPriorityColor(priority: string) {
  const p = priority.toLowerCase();
  switch (p) {
    case 'low': return 'text-slate-400';
    case 'medium': return 'text-blue-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-rose-600 font-bold';
    default: return 'text-slate-400';
  }
}
