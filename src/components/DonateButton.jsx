import { useRef, useEffect } from 'react';

export default function DonateButton() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Inject the dbox-widget into the DOM directly so Donorbox's script can find it
    const container = containerRef.current;
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

  return (
    <span ref={containerRef} className="inline-flex" />
  );
}
