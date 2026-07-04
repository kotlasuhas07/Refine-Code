import { createGroq } from "@ai-sdk/groq";

export const createAiGatewayProvider = (apiKey: string) =>
  createGroq({ apiKey });
