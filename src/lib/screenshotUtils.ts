import html2canvas from "html2canvas";

/**
 * Sanitizes stylesheets in the cloned document for html2canvas
 * to prevent crashes caused by unsupported CSS color functions like `oklch()`.
 */
export function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document): void {
  try {
    // 1. Sanitize all <style> elements in the cloned document containing oklch(...)
    const styleElements = clonedDoc.querySelectorAll("style");
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
        styleEl.textContent = styleEl.textContent.replace(
          /oklch\([^)]+\)/gi,
          (match) => {
            if (match.includes("/")) {
              const parts = match.split("/");
              const alpha = parts[1]?.replace(")", "").trim() || "1";
              return `rgba(30, 41, 59, ${alpha})`;
            }
            return "rgb(30, 41, 59)";
          }
        );
      }
    });

    // 2. Sanitize inline style attributes on all cloned elements
    const elementsWithStyle = clonedDoc.querySelectorAll("[style]");
    elementsWithStyle.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes("oklch")) {
        htmlEl.style.cssText = htmlEl.style.cssText.replace(
          /oklch\([^)]+\)/gi,
          "rgb(30, 41, 59)"
        );
      }
    });

    // 3. Remove external stylesheet links that might contain unparseable oklch rules
    const linkElements = clonedDoc.querySelectorAll("link[rel='stylesheet']");
    linkElements.forEach((linkEl) => {
      try {
        const href = linkEl.getAttribute("href");
        if (href && (href.includes("tailwind") || href.includes("oklch"))) {
          linkEl.remove();
        }
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.warn("Error during clonedDoc sanitization:", err);
  }
}

/**
 * Safely captures an HTML element as a canvas without crashing on oklch CSS color functions.
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options: Parameters<typeof html2canvas>[1] = {}
): Promise<HTMLCanvasElement> {
  const { onclone: userOnClone, ...restOptions } = options;

  const mergedOptions: Parameters<typeof html2canvas>[1] = {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc, clonedElement) => {
      sanitizeClonedDocForHtml2Canvas(clonedDoc);
      if (userOnClone) {
        userOnClone(clonedDoc, clonedElement);
      }
    },
    ...restOptions
  };

  return await html2canvas(element, mergedOptions);
}
