import { useRef, useEffect } from 'react';

export default function DonateButton() {
  const hiddenRef = useRef(null);

  useEffect(() => {
    // Inject a hidden dbox-widget so Donorbox's script registers the popup
    const container = hiddenRef.current;
    if (!container || container.querySelector('dbox-widget')) return;

    const widget = document.createElement('dbox-widget');
    widget.setAttribute('interval', '1 T');
    widget.setAttribute('campaign', 'makewater');
    widget.setAttribute('type', 'popup');
    widget.setAttribute('button-label', 'Donate');
    widget.setAttribute('button-type', 'regular');
    widget.setAttribute('button-color', '#2c6bdb');
    widget.setAttribute('button-size', 'medium');
    widget.setAttribute('regular-position', 'center');
    widget.setAttribute('show-icon', '');
    container.appendChild(widget);
  }, []);

  function handleClick() {
    // Try to click the Donorbox-rendered button inside the hidden widget
    const dboxBtn = hiddenRef.current?.querySelector('a, button');
    if (dboxBtn) {
      dboxBtn.click();
    } else {
      window.open('https://donorbox.org/makewater', '_blank');
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="text-xs px-3 py-1.5 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark transition-colors cursor-pointer"
      >
        Donate
      </button>
      <span ref={hiddenRef} className="hidden" />
    </>
  );
}
