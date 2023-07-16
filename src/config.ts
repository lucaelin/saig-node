const configFileName = new URL("../saig-config.json", import.meta.url).pathname;
const config = await Deno.readFile(configFileName)
  .then((file) => JSON.parse(new TextDecoder().decode(file)))
  .catch(async (err) => {
    console.error(err);
    console.log(`No config file found at ${configFileName}. Running setup.`);
    const openai_key = prompt("Please enter your OpenAI key:");
    if (!openai_key) throw new Error("Invalid OpenAi key");

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

export default config as {
  openai_key: string;
  gcp_key_path: string;
};
