import config from "../config.ts";
import {
  GoogleAuth,
  texttospeech,
} from "https://googleapis.deno.dev/v1/texttospeech:v1.ts";

const json = await Deno.readFile(config.gcp_key_path)
  .then((res) => JSON.parse(new TextDecoder().decode(res)))
  .catch((err) => {
    console.error(err);
    throw new Error(`Unable to load gcp key file at ${config.gcp_key_path}`);
  });

const googleauth = new GoogleAuth().fromJSON(json);
export const tts = new texttospeech(googleauth);
