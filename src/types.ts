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
  clientId: string;
  clientName: string;
  subject: string;
  description: string;
  status: Status;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
  assignedTo?: string;
  slaDeadline: number;
}

export interface TicketWithMessages extends Ticket {
  messages: Message[];
}
