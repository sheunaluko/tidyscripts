import { Item, Feature } from "./types";

export interface AssessmentStatus {
  features: Record<Feature, "positive" | "negative" | "skipped">;
  answered: { id: string; pass: boolean }[];
  deliriumPresent: boolean;
}

interface NextQuestionResult {
  item: Item;
  banner?: {
    title: string;
    subtitle: string;
  };
}

const FEATURE_LABELS: Record<Feature, string> = {
  feature1: "Acute Change or Fluctuation",
  feature2: "Inattention",
  feature3: "Disorganized Thinking",
  feature4: "Altered Level of Consciousness"
};

export class DeliriumAssessment {
  private items: Item[] = [];
  private skipFeatures = new Set<Feature>();
  private overrideTriggered = false;

  initAssessment(items: Item[]) {
    this.items = [...items].map((item) => ({ ...item, pass: undefined }));
    this.skipFeatures.clear();
    this.overrideTriggered = false;
  }

  get_next_question(): NextQuestionResult | undefined {
    if (this.overrideTriggered) return undefined;

    const ordered = this.items.filter(i => i.type !== "override");

    for (const item of ordered) {
      if (item.pass !== undefined) continue;
      if (this.skipFeatures.has(item.feature)) continue;

      let title: string | undefined;
      if (item.type === "question") {
        title = "3D-CAM Part 1: Patient Assessment";
      } else if (item.type === "observation") {
        title = "3D-CAM Part 2: Interviewer Ratings";
      }

      const subtitle = `${FEATURE_LABELS[item.feature]} (CAM Feature ${item.feature.slice(-1)})`;

      return {
        item,
        banner: title ? { title, subtitle } : undefined
      };
    }

    return undefined;
  }

  answer_question(id: string, pass: boolean): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    item.pass = pass;

    if (item.type === "override" && pass === false) {
      this.overrideTriggered = true;
      return;
    }

    if (item.type === "question" && pass === false) {
      this.skipFeatures.add(item.feature);
    }
  }

  get_status(): AssessmentStatus {
    const features: Record<Feature, "positive" | "negative" | "skipped"> = {
      feature1: "negative",
      feature2: "negative",
      feature3: "negative",
      feature4: "negative",
    };

    const answered: { id: string; pass: boolean }[] = [];

    for (const item of this.items) {
      if (item.pass !== undefined) {
        answered.push({ id: item.id, pass: item.pass });
        if (item.type === "question" && item.pass === false) {
          features[item.feature] = "positive";
        }
      }
    }

    for (const feature of Object.keys(features) as Feature[]) {
      if (features[feature] !== "positive") {
        if (this.skipFeatures.has(feature)) {
          features[feature] = "skipped";
        } else {
          const featureQuestions = this.items.filter(i => i.feature === feature && i.type === "question");
          if (featureQuestions.every(q => q.pass === true)) {
            features[feature] = "negative";
          }
        }
      }
    }

    const deliriumPresent = this.overrideTriggered || (
      features.feature1 === "positive" &&
      features.feature2 === "positive" &&
      (features.feature3 === "positive" || features.feature4 === "positive")
    );

    return { features, answered, deliriumPresent };
  }
}
