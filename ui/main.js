import { html, render } from "https://unpkg.com/lit@2.8.0/index.js?module";

async function update() {
  const history = await fetch("./api/history").then((res) => res.json());

  return html`
  <pre>
  ${JSON.stringify(history, null, 4)}
  </pre>
`;
}

while (true) {
  const dom = await update();

  render(
    dom,
    document.body,
  );

  await new Promise((res) => setTimeout(res, 1000));
}
