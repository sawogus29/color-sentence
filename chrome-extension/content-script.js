/**
 * Initialization
 */
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
 * Request
 */
const API_END_POINT = "https://localhost:8000/";

//mocking
async function fetch(resource, option) {
  const colored = option.body.map((innerText) => innerText.toUpperCase());
  const response = {
    ok: true,
    json: (async () => colored),
  };
  return response

}

async function requestColor(sentences){
    try{
        const response = await fetch(API_END_POINT+"test", {method: "POST", body: sentences});
        
        if (response.ok) {
            const json = await response.json();
            return json;
        }
        throw new Error("request Failed. Are you trying to convert non-english sentence?");
    }catch (e) {
        console.error(e.message);
    }
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
 * Features (change State)
 */

async function toggleColor() {
  let { isColorOn, $ps, origInnerHTMLs, colorInnerHTMLs } = state;

  if (!$ps) {
    $ps = Array.from(document.querySelectorAll("p"));
    origInnerHTMLs = $ps.map(($p) => $p.innerHTML);
    // TODO: Error Handling
    colorInnerHTMLs = await requestColor($ps.map($p=>$p.innerText));
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
