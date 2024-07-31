import { ApiContext, OperationContext, ParseForESLintResult, RequestDetail } from '../common/types.js';
import { InterfaceDeclaration, MethodSignature, SourceFile, SyntaxKind, createWrappedNode } from 'ts-morph';
import { ParserServicesWithTypeInformation, TSESTree, TSESTree as t } from '@typescript-eslint/utils';
import {
  findDeclaration,
  getGlobalScope,
  isInterfaceDeclarationNode,
  isParseServiceWithTypeInfo,
} from '../../utils/ast-utils.js';

import { Scope } from '@typescript-eslint/scope-manager';
import { removePathParameter } from './azure-operation-utils.js';

// TODO: find in import statements
const importedDeclarations = [
  'Client',
  'ClientOptions',
  'HttpResponse',
  'KeyCredential',
  'RawHttpHeaders',
  'RawHttpHeaders',
  'RequestParameters',
  'StreamableMethod',
  'StreamableMethod',
];

function convertToMorphNode(node: TSESTree.Node, service: ParserServicesWithTypeInformation) {
  const tsNode = service.esTreeNodeToTSNodeMap.get(node);
  const typeChecker = service.program.getTypeChecker();
  const moNode = createWrappedNode(tsNode, { typeChecker });
  return moNode;
}

// TODO: refactor: pass in morph root node
function findOperationsContextInRLC(
  scope: Scope,
  service: ParserServicesWithTypeInformation
): Map<string, OperationContext> {
  const routes = findDeclaration('Routes', scope, isInterfaceDeclarationNode);
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
    const pathExludeParameters = removePathParameter(path);
    var node = findDeclaration(name, scope, isInterfaceDeclarationNode);
    const moOperation = convertToMorphNode(node, service).asKindOrThrow(SyntaxKind.InterfaceDeclaration);
    const apis = getApiContexts(moOperation);

    return { name, pathExludeParameters, node, apis };
  });
  const map = operationContexts.reduce((map, op) => {
    map.set(op.pathExludeParameters, op);
    return map;
  }, new Map<string, OperationContext>());
  return map;
}

function findDeclarationInGlobalScope(targetName: string, kind: SyntaxKind, sourceFile: SourceFile) {
  const exportedDeclarations = sourceFile.getExportedDeclarations();
  for (const [_, decls] of exportedDeclarations) {
    for (const decl of decls) {
      const name = decl.asKind(kind)?.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
      if (name !== targetName) {
        continue;
      }
      return decl;
    }
  }
  throw new Error(`Failed to find interface "${targetName}"`);
}

// IMPORTANT: respect the ts emitter's pattern ONLY. e.g.
// export interface GetLanguages {
//  get(options?: GetLanguagesParameters): StreamableMethod<GetLanguages200Response | GetLanguagesDefaultResponse>;
// }
function getApiParameterDeclarations(api: MethodSignature): InterfaceDeclaration[] {
  const parameters = api.getParameters();

  // IMPORTANT: ts emitter only support 1 parameter for now
  if (parameters.length !== 1) {
    throw new Error(`Expected 1 parameter, but got ${parameters.length} for API parameter in "${api.getText()}"`);
  }
  // IMPORTANT: core(internal) model should be ignored
  const coreParamTypeName = parameters[0].getFirstChildByKindOrThrow(SyntaxKind.TypeReference).getText();
  const sourceFile = parameters[0].getSourceFile();
  // IMPORTANT: must be type alias in ts emitter
  const coreParamInterface = findDeclarationInGlobalScope(
    coreParamTypeName,
    SyntaxKind.TypeAliasDeclaration,
    sourceFile
  );
  // IMPORTANT: only consider intersaction type, which is the same as current tool
  const parameterIntersectionType = coreParamInterface.getFirstChildByKindOrThrow(SyntaxKind.IntersectionType);

  // TODO: get the actual properties
  // const parametersTypes = parameterIntersectionType.getType().getProperties();
  // parametersTypes.forEach((p) => {
  //   console.log('xxxxxp', p.getName());
  //   p.getDeclarations().map((d) => {
  //       //...
  //     });
  //   return
  // });

  const parameterTypes = parameterIntersectionType.getTypeNodes();
  // IMPORTANT: only consider 1 depth, which is the same as current tool
  const parameterNamesWithoutImport = parameterTypes
    .filter((t) => {
      const typeName = t.getText();
      return !importedDeclarations.includes(typeName);
    })
    .map((t) => t.getText());
  // IMPORTANT: only consider interfaces
  // TODO: support for features like extend
  const parameterDeclarations = parameterNamesWithoutImport.map((n) => {
    const declaration = findDeclarationInGlobalScope(n, SyntaxKind.InterfaceDeclaration, sourceFile);
    const decl = declaration.asKindOrThrow(SyntaxKind.InterfaceDeclaration);
    return decl;
  });
  return parameterDeclarations;
}

// IMPORTANT: respect the ts emitter's pattern ONLY. e.g.
// export interface GetLanguages {
//  get(options?: GetLanguagesParameters): StreamableMethod<GetLanguages200Response | GetLanguagesDefaultResponse>;
// }
function getApiResponseDeclarations(api: MethodSignature): Map<string, InterfaceDeclaration> {
  const returnType = api.getReturnTypeNodeOrThrow();
  const sourceFile = api.getSourceFile();

  // IMPORTANT: core(internal) model should be ignored
  const typeArguments = returnType.asKindOrThrow(SyntaxKind.TypeReference).getTypeArguments();
  // IMPORTANT: only consider union type for ts emitter
  if (typeArguments.length !== 1) {
    throw new Error(
      `Expected 1 union type, but got ${typeArguments.length} for API response type in "${api.getText()}"`
    );
  }
  if (typeArguments[0].getKind() !== SyntaxKind.UnionType) {
    throw new Error(`Expected union type for response model, but got ${typeArguments[0].getKindName()}`);
  }
  const responseUnionType = typeArguments[0].asKindOrThrow(SyntaxKind.UnionType);
  const responseTypes = responseUnionType.getTypeNodes();
  const responseNamesWithoutImport = responseTypes
    .filter((t) => {
      const typeName = t.getText();
      return !importedDeclarations.includes(typeName);
    })
    .map((t) => t.getText());
  // IMPORTANT: only consider interfaces
  // TODO: support for features like extend
  const responseDeclarations = responseNamesWithoutImport.reduce((map, n) => {
    const declaration = findDeclarationInGlobalScope(n, SyntaxKind.InterfaceDeclaration, sourceFile);
    const decl = declaration.asKindOrThrow(SyntaxKind.InterfaceDeclaration);
    map.set(n, decl);
    return map;
  }, new Map<string, InterfaceDeclaration>());

  return responseDeclarations;
}

// IMPORTANT: respect the ts emitter's pattern ONLY. e.g.
// export interface GetLanguages {
//  get(options?: GetLanguagesParameters): StreamableMethod<GetLanguages200Response | GetLanguagesDefaultResponse>;
// }
export function getApiContexts(operation: InterfaceDeclaration) {
  const apis = operation.getMembers().map((m) => m.asKindOrThrow(SyntaxKind.MethodSignature));
  const apiContexts = apis.reduce((map, api) => {
    const name = api.getStructure().name;
    // TODO: add name
    const parameterTypes = getApiParameterDeclarations(api);
    const responseTypes = getApiResponseDeclarations(api);
    const apiContext = <ApiContext>{ name, partialParameterTypes: parameterTypes, responseTypes };
    map.set(name, apiContext);
    return map;
  }, new Map<string, ApiContext>());
  return apiContexts;
}

export function getRequestParametersInfo(partOfRequestParameter: InterfaceDeclaration): RequestDetail[] {
  const properties = partOfRequestParameter.getStructure().properties;
  if (!properties) {
    return [{ name: undefined, type: undefined }];
  }
  const info = properties.map((p) => {
    if (typeof p.type === 'string') {
      return { name: p.name, type: p.type };
    }
    return { name: p.name, type: undefined };
  });
  return info;
}

export function getOperationContexsFromEsParseResult(result: ParseForESLintResult) {
  const service = result.services;
  if (!isParseServiceWithTypeInfo(service)) {
    throw new Error(`Failed to get ParserServicesWithTypeInformation. It indicates the parser configuration is wrong.`);
  }
  const globalScope = getGlobalScope(result.scopeManager);
  const operationContexts = restLevelClient.findOperationsContext(globalScope, service);
  return operationContexts;
}

export const restLevelClient = {
  findOperationsContext: findOperationsContextInRLC,
};
