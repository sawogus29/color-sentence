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
 * - Errors are handled by Message Handler
 */
const API_END_POINT = "http://35.185.212.220:8000/";
// const API_END_POINT = "http://localhost:8000/";

//mocking
// TODO: Add HTTPS to backend
// Since content-script can't make "mixed-content" request,
// content-script delegate request to background.js.
// * mixed-content: HTTPS page make HTTP request (not allowed)
async function fetch(resource, option) {
  const message = await chrome.runtime.sendMessage({type: "fetch", payload: [resource, option]})
  switch(message.type){
    case "fetch-response":
      const json = message.payload;
      const response = {ok: true, json: ()=>Promise.resolve(json) };
      return response;
    case "fetch-error":
      const errorMessage = message.payload;
      throw new Error(errorMessage);
    default:
      break;
  }
}

async function requestColor(paragraphs){
  const response = await fetch(API_END_POINT+"color", {
    method: "POST", 
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({paragraphs}),
  });
  
  if (response.ok) {
      const json = await response.json();
      return json.paragraphs;
  }
  throw new Error("request Failed. Are you trying to convert non-english sentence?");
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
        toggleColor()
          .catch((err)=>{
            notifyError("An error occured during Colorization. Try again later.")
          })
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
    colorInnerHTMLs = await requestColor($ps.map($p=>$p.textContent));
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

/**
 * Notify
 */

function notifyState(state) {
  chrome.runtime.sendMessage({ type: "color", payload: state.isColorOn });
}

function notifyError(errorMessage="Error Occured") {
  chrome.runtime.sendMessage({ type: "error", payload: errorMessage})
}
