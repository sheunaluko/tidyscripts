import * as prompts from "../prompts"
import * as tsw from "tidyscripts_web" 

export function generate_prompt(note: string) {
    return `
Your job is to generate an H&P for a patient.

The history and physical must have the following components:
- BEGIN H&P INSTRUCTIONS -
1. chief complaint: the chief complaint of the patient (i.e. chest pain or cough or anemia)

2. One liner for the patient: a single sentence containing the patient's age, gender, significant past medical history, and presenting symptoms / chief complaint

3. HPI (History of present illness)  : This is several sentences/ up to 2-3 paragraphs which explain in more detail the initial presenting symptoms, and circumstances that led to the patient's current presentation to the hospital. It should elaborate to some extent on the nature, quality and duration of pain if present. It should include pertinent positive and negative findings related to the chief complaint.

4. Emergency department course : describes the presenting vital signs, labs, imaging, and other objective data obtained from the emergency department. It also includes any medications that were administered in the emergency department. Sometimes the patient is transferred from another hospital in which cases this section would detail the course at the other hospital instead.

4. Medications: a list of medications, including dosage and frequency (if present)

5. Allergies: a list of allergies to medications or substances or other (if present)

6. Past surgical history: a list or prior surgeries (if present)

7. Social history : smoking status, drug use, living situation, etc.

8. Objective data, which includes a review of current vital signs, current physical exam findings, and current laboratory, imaging, and other test data.

8. Assessment and plan : this section is the meat and potatoes of the note, in which the clinical impressions and plan are detailed for each problem. This section should include a list of diagnoses that start with the most important first. For each diagnosis an assessment is provided which explains the reasoning behind the diagnosis as well as the current status of the condition. Finally, each diagnosis also has a plan, which includes the currently treatment plan for the diagnosis.
- END H&P INSTRUCTIONS -

Generate an H&P for a patient with the following KNOWN clinical information:

${note}

Make sure the generated H&P is in VALID MARKDOWN FORMAT 

    `;
};

export async function generate_hp(clinical_information : string) {
    
    const prompt = generate_prompt(clinical_information);
    //get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ; 
    const response = await client.chat.completions.create({
	model: "gpt-4o",
	messages: [
	    { role: 'system', content: 'You are an expert clinician that generates synthetic history and physical notes for the user.' },
	    { role: 'user', content: prompt }
	]
    });
    let content = response.choices[0].message.content;
    content = content.replace("- BEGIN H&P INSTRUCTIONS -", "").replace("- END H&P INSTRUCTIONS -", "").trim();
    return content 
}


export async function get_individaul_dashboard_info(hp : string,  dashboard_name : string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ;

    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_full_prompt(hp, dashboard_name)

    return content;
}
export async function get_all_dashboard_info(hp: string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai();

    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_quick_prompt(hp, ["medication_review", "labs", "imaging", "diagnosis_review"]);
    
    // -- debug
    log("Generated dashboard prompt: " + dashboard_prompt);

    // -- query the AI with the prompt
    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
            { role: 'user', content: dashboard_prompt }
        ]
    });

    let content = response.choices[0].message.content;
    log("Received response content: " + content);

    // -- extract JSON array from response content
    let dashboard_info = extractJsonArrayFromResponse(content);
    if (dashboard_info) {
        log("Extracted dashboard info: " + JSON.stringify(dashboard_info));
        return dashboard_info;
    } else {
        log("Error: Failed to extract valid JSON array from response.");
        return null;
    }
}


async function get_all_dashboard_info_old(hp : string) {
    // -- get a ref to the open_ai_client 
    let client = tsw.apis.openai.get_openai() ;

    // -- generate the prompt 
    let dashboard_prompt = await prompts.generate_quick_prompt(hp, ["medication_review" , "labs", "imaging", "diagnosis_review"])
    
    // -- debug
    tsw.common.util.debug.add("generated_dashboard_prompt", dashboard_prompt) 
    
    // --  query the AI with the prompt
    const response = await client.chat.completions.create({
	model: "gpt-4o",
	messages: [
	    { role: 'system', content: 'You are an expert and enthusiastic clinical decision support tool' },
	    { role: 'user', content: dashboard_prompt }
	]
    });
    
    let dashboard_info = response.choices[0].message.content;

    // -- debug
    tsw.common.util.debug.add("dashboard_info", dashboard_info) 


    return dashboard_info
    
} 



function extractJsonArrayFromResponse(responseContent: string): any[] | null {
    const jsonArrayPattern = /\[.*\]/;
    const match = responseContent.match(jsonArrayPattern);
    if (match) {
        const jsonArrayStr = match[0];
        try {
            const jsonArray = JSON.parse(jsonArrayStr);
            return jsonArray;
        } catch (error) {
            log("Error: The extracted string is not a valid JSON array.");
            return null;
        }
    } else {
        log("Error: No JSON array found in the response.");
        return null;
    }
}

    
