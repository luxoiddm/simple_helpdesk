# Changelog - SupportDesk

## [v0.1.0-BETA] - 2026-04-17

### Added
- **Bulk Actions (Массовые действия):** 
  - Implementation of multi-select checkboxes for tickets in Dashboard and Tickets view.
  - Contextual bulk action bar for changing status, assigning support staff, or deleting tickets (admin only).
- **Archive Status (Архив):**
  - New ticket status `ARCHIVED`.
  - Archived tickets are excluded from total ticket counts on the dashboard.
  - Dedicated filter and statistics card for archived tickets.
- **Support Assignment (Назначение ответственного):**
  - Ability to assign tickets to support/admin users.
  - "Assign to me" button in the ticket detail view for quick self-assignment.
  - Visible assignee initials/avatar in ticket lists.
- **Updated Timestamps (Время обновления):**
  - Display of the last update time and date next to the ticket ID in the dashboard.
- **User Management (Управление пользователями):**
  - Two-tier deletion: Soft Delete (marks as deleted, preserves history) and Hard Delete (full removal with backup).
  - Automated backups of user data (tickets, messages) during hard deletion.
  - Indicators for deleted users in chat history.
- **Improved Security Rules:**
  - Logic to prevent logouts on refresh by verifying tokens via `/api/auth/me`.
  - Role-based access control for API & Administration sections.
- **UI Enhancements:**
  - Expandable chat window for better focus.
  - Replaced back arrow with a Close (X) icon in ticket details.
  - Copyright Luxoid and versioning added to Login and Sidebar.

### Fixed
- Admin-side deletion logic for users and tickets (removal of `window.confirm`).
- Email threading and matching logic for "Re:" replies.
- Ticket statistics calculations in the dashboard.
- Resolved ticket filtering logic.
- Component refactoring: Extracted UI components into separated files for better maintenance.

### Security & Internal
- Implementation of SQLite backend with migration support for new columns (`assigned_to`, `deleted_at`).
- Socket.IO bulk events synchronization (`ticket:bulk_updated`, `ticket:bulk_deleted`).
- Automated backup system in `/backups` directory.
