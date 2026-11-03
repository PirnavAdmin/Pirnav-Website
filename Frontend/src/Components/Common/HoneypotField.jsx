// Hidden field that real visitors never see or fill in.
// Spam bots fill every input, so the backend ignores submissions where it has a value.
const hiddenStyle = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

export const getHoneypotValue = (formElement) =>
  formElement?.elements?.website?.value || "";

function HoneypotField() {
  return (
    <div style={hiddenStyle} aria-hidden="true">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export default HoneypotField;
