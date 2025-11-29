-- =====================================================
-- AIR - AI Interview Platform Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS (from Clerk, we just store reference)
-- =====================================================

CREATE TABLE organizations (
    id TEXT PRIMARY KEY,  -- Clerk organization ID
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTERVIEW TEMPLATES
-- Reusable interview configurations created by recruiters
-- =====================================================

CREATE TABLE interview_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_by TEXT NOT NULL,  -- Clerk user ID

    -- Job information
    job_requisition_id UUID,  -- Optional link to job requisition
    name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    company_name TEXT NOT NULL,

    -- What to assess
    competencies_to_assess JSONB NOT NULL DEFAULT '[]',
    must_ask_questions JSONB NOT NULL DEFAULT '[]',

    -- Configuration
    config JSONB NOT NULL DEFAULT '{
        "maxDurationMinutes": 9,
        "depthLevel": "standard",
        "maxProbesPerCompetency": 2,
        "aiVoice": "aura-asteria-en",
        "language": "en-US",
        "videoRequired": true,
        "allowPause": false,
        "showTranscript": false
    }',

    -- Status
    status TEXT NOT NULL DEFAULT 'draft',  -- draft, active, paused, completed, archived

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_org ON interview_templates(organization_id);
CREATE INDEX idx_templates_status ON interview_templates(status);

-- =====================================================
-- CANDIDATES
-- People being interviewed
-- =====================================================

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id),

    -- Basic info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    -- Additional data
    resume_url TEXT,
    linkedin_url TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, email)
);

CREATE INDEX idx_candidates_org ON candidates(organization_id);
CREATE INDEX idx_candidates_email ON candidates(email);

-- =====================================================
-- INTERVIEW SESSIONS
-- Individual interview instances with candidates
-- =====================================================

CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES interview_templates(id),
    candidate_id UUID REFERENCES candidates(id),

    -- Unique token for interview link
    token TEXT UNIQUE NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'invited',
    -- invited, started, in_progress, completed, abandoned, expired, technical_error

    -- Competency tracking
    competency_coverage JSONB NOT NULL DEFAULT '[]',
    current_competency_index INTEGER DEFAULT 0,

    -- Conversation
    conversation_history JSONB NOT NULL DEFAULT '[]',

    -- Metrics
    metrics JSONB DEFAULT '{
        "totalDurationMs": 0,
        "candidateSpeakingTimeMs": 0,
        "aiSpeakingTimeMs": 0,
        "turnCount": 0,
        "averageResponseTimeMs": 0
    }',

    -- Recordings
    video_url TEXT,
    audio_url TEXT,
    full_transcript TEXT,

    -- Timestamps
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_template ON interview_sessions(template_id);
CREATE INDEX idx_sessions_candidate ON interview_sessions(candidate_id);
CREATE INDEX idx_sessions_token ON interview_sessions(token);
CREATE INDEX idx_sessions_status ON interview_sessions(status);

-- =====================================================
-- INTERVIEW SUMMARIES
-- AI-generated summaries after interview completion
-- =====================================================

CREATE TABLE interview_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

    -- Summary content
    summary_text TEXT,
    key_strengths JSONB DEFAULT '[]',
    areas_of_concern JSONB DEFAULT '[]',
    skills_mentioned JSONB DEFAULT '[]',

    -- Scores per competency
    competency_scores JSONB DEFAULT '[]',

    -- Overall recommendation
    recommendation TEXT,  -- strong_yes, yes, maybe, no, strong_no
    recommendation_confidence FLOAT,
    recommendation_reasoning TEXT,

    -- Generated timestamp
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summaries_session ON interview_summaries(session_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON interview_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_summaries ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would be configured based on your auth setup
-- For Clerk, you'd typically use a custom JWT claim to identify the organization

-- =====================================================
-- SAMPLE DATA (for development)
-- =====================================================

-- Uncomment to insert sample data
/*
INSERT INTO organizations (id, name) VALUES
('org_sample', 'Sample Company');

INSERT INTO interview_templates (
    organization_id,
    created_by,
    name,
    job_title,
    job_description,
    company_name,
    competencies_to_assess,
    status
) VALUES (
    'org_sample',
    'user_sample',
    'Senior Engineer Interview',
    'Senior Software Engineer',
    'We are looking for a senior software engineer...',
    'Sample Company',
    '["technical_skills", "system_design", "communication", "problem_solving"]',
    'active'
);
*/
