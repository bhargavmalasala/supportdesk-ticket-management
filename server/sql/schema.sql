CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(180) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL CHECK (role IN ('customer','agent','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tickets (
 id SERIAL PRIMARY KEY, title VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Resolved','Closed')),
 priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
 customer_id INTEGER NOT NULL REFERENCES users(id), assignee_id INTEGER REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS comments (
 id SERIAL PRIMARY KEY, ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ticket_history (
 id SERIAL PRIMARY KEY, ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
 user_id INTEGER NOT NULL REFERENCES users(id), action VARCHAR(120) NOT NULL, details TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
 id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id, created_at DESC);
