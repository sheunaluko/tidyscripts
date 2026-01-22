/**
 * PromptManager - Manages construction and modification of system prompts
 *
 * Stores the "recipe" (sections + args) rather than just the baked string,
 * enabling programmatic generation of modified prompt variants.
 */

import { buildPrompt } from "./cortex_prompt_blocks"
import type { SectionName, SectionArgs } from "./cortex_prompt_blocks"

export type SectionOverrides = {
    [K in SectionName]?: any[] | null  // null = exclude section
}

export class PromptManager {
    private sections: SectionName[]
    private sectionArgs: SectionArgs

    constructor(ops: {
	sections: SectionName[]
	sectionArgs?: SectionArgs
    }) {
	this.sections = ops.sections
	this.sectionArgs = ops.sectionArgs || {}
    }

    /**
     * Build the prompt string using stored sections and args
     */
    build(): string {
	return buildPrompt({
	    sections: this.sections,
	    sectionArgs: this.sectionArgs
	})
    }

    /**
     * Build a modified copy of the prompt with section overrides
     *
     * - Pass an array to replace that section's args
     * - Pass null to exclude the section entirely
     * - Unspecified sections use original values
     */
    buildWith(overrides: SectionOverrides): string {
	const finalSections: SectionName[] = []
	const finalArgs: Record<string, any[]> = {}

	for (const section of this.sections) {
	    const override = overrides[section]

	    if (override === null) {
		// Explicitly excluded
		continue
	    } else if (override !== undefined) {
		// Use override args
		finalSections.push(section)
		finalArgs[section] = override
	    } else {
		// Use original
		finalSections.push(section)
		const originalArgs = (this.sectionArgs as Record<string, any[]>)[section]
		if (originalArgs) {
		    finalArgs[section] = originalArgs
		}
	    }
	}

	return buildPrompt({
	    sections: finalSections,
	    sectionArgs: finalArgs as SectionArgs
	})
    }

    /**
     * Get the current sections list
     */
    getSections(): SectionName[] {
	return [...this.sections]
    }

    /**
     * Get the current section args
     */
    getSectionArgs(): SectionArgs {
	return { ...this.sectionArgs }
    }
}
