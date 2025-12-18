
import config from '/snippets/.cache/config.jsx';

const ProviderName = () => {
  return (
    <strong className="capitalize" style={{ fontWeight: "600" }}>{config.vendorName}</strong>
  );
};

export default ProviderName;
