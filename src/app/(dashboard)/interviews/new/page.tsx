'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompetencyType, Competency } from '@/lib/competency'

type InputMethod = 'link' | 'text' | 'scratch'
type Step = 'input' | 'details' | 'competencies' | 'settings' | 'preview'

interface InterviewFormData {
  // Job info
  jobTitle: string
  jobDescription: string
  companyName: string

  // Competencies to assess
  competencies: CompetencyType[]

  // Settings
  maxDurationMinutes: number
  voice: string
  videoRequired: boolean
  depthLevel: 'quick' | 'standard' | 'deep'
}

const AVAILABLE_COMPETENCIES: Array<{ type: CompetencyType; name: string; category: string }> = [
  // Technical
  { type: 'technical_skills', name: 'Technical Skills', category: 'Technical' },
  { type: 'system_design', name: 'System Design', category: 'Technical' },
  { type: 'coding_ability', name: 'Coding Ability', category: 'Technical' },
  { type: 'debugging', name: 'Debugging', category: 'Technical' },
  { type: 'architecture', name: 'Architecture', category: 'Technical' },

  // Soft Skills
  { type: 'communication', name: 'Communication', category: 'Soft Skills' },
  { type: 'problem_solving', name: 'Problem Solving', category: 'Soft Skills' },
  { type: 'leadership', name: 'Leadership', category: 'Soft Skills' },
  { type: 'teamwork', name: 'Teamwork', category: 'Soft Skills' },

  // Role-Specific
  { type: 'project_management', name: 'Project Management', category: 'Role-Specific' },
  { type: 'stakeholder_management', name: 'Stakeholder Management', category: 'Role-Specific' },
]

const VOICE_OPTIONS = [
  { id: 'aura-asteria-en', name: 'Asteria', description: 'Female, American' },
  { id: 'aura-luna-en', name: 'Luna', description: 'Female, American' },
  { id: 'aura-stella-en', name: 'Stella', description: 'Female, American' },
  { id: 'aura-orion-en', name: 'Orion', description: 'Male, American' },
  { id: 'aura-arcas-en', name: 'Arcas', description: 'Male, American' },
]

export default function NewInterviewPage() {
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<InputMethod>('text')
  const [step, setStep] = useState<Step>('input')
  const [isGenerating, setIsGenerating] = useState(false)

  const [formData, setFormData] = useState<InterviewFormData>({
    jobTitle: '',
    jobDescription: '',
    companyName: '',
    competencies: ['technical_skills', 'communication', 'problem_solving'],
    maxDurationMinutes: 9,
    voice: 'aura-asteria-en',
    videoRequired: true,
    depthLevel: 'standard',
  })

  const handleGenerateFromDescription = async () => {
    if (!formData.jobDescription.trim()) return

    setIsGenerating(true)

    // TODO: Call AI to extract job title and suggest competencies
    // For now, we'll simulate this
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Simple extraction - in production this would be AI-powered
    const lines = formData.jobDescription.split('\n')
    const possibleTitle = lines.find(line =>
      line.toLowerCase().includes('engineer') ||
      line.toLowerCase().includes('developer') ||
      line.toLowerCase().includes('manager')
    )

    setFormData(prev => ({
      ...prev,
      jobTitle: possibleTitle?.trim() || 'Software Engineer',
    }))

    setIsGenerating(false)
    setStep('details')
  }

  const toggleCompetency = (comp: CompetencyType) => {
    setFormData(prev => ({
      ...prev,
      competencies: prev.competencies.includes(comp)
        ? prev.competencies.filter(c => c !== comp)
        : [...prev.competencies, comp],
    }))
  }

  const estimatedDuration = () => {
    const baseTime = 3 // minutes for intro/outro
    const perCompetency = formData.depthLevel === 'quick' ? 1 : formData.depthLevel === 'standard' ? 1.5 : 2
    return Math.ceil(baseTime + formData.competencies.length * perCompetency)
  }

  const handleCreateInterview = async () => {
    // TODO: Save to database via API
    console.log('Creating interview:', formData)

    // For now, just redirect to dashboard
    router.push('/dashboard')
  }

  // Step 1: Input job description
  if (step === 'input') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Create New Interview</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start by providing the job description. Our AI will help you configure the interview.
          </p>
        </div>

        {/* Input method tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['text', 'link', 'scratch'] as InputMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setInputMethod(method)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                inputMethod === method
                  ? 'bg-white dark:bg-gray-700 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {method === 'link' ? 'From link' : method === 'text' ? 'From text' : 'From scratch'}
            </button>
          ))}
        </div>

        <div className="card">
          {inputMethod === 'text' && (
            <>
              <label className="block text-sm font-medium mb-2">
                Paste job description
              </label>
              <textarea
                className="input min-h-[300px] font-mono text-sm"
                placeholder="Paste the full job description here...

Example:
Senior Software Engineer - Backend

We're looking for a senior backend engineer to join our team...

Requirements:
- 5+ years of experience
- Python, Go, or Node.js
- System design experience
..."
                value={formData.jobDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
              />
              <p className="text-sm text-gray-500 mt-2">
                Don&apos;t worry about formatting — our AI will extract the relevant information.
              </p>
            </>
          )}

          {inputMethod === 'link' && (
            <>
              <label className="block text-sm font-medium mb-2">
                Job posting URL
              </label>
              <input
                type="url"
                className="input"
                placeholder="https://careers.company.com/job/..."
              />
              <p className="text-sm text-gray-500 mt-2">
                We&apos;ll fetch the job description from the URL.
              </p>
            </>
          )}

          {inputMethod === 'scratch' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., TechCorp"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Job description (optional)</label>
                  <textarea
                    className="input min-h-[150px]"
                    placeholder="Brief description of the role..."
                    value={formData.jobDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={inputMethod === 'scratch' ? () => setStep('competencies') : handleGenerateFromDescription}
              className="btn-primary"
              disabled={inputMethod !== 'scratch' && !formData.jobDescription.trim()}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">✨</span>
                  Generating...
                </>
              ) : (
                <>
                  {inputMethod === 'scratch' ? 'Continue' : 'Generate Interview'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Job details
  if (step === 'details') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Job Details</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Confirm or edit the extracted job information.
          </p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Job title</label>
            <input
              type="text"
              className="input"
              value={formData.jobTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Company name</label>
            <input
              type="text"
              className="input"
              placeholder="Your company name"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
            />
          </div>

          <div className="pt-4 flex justify-between">
            <button onClick={() => setStep('input')} className="btn-secondary">
              Back
            </button>
            <button
              onClick={() => setStep('competencies')}
              className="btn-primary"
              disabled={!formData.jobTitle || !formData.companyName}
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Select competencies
  if (step === 'competencies') {
    const groupedCompetencies = AVAILABLE_COMPETENCIES.reduce((acc, comp) => {
      if (!acc[comp.category]) acc[comp.category] = []
      acc[comp.category].push(comp)
      return acc
    }, {} as Record<string, typeof AVAILABLE_COMPETENCIES>)

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">What to Assess</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select the competencies you want the AI to evaluate during the interview.
          </p>
        </div>

        <div className="card">
          {Object.entries(groupedCompetencies).map(([category, competencies]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">{category}</h3>
              <div className="grid grid-cols-2 gap-2">
                {competencies.map((comp) => (
                  <button
                    key={comp.type}
                    onClick={() => toggleCompetency(comp.type)}
                    className={`p-3 rounded-lg border text-left transition ${
                      formData.competencies.includes(comp.type)
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        formData.competencies.includes(comp.type)
                          ? 'bg-violet-500 border-violet-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.competencies.includes(comp.type) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">{comp.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="text-sm text-gray-500 mb-4">
            {formData.competencies.length} competencies selected •
            Estimated duration: ~{estimatedDuration()} min
          </div>

          <div className="pt-4 flex justify-between border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setStep('details')} className="btn-secondary">
              Back
            </button>
            <button
              onClick={() => setStep('settings')}
              className="btn-primary"
              disabled={formData.competencies.length === 0}
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Interview settings
  if (step === 'settings') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Interview Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure how the AI interviewer behaves.
          </p>
        </div>

        <div className="card space-y-6">
          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">Maximum duration</label>
            <select
              className="input"
              value={formData.maxDurationMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, maxDurationMinutes: parseInt(e.target.value) }))}
            >
              <option value={5}>5 minutes</option>
              <option value={9}>9 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
            </select>
          </div>

          {/* Depth level */}
          <div>
            <label className="block text-sm font-medium mb-2">Interview depth</label>
            <div className="grid grid-cols-3 gap-2">
              {(['quick', 'standard', 'deep'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setFormData(prev => ({ ...prev, depthLevel: level }))}
                  className={`p-3 rounded-lg border text-center transition ${
                    formData.depthLevel === level
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium capitalize">{level}</div>
                  <div className="text-xs text-gray-500">
                    {level === 'quick' ? '1 follow-up' : level === 'standard' ? '2 follow-ups' : '3 follow-ups'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice selection */}
          <div>
            <label className="block text-sm font-medium mb-2">AI Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setFormData(prev => ({ ...prev, voice: voice.id }))}
                  className={`p-3 rounded-lg border text-left transition ${
                    formData.voice === voice.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{voice.name}</div>
                  <div className="text-xs text-gray-500">{voice.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Video toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Require video</label>
              <p className="text-sm text-gray-500">Candidates must have camera on</p>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, videoRequired: !prev.videoRequired }))}
              className={`w-12 h-6 rounded-full transition ${
                formData.videoRequired ? 'bg-violet-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                formData.videoRequired ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="pt-4 flex justify-between border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setStep('competencies')} className="btn-secondary">
              Back
            </button>
            <button onClick={() => setStep('preview')} className="btn-primary">
              Preview & Create
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 5: Preview
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Preview Interview</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review your interview configuration before creating.
        </p>
      </div>

      <div className="card space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Job Title</p>
            <p className="font-medium">{formData.jobTitle}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Company</p>
            <p className="font-medium">{formData.companyName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-medium">Up to {formData.maxDurationMinutes} minutes</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Depth</p>
            <p className="font-medium capitalize">{formData.depthLevel}</p>
          </div>
        </div>

        {/* Competencies */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Competencies to Assess</p>
          <div className="flex flex-wrap gap-2">
            {formData.competencies.map((comp) => (
              <span
                key={comp}
                className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm"
              >
                {AVAILABLE_COMPETENCIES.find(c => c.type === comp)?.name}
              </span>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div>
          <p className="text-sm text-gray-500 mb-2">AI Voice</p>
          <p className="font-medium">
            {VOICE_OPTIONS.find(v => v.id === formData.voice)?.name} —{' '}
            {VOICE_OPTIONS.find(v => v.id === formData.voice)?.description}
          </p>
        </div>

        <div className="pt-4 flex justify-between border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setStep('settings')} className="btn-secondary">
            Back
          </button>
          <button onClick={handleCreateInterview} className="btn-primary">
            Create Interview
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
