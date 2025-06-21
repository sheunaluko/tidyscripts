export var template = `
Your goal is to generate a patient handoff based on the information given to you. 

The handoff is a concise summary of the patient and their active problems. Its purpose is to quickly inform a covering provider about the patient, assuming that they have never met or chart reviewed the patient before. Thus, it should include pertinent information and exclude extraneous information, so as to optimize the transfer of essential information to the cross covering physician in a timely manner.

The structure of the handoff consists first of the one-liner, which is a single sentence that summarizes the patient’s age, sex, medical comorbidities (often in a comma separated list), reason for presentation and optionally current status or diagnosis.

The one liner is followed by one or more diagnosis groups, which are the diagnoses being actively treated by the care team, ideally ranked in order of importance.

Each diagnosis group follows the same format. Each has three sections. The first section consists of one line for each diagnosis in the diagnosis group. 

The second section consists of a concise and brief narrative summary of the diagnoses in the group, including objective data (vitals, labs, imaging, physical exam, findings, history) that support the diagnoses or which provide critical supplemental or clarifying information relating to the diagnoses.

The third and final section consists of one line for each aspect of the plan for this diagnosis group. 
Each line describes a management action being taken for this diagnosis group. This includes information regarding ordered or held medication’s, imaging or consults to be obtained, surgeries or procedures to be done, or any other plan being taken or awaited by the primary team.

Much of the time, if not most of the time, a diagnosis group consists of a single diagnosis. However, if multiple diagnoses can be grouped together for efficiency and conciseness, this is preferred. This is especially true for diagnoses that share objective data and management plans.

Given the following information:

{patient_information}

Generate a patient handoff with the following parameters:

{parameters}

Use the Handoff Conciseness percentage to adjust output length: 100% means one concise sentence per diagnosis group followed by at most two plan items (preferably one).
`

export var default_parameters = ` 
Number of diagnosis_groups: 3-6
Number of sentences in narrative_summary of each diagnosis group: 3-6
Number of plan_items in each diagnosis_group: 2–5
`





    

