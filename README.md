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

## The Vision

### Input

SST, screen context, webhooks, gen UI
- https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks

https://github.com/wasmcp/wasmcp/blob/main/examples/hello-world/typescript/src/index.ts

https://medium.com/wasm-radar/mcp-and-webassembly-935ca3a9ad50

https://wasi.dev/interfaces#wasi-03

https://github.com/bytecodealliance/jco/tree/main/examples/components/webidl-book-library

https://www.klavis.ai/

https://github.com/mcp-router/mcp-router

https://modelcontextprotocol.io/docs/learn/architecture

https://developer.atlassian.com/platform/forge/storage-reference/sql-tutorial/

### Output

MCP, webhooks, internal store?

## Developing Locally

The project is maintained as one monorepo containing the following packages:

| Name       | Description                                       |
| ---------- | ------------------------------------------------- |
| `core`     | All logic related to running clients and servers. |
| `docs`     | [Our documentation website.][docs]                |
| `examples` | Examle projects.                                  |
| `runners`  | Pre-setup client execution environments .         |
| `vue`      | Vue bindings and components.                      |

After cloning the repo, run `npm install` in the root of the project to install
all necessary dependencies. Then run `npx nx run build` to build all the
packages.

## Contributing

Read through our [Contribution Guide](./CONTRIBUTING.md) to learn how you can
help make Motion Canvas better.

[authenticate]:
  https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token
[docs]: https://jacobsampson.github.io/kossabos/docs/quickstart

## Names

- Kossabos - Greek mythological figure, son of Zeus and Niobe, known for his strength and tragic fate.

Sensaia
Kondax
- https://github.com/atsuki-sakai/ai_collaboration_mcp_serve
