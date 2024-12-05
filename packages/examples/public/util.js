export const loadScript = (url, callback) => {
  const src = `${url}?type=module`;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = src;
  script.onload = () => import(src).then((create) => callback(create.default));;
  document.getElementsByTagName('head')[0].appendChild(script);
};

export const getQueryParam = (name) => {
  const url = new URL(window.location.href);
  const urlParams = new URLSearchParams(url.search);
  return urlParams.get(name);
}
