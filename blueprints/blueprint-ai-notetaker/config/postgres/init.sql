-- =============================================================================
-- AI Meeting Notes - Database Schema
-- =============================================================================
-- Tables: meetings, action_items, participants
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- MEETINGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    transcript TEXT NOT NULL,
    summary TEXT,
    key_points JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX idx_meetings_title ON meetings(title);

-- =============================================================================
-- ACTION ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    assigned_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

-- Indexes for filtering
CREATE INDEX idx_action_items_meeting_id ON action_items(meeting_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_created_at ON action_items(created_at DESC);

-- =============================================================================
-- PARTICIPANTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meeting_participant FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

-- Index for participant searches
CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);
CREATE INDEX idx_participants_name ON participants(name);

-- =============================================================================
-- TRIGGER: Update timestamp on row modification
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================================================
-- Uncomment to insert sample data

-- INSERT INTO meetings (title, transcript, summary, key_points) VALUES
-- (
--     'Product Planning Q1 2024',
--     'Team discussed Q1 goals. Sarah mentioned we need to prioritize mobile app. John agreed and suggested allocating 2 engineers. Maria raised concerns about timeline.',
--     'Team aligned on Q1 priorities with focus on mobile development.',
--     '["Prioritize mobile app", "Allocate 2 engineers", "Address timeline concerns"]'::jsonb
-- );

-- =============================================================================
-- GRANTS (if needed for specific user)
-- =============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO meetingnotesuser;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO meetingnotesuser;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check row counts:
-- SELECT 'meetings' as table_name, COUNT(*) as count FROM meetings
-- UNION ALL
-- SELECT 'action_items', COUNT(*) FROM action_items
-- UNION ALL
-- SELECT 'participants', COUNT(*) FROM participants;
