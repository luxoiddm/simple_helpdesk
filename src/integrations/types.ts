import { Database } from "sqlite";
import { Server } from "socket.io";

export interface IntegrationContext {
  db: Database;
  io: Server;
  runtimeConfig: any;
  mediaRoot: string;
}

export interface TicketIntegration {
  id: string;
  name: string;
  description: string;
  /**
   * Инициализация модуля (запуск слушателей, ботов и т.д.)
   */
  init: (ctx: IntegrationContext) => Promise<void>;
  /**
   * Отправка ответа пользователю в этот канал
   */
  sendReply?: (to: string, ticketId: string, text: string, subject: string) => Promise<void>;
}
