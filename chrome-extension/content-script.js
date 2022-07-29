/**
 * Initialization
 */
const API_ENDPOINT = "https://123.456.789:5000/";
const INITIAL_STATE = {
  isColorOn: false,
  url: "",
  $ps: null,
  origInnerHTMLs: null,
  colorInnerHTMLs: null,
};

let state = INITIAL_STATE;

/**
 * State
 */
function setState(nState) {
  state = { ...state, ...nState };

  console.log(state);
  changeDOM(state);
  notifyState(state);
}

/**
 * Edge Case: SPA(Single Page Application) Routing
 * This content-script was written on a Assumption that injection happens with every new page.
 * In case of a Normal Page, content-script is injected while loading a page.
 * However, a SPA page is just routed (not loaded) by using location & history.
 * So, content-script cannot be injected.
 */
function getCurURL() {
  return window.location.href.replace(window.location.hash, "");
}

function dangerouslyMutateState(nState) {
  console.log("dangerouslyMutateState() called");
  state = { ...state, ...nState };
}

/**
 * Message Handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  /*======= SPA Routing ==========*/
  const curURL = getCurURL();
  if (curURL !== state.url) {
    dangerouslyMutateState({ ...INITIAL_STATE, url: curURL });
  }
  /*==============================*/

  switch (message.type) {
    case "get-isColorOn":
      notifyState(state);
      break;
    case "event-click":
      toggleColor();
      break;
    default:
      break;
  }
});

/**
 * Mocking
 */
async function fetch(resource, option) {
  return option.body.map((innerText) => innerText.toUpperCase());
}

/**
 * Features (change State)
 */

async function toggleColor() {
  let { isColorOn, $ps, origInnerHTMLs, colorInnerHTMLs } = state;

  if (!$ps) {
    $ps = Array.from(document.querySelectorAll("p"));
    origInnerHTMLs = $ps.map(($p) => $p.innerHTML);
    colorInnerHTMLs = await fetch(API_ENDPOINT, {
      body: $ps.map(($p) => $p.innerText),
    });
  }

  setState({
    isColorOn: !state.isColorOn,
    $ps,
    origInnerHTMLs,
    colorInnerHTMLs,
  });
}

/**
 * Effects (on State Change)
 */
function changeDOM({ isColorOn, $ps, origInnerHTMLs, colorInnerHTMLs }) {
  if (!$ps) {
    return;
  }

  innerHTMLs = isColorOn ? colorInnerHTMLs : origInnerHTMLs;
  $ps.forEach(($p, i) => ($p.innerHTML = innerHTMLs[i]));
}

function notifyState(state) {
  chrome.runtime.sendMessage({ type: "color", payload: state.isColorOn });
}
