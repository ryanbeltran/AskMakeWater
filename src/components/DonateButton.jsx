export default function DonateButton({ className }) {
  return (
    <dbox-widget
      interval="1 T"
      campaign="makewater"
      type="popup"
      button-label="Donate"
      button-type="regular"
      button-color="#2c6bdb"
      button-size="medium"
      regular-position="center"
      show-icon=""
      className={className}
    />
  );
}
