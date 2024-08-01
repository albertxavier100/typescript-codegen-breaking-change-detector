import * as parser from '@typescript-eslint/parser';
import * as ruleIds from '../common/models/rules/rule-ids.js';

import { ParseForESLintResult, RuleMessage } from './common/types.js';
import { Renderer, marked } from 'marked';
import { basename, join, posix, relative } from 'node:path';
import { devConsolelog, toPosixPath } from '../utils/common-utils.js';
import { exists, outputFile, readFile, remove } from 'fs-extra';

import { TSESLint } from '@typescript-eslint/utils';
import findDeclarationOfTypeReferenceForRoutesRule from './common/rules/find-declaration-of-type-reference-for-routes.js';
import { glob } from 'glob';
import ignoreOperationGroupNameChangesRule from './common/rules/ignore-operation-group-name-changes.js';
import ignoreRequestParameterModelNameChangesRule from './common/rules/ignore-request-parameter-model-name-changes.js';
import ignoreResponseModelNameChangesRule from './common/rules/ignore-response-model-name-changes.js';
import { logger } from '../logging/logger.js';

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
  if (codeBlocks.length !== 1) throw new Error(`Expected 1 code block, got ${codeBlocks.length} in "${path}".`);

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

function findRoot(projectContext: ProjectContext) {
  const linter = new TSESLint.Linter({ cwd: projectContext.root });
  linter.defineRule(
    ruleIds.findDeclarationOfTypeReferenceForRoutes,
    findDeclarationOfTypeReferenceForRoutesRule(undefined)
  );
  linter.defineParser('@typescript-eslint/parser', parser);
  linter.verify(
    projectContext.current.code,
    {
      rules: {
        [ruleIds.findDeclarationOfTypeReferenceForRoutes]: [2],
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
      settings: {
        report: (message: RuleMessage) => {},
      },
    },
    projectContext.current.relativeFilePath
  );
}

async function detectBreakingChangesCore(projectContext: ProjectContext): Promise<RuleMessage[] | undefined> {
  try {
    findRoot(projectContext);
    const breakingChangeResults: RuleMessage[] = [];
    const baselineParsed = await parseBaselinePackage(projectContext);
    const linter = new TSESLint.Linter({ cwd: projectContext.root });
    linter.defineRule(ruleIds.ignoreOperationGroupNameChanges, ignoreOperationGroupNameChangesRule(baselineParsed));
    linter.defineRule(
      ruleIds.ignoreRequestParameterModelNameChanges,
      ignoreRequestParameterModelNameChangesRule(baselineParsed)
    );
    linter.defineRule(ruleIds.ignoreResponseModelNameChanges, ignoreResponseModelNameChangesRule(baselineParsed));
    linter.defineParser('@typescript-eslint/parser', parser);
    linter.verify(
      projectContext.current.code,
      {
        rules: {
          [ruleIds.ignoreOperationGroupNameChanges]: [2],
          [ruleIds.ignoreRequestParameterModelNameChanges]: [2],
          [ruleIds.ignoreResponseModelNameChanges]: [2],
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
        settings: {
          report: (message: RuleMessage) => {
            breakingChangeResults.push(message);
          },
        },
      },
      projectContext.current.relativeFilePath
    );
    return breakingChangeResults;
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
): Promise<Map<string, RuleMessage[] | undefined>> {
  if (!baselinePackageFolder) throw new Error(`Failed to use undefined or null baseline package folder`);

  if (!currentPackageFolder) throw new Error(`Failed to use undefined or null current package folder`);

  if (!tempFolder) throw new Error(`Failed to use undefined or null temp folder`);

  try {
    baselinePackageFolder = toPosixPath(baselinePackageFolder);
    currentPackageFolder = toPosixPath(currentPackageFolder);
    tempFolder = toPosixPath(tempFolder);

    devConsolelog('start detect');
    const apiViewPathPattern = posix.join(baselinePackageFolder, 'review/*.api.md');
    const baselineApiViewPaths = await glob(apiViewPathPattern);
    const messsagesPromises = baselineApiViewPaths.map(async (baselineApiViewPath) => {
      const relativeApiViewPath = relative(baselinePackageFolder!, baselineApiViewPath);
      const apiViewBasename = basename(relativeApiViewPath);
      const currentApiViewPath = join(currentPackageFolder!, relativeApiViewPath);
      if (!(await exists(currentApiViewPath))) throw new Error(`Failed to find API view: ${currentApiViewPath}`);

      const projectContext = await prepareProject(currentApiViewPath, baselineApiViewPath, tempFolder!);
      const messages = await detectBreakingChangesCore(projectContext);
      return { name: apiViewBasename, messages };
    });
    const messagesMap = new Map<string, RuleMessage[] | undefined>();
    const promises = messsagesPromises.map(async (p) => {
      const result = await p;
      devConsolelog('name', result.name);
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
