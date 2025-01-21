const files = import.meta.glob('./**/*.json');
const appIds = Object.keys(files).map(
  (key) => key.split('./')[1].split('/kossabos.json')[0],
);
console.log(appIds);