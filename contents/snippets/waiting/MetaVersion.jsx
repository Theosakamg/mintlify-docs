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

  if (!data.versions || data.versions.length === 0) {
    return <p>No versions found! Contact support.</p>;
  }

  // Filter versions by status if provided
  const versions = status
    ? data.versions.filter(v => v.status === status)
    : data.versions;

  return (
    <ul>
      {versions.map((version) => (
        <li key={version.name} className="image-version">
          {version.name} {version.status === 'beta' && <Badge icon="badge-alert" color="orange" shape="rounded">Beta</Badge>}
        </li>
      ))}
    </ul>
  );
};
