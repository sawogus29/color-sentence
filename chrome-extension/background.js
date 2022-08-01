// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("extension load");
});

/*
  * TODO: Add HTTPS to backend
  * Since content-script can't make "mixed-content" request,
  * content-script delegate request to background.js.
  *
  * mixed-content: HTTPS page make HTTP request (not allowed)
  * */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type){
    case "fetch":
      const args = message.payload;
        fetch(...args)
        .then(async (response)=>{
          if (response.ok) {
            const json = await response.json();
            sendResponse({type:"fetch-response", payload: json})
          }

          throw new Errow("fetch error")
        })
        .catch((e)=>{
          sendResponse({type:"fetch-error", payload: e.message})
        });
      break;
    default:
      break;
  }

  // To use sendRequest Asynchronously,
  //  * To make sender wait until sendRequest() is called.
  // it is essential to "return true" synchronously. 
  //  * A handler itself shouldn't be a async function.
  return true;  
})