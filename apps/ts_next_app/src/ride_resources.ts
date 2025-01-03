import { z } from "zod" ;
import { zodResponseFormat } from 'openai/helpers/zod' ; 


/*
 * Define the response structure for the handoff 
 */

const one_liner = z.string()  ;
const diagnosis_group = z.object({
    diagnoses : z.array(z.string()),
    narrative_summary : z.string() ,
    plan_items : z.array(z.string())  
})
const handoff_response_structure = z.object({
    one_liner,
    diagnosis_groups : z.array(diagnosis_group)
}) ;

export const Handoff_Response_Format = zodResponseFormat(handoff_response_structure, 'handoff')



export var test_ap_1 = `
Obstructive lung disease (HCC) 

Assessment & Plan 

PFTs done 3/12/24 with severe obstructive ventilatory defect. Mild DLCO impairment. (FEV1% 46 PRE, and POST 49%).  

  

She does not appear to have a pulmonologist. She has chart history of asthma and COPD however her lack of smoking points away from COPD despite her severely reduced FEV1. On the other hand she does have history of atopy with lifelong allergies but these do not seem out of control. Interestingly she worked as a hair dresser for 10 years and states she was exposed to a lot of chemicals that triggered her allergies.  

  

Overall it seems more likely she is having asthma exacerbation given expiratory wheezing. RPP was negative and she has no sick contacts  

  

- start pred 40 daily for asthma exacerbation (will schedule for AM given patient is currently minimally symptomatic; risk of insomnia/hyperglycemia; and will give time for day team to reassess prior to 9AM administration)  

- prn duonebs with RT+ home incruse; restart symbicort as tolerated  

- she should see pulmonology likely outpatient given her diagnosis of COPD without smoking history and her current inhaler regimen being more for COPD than for asthma  

  

* Acute exacerbation of chronic heart failure (HCC) 

Assessment & Plan 

Regimen: lisinopril 40mg, carvedilol 25mg BID, spironolactone 25mg, empagliflozin 25mg  

TTE 11/2024: LVEF 60-65%, grade III diastolic dysfunction 

NT-BNP 3.6k, decreased from prior admission for HF exacerbation.  

  

Overall her presentation does have features c/w mild CHF exacerbation including orthopnea, elevated BNP, mild LE edema, all exacerbated in the setting of poorly controlled HTN.  However her CXR is relatively clear and she is breathing well on RA; with mild expiratory wheezing 

  

- will continue GDMT with lisinopril, coreg, spiro, jardiance  

- hypertensive control as elsewhere  

- will give lasix spot dose 40mg IV and assess response  

  

Atrial fibrillation (CMS/HCC) (HCC) 

Assessment & Plan 

PPM placed 3/2024 admission for presyncope after EP consultation. Last device check was mobile check 11/24/24  which showed 26% afib and the rest of the time predominantly controlled NSR. Prior to this another check has report date 10/29/24 (but was uploaded 12/2024 ); notable for 62% atrial paced; 6% ventricular paced ; AT/AF burden 4.0%.  

- EKG this admission with afib + what looks like v paced beats ; HR well controlled currently and regular on my physical exam  

- telemetry; consider device check this admission  

- eliquis  

  

Hypertension, essential 

Assessment & Plan 

- continue home coreg 25; lisinopril 40, spiro 25; BP has already improved; will ctm  

  

CVA (cerebral vascular accident) (HCC) 

Assessment & Plan 

Patient presented on 11/24/2024 with LLE weakness, CT showed subacute infarct in right ACA territory. She underwent EGD 11/21/2024 and had held her Eliquis for 3 days prior (resumed 11/24/2024). She was out of the window for tPA. Thought to be cardioembolic etiology in setting of hypertension, atrial fibrillation, & coronary artery disease.  

- no new neurologic complaints; exam non focal  

- continue atorva 80 / eliquis  

  

Glaucoma 

Assessment & Plan 

- continue home eye drops
`

