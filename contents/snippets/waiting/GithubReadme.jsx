import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function GithubReadme({ repo, path = "README.md", branch = "main" }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`[${res.status}] Cannot fetch README`);
        return res.text();
      })
      .then(setContent)
      .catch((err) => setError(err.message));
  }, [repo, path, branch]);

  if (error) {
    return (
      <div style={{ border: "1px solid #cc0000", padding: "12px", borderRadius: "8px" }}>
        ❌ Unable to load GitHub README<br />
        <small>{error}</small>
      </div>
    );
  }

  if (!content) {
    return <div>📥 Loading README…</div>;
  }

  return (
    <div className="github-readme">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
