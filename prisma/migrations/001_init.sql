-- AIR (AI Interview Platform) - Initial Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vgimxgpcrueamzhgnlha/sql

-- =====================================================
-- ORGANIZATIONS (synced from Clerk)
-- =====================================================

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INTERVIEW TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_by TEXT NOT NULL,

    job_requisition_id TEXT,
    name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    company_name TEXT NOT NULL,

    competencies_to_assess JSONB DEFAULT '[]',
    must_ask_questions JSONB DEFAULT '[]',
    config JSONB DEFAULT '{"maxDurationMinutes": 9, "depthLevel": "standard", "maxProbesPerCompetency": 2, "aiVoice": "aura-asteria-en", "language": "en-US", "videoRequired": true}',

    status TEXT DEFAULT 'draft',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON interview_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON interview_templates(status);

-- =====================================================
-- CANDIDATES
-- =====================================================

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id),

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    resume_url TEXT,
    linkedin_url TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_candidates_org ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- =====================================================
-- INTERVIEW SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES interview_templates(id),
    candidate_id UUID REFERENCES candidates(id),

    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'invited',

    competency_coverage JSONB DEFAULT '[]',
    current_competency_index INTEGER DEFAULT 0,
    conversation_history JSONB DEFAULT '[]',

    metrics JSONB DEFAULT '{"totalDurationMs": 0, "candidateSpeakingTimeMs": 0, "aiSpeakingTimeMs": 0, "turnCount": 0}',

    video_url TEXT,
    audio_url TEXT,
    full_transcript TEXT,

    invited_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_template ON interview_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON interview_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON interview_sessions(status);

-- =====================================================
-- INTERVIEW SUMMARIES
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,

    summary_text TEXT,
    key_strengths JSONB DEFAULT '[]',
    areas_of_concern JSONB DEFAULT '[]',
    skills_mentioned JSONB DEFAULT '[]',

    competency_scores JSONB DEFAULT '[]',

    recommendation TEXT,
    recommendation_confidence FLOAT,
    recommendation_reasoning TEXT,

    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summaries_session ON interview_summaries(session_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON interview_templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON interview_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
CREATE TRIGGER update_candidates_updated_at
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Enable Row Level Security (optional, configure as needed)
-- =====================================================

-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interview_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interview_summaries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Done!
-- =====================================================

SELECT 'Migration completed successfully!' as status;
