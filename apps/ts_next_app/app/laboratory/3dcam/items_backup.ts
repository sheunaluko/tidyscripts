import { Item } from "./types";

export const ITEMS: Item[] = [
  // Feature 3: Disorganized Thinking
  { id: "feature3_q1", text: "Was the patient unable to correctly identify the day of the week?", feature: "feature3", type: "question" },
  { id: "feature3_q2", text: "Please tell me the year we are in right now.", feature: "feature3", type: "question" },
  { id: "feature3_q3", text: "Please tell me what type of place this is (hospital, rehab, home, etc.).", feature: "feature3", type: "question" },
  { id: "feature3_obs1", text: "Was the patient’s flow of ideas unclear or illogical?", feature: "feature3", type: "observation" },
  { id: "feature3_obs2", text: "Was the patient’s conversation rambling, inappropriately verbose, or tangential?", feature: "feature3", type: "observation" },
  { id: "feature3_obs3", text: "Was the patient’s speech unusually limited or sparse?", feature: "feature3", type: "observation" },

  // Feature 2: Attention
  { id: "feature2_q1", text: "Was the patient unable to correctly name the months of the year backwards?", feature: "feature2", type: "question" },
  { id: "feature2_q2", text: "Please tell me the days of the week backwards, say 'Saturday' as your first day.", feature: "feature2", type: "question" },
  { id: "feature2_q3", text: "Repeat these numbers in backward order: '7-5-1'.", feature: "feature2", type: "question" },
  { id: "feature2_q4", text: "Repeat these numbers in backward order: '8-2-4-3'.", feature: "feature2", type: "question" },
  { id: "feature2_obs1", text: "Does the patient have trouble keeping track of what was said or following directions?", feature: "feature2", type: "observation" },
  { id: "feature2_obs2", text: "Does the patient appear to be inappropriately distracted by external stimuli?", feature: "feature2", type: "observation" },

  // Feature 1: Acute Change or Fluctuation
  { id: "feature1_q1", text: "Over the past day, have you felt confused?", feature: "feature1", type: "question" },
  { id: "feature1_q2", text: "Over the past day, do you think that you were not really in the hospital (or location of interview)?", feature: "feature1", type: "question" },
  { id: "feature1_q3", text: "Over the past day, did you see things that were not really there?", feature: "feature1", type: "question" },
  { id: "feature1_obs1", text: "Did the patient’s level of consciousness, level of attention, or speech/thinking fluctuate during the interview?", feature: "feature1", type: "observation" },
  { id: "feature1_obs2", text: "If prior assessments exist, is there evidence of an acute change in memory or thinking (according to records or informant)?", feature: "feature1", type: "observation" },
  { id: "feature1_obs3", text: "If prior assessments are unavailable, are there any new signs of delirium based on the above questions (new errors, positive ratings)?", feature: "feature1", type: "observation" },

  // Feature 4: Altered Level of Consciousness
  { id: "feature4_obs1", text: "Was the patient sleepy during the interview? (Requires that they actually fall asleep.)", feature: "feature4", type: "observation" },
  { id: "feature4_obs2", text: "Did the patient show vigilance problems or primitive agitation?", feature: "feature4", type: "observation" },
  { id: "feature4_obs3", text: "Is a MAAS score abnormal?", feature: "feature4", type: "observation" }
];

export function item_id_to_text(id : string) {
    let tmp = ITEMS.filter( (i:any)=> (i.id == id) )[0]
    return tmp.text 
}
