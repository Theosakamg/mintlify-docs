export const MetaVersion = ({language , version}) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!language) return;

    let url = `https://meta.upsun.com/image/${language}`;
    if (version) {
      url = `https://meta.upsun.com/image/${language}/${version}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((err) => console.error('Fetch error:', err));
  }, [language]);

  if (!data) return <p>Loading...</p>;

  const latest = data.name;

  return (
    <span>
      Latest version of Php is {latest}
    </span>
  );
};


export const MetaVersionList = ({language, status}) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!language) return;

    const url = `https://meta.upsun.com/image/${language}`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch((err) => console.error('Fetch error:', err));
  }, [language]);

  if (!data) return <p>Loading...</p>;

  // Filter versions by status if provided
  const versions = status
    ? data.versions.filter(v => v.status === status)
    : data.versions;

  return (
    <ul>
      {versions.map((version) => (
        <li key={version.name} className="image-version">
          {version.name}
        </li>
      ))}
    </ul>
  );
};
