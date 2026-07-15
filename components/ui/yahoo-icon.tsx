/**
 * The Yahoo! logo (FontAwesome brand mark, viewBox 0 0 512 512). Single-path, so it
 * fills with `currentColor`, the caller tints it (we use the accent purple).
 */
export function YahooIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-hidden focusable="false" fill="currentColor">
      <path d="M223.69,141.06,167,284.23,111,141.06H14.93L120.76,390.19,82.19,480h94.17L317.27,141.06Zm105.4,135.79a58.22,58.22,0,1,0,58.22,58.22A58.22,58.22,0,0,0,329.09,276.85ZM394.65,32l-93,223.47H406.44L499.07,32Z" />
    </svg>
  );
}
