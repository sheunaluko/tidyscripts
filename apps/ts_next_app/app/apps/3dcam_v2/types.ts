// Unique ID for each item (question or observation)
export type ItemId = string;

// Features in 3D-CAM
export type FeatureKey = "feature1" | "feature2" | "feature3" | "feature4" | "featureOverride" ;

// General structure for both assessment questions and observations
/*
export interface Item {
  id: ItemId;
  text: string;
  feature: FeatureKey;
    type: "question" | "observation" | "display" | "override" ;
    banner_info : any ,
    answer_map : any , 
}

*/

export type Item = any ; 
