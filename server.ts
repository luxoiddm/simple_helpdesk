import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

import multer from "multer";
import fs from "fs";

dotenv.config();

let runtimeConfig = {
  JWT_SECRET: process.env.JWT_SECRET || "default_secret",
  API_KEY: process.env.API_KEY || "default_api_key",
  SITE_NAME: process.env.SITE_NAME || "SupportDesk",
  EMAIL_SUPPORT_ADDR: process.env.EMAIL_SUPPORT_ADDR || "support@example.com",
  EMAIL_IMAP: {
    host: process.env.EMAIL_IMAP_HOST || "",
    port: Number(process.env.EMAIL_IMAP_PORT) || 993,
    user: process.env.EMAIL_IMAP_USER || "",
    pass: process.env.EMAIL_IMAP_PASS || "",
    secure: process.env.EMAIL_IMAP_SECURE === "true" || (Number(process.env.EMAIL_IMAP_PORT) || 993) === 993
  },
  EMAIL_SMTP: {
    host: process.env.EMAIL_SMTP_HOST || "",
    port: Number(process.env.EMAIL_SMTP_PORT) || 465,
    user: process.env.EMAIL_SMTP_USER || "",
    pass: process.env.EMAIL_SMTP_PASS || "",
    secure: process.env.EMAIL_SMTP_SECURE === "true" || (Number(process.env.EMAIL_SMTP_PORT) || 465) === 465
  }
};

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

let transporter = nodemailer.createTransport({
  host: runtimeConfig.EMAIL_SMTP.host,
  port: runtimeConfig.EMAIL_SMTP.port,
  secure: runtimeConfig.EMAIL_SMTP.secure,
  auth: {
    user: runtimeConfig.EMAIL_SMTP.user,
    pass: runtimeConfig.EMAIL_SMTP.pass,
  },
});

async function refreshRuntimeConfig() {
  if (!db) return;
  const settings = await db.all("SELECT * FROM settings");
  const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  runtimeConfig.JWT_SECRET = settingsMap.jwt_secret || process.env.JWT_SECRET || "default_secret";
  runtimeConfig.API_KEY = settingsMap.api_key || process.env.API_KEY || "default_api_key";
  runtimeConfig.SITE_NAME = settingsMap.site_name || process.env.SITE_NAME || "SupportDesk";
  runtimeConfig.EMAIL_SUPPORT_ADDR = settingsMap.email_support_addr || process.env.EMAIL_SUPPORT_ADDR || "support@example.com";
  
  runtimeConfig.EMAIL_IMAP = {
    host: settingsMap.email_imap_host || process.env.EMAIL_IMAP_HOST || "",
    port: Number(settingsMap.email_imap_port) || Number(process.env.EMAIL_IMAP_PORT) || 993,
    user: settingsMap.email_imap_user || process.env.EMAIL_IMAP_USER || "",
    pass: settingsMap.email_imap_pass || process.env.EMAIL_IMAP_PASS || "",
    secure: settingsMap.email_imap_secure === "true" || (Number(settingsMap.email_imap_port) || 993) === 993
  };

  runtimeConfig.EMAIL_SMTP = {
    host: settingsMap.email_smtp_host || process.env.EMAIL_SMTP_HOST || "",
    port: Number(settingsMap.email_smtp_port) || Number(process.env.EMAIL_SMTP_PORT) || 465,
    user: settingsMap.email_smtp_user || process.env.EMAIL_SMTP_USER || "",
    pass: settingsMap.email_smtp_pass || process.env.EMAIL_SMTP_PASS || "",
    secure: settingsMap.email_smtp_secure === "true" || (Number(settingsMap.email_smtp_port) || 465) === 465
  };

  transporter = nodemailer.createTransport({
    host: runtimeConfig.EMAIL_SMTP.host,
    port: runtimeConfig.EMAIL_SMTP.port,
    secure: runtimeConfig.EMAIL_SMTP.secure,
    auth: {
      user: runtimeConfig.EMAIL_SMTP.user,
      pass: runtimeConfig.EMAIL_SMTP.pass,
    },
  });

  // Restart IMAP listener if config changed
  if (imapClient) {
    console.log("[Config] Closing IMAP client for restart...");
    await imapClient.logout();
    imapClient = null;
  }
  initImapListener();

  console.log("[Config] Runtime configuration refreshed from database.");
}

const MEDIA_ROOT = path.join(process.cwd(), "media_data");

// Ensure media root exists
if (!fs.existsSync(MEDIA_ROOT)) {
  fs.mkdirSync(MEDIA_ROOT, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    try {
      const ticketId = req.query.ticketId;
      if (!ticketId) {
        return cb(new Error("Ticket ID is required"), "");
      }

      // Fetch the client's username for this ticket
      const ticket = await db.get(
        "SELECT u.username FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?",
        [ticketId]
      );

      if (!ticket) {
        return cb(new Error("Ticket or client not found"), "");
      }

      const clientUsername = ticket.username;
      const userDir = path.join(MEDIA_ROOT, clientUsername);
      
      console.log(`Multer destination for ticket ${ticketId}: ${userDir}`);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log(`Created directory: ${userDir}`);
      }
      cb(null, userDir);
    } catch (err) {
      console.error("Multer destination error:", err);
      cb(err as Error, "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG and PNG are allowed.'));
    }
  }
});

let db: Database;
let io: Server;

// --- Database Initialization ---
async function initDb() {
  db = await open({
    filename: process.env.DB_PATH || './database.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'support', 'client')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      client_id INTEGER REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_to INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sla_deadline DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT REFERENCES tickets(id),
      sender_id INTEGER REFERENCES users(id),
      text TEXT NOT NULL,
      media_url TEXT,
      is_internal BOOLEAN DEFAULT FALSE,
      external_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if media_url and external_id columns exist in messages table (for existing databases)
  const columns = await db.all("PRAGMA table_info(messages)");
  console.log("Messages table columns:", columns.map(c => c.name));
  
  if (!columns.some(col => col.name === 'media_url')) {
    console.log("Adding media_url column to messages table...");
    await db.exec("ALTER TABLE messages ADD COLUMN media_url TEXT");
  }
  if (!columns.some(col => col.name === 'external_id')) {
    console.log("Adding external_id column to messages table...");
    await db.exec("ALTER TABLE messages ADD COLUMN external_id TEXT");
  }

  // Ensure unique index for external_id
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_id)");

  // Create or update default admin
  const admin = await db.get("SELECT * FROM users WHERE username = ?", [ADMIN_USERNAME]);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  
  if (!admin) {
    console.log(`Admin user ${ADMIN_USERNAME} not found. Creating...`);
    await db.run(
      "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
      [ADMIN_USERNAME, hashedPassword, "Главный Администратор", "admin"]
    );
    console.log(`Default admin created: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin user ${ADMIN_USERNAME} already exists. Updating password...`);
    await db.run(
      "UPDATE users SET password = ? WHERE username = ?",
      [hashedPassword, ADMIN_USERNAME]
    );
  }
}

// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, runtimeConfig.JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Access denied" });
  next();
};

const isExternalApi = (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== runtimeConfig.API_KEY) return res.status(401).json({ error: "Invalid API Key" });
  next();
};

async function startServer() {
  await initDb();
  await refreshRuntimeConfig();

  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/media_data', express.static(path.join(process.cwd(), 'media_data')));

    // --- Auth Routes ---
    app.get("/api/config", async (req, res) => {
      res.json({
        siteName: runtimeConfig.SITE_NAME
      });
    });

    app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
      const user = await db.get("SELECT id, username, full_name as name, role FROM users WHERE id = ?", [req.user.id]);
      if (user) {
        res.json({ user });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    });

    app.post("/api/auth/login", async (req, res) => {
      const { username, password } = req.body;
      const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.full_name }, runtimeConfig.JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.full_name } });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    });

    // --- Admin Routes (User Management) ---
    app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
      const users = await db.all("SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC");
      res.json(users);
    });

    app.post("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
      const { username, password, fullName, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        const result = await db.run(
          "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
          [username, hashedPassword, fullName, role]
        );
        res.status(201).json({ id: result.lastID, username, full_name: fullName, role });
      } catch (e) {
        res.status(400).json({ error: "Username already exists" });
      }
    });

    app.delete("/api/admin/users/:id", authenticateToken, isAdmin, async (req, res) => {
      const result = await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ error: "User not found" });
      res.json({ message: "User deleted successfully" });
    });

    app.get("/api/admin/settings", authenticateToken, isAdmin, async (req, res) => {
      const settings = await db.all("SELECT * FROM settings");
      const settingsMap = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      
      // Return merged settings (DB overrides ENV)
      res.json({
        site_name: settingsMap.site_name || process.env.SITE_NAME || "SupportDesk",
        jwt_secret: settingsMap.jwt_secret || process.env.JWT_SECRET || "default_secret",
        api_key: settingsMap.api_key || process.env.API_KEY || "default_api_key",
        email_support_addr: settingsMap.email_support_addr || process.env.EMAIL_SUPPORT_ADDR || "support@example.com",
        email_imap_host: settingsMap.email_imap_host || process.env.EMAIL_IMAP_HOST || "",
        email_imap_port: settingsMap.email_imap_port || process.env.EMAIL_IMAP_PORT || "993",
        email_imap_user: settingsMap.email_imap_user || process.env.EMAIL_IMAP_USER || "",
        email_imap_pass: settingsMap.email_imap_pass ? "********" : (process.env.EMAIL_IMAP_PASS ? "********" : ""),
        email_smtp_host: settingsMap.email_smtp_host || process.env.EMAIL_SMTP_HOST || "",
        email_smtp_port: settingsMap.email_smtp_port || process.env.EMAIL_SMTP_PORT || "465",
        email_smtp_user: settingsMap.email_smtp_user || process.env.EMAIL_SMTP_USER || "",
        email_smtp_pass: settingsMap.email_smtp_pass ? "********" : (process.env.EMAIL_SMTP_PASS ? "********" : ""),
        db_path: settingsMap.db_path || process.env.DB_PATH || "./database.db"
      });
    });

    app.post("/api/admin/settings", authenticateToken, isAdmin, async (req, res) => {
      const { settings } = req.body;
      
      for (const [key, value] of Object.entries(settings)) {
        if (value === "********") continue; // Skip masked passwords
        await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
      }
      
      await refreshRuntimeConfig();
      res.json({ message: "Settings updated and applied." });
    });

    app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
      const totalTickets = await db.get("SELECT COUNT(*) as count FROM tickets");
      const openTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE status IN ('new', 'open')");
      const resolvedTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'");
      const criticalTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE priority = 'critical'");
      
      res.json({
        total: totalTickets.count,
        open: openTickets.count,
        resolved: resolvedTickets.count,
        critical: criticalTickets.count
      });
    });

    // --- Ticket Routes ---
    app.get("/api/tickets", authenticateToken, async (req: any, res) => {
      let query = "SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id";
      let params: any[] = [];

      if (req.user.role === 'client') {
        query += " WHERE t.client_id = ?";
        params.push(req.user.id);
      }
      
      query += " ORDER BY t.created_at DESC";
      const tickets = await db.all(query, params);
      res.json(tickets);
    });

    app.get("/api/tickets/:id", authenticateToken, async (req: any, res) => {
      const ticket = await db.get(
        "SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?",
        [req.params.id]
      );
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      if (req.user.role === 'client' && ticket.client_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await db.all(
        "SELECT m.*, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC",
        [req.params.id]
      );
      
      res.json({ ...ticket, messages });
    });

    app.post("/api/tickets/:id/messages", authenticateToken, async (req: any, res) => {
      const { text, media_url, is_internal } = req.body;
      const ticketId = req.params.id;

      const ticket = await db.get("SELECT client_id FROM tickets WHERE id = ?", [ticketId]);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      if (req.user.role === 'client' && ticket.client_id !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await db.run(
        "INSERT INTO messages (ticket_id, sender_id, text, media_url, is_internal) VALUES (?, ?, ?, ?, ?)",
        [ticketId, req.user.id, text, media_url || null, is_internal ? 1 : 0]
      );

      const msg = await db.get("SELECT m.*, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?", [result.lastID]);
      io.to(ticketId).emit("message:received", msg);
      
      // Send email reply if client is email-based
      const ticketData = await db.get("SELECT t.subject, u.username FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [ticketId]);
      if (ticketData && ticketData.username.includes("@") && !is_internal) {
        sendEmailReply(ticketData.username, ticketId, text, ticketData.subject);
      }

      res.status(201).json(msg);
    });

    // --- Media Upload ---
    app.post("/api/upload", authenticateToken, (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    }, async (req: any, res) => {
      if (!req.file) {
        console.error("No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get the client's username again to return the correct URL
      const ticketId = req.query.ticketId;
      const ticket = await db.get(
        "SELECT u.username FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?",
        [ticketId]
      );
      
      const clientUsername = ticket?.username || req.user.username;
      const mediaUrl = `/media_data/${clientUsername}/${req.file.filename}`;
      
      console.log(`File uploaded and saved to: ${mediaUrl}`);
      res.json({ url: mediaUrl });
    });

    app.post("/api/tickets", authenticateToken, async (req: any, res) => {
      const { subject, description } = req.body;
      const ticketId = `V-${Math.floor(1000 + Math.random() * 9000)}`;
      const slaDeadline = new Date(Date.now() + 3600000 * 8).toISOString();

      await db.run(
        "INSERT INTO tickets (id, client_id, subject, description, sla_deadline) VALUES (?, ?, ?, ?, ?)",
        [ticketId, req.user.id, subject, description, slaDeadline]
      );
      
      const newTicket = await db.get("SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [ticketId]);
      io.emit("ticket:created", newTicket);
      res.status(201).json(newTicket);
    });

    app.patch("/api/tickets/:id", authenticateToken, async (req: any, res) => {
      const { status, priority, assigned_to } = req.body;
      await db.run(
        "UPDATE tickets SET status = COALESCE(?, status), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, priority, assigned_to, req.params.id]
      );
      const updatedTicket = await db.get("SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [req.params.id]);
      io.emit("ticket:updated", updatedTicket);
      res.json(updatedTicket);
    });

    app.delete("/api/tickets/:id", authenticateToken, isAdmin, async (req, res) => {
      await db.run("DELETE FROM messages WHERE ticket_id = ?", [req.params.id]);
      const result = await db.run("DELETE FROM tickets WHERE id = ?", [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ error: "Ticket not found" });
      io.emit("ticket:deleted", req.params.id);
      res.json({ message: "Ticket deleted successfully" });
    });

    // --- External API ---
    app.get("/api/external/tickets", isExternalApi, async (req, res) => {
      const tickets = await db.all("SELECT t.id, t.subject, t.status, t.priority, t.created_at, u.username as client_username, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id");
      res.json(tickets);
    });

    app.get("/api/external/tickets/:id", isExternalApi, async (req, res) => {
      const ticket = await db.get(
        "SELECT t.*, u.username as client_username, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?",
        [req.params.id]
      );
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      const messages = await db.all(
        "SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC",
        [req.params.id]
      );
      
      res.json({ ...ticket, messages });
    });

    app.post("/api/external/tickets", isExternalApi, async (req, res) => {
      const { subject, description, clientUsername } = req.body;
      const user = await db.get("SELECT id FROM users WHERE username = ?", [clientUsername]);
      if (!user) return res.status(404).json({ error: "Client not found" });
      
      const ticketId = `EXT-${Math.floor(1000 + Math.random() * 9000)}`;
      const slaDeadline = new Date(Date.now() + 3600000 * 8).toISOString();

      await db.run(
        "INSERT INTO tickets (id, client_id, subject, description, sla_deadline) VALUES (?, ?, ?, ?, ?)",
        [ticketId, user.id, subject, description, slaDeadline]
      );
      const newTicket = await db.get("SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [ticketId]);
      io.emit("ticket:created", newTicket);
      res.status(201).json(newTicket);
    });

    app.patch("/api/external/tickets/:id", isExternalApi, async (req, res) => {
      const { status, priority, assignedToUsername } = req.body;
      let assigned_to = null;
      
      if (assignedToUsername) {
        const user = await db.get("SELECT id FROM users WHERE username = ?", [assignedToUsername]);
        if (!user) return res.status(404).json({ error: "Assigned user not found" });
        assigned_to = user.id;
      }

      await db.run(
        "UPDATE tickets SET status = COALESCE(?, status), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, priority, assigned_to, req.params.id]
      );
      
      const updatedTicket = await db.get("SELECT t.*, u.full_name as client_name FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [req.params.id]);
      if (!updatedTicket) return res.status(404).json({ error: "Ticket not found" });
      
      io.emit("ticket:updated", updatedTicket);
      res.json(updatedTicket);
    });

    app.post("/api/external/tickets/:id/messages", isExternalApi, async (req, res) => {
      const { text, senderUsername, isInternal } = req.body;
      const user = await db.get("SELECT id, full_name, role FROM users WHERE username = ?", [senderUsername]);
      if (!user) return res.status(404).json({ error: "Sender not found" });

      const ticket = await db.get("SELECT id FROM tickets WHERE id = ?", [req.params.id]);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });

      const result = await db.run(
        "INSERT INTO messages (ticket_id, sender_id, text, is_internal) VALUES (?, ?, ?, ?)",
        [req.params.id, user.id, text, isInternal || false]
      );
      
      const msg = await db.get("SELECT * FROM messages WHERE id = ?", [result.lastID]);
      const fullMsg = { ...msg, sender_name: user.full_name, sender_role: user.role };
      
      io.to(req.params.id).emit("message:received", fullMsg);
      res.status(201).json(fullMsg);
    });

    app.get("/api/external/users", isExternalApi, async (req, res) => {
      const users = await db.all("SELECT id, username, full_name, role, created_at FROM users");
      res.json(users);
    });

    app.post("/api/external/users", isExternalApi, async (req, res) => {
      const { username, password, fullName, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        const result = await db.run(
          "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
          [username, hashedPassword, fullName, role]
        );
        res.status(201).json({ id: result.lastID, username, full_name: fullName, role });
      } catch (e) {
        res.status(400).json({ error: "Username already exists" });
      }
    });

    app.delete("/api/external/users/:id", isExternalApi, async (req, res) => {
      const result = await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
      if (result.changes === 0) return res.status(404).json({ error: "User not found" });
      res.json({ message: "User deleted successfully" });
    });

    app.get("/api/external/stats", isExternalApi, async (req, res) => {
      const totalTickets = await db.get("SELECT COUNT(*) as count FROM tickets");
      const openTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE status IN ('new', 'open')");
      const resolvedTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'");
      const criticalTickets = await db.get("SELECT COUNT(*) as count FROM tickets WHERE priority = 'critical'");
      
      res.json({
        total: totalTickets.count,
        open: openTickets.count,
        resolved: resolvedTickets.count,
        critical: criticalTickets.count
      });
    });

    // --- Socket.io ---
    io.on("connection", (socket) => {
      socket.on("join:ticket", (ticketId) => socket.join(ticketId));
      socket.on("message:send", async (data) => {
        const { ticketId, senderId, text, media_url, isInternal } = data;
        const result = await db.run(
          "INSERT INTO messages (ticket_id, sender_id, text, media_url, is_internal) VALUES (?, ?, ?, ?, ?)",
          [ticketId, senderId, text, media_url || null, isInternal ? 1 : 0]
        );
        const user = await db.get("SELECT full_name as sender_name, role as sender_role FROM users WHERE id = ?", [senderId]);
        const msg = await db.get("SELECT * FROM messages WHERE id = ?", [result.lastID]);
        const fullMsg = { ...msg, ...user };
        io.to(ticketId).emit("message:received", fullMsg);

        // Send email reply if client is email-based
        const ticketData = await db.get("SELECT t.subject, u.username FROM tickets t JOIN users u ON t.client_id = u.id WHERE t.id = ?", [ticketId]);
        if (ticketData && ticketData.username.includes("@") && !isInternal) {
          sendEmailReply(ticketData.username, ticketId, text, ticketData.subject);
        }
      });
    });

    // --- Vite ---
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }

    httpServer.listen(PORT, "0.0.0.0", () => console.log(`SupportDesk running on port ${PORT}`));
}

async function sendEmailReply(to: string, ticketId: string, text: string, originalSubject: string) {
  try {
    // Ensure the ticket ID is in the subject for better threading
    const subject = originalSubject.includes(ticketId) 
      ? `Re: ${originalSubject}` 
      : `Re: [${ticketId}] ${originalSubject}`;

    await transporter.sendMail({
      from: runtimeConfig.EMAIL_SUPPORT_ADDR,
      to,
      subject,
      text: text,
    });
    console.log(`Email reply sent to ${to} for ticket ${ticketId}`);
  } catch (err) {
    console.error("Failed to send email reply:", err);
  }
}

let imapClient: ImapFlow | null = null;
let isSyncing = false;
let lastKnownCount = 0;

async function checkEmails() {
  if (isSyncing || !imapClient) return;
  isSyncing = true;

  try {
    let lock = await imapClient.getMailboxLock("INBOX");
    try {
      const status = await imapClient.status("INBOX", { messages: true, unseen: true });
      console.log(`[IMAP] INBOX Status: ${status.messages} total, ${status.unseen} unseen.`);

      if (lastKnownCount === 0) {
        lastKnownCount = status.messages;
        console.log(`[IMAP] Initialized lastKnownCount to ${lastKnownCount}`);
      }

      if (status.messages <= lastKnownCount) {
        console.log("[IMAP] No new messages by count.");
        return;
      }

      const range = `${lastKnownCount + 1}:*`;
      console.log(`[IMAP] Fetching new messages in range: ${range}`);

      let count = 0;
      for await (let message of imapClient.fetch(range, { source: true, uid: true })) {
        const parsed = await simpleParser(message.source);
        const messageId = parsed.messageId || `uid-${message.uid}`;
        
        const existing = await db.get("SELECT id FROM messages WHERE external_id = ?", [messageId]);
        if (existing) continue;

        count++;
        console.log(`[IMAP] Processing new message UID: ${message.uid}, ID: ${messageId}...`);
        
        const from = parsed.from?.text || "";
        const to = parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0].text : parsed.to.text) : runtimeConfig.EMAIL_SUPPORT_ADDR;
        const subject = parsed.subject || "(No Subject)";
        const body = parsed.text || "";
        const fromEmail = parsed.from?.value[0]?.address || "";

        if (!fromEmail) {
          console.log(`[IMAP] Skipping message UID: ${message.uid} (no sender email).`);
          continue;
        }

        // Normalize subject for matching
        const cleanSubject = subject.replace(/^(Re|Fwd|Отв|Пересл):\s*/i, "").trim();

        let user = await db.get("SELECT id FROM users WHERE username = ?", [fromEmail]);
        if (!user) {
          console.log(`[IMAP] Creating new user for ${fromEmail}...`);
          const randomPass = await bcrypt.hash(Math.random().toString(36), 10);
          const result = await db.run(
            "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
            [fromEmail, randomPass, parsed.from?.value[0]?.name || fromEmail, "client"]
          );
          user = { id: result.lastID };
          const userDir = path.join(MEDIA_ROOT, fromEmail);
          if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        }

        const ticketMatch = subject.match(/V-\d{4}/);
        let ticketId = ticketMatch ? ticketMatch[0] : null;
        let ticket = null;

        if (ticketId) {
          ticket = await db.get("SELECT id FROM tickets WHERE id = ?", [ticketId]);
        }

        // If no ID match, try matching by subject and client
        if (!ticket) {
          ticket = await db.get(
            "SELECT id FROM tickets WHERE client_id = ? AND (subject = ? OR subject LIKE ?) ORDER BY created_at DESC LIMIT 1",
            [user.id, cleanSubject, `%${cleanSubject}%`]
          );
          if (ticket) {
            ticketId = ticket.id;
            console.log(`[IMAP] Found existing ticket ${ticketId} by subject match.`);
          }
        }

        if (!ticket) {
          ticketId = `V-${Math.floor(1000 + Math.random() * 9000)}`;
          console.log(`[IMAP] Creating new ticket ${ticketId} for ${fromEmail}...`);
          const slaDeadline = new Date(Date.now() + 3600000 * 8).toISOString();
          await db.run(
            "INSERT INTO tickets (id, client_id, subject, description, sla_deadline) VALUES (?, ?, ?, ?, ?)",
            [ticketId, user.id, cleanSubject, `Email Ticket: ${cleanSubject}`, slaDeadline]
          );
          ticket = { id: ticketId };
          
          // Emit new ticket to all admins/support
          const newTicketFull = await db.get(`
            SELECT t.*, u.full_name as client_name 
            FROM tickets t 
            JOIN users u ON t.client_id = u.id 
            WHERE t.id = ?
          `, [ticketId]);
          io.emit("ticket:created", newTicketFull);
        } else {
          console.log(`[IMAP] Adding message to existing ticket ${ticketId}...`);
          // Re-open ticket if it was resolved
          await db.run("UPDATE tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [ticketId]);
        }

        let mediaUrl = null;
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const attachment of parsed.attachments) {
            if (attachment.contentType.startsWith("image/")) {
              const filename = `${Date.now()}-${attachment.filename}`;
              const userDir = path.join(MEDIA_ROOT, fromEmail);
              if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
              fs.writeFileSync(path.join(userDir, filename), attachment.content);
              mediaUrl = `/media_data/${fromEmail}/${filename}`;
              console.log(`[IMAP] Saved attachment: ${mediaUrl}`);
              break;
            }
          }
        }

        const clientName = parsed.from?.value[0]?.name || fromEmail;
        const formattedDate = new Date().toLocaleString('ru-RU', { 
          day: '2-digit', 
          month: 'short', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const formattedText = `**КЛИЕНТ:** ${clientName}\n**ДАТА:** ${formattedDate}\n**ОТ:** ${fromEmail}\n**ТЕМА:** ${subject}\n\n${body}`;
        const result = await db.run(
          "INSERT INTO messages (ticket_id, sender_id, text, media_url, is_internal, external_id) VALUES (?, ?, ?, ?, ?, ?)",
          [ticketId, user.id, formattedText, mediaUrl, 0, messageId]
        );

        const fullMsg = await db.get("SELECT m.*, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?", [result.lastID]);
        io.to(ticketId).emit("message:received", fullMsg);
        
        await imapClient.messageFlagsAdd({ uid: message.uid }, ["\\Seen"], { uid: true });
        console.log(`[IMAP] Message UID: ${message.uid} processed and marked as seen.`);
      }
      
      lastKnownCount = status.messages;
      if (count === 0) {
        console.log("[IMAP] No new messages to process in this range.");
      } else {
        console.log(`[IMAP] Finished processing ${count} new messages.`);
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("[IMAP] Sync Error:", err);
  } finally {
    isSyncing = false;
  }
}

async function initImapListener() {
  if (!runtimeConfig.EMAIL_IMAP.host || !runtimeConfig.EMAIL_IMAP.user || !runtimeConfig.EMAIL_IMAP.pass) return;

  console.log(`[IMAP] Establishing persistent connection to ${runtimeConfig.EMAIL_IMAP.host}...`);

  imapClient = new ImapFlow({
    host: runtimeConfig.EMAIL_IMAP.host,
    port: runtimeConfig.EMAIL_IMAP.port,
    secure: runtimeConfig.EMAIL_IMAP.secure,
    auth: {
      user: runtimeConfig.EMAIL_IMAP.user,
      pass: runtimeConfig.EMAIL_IMAP.pass,
    },
    logger: false,
    greetingTimeout: 60000,
    socketTimeout: 600000, // 10 minutes
    tls: {
      rejectUnauthorized: false,
      servername: runtimeConfig.EMAIL_IMAP.host,
    }
  });

  imapClient.on('error', err => {
    console.error('[IMAP] Connection Error:', err);
  });

  imapClient.on('close', () => {
    console.log("[IMAP] Connection closed. Reconnecting in 30s...");
    imapClient = null;
    setTimeout(initImapListener, 30000);
  });

  imapClient.on('exists', (data) => {
    console.log(`[IMAP] New mail notification received (${data.count} total). Syncing...`);
    checkEmails();
  });

  try {
    await imapClient.connect();
    console.log("[IMAP] Connected and listening for updates.");
    // Initial sync
    await checkEmails();
  } catch (err) {
    console.error("[IMAP] Initialization Failed:", err);
    imapClient = null;
    setTimeout(initImapListener, 30000);
  }
}

startServer();
