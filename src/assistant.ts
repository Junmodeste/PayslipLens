// The two conversational paths:
// - explainLine: on-device only. The line contains real amounts, so it stays local.
// - askCloud: cloud first, on the anonymized prompt only (see anonymize.ts).
import {
  getGenerativeModel, InferenceMode, InferenceSource,
  type GenerativeModel,
} from "firebase/ai";
import { ai } from "./firebase";
import { CLOUD_SYSTEM_PROMPT } from "./anonymize";
import { withRetry } from "./retry";

export type Source = "on_device" | "in_cloud";

const EXPLAIN_INSTRUCTIONS = `You explain one line of an Ivory Coast payslip to the employee.
Use plain English, at most 60 words, no greeting. Say what the line is, who receives the money,
and how it is usually computed (CNPS retirement 6.3% employee share; ITS income tax on a
progressive monthly scale with a family reduction; CMU 500 FCFA per covered person;
transport allowance tax-free up to 30,000 FCFA). Do not invent amounts.`;

const explainModel = getGenerativeModel(ai, {
  mode: InferenceMode.ONLY_ON_DEVICE,
  onDeviceParams: {
    createOptions: {
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      initialPrompts: [{ role: "system", content: [{ type: "text", value: EXPLAIN_INSTRUCTIONS }] }],
    },
  },
});

export function prepareExplain(): Promise<void> {
  return explainModel.initializeDeviceModel();
}

let cloudModel: GenerativeModel | undefined;

export function configureCloud(modelName: string): void {
  cloudModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_IN_CLOUD,
    inCloudParams: { model: modelName, systemInstruction: CLOUD_SYSTEM_PROMPT },
  });
}

export function explainLine(line: string, onText: (text: string) => void): Promise<Source> {
  return stream(explainModel, `Payslip line: ${line}`, onText);
}

// Not streamed: cloud streams intermittently failed with AI/parse-failed under
// load (2 of 4 calls), while plain requests succeeded 4 of 4. Answers are short.
export async function askCloud(anonymizedPrompt: string, onText: (text: string) => void): Promise<Source> {
  const model = cloudModel;
  if (!model) throw new Error("Cloud model is not configured yet.");
  const { response } = await withRetry(() => model.generateContent(anonymizedPrompt));
  onText(response.text());
  return response.inferenceSource === InferenceSource.ON_DEVICE ? "on_device" : "in_cloud";
}

async function stream(model: GenerativeModel, prompt: string, onText: (text: string) => void): Promise<Source> {
  const result = await model.generateContentStream(prompt);
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.text();
    onText(text);
  }
  const response = await result.response;
  return response.inferenceSource === InferenceSource.ON_DEVICE ? "on_device" : "in_cloud";
}
