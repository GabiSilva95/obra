// oxlint JS plugin: ESLint-style `no-restricted-syntax` (oxlint has no native equivalent).
// Options are [{ selector, message }] and run the design-system adherence checks in .oxlintrc.json.
const restrictedSyntax = {
  meta: { type: "suggestion", schema: false },
  create(context) {
    const visitors = {};
    for (const opt of context.options) {
      const { selector, message } = typeof opt === "string" ? { selector: opt, message: `Using '${opt}' is not allowed.` } : opt;
      const prev = visitors[selector];
      visitors[selector] = node => { prev?.(node); context.report({ node, message }); };
    }
    return visitors;
  },
};

export default { meta: { name: "ds" }, rules: { "restricted-syntax": restrictedSyntax } };
