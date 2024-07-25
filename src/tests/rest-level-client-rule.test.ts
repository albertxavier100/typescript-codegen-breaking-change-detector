import { TSESLint } from '@typescript-eslint/utils';
import { describe, test } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import rule from '../azure/common/rules/ignore-operation-interface-name-changes';
import { parseMarkdown, iterate } from '@azure-tools/openapi-tools-common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ParseForESLintResult } from '../azure/common/types';

async function load(apiViewPath: string) {
  const content = await readFile(apiViewPath);
  const parsed = parseMarkdown(content.toString());
  const codeBlocks = new Array<string>();
  for (const c of iterate(parsed.markDown)) {
    if (c.type === 'code_block' && c.info === 'ts' && c.literal) {
      codeBlocks.push(c.literal);
    }
  }
  if (codeBlocks.length !== 1) {
    throw new Error(`High level client's API document should contains 1 code block, but got ${codeBlocks.length}`);
  }
  return codeBlocks[0];
}

function lint(code: string, oldResult: ParseForESLintResult) {
  const dir = join(__dirname, '../../misc/test-cases/rest-level-client-to-rest-level-client/');
  const linter = new TSESLint.Linter({ cwd: dir });
  linter.defineRule('ignore-operation-interface-name-changes', rule(oldResult));
  linter.defineParser('@typescript-eslint/parser', parser);

  const messages = linter.verify(
    code,
    {
      rules: {
        'ignore-operation-interface-name-changes': [2]
      },
      parser: '@typescript-eslint/parser',

      parserOptions: {
        filePath: 'upcoming-package/review/ai-translation-text.api.ts',
        comment: true,
        tokens: true,
        range: true,
        loc: true,
        project: './tsconfig.json',
        tsconfigRootDir: dir
      }
    },
    'upcoming-package/review/ai-translation-text.api.ts'
  );
  return messages;
}

function detect(oldCode: string, newCode: string) {
  const dir = join(__dirname, '../../misc/test-cases/rest-level-client-to-rest-level-client/');
  const result = parser.parseForESLint(oldCode, {
    comment: true,
    tokens: true,
    range: true,
    loc: true,
    project: './tsconfig.json',
    tsconfigRootDir: dir,
    filePath: join(dir, 'latest-package/review/ai-translation-text.api.ts')
  });

  const message = lint(newCode, result);
  return message;
}

describe('detect rest level client breaking changes', async () => {
  const newApiViewPath = join(
    __dirname,
    '../../misc/test-cases/rest-level-client-to-rest-level-client/upcoming-package/review/ai-translation-text.api.md'
  );
  const oldApiViewPath = join(
    __dirname,
    '../../misc/test-cases/rest-level-client-to-rest-level-client/latest-package/review/ai-translation-text.api.md'
  );
  let oldCode = await load(oldApiViewPath);
  let newCode = await load(newApiViewPath);

  const messages = detect(oldCode, newCode);
  console.log('msg', messages);
  test('should ignore operation rename', () => {});
});
