import { Item } from "./types";


const cmp = {
    f1: '#eec9c9', // Acute Change/Fluctuation (light red/pink)
    f2: '#c6dceb', // Inattention (light blue)
    f3: '#d7e9c6', // Disorganized Thinking (light green)
    f4: '#dddddd', // Altered Level of Consciousness (light gray)
    correct: '#8cc97c', // Correct button (green)
    black : "#000000" , 
}

export const ITEMS: Item[] = [
    // Override
    {
	id: "override_1",
	text: "Severe lethargy or severe altered level of consciousness (no or minimal response to voice/touch). If present and baseline unclear, please confirm baseline with caregiver, outpatient providers",
	feature: "feature4",
	type: "override",
	banner_info : {
	    title : "3D-CAM" ,
	    subtitle : "Step 1: Severe lethargy or severe altered level of consciousness screen", 
	    bgc : cmp.black , 
	}, 
	answer_map: { pass: "Not Present", fail: "Present" }
    },

    // 1st display only item 
    {
	id: "display1",
	text: "Have UB-2 results on hand (Day of the Week and Months of the Year Backwards)",
	feature: null  , 
	type: "display",
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "Step 2: Done by Nursing on UB-2" , 
	    bgc  : cmp.black , 
	},
	answer_map: { pass: "OK" } 
    },
    

    // Feature 3: Disorganized Thinking (questions)
    {
	id: "feature3_q1",
	text: "Carry forward from the UB-2: Was the patient unable to correctly identify the day of the week?",
	feature: "feature3",
	type: "question",
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "3: Assess Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3 
	},
	
	answer_map: { pass: "Correct", fail: "Incorrect" }
    },
    {
	id: "feature3_q2",
	text: "Please tell me the year we are in right now.",
	feature: "feature3",
	type: "question",
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "3: Assess Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3 
	},
	
	answer_map: { pass: "Correct", fail: "Incorrect" }
    },
    {
	id: "feature3_q3",
	text: "Please tell me what type of place this is (hospital, rehab, home, etc.).",
	feature: "feature3",
	type: "question",
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "3: Assess Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3
	},
	
	answer_map: { pass: "Correct", fail: "Incorrect" }
    },

    // Feature 2: Attention (questions)
    {
	id: "feature2_q1",
	text: "Carry forward from the UB-2: Was the patient unable to correctly name the months of the year backwards?",
	feature: "feature2",
	type: "question",
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "4: Assess Attention (CAM Feature 2)" ,
	    bgc : cmp.f2
	},

	answer_map: { pass: "Correct", fail: "Incorrect" }
    },
    {
	id: "feature2_q2",
	text: "Please tell me the days of the week backwards, say 'Saturday' as your first day.",
	feature: "feature2",
	type: "question",
	answer_map: { pass: "Correct", fail: "Incorrect" }, 
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "4: Assess Attention (CAM Feature 2)" ,
	    bgc : cmp.f2
	},
	
    },
    {
	id: "feature2_q3",
	text: "Repeat these numbers in backward order: '7-5-1'.",
	feature: "feature2",
	type: "question",
	answer_map: { pass: "Correct", fail: "Incorrect" },
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "4: Assess Attention (CAM Feature 2)" ,
	    bgc : cmp.f2
	},

    },
    {
	id: "feature2_q4",
	text: "Repeat these numbers in backward order: '8-2-4-3'.",
	feature: "feature2",
	type: "question",
	answer_map: { pass: "Correct", fail: "Incorrect" } , 
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "4: Assess Attention (CAM Feature 2)" ,
	    bgc : cmp.f2
	},
	
    },

    // Feature 1: Acute Change or Fluctuation (questions)
    {
	id: "feature1_q1",
	text: "Over the past day, have you felt confused?",
	feature: "feature1",
	type: "question",
	answer_map: { pass: "No", fail: "Yes" }, 
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "5: Assess Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},
	
    },
    {
	id: "feature1_q2",
	text: "Over the past day, do you think that you were not really in the hospital (or location of interview)?",
	feature: "feature1",
	type: "question",
	answer_map: { pass: "No", fail: "Yes" }, 
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "5: Assess Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},

    },
    {
	id: "feature1_q3",
	text: "Over the past day, did you see things that were not really there?",
	feature: "feature1",
	type: "question",
	answer_map: { pass: "No", fail: "Yes" }, 
	banner_info : {
	    title : "3D-CAM Part 1: Patient Assessment" ,
	    subtitle : "5: Assess Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},

    },

    // 2nd display only item 
    {
	id: "display2",
	text: "Reflect on your bedside observations and newly acquired history (e.g. patient's cognitive baseline)",
	feature: null  , 
	type: "display",
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "(Of Assessment Observations and Additional History)" , 
	    bgc  : cmp.black , 
	},
	answer_map: { pass: "OK" } 
    },
    

    // Feature 4: Altered Level of Consciousness (observations)
    {
	id: "feature4_obs1",
	text: "Was the patient sleepy during the interview? (Requires that they actually fall asleep.)",
	feature: "feature4",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" }, 
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "6: Ratings for Altered Level of Consciousness (CAM Feature 4)" ,
	    bgc : cmp.f4
	},
	
    },
    
    {
	id: "feature4_obs2",
	text: "Did the patient show hypervigilance?",
	feature: "feature4",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "6: Ratings for Altered Level of Consciousness (CAM Feature 4)" ,
	    bgc : cmp.f4
	}
    },


    
    // Feature 3: Disorganized Thinking (observations)
    {
	id: "feature3_obs1",
	text: "Was the patient’s flow of ideas unclear or illogical?",
	feature: "feature3",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "7: Ratings for Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3 
	},
	
    },
    {
	id: "feature3_obs2",
	text: "Was the patient’s conversation rambling, inappropriately verbose, or tangential?",
	feature: "feature3",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "7: Ratings for Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3 
	},
	
    },
    {
	id: "feature3_obs3",
	text: "Was the patient’s speech unusually limited or sparse?",
	feature: "feature3",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "7: Ratings for Disorganized Thinking (CAM Feature 3)" ,
	    bgc : cmp.f3 
	},
	
    },

    // Feature 2: Attention (observations)
    {
	id: "feature2_obs1",
	text: "Does the patient have trouble keeping track of what was said or following directions?",
	feature: "feature2",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "8: Ratings for Attention (CAM Feature 2)" ,
	    bgc : cmp.f2 
	},

    },
    {
	id: "feature2_obs2",
	text: "Does the patient appear to be inappropriately distracted by external stimuli?",
	feature: "feature2",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "8: Ratings for Attention (CAM Feature 2)" ,
	    bgc : cmp.f2
	},
	
    },

    // Feature 1: Acute Change or Fluctuation (observations)
    {
	id: "feature1_obs1",
	text: "Did the patient’s level of consciousness, level of attention, or speech/thinking fluctuate during the interview?",
	feature: "feature1",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "9: Ratings for Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},
	
    },
    {
	id: "feature1_obs2",
	text: "If no prior assessments, is there evidence of an acute change in memory or thinking (according to records or informant)?",
	feature: "feature1",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
        banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "9: Ratings for Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},

    },
    {
	id: "feature1_obs3",
	text: "If prior assessments, are there any new signs of delirium based on the above questions (new errors, positive ratings)?",
	feature: "feature1",
	type: "observation",
	answer_map: { pass: "No", fail: "Yes" },
	banner_info : {
	    title : "3D-CAM Part 2: Interviewer Ratings" ,
	    subtitle : "9: Ratings for Acute Change or Fluctuation (CAM Feature 1)" ,
	    bgc : cmp.f1
	},
	
    },

];
