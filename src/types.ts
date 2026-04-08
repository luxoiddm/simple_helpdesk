export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'new' | 'open' | 'pending' | 'resolved' | 'closed';
export type Role = 'client' | 'support';

export interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  timestamp: number;
  isInternal: boolean;
}

export interface Ticket {
  id: string;
  client_id: number;
  client_name: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_to?: number;
  sla_deadline: string;
}

export interface TicketWithMessages extends Ticket {
  messages: Message[];
}
