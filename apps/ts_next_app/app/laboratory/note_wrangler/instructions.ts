export const CONVERSION_INSTRUCTIONS = `COMPREHENSIVE TRANSFORMATION SUMMARY: PROGRESS NOTES TO DISCHARGE SUMMARIES
==================================================================================

This document synthesizes the key transformation principles identified across multiple examples for converting progress notes into discharge summaries. These principles should guide AI prompt development for automated transformation.

CORE FORMATTING
==================================================================================
You should leave the main high level formatting of the text the same
- i.e., do not change the section headers
- Each section should consist of headers followed by a paragraph for that section
- this should be followed by a plan subsection as follows

Plan:
- plan item 1 on discharge (may include "***") if it is ensure if this will happen or if it has not been set up yet
- plan item 2
- etc...

So the template or a section is like this: 

#Diagnosis1
#Diagnosis2
Paragraph about this section ....

Plan:
- discharge plan item 1
- discharge plan item 2 


It is key to remember that the patient is not yet discharging but we are preparing the discharge summary for when they do, so we leave some blanks/ reminders with *** to ensure that missing information gets filled in. 

CORE TRANSFORMATION DIMENSIONS
==================================================================================

1. TENSE
   - Convert all present tense observations and future planning language to past tense
   - Narrative should describe what WAS DONE during hospitalization, not what IS or WILL BE done
   - Example transformations: "will continue" → "continued", "plan to" → "underwent"
   - When making these transformations, include a "***" which is a placeholder for the reviewing physician to ensure that future planned events actually did indeed occur (since we are converting the tense) 

2. NARRATIVE_STYLE
   - Transform from assessment/planning format to retrospective narrative
   - Convert fragmented clinical documentation into cohesive storytelling
   - May include daily updates that need to be collapsed into single narrative
   - Focus on summarizing hospitalization rather than ongoing assessment

3. TEMPORAL_FRAMING
   - Change from ongoing assessment/monitoring to completed hospital stay
   - Document final outcomes rather than current status (however use "***") if the final outcome needs to be verified 
   - Shift from "monitoring" to "outcomes achieved"

4. SECTION_HEADERS
   - Convert from "Assessment & Plan" subheadings to hashtag-prefixed problem list (#Problem Name)
   - May consolidate related problems under single headers (though in general would preserve the headers that are present) 
   - May remove minor/stable problems not requiring discharge documentation

5. SENTENCE_INTEGRATION
   - Combine fragmented clinical notes into complete, flowing sentences
   - May need to combine daily updates into coherent narrative

6. ACTION_PLANNING_VS_RETROSPECTIVE
   - Convert future-oriented plans to past tense actions taken (but use "***" to ensure that it is reviewed) - for example; The patient will complete an antibiotic course becomes -> The patient *** completed an antibiotic course 
   - Change "will do, continue, monitor" to "was done, continued, monitored" with the *** as indicator 

7. CHRONOLOGICAL_REORDERING
   - Reorganize content to follow hospital course chronologically
   - Present from admission → procedures/interventions → discharge
   - Collapse serial daily notes into single chronological narrative
   - Not as ongoing assessment snapshots

8. OUTCOME_DOCUMENTATION
    - Document what happened during stay and final outcomes
    - Document resolution status rather than pending actions
    - Describe completed procedures and their results
    - Focus on endpoints, not ongoing processes

9. FOLLOW_UP_PLANS
    - When describing follow up that should be arranged, you can say:
      - *** follow up was arranged upon discharged 
    - in general for pending items that need to be arranged this passive voice with *** is essential to notify the user that the item needs to be done
    - instead of saying "review results in clinic in 2 weeks" say "she/he will need to follow up in clinic to review results" 

10. CLINICAL_REASONING_ELABORATION
    - Expand abbreviated clinical reasoning into fuller explanatory sentences
    - Add connecting phrases to link clinical events
    - Maintain clinical detail while creating narrative flow
    - Use transitional language to explain cause and effect


11. CONSULTATION_INTEGRATION
    - Convert consultation orders/requests to completed consultations
    - Document what consultants recommended and actions taken
    - Transform "appreciate recs", "c/s" to "was consulted and recommended..."
    - Remove internal team communication language

12. PROCEDURAL_DETAIL_EXPANSION (IF INFORMATION AVAILABLE)
    - Expand procedural notes with dates, process, and outcomes (ONLY IF AVAILABLE)
    - Include placement, monitoring, and removal for devices/interventions
    - Document completion of procedures like radiation, ERCP, thoracentesis, etc.
    - Specify timeline of procedural events

13. TREATMENT_CONTINUATION_SPECIFICATION
    - Clearly document discharge medication regimen UNDER EACH SECTION AS hyphenated PLAN ITEMS 
    - Replace "continue" with explicit medication on discharge
    - Specify what was held vs. continued vs. changed (SPECIFY this in plan for each section) 
    - Avoid vague "cont" or "ctm" statements

14. FOLLOW_UP_DOCUMENTATION
    - Specify follow-up plans rather than ongoing monitoring (FOR EACH SECTION IN THE PLAN)
    - State outpatient follow-up rather than inpatient serial monitoring 

15. REMOVING_ASSESSMENT_PLAN_SUBHEADINGS
    - Eliminate all "Assessment & Plan" repeated subheadings
    - Remove these structural headers from under each problem
    - Integrate content directly under problem headers

16. CONDENSATION_OF_LAB_VALUES
    - Present lab values in narrative form when relevant
    - Integrate into clinical story rather than formatted tables
    - Avoid detailed table formatting in discharge summary
    - Include only values relevant to clinical narrative

17. PRONOUN_USAGE
    - Use consistent pronoun reference throughout (he/his or she/her)
    - Maintain consistency within entire document
    - Patient-specific but ensure uniformity

18. PLACEHOLDER_HANDLING
    - Insert *** markers where actual patient-specific data needs completion
    - Use for pending results that should be filled in!
    - Mark incomplete information requiring real patient data
    - Examples: "underwent procedure on ***", "follow up in *** weeks"

19. TRANSITIONAL_PHRASING
    - Add transitional phrases to connect clinical events
    - Create narrative flow between sequential events
    - Use connecting language: "After...", "Following...", "Subsequently..."
    - Link cause and effect relationships

20. REMOVING_INTERNAL_TEAM_COMMUNICATIONS
    - Remove internal team notes and communications
    - Eliminate phrases like:
      - "appreciate oncology recs"
      - "will tbw cardio-oncology Monday"
      - "await serial CXRs and IP recs"
      - "t/b with Med Onc"
    - Convert to completed consultation summaries
    - Document final actions taken, not internal coordination

21. REMOVING_CMS_HCC_ANNOTATIONS
    - Remove ALL administrative coding annotations
    - Strip out: (CMS/HCC), (HCC), (initial encounter), etc.
    - Keep only clean diagnosis names
    - No billing/coding markers in discharge summary

22. COMPLETENESS_OF_INFORMATION
    - Use *** placeholders for information requiring patient-specific completion
    - Mark areas where actual outcomes need to be inserted
    - Ensure all pending items are addressed or marked
    - Final document should be ready for data insertion

==================================================================================
IMPORTANT 
==================================================================================

- Please remember to PRESERVE THE HEADINGS THAT ARE ALREADY PRESENT FOR EACH SECTION

- DO NOT ADD PLAN ITEMS THAT ARE NOT EXPLICITLY DEFINED

- if there are no plan items for a section you can simply put " - outpatient follow up " 


==================================================================================
END OF SUMMARY
==================================================================================
`;
