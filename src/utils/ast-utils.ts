import { Scope, ScopeManager } from "@typescript-eslint/scope-manager";

export function getGlobalScope(scopeManager: ScopeManager | null): Scope {
  const globalScope = scopeManager?.globalScope;
  if (!globalScope) {
    throw new Error(`Failed to find global scope`);
  }
  return globalScope;
}
