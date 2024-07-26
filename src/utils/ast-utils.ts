import { Scope, ScopeManager } from '@typescript-eslint/scope-manager';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';

export function getGlobalScope(scopeManager: ScopeManager | null): Scope {
  const globalScope = scopeManager?.globalScope;
  if (!globalScope) {
    throw new Error(`Failed to find global scope`);
  }
  return globalScope;
}

export function isNodeTypeAssignableTo(
  source: TSESTree.Node,
  target: TSESTree.Node,
  context: RuleContext<string, readonly unknown[]>
): boolean {
  const service = getParserServices(context);
  const checker = service.program.getTypeChecker();
  const sourceType = service.getTypeAtLocation(source);
  const targetType = service.getTypeAtLocation(target);
  return checker.isTypeAssignableTo(sourceType, targetType);
}
