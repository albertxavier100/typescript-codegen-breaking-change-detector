import * as parser from '@typescript-eslint/parser';

import { Renderer, marked } from 'marked';
import { basename, join, posix, relative } from 'node:path';
import { exists, outputFile, readFile, remove } from 'fs-extra';

import { Linter } from '@typescript-eslint/utils/ts-eslint';
import { ParseForESLintResult } from './common/types';
import { TSESLint } from '@typescript-eslint/utils';
import { devConsolelog } from '../utils/common-utils';
import { glob } from 'glob';
import ignoreOperationInterfaceNameChangesRule from './common/rules/ignore-operation-interface-name-changes';
import ignoreRequestParameterModelNameChangesRule from './common/rules/ignore-request-parameter-model-name-changes';
import ignoreResponseModelNameChangesRule from './common/rules/ignore-response-model-name-changes';
import { logger } from '../logging/logger';

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

interface SubProjectContext {
  code: string;
  relativeFilePath: string;
}
interface ProjectContext {
  root: string;
  baseline: SubProjectContext;
  current: SubProjectContext;
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

async function prepareProject(
  currentPackageFolder: string,
  baselinePackageFolder: string,
  tempFolder: string
): Promise<ProjectContext> {
  const [currentCode, baselineCode] = await Promise.all([
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

async function detectBreakingChangesCore(
  projectContext: ProjectContext
): Promise<TSESLint.Linter.LintMessage[] | undefined> {
  try {
    const baselineParsed = await parseBaselinePackage(projectContext);
    const linter = new TSESLint.Linter({ cwd: projectContext.root });
    linter.defineRule(
      'ignore-operation-interface-name-changes',
      ignoreOperationInterfaceNameChangesRule(baselineParsed)
    );
    linter.defineRule(
      'ignore-request-parameter-model-name-changes',
      ignoreRequestParameterModelNameChangesRule(baselineParsed)
    );
    linter.defineRule('ignore-response-model-name-changes', ignoreResponseModelNameChangesRule(baselineParsed));
    linter.defineParser('@typescript-eslint/parser', parser);
    console.log('projectContext.current.relativeFilePath', projectContext.current.relativeFilePath);
    const messages = linter.verify(
      projectContext.current.code,
      {
        // TODO: add warning if order is incorrect
        rules: {
          'ignore-operation-interface-name-changes': [2],
          'ignore-request-parameter-model-name-changes': [2],
          'ignore-response-model-name-changes': [2],
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
  } catch (err) {
    logger.error(`Failed to detect breaking changes due to ${(err as Error).stack ?? err}`);
    return undefined;
  }
}

export async function detectBreakingChangesBetweenPackages(
  baselinePackageFolder: string | undefined,
  currentPackageFolder: string | undefined,
  tempFolder: string | undefined,
  cleanUpAtTheEnd: boolean
): Promise<Map<string, Linter.LintMessage[] | undefined>> {
  if (!baselinePackageFolder) {
    throw new Error(`Failed to use undefined or null baseline package folder`);
  }
  if (!currentPackageFolder) {
    throw new Error(`Failed to use undefined or null current package folder`);
  }
  if (!tempFolder) {
    throw new Error(`Failed to use undefined or null temp folder`);
  }
  try {
    const apiViewPathPattern = posix.join(baselinePackageFolder, 'review/*.api.md');
    const baselineApiViewPaths = await glob(apiViewPathPattern);
    const messsagesPromises = baselineApiViewPaths.map(async (baselineApiViewPath) => {
      const relativeApiViewPath = relative(baselinePackageFolder, baselineApiViewPath);
      const apiViewBasename = basename(relativeApiViewPath);
      const currentApiViewPath = join(currentPackageFolder, relativeApiViewPath);
      if (!(await exists(currentApiViewPath))) {
        throw new Error(`Failed to find API view: ${currentApiViewPath}`);
      }
      const projectContext = await prepareProject(currentApiViewPath, baselineApiViewPath, tempFolder);
      const messages = await detectBreakingChangesCore(projectContext);
      return { name: apiViewBasename, messages };
    });
    const messagesMap = new Map<string, Linter.LintMessage[] | undefined>();
    const promises = messsagesPromises.map(async (p) => {
      const result = await p;
      messagesMap.set(result.name, result.messages);
    });
    await Promise.all(promises);
    return messagesMap;
  } finally {
    if (cleanUpAtTheEnd) {
      if (await exists(tempFolder)) {
        await remove(tempFolder);
      }
    }
  }
}
