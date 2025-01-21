---
outline: deep
---

# Setup

Add Kossabos Vue components and features.

```ts
import { createChildTransport, loadClient } from '@kossabos/core';
import { KossabosPlugin } from '@kossabos/vue';

import type { User } from '@kossabos/core';

const user = getUser();
const transport = createChildTransport();
const kossabosClient = loadClient(user, config, transport);

app.use(KossabosPlugin, { client: kossabosClient });
```
