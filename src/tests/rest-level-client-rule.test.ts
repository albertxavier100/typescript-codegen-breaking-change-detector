import { TSESLint } from '@typescript-eslint/utils';
import { describe, test } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import rule from '../azure/common/rules/ignore-operation-interface-name-changes';
import { join } from 'node:path';
import { ParseForESLintResult } from '../azure/common/types';
import { mkdirp, pathExists } from 'fs-extra/esm';
import { readFile, outputFile, remove } from 'fs-extra';
import { marked, Renderer } from 'marked';

const tsconfig = `
{
  "compilerOptions": {
    "jsx": "preserve",
    "target": "es5",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "lib": ["es2015", "es2017", "esnext"],
    "experimentalDecorators": true,
  "rootDir": "."
  },
  "include": [
    "**/*.ts",
  ],
  "exclude": ["**/node_modules/**/*.*"]
}
`;

async function createTempFolder(tempFolderPrefix: string): Promise<string> {
  const maxRetry = 1000;
  let tempFolder = '';
  for (let i = 0; i < maxRetry; i++) {
    const tempFolder = `${tempFolderPrefix}-${Math.round(Math.random() * 1000)}`;
    if (await pathExists(tempFolder)) {
      continue;
    }
    await mkdirp(tempFolder);
    return tempFolder;
  }
  throw new Error(`Failed to create temp folder at "${tempFolder}" for ${maxRetry} times`);
}

async function loadCodeFromApiView(path: string) {
  const content = await readFile(path, { encoding: 'utf-8' });
  const markdown = content.toString();
  const codeBlocks: string[] = [];
  const renderer = new Renderer();
  renderer.code = ({ text }) => {
    codeBlocks.push(text);
    return '';
  };
  marked(markdown, { renderer });
  if (codeBlocks.length !== 1) {
    throw new Error(`Expected 1 code block, got ${codeBlocks.length} in "${path}".`);
  }
  return codeBlocks[0];
}

async function prepareProjectForAzureSdkPackage(
  currentPackageFolder: string,
  baselinePackageFolder: string,
  tempFolderPrefix: string
): Promise<ProjectContext> {
  const [tempFolder, currentCode, baselineCode] = await Promise.all([
    createTempFolder(tempFolderPrefix),
    loadCodeFromApiView(currentPackageFolder),
    loadCodeFromApiView(baselinePackageFolder),
  ]);

  const relativeCurrentPath = join('current', 'review', 'index.ts');
  const relativeBaselinePath = join('baseline', 'review', 'index.ts');
  const currentPath = join(tempFolder, relativeCurrentPath);
  const baselinePath = join(tempFolder, relativeBaselinePath);
  const tsConfigPath = join(tempFolder, 'tsconfig.json');
  await Promise.all([
    outputFile(tsConfigPath, tsconfig, 'utf-8'),
    outputFile(currentPath, currentCode, 'utf-8'),
    outputFile(baselinePath, baselineCode, 'utf-8'),
  ]);
  return {
    root: tempFolder,
    baseline: {
      code: baselineCode,
      relativeFilePath: relativeBaselinePath,
    },
    current: {
      code: currentCode,
      relativeFilePath: relativeCurrentPath,
    },
  };
}

async function parseBaselinePackage(projectContext: ProjectContext): Promise<ParseForESLintResult> {
  const result = parser.parseForESLint(projectContext.baseline.code, {
    comment: true,
    tokens: true,
    range: true,
    loc: true,
    project: './tsconfig.json',
    tsconfigRootDir: projectContext.root,
    filePath: projectContext.baseline.relativeFilePath,
  });
  return result;
}

async function detectBreakingChanges(projectContext: ProjectContext): Promise<TSESLint.Linter.LintMessage[]> {
  const baselineParsed = await parseBaselinePackage(projectContext);
  const linter = new TSESLint.Linter({ cwd: projectContext.root });
  linter.defineRule('ignore-operation-interface-name-changes', rule(baselineParsed));
  linter.defineParser('@typescript-eslint/parser', parser);
  console.log('projectContext.current.relativeFilePath', projectContext.current.relativeFilePath);
  const messages = linter.verify(
    projectContext.current.code,
    {
      rules: {
        'ignore-operation-interface-name-changes': [2],
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        filePath: projectContext.current.relativeFilePath,
        comment: true,
        tokens: true,
        range: true,
        loc: true,
        project: './tsconfig.json',
        tsconfigRootDir: projectContext.root,
      },
    },
    projectContext.current.relativeFilePath
  );
  return messages;
}

interface SubProjectContext {
  code: string;
  relativeFilePath: string;
}
interface ProjectContext {
  root: string;
  baseline: SubProjectContext;
  current: SubProjectContext;
}

function getFormattedDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

describe('detect rest level client breaking changes', async () => {
  let projectContext: ProjectContext | undefined;

  test('should ignore operation rename', async () => {
    try {
      const testCaseDir = '../../misc/test-cases/rest-level-client-to-rest-level-client/';
      const pathToApiView = 'review/ai-translation-text.api.md';
      const currentApiViewPath = join(__dirname, testCaseDir, 'current-package', pathToApiView);
      const baselineApiViewPath = join(__dirname, testCaseDir, 'baseline-package', pathToApiView);
      const date = getFormattedDate();
      projectContext = await prepareProjectForAzureSdkPackage(
        currentApiViewPath,
        baselineApiViewPath,
        `.tmp/temp-${date}`
      );
      const messages = await detectBreakingChanges(projectContext);
      console.log('messages', messages);
    } catch (err) {
      console.error((err as Error).stack ?? err);
      throw err;
    } finally {
      if (projectContext && (await pathExists(projectContext.root))) {
        await remove(projectContext.root);
      }
    }
  });
});
