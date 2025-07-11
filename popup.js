document.addEventListener("DOMContentLoaded", async () => {
  const dropdown = document.getElementById("buttonDropdown");
  const delayInput = document.getElementById("delayInput");
  const highlightAllCheckbox = document.getElementById("highlightAllCheckbox");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");

  let selectedButton = null;
  let allButtons = [];

  function getStructureChain(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return "";
    function walk(node) {
      if (node.children.length === 0) return node.tagName.toLowerCase();
      const children = Array.from(node.children).map(walk);
      return node.tagName.toLowerCase() + ">" + children.join(">");
    }
    return walk(root);
  }

  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      callback(tabs[0]);
    });
  }

  function requestEligibleButtons(tabId) {
    chrome.tabs.sendMessage(tabId, { type: "GET_ELIGIBLE_BUTTONS" });
  }

  function highlightButton(tabId, selector) {
    chrome.tabs.sendMessage(tabId, {
      type: "HIGHLIGHT_SINGLE_BUTTON",
      payload: { selector },
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ELIGIBLE_BUTTONS") {
      allButtons = message.payload.buttons;
      dropdown.innerHTML = "";

      allButtons.forEach((btn, idx) => {
        const option = document.createElement("option");
        option.value = btn.uniqueSelector;
        option.textContent = `${btn.text} — ${btn.tagName}`;
        option.dataset.index = idx;
        dropdown.appendChild(option);
      });

      dropdown.disabled = false;
    }
  });

  dropdown.addEventListener("change", () => {
    const selectedIdx = dropdown.options[dropdown.selectedIndex].dataset.index;
    selectedButton = allButtons[selectedIdx];
    getCurrentTab((tab) => {
      highlightButton(tab.id, selectedButton.uniqueSelector);
    });
    highlightAllCheckbox.disabled = false;
  });

  highlightAllCheckbox.addEventListener("change", () => {
    if (!selectedButton) return;
    getCurrentTab((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: "TOGGLE_HIGHLIGHT_ALL",
        payload: {
          highlightAll: highlightAllCheckbox.checked,
        },
      });
    });
  });

  startButton.addEventListener("click", () => {
    if (!selectedButton) return;
    const delay = parseFloat(delayInput.value) || 5;

    getCurrentTab((tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector) => {
          function getElementByXPath(xpath) {
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          }
          const el = getElementByXPath(selector);
          return el ? (function getStructureChain(root) {
            if (!root || root.nodeType !== Node.ELEMENT_NODE) return "";
            function walk(node) {
              if (node.children.length === 0) return node.tagName.toLowerCase();
              const children = Array.from(node.children).map(walk);
              return node.tagName.toLowerCase() + ">" + children.join(">");
            }
            return walk(root);
          })(el) : null;
        },
        args: [selectedButton.uniqueSelector],
      }, (results) => {
        const structureSignature = results[0].result;
        chrome.tabs.sendMessage(tab.id, {
          type: "START_ACTION",
          payload: {
            structureSignature,
            delay,
            highlightAll: highlightAllCheckbox.checked,
          },
        });
      });
    });
  });

  stopButton.addEventListener("click", () => {
    getCurrentTab((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: "STOP_ACTION" });
    });
  });

  getCurrentTab((tab) => requestEligibleButtons(tab.id));
});
