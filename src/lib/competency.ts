// Competencies that the AI will assess during the interview
export type CompetencyType =
  // Technical Skills (for tech recruiting)
  | 'technical_skills'
  | 'system_design'
  | 'coding_ability'
  | 'debugging'
  | 'architecture'
  | 'database_design'
  | 'api_design'
  | 'testing'
  | 'devops'
  | 'security'

  // Soft Skills
  | 'communication'
  | 'problem_solving'
  | 'leadership'
  | 'teamwork'
  | 'adaptability'
  | 'conflict_resolution'
  | 'time_management'
  | 'decision_making'

  // Role-Specific
  | 'project_management'
  | 'stakeholder_management'
  | 'product_thinking'
  | 'customer_focus'
  | 'strategic_thinking'
  | 'mentoring'

  // Culture & Values
  | 'culture_fit'
  | 'motivation'
  | 'growth_mindset'
  | 'ownership'

export interface CompetencyCoverage {
  competency: CompetencyType
  covered: boolean
  depth: number  // 0-3: 0=not covered, 1=surface, 2=moderate, 3=deep
  probeCount: number
  notes: string[]
}

export class Competency {
  private constructor(
    private readonly value: CompetencyType,
    private readonly displayName: string,
    private readonly description: string,
    private readonly category: 'technical' | 'soft' | 'role' | 'culture'
  ) {}

  static readonly ALL_COMPETENCIES: Record<CompetencyType, Competency> = {
    // Technical
    technical_skills: new Competency('technical_skills', 'Technical Skills', 'General programming and technical abilities', 'technical'),
    system_design: new Competency('system_design', 'System Design', 'Ability to design scalable systems', 'technical'),
    coding_ability: new Competency('coding_ability', 'Coding Ability', 'Writing clean, efficient code', 'technical'),
    debugging: new Competency('debugging', 'Debugging', 'Finding and fixing bugs systematically', 'technical'),
    architecture: new Competency('architecture', 'Architecture', 'Software architecture decisions', 'technical'),
    database_design: new Competency('database_design', 'Database Design', 'Data modeling and database optimization', 'technical'),
    api_design: new Competency('api_design', 'API Design', 'Designing clean, usable APIs', 'technical'),
    testing: new Competency('testing', 'Testing', 'Test strategy and implementation', 'technical'),
    devops: new Competency('devops', 'DevOps', 'CI/CD, infrastructure, deployment', 'technical'),
    security: new Competency('security', 'Security', 'Security awareness and practices', 'technical'),

    // Soft Skills
    communication: new Competency('communication', 'Communication', 'Clear and effective communication', 'soft'),
    problem_solving: new Competency('problem_solving', 'Problem Solving', 'Analytical and creative problem solving', 'soft'),
    leadership: new Competency('leadership', 'Leadership', 'Leading teams and initiatives', 'soft'),
    teamwork: new Competency('teamwork', 'Teamwork', 'Collaboration and team dynamics', 'soft'),
    adaptability: new Competency('adaptability', 'Adaptability', 'Handling change and ambiguity', 'soft'),
    conflict_resolution: new Competency('conflict_resolution', 'Conflict Resolution', 'Managing disagreements constructively', 'soft'),
    time_management: new Competency('time_management', 'Time Management', 'Prioritization and deadline management', 'soft'),
    decision_making: new Competency('decision_making', 'Decision Making', 'Making sound decisions with incomplete info', 'soft'),

    // Role-Specific
    project_management: new Competency('project_management', 'Project Management', 'Planning and executing projects', 'role'),
    stakeholder_management: new Competency('stakeholder_management', 'Stakeholder Management', 'Managing expectations and relationships', 'role'),
    product_thinking: new Competency('product_thinking', 'Product Thinking', 'Understanding user needs and product strategy', 'role'),
    customer_focus: new Competency('customer_focus', 'Customer Focus', 'Prioritizing customer needs', 'role'),
    strategic_thinking: new Competency('strategic_thinking', 'Strategic Thinking', 'Long-term planning and vision', 'role'),
    mentoring: new Competency('mentoring', 'Mentoring', 'Developing others', 'role'),

    // Culture & Values
    culture_fit: new Competency('culture_fit', 'Culture Fit', 'Alignment with company values', 'culture'),
    motivation: new Competency('motivation', 'Motivation', 'Drive and reasons for interest', 'culture'),
    growth_mindset: new Competency('growth_mindset', 'Growth Mindset', 'Learning orientation and self-improvement', 'culture'),
    ownership: new Competency('ownership', 'Ownership', 'Taking responsibility and initiative', 'culture'),
  }

  static fromType(type: CompetencyType): Competency {
    return Competency.ALL_COMPETENCIES[type]
  }

  static getTechnicalCompetencies(): Competency[] {
    return Object.values(Competency.ALL_COMPETENCIES).filter(c => c.category === 'technical')
  }

  static getSoftSkillCompetencies(): Competency[] {
    return Object.values(Competency.ALL_COMPETENCIES).filter(c => c.category === 'soft')
  }

  getType(): CompetencyType {
    return this.value
  }

  getDisplayName(): string {
    return this.displayName
  }

  getDescription(): string {
    return this.description
  }

  getCategory(): string {
    return this.category
  }

  equals(other: Competency): boolean {
    return this.value === other.value
  }
}
