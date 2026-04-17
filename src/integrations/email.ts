import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { TicketIntegration, IntegrationContext } from "./types";

export const EmailIntegration: TicketIntegration = {
  id: "email",
  name: "Email",
  description: "Интеграция с почтой через IMAP и SMTP",

  async init(ctx: IntegrationContext) {
    const { db, io, runtimeConfig, mediaRoot } = ctx;
    
    if (!runtimeConfig.EMAIL_IMAP.host || !runtimeConfig.EMAIL_IMAP.user || !runtimeConfig.EMAIL_IMAP.pass) {
      console.log("[Integration: Email] Missing configuration, skipping.");
      return;
    }

    let imapClient: ImapFlow | null = null;
    let isSyncing = false;
    let lastKnownCount = 0;
    let imapKeepAlive: NodeJS.Timeout | null = null;

    const transporter = nodemailer.createTransport({
      host: runtimeConfig.EMAIL_SMTP.host,
      port: runtimeConfig.EMAIL_SMTP.port,
      secure: runtimeConfig.EMAIL_SMTP.secure,
      auth: {
        user: runtimeConfig.EMAIL_SMTP.user,
        pass: runtimeConfig.EMAIL_SMTP.pass,
      }
    });

    async function checkEmails() {
      if (isSyncing || !imapClient || !imapClient.usable) return;
      isSyncing = true;

      const stripQuotedText = (text: string) => {
        if (!text) return "";
        // Common patterns for quoted text in emails
        const patterns = [
          /\r?\n\s*On\s+.*\s+wrote:[\s\S]*/i,
          /\r?\n\s*---\s*Original Message\s*---\s*[\s\S]*/i,
          /\r?\n\s*>[\s\S]*/,
          /\r?\n\s*From:[\s\S]*/i,
          /\r?\n\s*От кого:[\s\S]*/i,
          /\r?\n\s*Четверг, \d+.*[\s\S]*/i, // Russian date pattern common in mail.ru/yandex
        ];

        let cleanText = text;
        for (const pattern of patterns) {
          cleanText = cleanText.split(pattern)[0];
        }
        return cleanText.trim();
      };

      let lock;
      try {
        lock = await imapClient.getMailboxLock("INBOX");
        try {
          const status = await imapClient.status("INBOX", { messages: true, unseen: true });
          if (lastKnownCount === 0) lastKnownCount = status.messages;
          if (status.messages <= lastKnownCount) return;

          const range = `${lastKnownCount + 1}:*`;
          for await (let message of imapClient.fetch(range, { source: true, uid: true })) {
            if (!imapClient || !imapClient.usable) break;
            
            const parsed = await simpleParser(message.source);
            const messageId = parsed.messageId || `uid-${message.uid}`;
            
            const existing = await db.get("SELECT id FROM messages WHERE external_id = ?", [messageId]);
            if (existing) continue;

            const fromEmail = parsed.from?.value[0]?.address || "";
            if (!fromEmail) continue;

            const subject = parsed.subject || "(No Subject)";
            const body = stripQuotedText(parsed.text || "");
            const cleanSubject = subject.replace(/^(Re|Fwd|Отв|Пересл):\s*/i, "").trim();

            let user = await db.get("SELECT id FROM users WHERE username = ?", [fromEmail]);
            if (!user) {
              const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
              const result = await db.run(
                "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
                [fromEmail, randomPass, parsed.from?.value[0]?.name || fromEmail, "client"]
              );
              user = { id: result.lastID };
              const userDir = path.join(mediaRoot, fromEmail);
              if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
            }

            const ticketMatch = subject.match(/V-\d{4}/);
            let ticketId = ticketMatch ? ticketMatch[0] : null;
            let ticket = null;

            if (ticketId) ticket = await db.get("SELECT id FROM tickets WHERE id = ?", [ticketId]);

            if (!ticket) {
              ticket = await db.get(
                "SELECT id FROM tickets WHERE client_id = ? AND (subject = ? OR subject LIKE ?) ORDER BY created_at DESC LIMIT 1",
                [user.id, cleanSubject, `%${cleanSubject}%`]
              );
              if (ticket) ticketId = ticket.id;
            }

            if (!ticket) {
              ticketId = `V-${Math.floor(1000 + Math.random() * 9000)}`;
              const slaDeadline = new Date(Date.now() + 3600000 * 8).toISOString();
              await db.run(
                "INSERT INTO tickets (id, client_id, subject, description, sla_deadline, source) VALUES (?, ?, ?, ?, ?, ?)",
                [ticketId, user.id, cleanSubject, `Email Ticket: ${cleanSubject}`, slaDeadline, "email"]
              );
              const newTicketFull = await db.get(`SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?`, [ticketId]);
              io.emit("ticket:created", newTicketFull);
            } else {
              await db.run("UPDATE tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [ticketId]);
              const updatedTicket = await db.get(`SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?`, [ticketId]);
              io.emit("ticket:updated", updatedTicket);
            }

            let mediaUrl = null;
            if (parsed.attachments && parsed.attachments.length > 0) {
              for (const attachment of parsed.attachments) {
                if (attachment.contentType.startsWith("image/")) {
                  const filename = `${Date.now()}-${attachment.filename}`;
                  const userDir = path.join(mediaRoot, fromEmail);
                  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
                  fs.writeFileSync(path.join(userDir, filename), attachment.content);
                  mediaUrl = `/media_data/${fromEmail}/${filename}`;
                  break;
                }
              }
            }

            const clientName = parsed.from?.value[0]?.name || fromEmail;
            const formattedDate = new Date().toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const formattedText = `**КЛИЕНТ:** ${clientName}\n**ДАТА:** ${formattedDate}\n**ОТ:** ${fromEmail}\n**ТЕМА:** ${subject}\n\n${body}`;
            
            const result = await db.run(
              "INSERT INTO messages (ticket_id, sender_id, text, media_url, is_internal, external_id) VALUES (?, ?, ?, ?, ?, ?)",
              [ticketId, user.id, formattedText, mediaUrl, 0, messageId]
            );

            const fullMsg = await db.get("SELECT m.*, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?", [result.lastID]);
            io.to(ticketId).emit("message:received", fullMsg);
            
            if (imapClient && imapClient.usable) {
              try {
                await imapClient.messageFlagsAdd({ uid: message.uid }, ["\\Seen"], { uid: true });
              } catch (e) {}
            }
          }
          lastKnownCount = status.messages;
        } finally {
          if (lock) try { await lock.release(); } catch (e) {}
        }
      } catch (err) {
        console.error("[IMAP] Sync Error:", err);
      } finally {
        isSyncing = false;
      }
    }

    const initImap = async () => {
      if (imapKeepAlive) clearInterval(imapKeepAlive);
      imapClient = new ImapFlow({
        host: runtimeConfig.EMAIL_IMAP.host,
        port: runtimeConfig.EMAIL_IMAP.port,
        secure: runtimeConfig.EMAIL_IMAP.secure,
        auth: { user: runtimeConfig.EMAIL_IMAP.user, pass: runtimeConfig.EMAIL_IMAP.pass },
        logger: false,
        greetingTimeout: 60000,
        socketTimeout: 600000,
        tls: { rejectUnauthorized: false, servername: runtimeConfig.EMAIL_IMAP.host }
      });

      imapClient.on('close', () => {
        if (imapKeepAlive) clearInterval(imapKeepAlive);
        imapClient = null;
        setTimeout(initImap, 30000);
      });

      imapClient.on('exists', () => checkEmails());

      try {
        await imapClient.connect();
        imapKeepAlive = setInterval(async () => {
          if (imapClient && imapClient.usable) try { await imapClient.noop(); } catch (e) {}
        }, 30000);
        await checkEmails();
      } catch (err) {
        imapClient = null;
        setTimeout(initImap, 30000);
      }
    };

    initImap();

    // Экспортируем метод отправки ответа через замыкание или привязку к объекту
    this.sendReply = async (to: string, ticketId: string, htmlContent: string, originalSubject: string) => {
      const subject = originalSubject.includes(ticketId) ? `Re: ${originalSubject}` : `Re: [${ticketId}] ${originalSubject}`;
      const plainText = htmlContent.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<li>/gi, '  • ').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .header { background-color: #1a1a1a; color: #ffffff; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #ffffff; }
            .footer { background-color: #f9f9f9; color: #888; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #eeeeee; }
            .ticket-info { font-size: 11px; color: #999; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; overflow-x: auto; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h2 style="margin:0;">Служба поддержки</h2></div>
            <div class="content"><div class="ticket-info">Заявка: ${ticketId}</div>${htmlContent}</div>
            <div class="footer">Это автоматическое уведомление. Пожалуйста, отвечайте на это письмо.<br>&copy; ${new Date().getFullYear()} ${runtimeConfig.SITE_NAME}</div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${runtimeConfig.SITE_NAME}" <${runtimeConfig.EMAIL_SUPPORT_ADDR}>`,
        to,
        subject,
        text: plainText,
        html: emailHtml,
      });
    };
  }
};
