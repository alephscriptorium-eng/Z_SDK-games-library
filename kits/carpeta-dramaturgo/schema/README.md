# Schema story-board

La copia local se **demolió** en WP-U117. El contrato único vive en el
paquete publicable **`@zeus/story-board-schema`**
(`Z_SDK` → `packages/engine/story-board-schema/schemas/story-board.schema.json`).

```js
import {
  validateStoryBoard,
  STORY_BOARD_SCHEMA_PATH
} from '@zeus/story-board-schema';
```

El CLI del kit (`scripts/validate-story-board.mjs`) reexporta ese
validador.
