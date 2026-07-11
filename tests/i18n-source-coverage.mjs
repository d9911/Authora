import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.join(root, 'frontend');
const sourceRoot = path.join(frontendRoot, 'src');
const requireFromFrontend = createRequire(path.join(frontendRoot, 'package.json'));
const ts = requireFromFrontend('typescript');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(filename);
      return entry.name.endsWith('.tsx') ? [filename] : [];
    }),
  );
  return nested.flat();
}

const userFacingAttributes = new Set([
  'alt',
  'aria-label',
  'description',
  'eyebrow',
  'label',
  'placeholder',
  'subtitle',
  'title',
]);

// These are product/provider/credential identifiers, sample input values, or
// punctuation rather than natural-language UI copy.
const technicalLiterals = new Set([
  'ABCD-EFGH-JKLM',
  'Authora',
  'GitHub',
  'Telegram',
  'Denis Gutsuliak',
  'Europe/Moscow',
  'Telegram: @d9911',
  'admin@d9911.org',
  'city_id',
  'country_id',
  'jwt · access+refresh',
  'name@example.com',
  'oauth · github·telegram',
  'region_id',
  'totp · 2fa',
  'ui-kit:selected',
  'user@example.com',
  '📧 admin@d9911.org',
  '💬 Telegram: @d9911',
]);

function isNaturalLanguage(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return (
    normalized.length > 0 &&
    /\p{L}/u.test(normalized) &&
    !technicalLiterals.has(normalized)
  );
}

const violations = [];
for (const filename of await sourceFiles(sourceRoot)) {
  const source = await readFile(filename, 'utf8');
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const report = (node, value, kind) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!isNaturalLanguage(normalized)) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push(
      `${path.relative(root, filename)}:${line + 1} ${kind}: ${JSON.stringify(normalized)}`,
    );
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) report(node, node.text, 'raw JSX text');

    if (ts.isJsxAttribute(node) && userFacingAttributes.has(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        report(node, node.initializer.text, `${node.name.text} attribute`);
      }
      if (
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        (ts.isStringLiteral(node.initializer.expression) ||
          ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))
      ) {
        report(
          node,
          node.initializer.expression.text,
          `${node.name.text} attribute`,
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

const progressBarSource = await readFile(
  path.join(sourceRoot, 'shared/ui/ProgressBar/ProgressBar.tsx'),
  'utf8',
);
assert.match(progressBarSource, /formatPercent/);
assert.match(progressBarSource, /useCurrentLocale/);
assert.doesNotMatch(progressBarSource, /Math\.round\(percent\).*%/s);

const passwordPolicySource = await readFile(
  path.join(sourceRoot, 'shared/lib/passwordPolicy.ts'),
  'utf8',
);
assert.doesNotMatch(passwordPolicySource, /PASSWORD_POLICY_HINT/);

const serverI18nSource = await readFile(
  path.join(sourceRoot, 'shared/i18n/server.ts'),
  'utf8',
);
assert.match(serverI18nSource, /import\s*{\s*cache\s*}\s*from\s*['"]react['"]/);
assert.match(serverI18nSource, /cache\(createServerI18n\)/);

assert.deepEqual(
  violations,
  [],
  `Mounted TSX contains untranslated natural-language literals:\n${violations.join('\n')}`,
);

console.log('i18n mounted-source coverage checks passed');
