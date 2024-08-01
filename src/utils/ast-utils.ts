import { ParserServices, ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import { Scope, ScopeManager } from '@typescript-eslint/scope-manager';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { devConsolelog } from './common-utils.js';
import { findVariable } from '@typescript-eslint/utils/ast-utils';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { logger } from '../logging/logger.js';
import {
  InterfaceDeclaration,
  TypeAliasDeclaration,
  Node,
  createWrappedNode,
  TypeReferenceNode,
  SyntaxKind,
} from 'ts-morph';

export function getGlobalScope(scopeManager: ScopeManager | null): Scope {
  const globalScope = scopeManager?.globalScope;
  if (!globalScope) throw new Error(`Failed to find global scope`);
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
    logger.warn(`Failed to find ${name}'s declaration`);
    return undefined;
  }
  if (!typeGuard(node)) {
    logger.warn(`Found ${name}'s declaration but with another node type "${node.type}"`);
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
  if (!node) throw new Error(`Failed to find "${name}"`);
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

// TODO: remove
export function isChildOfInterface(name: string, node: TSESTree.TSTypeReference): boolean {
  let current: TSESTree.Node | undefined = node.parent;

  while (current?.type !== TSESTree.AST_NODE_TYPES.Program) {
    if (current?.type === TSESTree.AST_NODE_TYPES.TSInterfaceDeclaration && current.id.name === name) return true;
    current = current?.parent;
  }
  return false;
}

export function getTypeReferencesUnder(node: Node) {
  const types: TypeReferenceNode[] = [];
  if (!node) return types;
  node.forEachChild((child) => {
    if (Node.isTypeReference(child)) {
      types.push(child);
    }
    const childTypeAliases = getTypeReferencesUnder(child);
    types.push(...childTypeAliases);
  });
  return types;
}

export function convertToMorphNode(node: TSESTree.Node, service: ParserServicesWithTypeInformation) {
  const tsNode = service.esTreeNodeToTSNodeMap.get(node);
  const typeChecker = service.program.getTypeChecker();
  const moNode = createWrappedNode(tsNode, { typeChecker });
  return moNode;
}

export function findAllDeclarationsUnder(node: Node, scope: Scope, service: ParserServicesWithTypeInformation) {
  const interfaces: InterfaceDeclaration[] = [];
  const typeAliases: TypeAliasDeclaration[] = [];
  if (!node) return { interfaces, typeAliases };
  const findNext = (node: Node) => {
    const result = findAllDeclarationsUnder(node, scope, service);
    interfaces.push(...result.interfaces);
    typeAliases.push(...result.typeAliases);
  };
  const references = getTypeReferencesUnder(node);
  references.forEach((r) => {
    const esInterfaceOfReference = tryFindDeclaration(r.getText(), scope, isInterfaceDeclarationNode);
    if (esInterfaceOfReference) {
      // console.log('////', esInterfaceOfReference.id.name);
      const interfaceOfReference = convertToMorphNode(esInterfaceOfReference, service).asKindOrThrow(
        SyntaxKind.InterfaceDeclaration
      );
      interfaces.push(interfaceOfReference);
      findNext(interfaceOfReference)
    } else {
      const esTypeAliasOfReference = tryFindDeclaration(r.getText(), scope, isTypeAliasDeclarationNode);
      if (esTypeAliasOfReference) {
        // console.log(']]]]', esTypeAliasOfReference.id.name);
        const typeAliasOfReference = convertToMorphNode(esTypeAliasOfReference, service).asKindOrThrow(
          SyntaxKind.TypeAliasDeclaration
        );
        typeAliases.push(typeAliasOfReference);
        findNext(typeAliasOfReference)
      }
    }
  });
  return { interfaces, typeAliases };
}
