document.addEventListener("DOMContentLoaded", async () => {
  const buttonList = document.getElementById("buttonList")
  const highlightCheckbox = document.getElementById("highlightMatches")
  const delayInput = document.getElementById("delayInput")
  const startBtn = document.getElementById("startBtn")
  const stopBtn = document.getElementById("stopBtn")
  const status = document.getElementById("status")

  let eligibleButtons = []
  let selectedIndex = -1

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  // Request eligible buttons once on popup load
  chrome.tabs.sendMessage(tab.id, { type: "GET_ELIGIBLE_BUTTONS" })

  // Listen for eligible buttons response
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "ELIGIBLE_BUTTONS") {
      eligibleButtons = message.payload.buttons
      renderButtonList()
      const hasButtons = eligibleButtons.length > 0
      highlightCheckbox.disabled = !hasButtons
      startBtn.disabled = !hasButtons
      stopBtn.disabled = !hasButtons
      status.textContent = hasButtons
        ? `${eligibleButtons.length} buttons found.`
        : "No eligible buttons found."
    }
  })

  function renderButtonList() {
    buttonList.innerHTML = ""
    eligibleButtons.forEach((btn, idx) => {
      const item = document.createElement("div")
      item.className = "dropdown-item"
      item.textContent = btn.text || "(no text)"
      item.addEventListener("mouseover", () => {
        chrome.tabs.sendMessage(tab.id, {
          type: "HIGHLIGHT_SINGLE_BUTTON",
          payload: { selector: btn.uniqueSelector }
        })
      })
      item.addEventListener("click", () => {
        selectedIndex = idx
        document
          .querySelectorAll(".dropdown-item")
          .forEach((el) => el.classList.remove("selected"))
        item.classList.add("selected")
        highlightCheckbox.disabled = false
      })
      buttonList.appendChild(item)
    })
  }

  startBtn.addEventListener("click", () => {
    if (selectedIndex === -1) {
      status.textContent = "Please select a button first."
      return
    }
    const delay = parseInt(delayInput.value, 10)
    const highlightAll = highlightCheckbox.checked
    const selectedButton = eligibleButtons[selectedIndex]

    chrome.tabs.sendMessage(tab.id, {
      type: "START_ACTION",
      payload: {
        selectedButtonSelector: selectedButton.uniqueSelector,
        delay,
        highlightAll
      }
    })

    status.textContent = "Started clicking."
  })

  stopBtn.addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { type: "STOP_ACTION" })
    status.textContent = "Stopped clicking."
  })

  highlightCheckbox.addEventListener("change", () => {
    const highlightAll = highlightCheckbox.checked
    chrome.tabs.sendMessage(tab.id, {
      type: "TOGGLE_HIGHLIGHT_ALL",
      payload: { highlightAll }
    })
  })
})
