import { TSESTree as t } from '@typescript-eslint/utils';
import { findVariable } from '@typescript-eslint/utils/ast-utils';
import { Scope } from '@typescript-eslint/utils/ts-eslint';
import { OperationContext } from '../common/types';

function findInterface(name: string, scope: Scope.Scope): t.TSInterfaceDeclaration {
  const variable = findVariable(scope as Scope.Scope, name);
  const node = (variable?.defs?.[0]?.node as t.TSInterfaceDeclaration) ?? undefined;
  if (!node) {
    throw new Error(`Failed to find "${name}" interface`);
  }
  return node;
}

function findOperationsContextInRLC(scope: Scope.Scope): OperationContext[] {
  const routes = findInterface('Routes', scope);
  const operationContexts = routes.body.body.map((call) => {
    const callSignature = call as t.TSCallSignatureDeclaration;
    const returnType = callSignature?.returnType?.typeAnnotation as t.TSTypeReference;
    const name = (returnType.typeName as t.Identifier).name;
    console.log('name', name);
    const path = callSignature.params
      .filter((para) => (para as t.Identifier)?.name === 'path')
      .map((para) => {
        const literalType = (para as t.Identifier)?.typeAnnotation?.typeAnnotation as t.TSLiteralType;
        const path = (literalType.literal as t.Literal)?.value as string;
        return path;
      })[0];
    var node = findInterface(name, scope);
    return { name, path, node };
  });
  return operationContexts;
}

export const restLevelClient = {
  findOperationsInParseResult: findOperationsContextInRLC
};
