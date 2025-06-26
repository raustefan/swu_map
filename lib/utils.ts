/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString The HTML string to convert.
 * @returns {Element} The created DOM element.
 */
export function createElementFromHTML(htmlString) {
  const container = document.createElement('div');
  container.innerHTML = htmlString.trim();
  // Return the first child element of the container
  return container.firstElementChild;
}