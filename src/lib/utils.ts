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
    case 'NEW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'PENDING': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'RESOLVED': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'CRITICAL': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'CLOSED': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

export function getStatusLabel(status: string) {
  const s = status.toUpperCase();
  switch (s) {
    case 'NEW': return '\u041d\u043e\u0432\u0430\u044f'; // Новая
    case 'IN_PROGRESS': return '\u0412\u0020\u0440\u0430\u0431\u043e\u0442\u0435'; // В работе
    case 'PENDING': return '\u041e\u0436\u0438\u0434\u0430\u043d\u0438\u0435'; // Ожидание
    case 'RESOLVED': return '\u0420\u0435\u0448\u0435\u043d\u043e'; // Решено
    case 'CRITICAL': return '\u041a\u0440\u0438\u0442\u0438\u0447\u043d\u043e'; // Критично
    case 'CLOSED': return '\u0417\u0430\u043a\u0440\u044b\u0442\u043e'; // Закрыто
    default: return status;
  }
}

export function getPriorityColor(priority: string) {
  const p = priority.toLowerCase();
  switch (p) {
    case 'low': return 'text-gray-500';
    case 'medium': return 'text-blue-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-600 font-bold';
    default: return 'text-gray-500';
  }
}
