import { html, render, css } from "https://unpkg.com/lit@2.8.0/index.js?module";
import {createRef, ref} from 'https://unpkg.com/lit@2.8.0/directives/ref.js?module';
const eventHistoryContainer = document.querySelector('#eventHistoryContainer');
const promptContainer = document.querySelector('#promptContainer');
const sayAsPlayer = document.querySelector('#sayAsPlayer');
const sayAsAi = document.querySelector('#sayAsAi');

const styles = css`
  body {
    display: grid;
    gap: 1rem;
    grid-template:
      [row1-start] "eventHistoryContainer promptContainer" 65vh [row1-end]
      [row2-start] "sayAsPlayer sayAsAi" 30vh [row2-end]
      / 1fr 1fr;
  }
  section {
    overflow: auto;
  }
  #eventHistoryContainer {
    display: flex;
    grid-area: eventHistoryContainer;
    flex-direction: column;
    flex-basis: 0 0;
  }
  .eventhistoryelement-chat {
    background-color: lightblue;
  }
  .eventhistoryelement-context {
    background-color: lightyellow;
  }
  .eventhistoryelement-book {
    background-color: lightgreen;
  }
  .eventhistoryelement-unknown {
    background-color: lightcoral;
  }
`.styleSheet;
document.adoptedStyleSheets.push(styles);

function renderEventHistoryElement(element) {
  let message = element.payload;
  if (element.kind==='chat') {
    message = `${element.chat.name}: ${element.chat.message}`;
  }
  if (element.kind==='context') {
    message = `${JSON.stringify(element.context, null, 2)}`;
  }
  if (element.kind==='book') {
    message = element.title;
  }
  return html`
    <div class="eventhistoryelement-${element.kind}">${element.kind} (${element.gameKind}): ${message}</div>
  `
}

async function updateEventHistory() {
  const history = await fetch("./api/history").then((res) => res.json());

  const elements = history.reverse().map(renderEventHistoryElement);

  render(html`<h2>History</h2>${elements}`, eventHistoryContainer);
}
async function updatePrompt() {
  const prompt = await fetch("./api/prompt").then((res) => res.json());
  render(html`<h2>Prompt</h2><pre>${prompt.map(p=>html`${p.role.toUpperCase()}: ${p.content.trim()}\n\n`)}</pre>`, promptContainer);
}
async function sayAs(user, target) {
  const inputRef = createRef();
  render(html`
    <h2>Say as ${user}</h2>
    <textarea ${ref(inputRef)}></textarea>
    <button @click=${async ()=>{
      const url = new URL("./api/sayAs"+user, window.location);
      url.searchParams.append('text', inputRef.value.value)
      await fetch(url);
    }}>say</button>
  `, target);

}

sayAs('Player', sayAsPlayer);
sayAs('Ai', sayAsAi);

while (true) {
  await updateEventHistory();
  await updatePrompt();

  await new Promise((res) => setTimeout(res, 1000));
}
