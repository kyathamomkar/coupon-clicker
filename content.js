;(() => {
  let highlightOverlay = null
  let highlightAllElements = []
  let intervalId = null
  let currentSelectedButton = null

  function getXPath(el) {
    if (el.id) return `//*[@id='${el.id}']`
    const parts = []
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let index = 1
      let sibling = el.previousElementSibling
      while (sibling) {
        if (sibling.nodeName === el.nodeName) index++
        sibling = sibling.previousElementSibling
      }
      parts.unshift(`${el.nodeName.toLowerCase()}[${index}]`)
      el = el.parentElement
    }
    return "//" + parts.join("/")
  }

  function getStructureChain(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return ""

    function walk(node) {
      if (node.children.length === 0) return node.tagName.toLowerCase()
      const children = Array.from(node.children).map(walk)
      return node.tagName.toLowerCase() + ">" + children.join(">")
    }

    return walk(root)
  }

  function findEligibleButtons() {
    const allElements = Array.from(
      document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      )
    )
    return allElements.map((el) => ({
      text: el.textContent?.trim() || el.value || "(no text)",
      xPath: getXPath(el),
      signature: getStructureChain(el),
      domElement: el
    }))
  }

  function findMatchingButtons() {
    const allElements = Array.from(
      document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      )
    )
    return allElements.filter(
      (el) => getStructureChain(el) === currentSelectedButton.signature
    )
  }

  function clearHighlight() {
    if (highlightOverlay) {
      highlightOverlay.remove()
      highlightOverlay = null
    }
  }

  function highlightButton(xpath) {
    clearHighlight()
    const el = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue
    if (!el) return

    const rect = el.getBoundingClientRect()
    highlightOverlay = document.createElement("div")
    highlightOverlay.style.position = "absolute"
    highlightOverlay.style.top = `${rect.top + window.scrollY}px`
    highlightOverlay.style.left = `${rect.left + window.scrollX}px`
    highlightOverlay.style.width = `${rect.width}px`
    highlightOverlay.style.height = `${rect.height}px`
    highlightOverlay.style.backgroundColor = "rgba(255, 255, 0, 0.4)"
    highlightOverlay.style.pointerEvents = "none"
    highlightOverlay.style.zIndex = "9999999"
    highlightOverlay.style.border = "2px solid orange"
    document.body.appendChild(highlightOverlay)
  }

  function clearAllHighlights() {
    highlightAllElements.forEach((el) => el.remove())
    highlightAllElements = []
  }

  function highlightAllButtons() {
    clearAllHighlights()
    const buttons = findMatchingButtons()
    if (buttons.length === 0) return
    highlightAllElements = []

    buttons.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const overlay = document.createElement("div")
      overlay.style.position = "absolute"
      overlay.style.top = `${rect.top + window.scrollY}px`
      overlay.style.left = `${rect.left + window.scrollX}px`
      overlay.style.width = `${rect.width}px`
      overlay.style.height = `${rect.height}px`
      overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)"
      overlay.style.pointerEvents = "none"
      overlay.style.zIndex = "9999998"
      overlay.style.border = "1px solid gold"
      document.body.appendChild(overlay)
      highlightAllElements.push(overlay)
    })
  }

  function startClicking(referenceSelector, delay, highlightAllToggle) {
    if (intervalId) clearInterval(intervalId)

    const buttons = findMatchingButtons()
    if (buttons.length === 0) return

    if (highlightAllToggle) highlightAllButtons()
    else clearAllHighlights()

    let index = buttons.findIndex((el) => el.matches(referenceSelector))
    if (index === -1) index = 0

    intervalId = setInterval(() => {
      if (index >= buttons.length) {
        clearInterval(intervalId)
        intervalId = null
        clearAllHighlights()
        return
      }
      buttons[index].click()
      index++
    }, delay * 1000)
  }

  function stopClicking() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    clearHighlight()
    clearAllHighlights()
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message

    if (type === "GET_ELIGIBLE_BUTTONS") {
      const buttons = findEligibleButtons()
      chrome.runtime.sendMessage({
        type: "ELIGIBLE_BUTTONS",
        payload: { buttons }
      })
    } else if (type === "HIGHLIGHT_SINGLE_BUTTON") {
      highlightButton(payload.selectedButton.xPath)
    } else if (type === "START_ACTION") {
      startClicking(
        payload.selectedButtonSelector,
        payload.delay,
        payload.highlightAll
      )
    } else if (type === "STOP_ACTION") {
      stopClicking()
    } else if (type === "BUTTON_OPTION_CLICK") {
      const { selectedButton, highlightAll } = payload
      currentSelectedButton = selectedButton
      if (highlightAll) {
        highlightAllButtons()
      } else {
        clearAllHighlights()
      }
    } else if (type === "TOGGLE_HIGHLIGHT_ALL") {
      if (payload.highlightAll) {
        highlightAllButtons()
      } else {
        clearAllHighlights()
      }
    }
  })
})()
