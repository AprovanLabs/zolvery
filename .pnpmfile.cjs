module.exports = {
  hooks: {
    readPackage(pkg) {
      const useLocalLinks = process.env.CI ? false : true;

      if (useLocalLinks) {
        pkg.pnpm ??= {};
        pkg.pnpm.overrides ??= {};
        Object.assign(pkg.pnpm.overrides, {
          "@aprovan/patchwork-editor": "link:../patchwork/packages/editor",
          "@aprovan/bobbin": "link:../patchwork/packages/bobbin",
        });
      }

      return pkg;
    },
  },
};
