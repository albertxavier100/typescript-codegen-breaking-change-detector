import { LinterSettings } from '../azure/common/types.js';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import path from 'path';
import util from 'util';

export function AreSameSets<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false;

  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
}

// IMPORTANT: dev with chakrounanas.turbo-console-log vscode extension
export function devConsolelog(title?: any, ...optionalParams: any[]): void {
  const start = '💎💎💎💎';
  const end = '📍📍📍📍';
  const body = util.inspect(optionalParams, { depth: null, colors: true });
  console.log(start, 'START:', title, start);
  console.log(body);
  console.log(end, 'END  :', title, end);
  console.log();
}

export function getSettings(context: RuleContext<string, readonly unknown[]>) {
  return (context.settings as any as LinterSettings)!;
}

export function toPosixPath(winPath: string) {
  const posixPath = winPath.split(path.sep).join(path.posix.sep);
  return posixPath;
}
