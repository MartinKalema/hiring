/**
 * AI Prompts Index
 *
 * Central export for all interview prompts and templates.
 */

// Junior Data Engineer Prompt
export {
  generateJuniorDataEngineerPrompt,
  defaultJuniorDataEngineerConfig,
  JUNIOR_DATA_ENGINEER_SYSTEM_PROMPT,
  type JuniorDataEngineerPromptConfig,
} from './junior-data-engineer.prompt'

// Template loader utility
import juniorDataEngineerTemplate from './templates/junior-data-engineer.template.json'

export const TEMPLATES = {
  juniorDataEngineer: juniorDataEngineerTemplate,
} as const

export type TemplateName = keyof typeof TEMPLATES

/**
 * Get a pre-configured interview template by name
 */
export function getTemplate(name: TemplateName) {
  return TEMPLATES[name]
}
