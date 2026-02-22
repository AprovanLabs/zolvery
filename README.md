# zolvery

![Zolvery](apps/client/public/logo.png)
<br /> <a href="https://aprovan.com">
<img height="20" src="https://img.shields.io/badge/aprovan.com-ef4444?style=flat-square" alt="aprovan.com">
</a> <a href="https://github.com/AprovanLabs">
<img height="20" src="https://img.shields.io/badge/-AprovanLabs-000000?style=flat-square&logo=GitHub&logoColor=white&link=https://github.com/AprovanLabs/" alt="Aprovan Labs GitHub" />
</a> <a href="https://www.linkedin.com/company/aprovan">
<img height="20" src="https://img.shields.io/badge/-Aprovan-blue?style=flat-square&logo=Linkedin&logoColor=white&link=https://www.linkedin.com/company/aprovan)" alt="Aprovan LinkedIn">
</a>

Games!

## About

[Zolvery](https://zolvery.com) is a free platform for playing community-built games.

## Developing Locally

The project is maintained as one monorepo containing the following packages:

| Name       | Description                                       |
| ---------- | ------------------------------------------------- |
| `core`     | All logic related to running clients and servers. |
| `examples` | Examle projects.                                  |
| `images`   | Pre-setup client execution environments .         |

After cloning the repo, run `npm install` in the root of the project to install
all necessary dependencies. Then run `npx nx run build` to build all the
packages.

## Contributing

Read through our [Contribution Guide](./CONTRIBUTING.md) to learn how you can
help make Zolvery better.

[authenticate]:
  https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token
[docs]: https://jacobsampson.github.io/zolvery/docs/quickstart
