export const initSandbox = (projectId, callback) => {
  const src = `/src/examples/${projectId}/index.ts?worker_file&type=module`;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = src;
  script.onload = () => {
    import(src).then((create) => callback(create.default));
  };
  document.getElementsByTagName('head')[0].appendChild(script);
};
