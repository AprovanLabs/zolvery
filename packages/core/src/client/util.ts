export const loadScript = (
  url: string,
  callback: (...args: unknown[]) => void,
) => {
  console.log('Loading script', url);
  import(/* @vite-ignore */`${url}`).then((exports) => callback(exports)).catch((e) => {
    console.log('Failed to load script', e);
});
};

export const getQueryParam = (name: string) => {
  const url = new URL(window.location.href);
  const urlParams = new URLSearchParams(url.search);
  return urlParams.get(name);
};
