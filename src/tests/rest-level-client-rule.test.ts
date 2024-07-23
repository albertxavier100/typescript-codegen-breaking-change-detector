import { TSESLint } from '@typescript-eslint/utils';
import { describe, expect, test } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { logger } from '../logging/logger';
import rule from '../rules/rest-level-client-rule';
import { parseMarkdown, iterate } from '@azure-tools/openapi-tools-common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

function lint(code: string) {
  const linter = new TSESLint.Linter();
  linter.defineRule('rest-level-client-breaking-change-rule', rule);
  linter.defineParser('@typescript-eslint/parser', parser);
  const messages = linter.verify(code, {
    rules: {
      'rest-level-client-breaking-change-rule': [2]
    },
    parser: '@typescript-eslint/parser'
  });
  return messages;
}

describe('rest level client breaking change rule', async () => {
  const apiViewPath = join(
    __dirname,
    '../../misc/test-cases/rest-level-client-to-rest-level-client/upcoming-package/review/ai-translation-text.api.md'
  );
  const code = await load(apiViewPath);
  const messages = lint(code);

  test('should ignore operation name', () => {
    const operationNames = messages.map(m => m.message);
    expect(operationNames.length).toBe(6)
    expect(operationNames.includes("GetLanguages")).toBe(true)
    expect(operationNames.includes("Translate")).toBe(true)
    expect(operationNames.includes("Transliterate")).toBe(true)
    expect(operationNames.includes("FindSentenceBoundaries")).toBe(true)
    expect(operationNames.includes("LookupDictionaryEntries")).toBe(true)
    expect(operationNames.includes("LookupDictionaryExamples")).toBe(true)
    console.log('messages', messages, 'end message');
  });
});
