# VikingDesk Project Context & Rules

## Project Overview
VikingDesk is a support ticket management system built with React (Vite), Express, and SQLite. It features real-time updates via Socket.IO and a modern UI using Tailwind CSS and Framer Motion.

## User Roles
- **admin**: Full access to all sections, including user and ticket management.
- **support**: Access to dashboard, tickets, and analytics.
- **client**: Can create and view their own tickets.

## Key Rules & Conventions
- **No `window.confirm`**: Avoid using `window.confirm` as it can be blocked or invisible in the AI Studio iframe. Use direct actions with error handling (e.g., `alert` for errors).
- **Ticket Visibility**: By default, tickets with status `RESOLVED` are hidden from the main ticket list and dashboard. They should only be visible when explicitly filtered (e.g., by clicking a "Resolved" stat card).
- **Status Comparison**: Always use case-insensitive and null-safe status comparisons: `(t.status || '').toUpperCase() === 'RESOLVED'`.
- **Real-Time Updates**: Use Socket.IO for real-time ticket and message updates. Ensure the server emits `ticket:updated`, `ticket:created`, and `ticket:deleted` events.
- **Access Control**: Restrict "Администрирование" (Admin) and "API & Интеграции" (API & Integrations) sections to the `admin` role only.

## Recent Changes
- Fixed admin deletion for users and tickets (removed `window.confirm`).
- Added error handling to ticket creation and deletion.
- Refined "Resolved" ticket filtering logic across all views.
- Improved statistics and status data calculations in the dashboard.
- **Session Persistence**: Added `/api/auth/me` endpoint and frontend logic in `App.tsx` to verify tokens on page refresh, preventing unwanted logouts.
- **Expandable Chat Window**: Implemented a toggle in `TicketDetail.tsx` (using `ChevronLeft`/`ChevronRight`) that allows the chat panel to expand to full width, hiding the ticket list for better focus.
- **Advanced Ticket Archive**: Redefined the "Tickets" section as a full-featured archive with search (by ID, subject, or client) and filters for status, priority, and resolved tickets.
- **Priority Management**: Added a mechanism to set and change ticket priority (low, medium, high, critical) in both the creation modal and the ticket detail view.
- **Email Threading & Matching**: Improved email integration to match replies (e.g., "Re:") to existing tickets by subject and client if no ID is found. Automatically re-opens resolved tickets upon receiving a new email message.
- **Component Refactoring**: Successfully extracted all major UI components into `src/components/` for better maintainability.
