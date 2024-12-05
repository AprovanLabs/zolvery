# Kossabos

![Aprovan Labs](https://raw.githubusercontent.com/AprovanLabs/aprovan.com/main/docs/assets/header-labs.svg)
<br /> <a href="https://aprovan.com">
<img height="20" src="https://img.shields.io/badge/aprovan.com-ef4444?style=flat-square" alt="aprovan.com">
</a> <a href="https://github.com/AprovanLabs/data-science">
<img height="20" src="https://img.shields.io/badge/-AprovanLabs-000000?style=flat-square&logo=GitHub&logoColor=white&link=https://github.com/AprovanLabs/" alt="Aprovan Labs GitHub" />
</a> <a href="https://www.linkedin.com/company/aprovan">
<img height="20" src="https://img.shields.io/badge/-Aprovan-blue?style=flat-square&logo=Linkedin&logoColor=white&link=https://www.linkedin.com/company/aprovan)" alt="Aprovan LinkedIn">
</a>

Games! [@AprovanLabs](https://github.com/AprovanLabs)

## Developing Locally

The project is maintained as one monorepo containing the following packages:

| Name       | Description                                              |
| ---------- | -------------------------------------------------------- |
| `core`     | All logic related to running and rendering animations.   |
| `create`   | A package for bootstrapping new projects.                |
| `docs`     | [Our documentation website.][docs]                       |
| `examples` | Animation examples used in documentation.                |
| `template` | A template project included for developer's convenience. |
| `ui`       | The user interface used for editing.                     |

After cloning the repo, run `npm install` in the root of the project to install
all necessary dependencies. Then run `npx lerna run build` to build all the
packages.

### Developing Core & UI

When developing the core, start both `core:watch` and `template:serve`.

This will pick up any changes you make to the core package, automatically
rebuild the `template` project and refresh the page.

Similarly, when developing the UI package, start `ui:watch` and
`template:serve`.

### Developing UI

If you want to develop the UI, first build the template project by running:
`template:build`. Next, start `ui:serve`.

## Contributing

Read through our [Contribution Guide](./CONTRIBUTING.md) to learn how you can
help make Motion Canvas better.

[authenticate]:
  https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token
[template]:
  https://github.com/JacobSampson/kossabos/project-template#using-the-template
[docs]: https://jacobsampson.github.io/kossabos/docs/quickstart
