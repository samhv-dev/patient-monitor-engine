// Node module hook for `pnpm audit:monitor`: the engine imports JSON data files without an import attribute.
import { registerHooks } from 'node:module';
registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('.json')) return next(url, { ...ctx, importAttributes: { ...ctx.importAttributes, type: 'json' } });
    return next(url, ctx);
  },
});
