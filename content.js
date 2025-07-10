;(() => {
  let highlightOverlay = null
  let highlightAllElements = []
  let intervalId = null
  let currentReferenceSelector = null

  function getUniqueSelector(el) {
    if (!el) return null
    if (el.id) return `#${el.id}`
    let path = []
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase()
      if (el.className) {
        const classes = el.className.trim().split(/\s+/).join(".")
        if (classes) selector += `.${classes}`
      }
      let sibling = el
      let nth = 1
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++
      }
      selector += `:nth-of-type(${nth})`
      path.unshift(selector)
      el = el.parentElement
    }
    return path.join(" > ")
  }

  function findEligibleButtons() {
    const allElements = Array.from(
      document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      )
    )
    return allElements.map((el) => ({
      text: el.textContent?.trim() || el.value || "(no text)",
      uniqueSelector: getUniqueSelector(el),
      tagName: el.tagName,
      classList: Array.from(el.classList)
    }))
  }

  function buttonsMatch(el, reference) {
    if (!el || !reference) return false
    if (el.tagName !== reference.tagName) return false

    const elText = el.textContent?.trim() || el.value || ""
    const refText = reference.textContent?.trim() || reference.value || ""
    if (elText !== refText) return false

    const elClasses = Array.from(el.classList)
    const refClasses = reference.classList || []
    const commonClass = refClasses.some((c) => elClasses.includes(c))
    if (!commonClass) return false

    return true
  }

  function findMatchingButtons(referenceSelector) {
    const reference = document.querySelector(referenceSelector)
    if (!reference) return []

    const candidates = Array.from(document.querySelectorAll(reference.tagName))
    return candidates.filter((el) => buttonsMatch(el, reference))
  }

  function clearHighlight() {
    if (highlightOverlay) {
      highlightOverlay.remove()
      highlightOverlay = null
    }
  }

  function highlightButton(selector) {
    clearHighlight()
    const el = document.querySelector(selector)
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

  function highlightAllButtons(buttons) {
    clearAllHighlights()
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

    currentReferenceSelector = referenceSelector
    const buttons = findMatchingButtons(referenceSelector)
    if (buttons.length === 0) return

    if (highlightAllToggle) highlightAllButtons(buttons)
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
      highlightButton(payload.selector)
    } else if (type === "START_ACTION") {
      startClicking(
        payload.selectedButtonSelector,
        payload.delay,
        payload.highlightAll
      )
    } else if (type === "STOP_ACTION") {
      stopClicking()
    } else if (type === "TOGGLE_HIGHLIGHT_ALL") {
      if (!currentReferenceSelector) return

      if (payload.highlightAll) {
        const buttons = findMatchingButtons(currentReferenceSelector)
        highlightAllButtons(buttons)
      } else {
        clearAllHighlights()
      }
    }
  })
})()
