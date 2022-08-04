/**
 * Initialization
 */
const $btnChangeColor = document.getElementById("changeColor");
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

try {
  // A response for get-isColorOn is handled by Message Handler
  await chrome.tabs.sendMessage(tab.id, { type: "get-isColorOn" });
} catch (e) {
  /* Error: content-script was not injected.
   * Require user to refresh the page, so that content-script can be injected
   */
  renderRefresh();
}

/**
 * Message Handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);
  switch (message.type) {
    case "color":
      const {isColorOn, isLoading} = message.payload;
      renderButton(isColorOn, isLoading);
      break;
    case "error":
      console.log('error message recieved');
      const errorMessage = message.payload;
      renderError(errorMessage);
    default:
      break;
  }
});

/**
 * Event Handler
 */
$btnChangeColor.addEventListener("click", async () => {
  if($btnChangeColor.dataset.loading){
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "event-click" });
});

/**
 * Rendering
 */
function renderButton(isColorOn = false, isLoading = false) {
  if (isLoading){
    $btnChangeColor.innerHTML = "Loading";
    $btnChangeColor.dataset.loading = true;
    return;
  }
  delete $btnChangeColor.dataset.loading;

  if (isColorOn) {
    $btnChangeColor.innerText = "Revert";
    $btnChangeColor.dataset.revert = true;
  } else {
    $btnChangeColor.innerText = "Colorize";
    delete $btnChangeColor.dataset.revert;
  }
}

function renderRefresh() {
  document.body.innerHTML =
    "<p>To use this extension, You need to refresh this page</p>";
  document.body.style.textAlign = "center";
  const $btnRefresh = document.createElement("button");
  $btnRefresh.innerText = "Refresh";
  $btnRefresh.addEventListener("click", () => {
    chrome.tabs.reload(tab.id);
    window.close();
  });
  document.body.appendChild($btnRefresh);
}

function renderError(errorMessage){
  document.body.innerHTML = ""
  const $error = document.createElement("p")
  $error.id = "error";
  $error.innerText = errorMessage;
  document.body.appendChild($error);
}
