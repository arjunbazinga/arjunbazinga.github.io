// Keep keyboard focus inside Quarto's photo viewer, then return to the image.
document.addEventListener("DOMContentLoaded", () => {
  const viewer = window.lightboxQuarto;
  if (!viewer) return;

  let returnFocus;
  let background = [];

  viewer.on("open", () => {
    const modal = document.querySelector(".glightbox-container");
    if (!modal) return;
    returnFocus = document.activeElement;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Photograph viewer");
    background = [...document.body.children].filter(element =>
      element !== modal && !element.contains(modal) && !element.inert &&
      !["SCRIPT", "STYLE", "LINK"].includes(element.tagName)
    );
    modal.querySelector(".gclose")?.focus({ preventScroll: true });
    background.forEach(element => { element.inert = true; });
  });

  viewer.on("close", () => {
    background.forEach(element => { element.inert = false; });
    background = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
});
