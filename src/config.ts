type Config = {
  openai_key: string;
  gcp_key_path: string;
  openrouter_key: string;
};

const configFileName = "./saig-config.json";
const config = await Deno.readFile(configFileName)
  .then((file) => JSON.parse(new TextDecoder().decode(file)) as Config)
  .then((config) => {
    if (!config.openai_key) throw new Error("missing openai_key");
    if (!config.gcp_key_path) throw new Error("missing gcp_key_path");
    if (!config.openrouter_key) throw new Error("missing openrouter_key");
    return config;
  })
  .catch(async (err) => {
    console.error(err);
    console.log(`No config file found at ${configFileName}. Running setup.`);
    const openai_key = prompt("Please enter your OpenAI key:");
    if (!openai_key) throw new Error("Invalid OpenAi key");

    const openrouter_key = prompt("Please enter your OpenRouter key:");
    if (!openrouter_key) throw new Error("Invalid OpenRouter key");

    const gcp_key_path = prompt(
      "Please enter the path to your Google Compute Platform credentials:",
    );
    if (!gcp_key_path) throw new Error("Invalid GCP key path");

    await Deno.writeFile(
      configFileName,
      new TextEncoder().encode(JSON.stringify(
        {
          openai_key,
          gcp_key_path,
          openrouter_key,
        },
        null,
        4,
      )),
    );

    console.log(
      `Config created at "${configFileName}". Please restart the server.`,
    );
    Deno.exit(0);
  });

console.log("config loaded.");

export default config as Config;
