import { ParserServices, ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import { Scope, ScopeManager } from '@typescript-eslint/scope-manager';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { createWrappedNode } from 'ts-morph';
import { devFileLogger } from '../logging/logger';
import { findVariable } from '@typescript-eslint/utils/ast-utils';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';

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

export function tryFindDeclaration<TNode extends TSESTree.Node>(
  name: string,
  scope: Scope,
  typeGuard: (node: TSESTree.Node) => node is TNode
): TNode | undefined {
  const variable = findVariable(scope as Scope, name);
  const node = variable?.defs?.[0]?.node;
  if (!node) {
    devFileLogger.warn(`Failed to find ${name}'s declaration`);
    return undefined;
  }
  if (!typeGuard(node)) {
    devFileLogger.warn(`Found ${name}'s declaration but with another node type "${node.type}"`);
    return undefined;
  }
  return node;
}

export function findDeclaration<TNode extends TSESTree.Node>(
  name: string,
  scope: Scope,
  typeGuard: (node: TSESTree.Node) => node is TNode
): TNode {
  const node = tryFindDeclaration(name, scope, typeGuard);
  if (!node) {
    throw new Error(`Failed to find "${name}"`);
  }
  return node;
}

export function isParseServiceWithTypeInfo(service: ParserServices): service is ParserServicesWithTypeInformation {
  return service.program !== null;
}

export function isInterfaceDeclarationNode(node: TSESTree.Node): node is TSESTree.TSInterfaceDeclaration {
  return node.type === TSESTree.AST_NODE_TYPES.TSInterfaceDeclaration;
}

export function isTypeAliasDeclarationNode(node: TSESTree.Node): node is TSESTree.TSTypeAliasDeclaration {
  return node.type === TSESTree.AST_NODE_TYPES.TSTypeAliasDeclaration;
}

export function isTypeAnnotationIntersectionNode(node: TSESTree.Node): node is TSESTree.TSIntersectionType {
  return node.type === TSESTree.AST_NODE_TYPES.TSIntersectionType;
}

export function isTypeAnnotationUnionNode(node: TSESTree.Node): node is TSESTree.TSUnionType {
  return node.type === TSESTree.AST_NODE_TYPES.TSUnionType;
}
