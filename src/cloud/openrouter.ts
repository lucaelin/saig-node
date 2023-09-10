import { Configuration, OpenAIApi } from "npm:openai";
import config from "../config.ts";

const configuration = new Configuration({
  apiKey: config.openrouter_key,
  basePath: "https://openrouter.ai/api/v1",
  baseOptions: {
    headers: {
      "HTTP-Referer": "https://localhost:3000/",
      "X-Title": "saig-node",
    },
  },
});
export const openrouter = new OpenAIApi(configuration);
