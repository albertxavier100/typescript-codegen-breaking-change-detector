import { TSESTree as t } from '@typescript-eslint/utils';
import { findVariable } from '@typescript-eslint/utils/ast-utils';
import { Scope } from '@typescript-eslint/utils/ts-eslint';
import { OperationContext } from '../common/types';
import { removePathParameter } from './azure-operation-utils';
import { getGlobalScope } from '../../utils/ast-utils';

function findDefinition(name: string, scope: Scope.Scope): t.Node {
  const variable = findVariable(scope as Scope.Scope, name);
  const node = variable?.defs?.[0]?.node;
  if (!node) {
    throw new Error(`Failed to find "${name}" interface`);
  }
  return node;
}

function findOperationsContextInRLC(scopeManager: Scope.ScopeManager | null): Map<string, OperationContext> {
  const scope = getGlobalScope(scopeManager);
  const routes = findDefinition('Routes', scope) as t.TSInterfaceDeclaration;
  const operationContexts = routes.body.body.map((call) => {
    const callSignature = call as t.TSCallSignatureDeclaration;
    const returnType = callSignature?.returnType?.typeAnnotation as t.TSTypeReference;
    const name = (returnType.typeName as t.Identifier).name;
    const path = callSignature.params
      .filter((para) => (para as t.Identifier)?.name === 'path')
      .map((para) => {
        const literalType = (para as t.Identifier)?.typeAnnotation?.typeAnnotation as t.TSLiteralType;
        const path = (literalType.literal as t.Literal)?.value as string;
        return path;
      })[0];
    var node = findDefinition(name, scope) as t.TSInterfaceDeclaration;
    return { name, path, node };
  });
  const map = operationContexts.reduce((map, op) => {
    op.path = removePathParameter(op.path);
    map.set(op.path, { node: op.node, name: op.name, pathExludeParameters: op.path });
    return map;
  }, new Map<string, OperationContext>());
  return map;
}

export const restLevelClient = {
  findOperationsContext: findOperationsContextInRLC,
};
