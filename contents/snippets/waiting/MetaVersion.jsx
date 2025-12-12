const MetaVersion = ({language}) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!language) return;

    const url = `https://meta.upsun.com/image/${language}?items=versions,supported`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((err) => console.error("Fetch error:", err));
  }, [language]);

  if (!data) return <p>Loading...</p>;

  const latest = data?.versions?.supported?.[0] ?? "n/a";

  return (
    <p>
      Latest supported version of <strong>{language}</strong>:{" "}
      <strong>{latest}</strong>
    </p>
  );
};

export default MetaVersion;
