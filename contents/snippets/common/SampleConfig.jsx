

export const SampleConfig = () => {
  const yamlMultiBlock = `
\`\`\`yaml .upsun/config.yml theme={null}
  applications:
    # The app's name, which must be unique within the project.
    <APP_NAME>:
      type: 'php:<VERSION_NUMBER>'
\`\`\`

\`\`\`yaml Example theme={null}
  applications:
    # The app's name, which must be unique within the project.
    myapp:
      type: 'php:8.5'
\`\`\`
`;

  return (
    <CodeGroup>
      {yamlMultiBlock}
    </CodeGroup>
  );
};
