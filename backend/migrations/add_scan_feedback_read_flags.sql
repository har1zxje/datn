ALTER TABLE scan_feedback_events ADD COLUMN is_read BOOLEAN DEFAULT 0;
ALTER TABLE scan_feedback_events ADD COLUMN read_at DATETIME;
