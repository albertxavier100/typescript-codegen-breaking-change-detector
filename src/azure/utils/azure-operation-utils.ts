import { ApiContext, ApiDetail, OperationContext, OperationPair, RenamePair, RequestDetail } from '../common/types';
import { getRequestParametersInfo, restLevelClient } from './azure-ast-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { getGlobalScope } from '../../utils/ast-utils';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { ignoreRequestParameterModelNameChanges } from '../../common/models/rules/rule-ids';

function getApiDetail(api: ApiContext): ApiDetail {
  const requestInfo = api.partialParameterTypes.reduce((arr, p) => {
    const info = getRequestParametersInfo(p);
    arr = arr.concat(info);
    return arr;
  }, new Array<RequestDetail>());
  const responseTypeNames = Array.from(api.responseTypes.keys());
  return { parameters: requestInfo, responseTypes: responseTypeNames };
}

function getRenamedParameterOrResponseTypePairs(
  baselineTypes: (string | undefined)[],
  currentTypes: (string | undefined)[]
) {
  const count = Math.min(baselineTypes.length, currentTypes.length);
  let renamedPairs: RenamePair[] = [];
  for (let i = 0; i < count; i++) {
    const baselineTypeName = baselineTypes[i];
    const currentTypeName = currentTypes[i];
    // IMPORTANT: limitation: only compare string
    // e.g. A | B !== B | A, A & B !== B & A are consider as renamed.should be fixed in the future
    if (!baselineTypeName || !currentTypeName || baselineTypeName === currentTypeName) {
      continue;
    }
    renamedPairs.push({ baseline: baselineTypeName, current: currentTypeName });
  }
  return renamedPairs;
}

function getRenamedResponseTypePairs(baseline: ApiDetail, current: ApiDetail): RenamePair[] {
  return getRenamedParameterOrResponseTypePairs(baseline.responseTypes, current.responseTypes);
}

function getRenamedParameterTypePairs(baseline: ApiDetail, current: ApiDetail): RenamePair[] {
  return getRenamedParameterOrResponseTypePairs(
    baseline.parameters.map((p) => p.type),
    current.parameters.map((p) => p.type)
  );
}

function getRenamedParameterOrResponseTypeNameMap(
  baseline: Map<string, ApiDetail>,
  current: Map<string, ApiDetail>,
  getTypesFunc: (apiDetail: ApiDetail) => (string | undefined)[],
  findRenamedPairFunc: (baseline: ApiDetail, current: ApiDetail) => RenamePair[]
): Map<string, RenamePair[]> | undefined {
  const currentApiNames = new Set<string>(current.keys());
  const apiNamesInBothPackage = Array.from(baseline.keys()).filter((baselineApiName) =>
    currentApiNames.has(baselineApiName)
  );

  const renamedMap = apiNamesInBothPackage
    .filter((apiName) => {
      const baselineTypes = getTypesFunc(baseline.get(apiName)!);
      const currentTypes = getTypesFunc(current.get(apiName)!);
      return baselineTypes.length === currentTypes.length;
    })
    .reduce((map, apiName) => {
      const renamePairs = findRenamedPairFunc(baseline.get(apiName)!, current.get(apiName)!);
      map.set(apiName, renamePairs);
      return map;
    }, new Map<string, RenamePair[]>());
  return renamedMap;
}

export function getRenamedResponseTypeNameMap(
  baseline: Map<string, ApiDetail>,
  current: Map<string, ApiDetail>
): Map<string, RenamePair[]> | undefined {
  const getTypesFunc = (apiDetail: ApiDetail): (string | undefined)[] => apiDetail.responseTypes;
  const renamedMap = getRenamedParameterOrResponseTypeNameMap(
    baseline,
    current,
    getTypesFunc,
    getRenamedResponseTypePairs
  );
  return renamedMap;
}

export function getRenamedParameterTypeNameMap(
  baseline: Map<string, ApiDetail>,
  current: Map<string, ApiDetail>
): Map<string, RenamePair[]> | undefined {
  const getTypesFunc = (apiDetail: ApiDetail): (string | undefined)[] => apiDetail.parameters.map((p) => p.type);
  const renamedMap = getRenamedParameterOrResponseTypeNameMap(
    baseline,
    current,
    getTypesFunc,
    getRenamedParameterTypePairs
  );
  return renamedMap;
}

export function removePathParameter(path: string): string {
  const pattern = /\{[^}]+\}/g;
  return path.replace(pattern, '');
}

export function getApiDetails(apis: Map<string, ApiContext>): Map<string, ApiDetail> {
  const map = new Map<string, ApiDetail>();
  apis.forEach((api) => {
    map.set(api.name, getApiDetail(api));
  });
  return map;
}

export function getOperationPairsWithSamePath(
  context: RuleContext<string, readonly unknown[]>,
  baselineOperationContexts: Map<string, OperationContext>
) {
  if (!context.sourceCode.scopeManager) {
    // TODO: carefully handle throw
    throw new Error(
      `Failed to run rule "${ignoreRequestParameterModelNameChanges}" due to lack of scope manager in rule context.`
    );
  }
  const currentService = getParserServices(context);
  const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
  const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);

  const baselineOperationPaths = Array.from(baselineOperationContexts.keys());

  // filter operations have the same path
  const operationPairs: OperationPair[] = baselineOperationPaths
    .filter((path) => currentOperationContexts.has(path))
    .map((path) => {
      const baseline = baselineOperationContexts.get(path)!;
      const current = currentOperationContexts.get(path)!;
      baseline.apiDetails = getApiDetails(baseline.apis);
      current.apiDetails = getApiDetails(current.apis);
      return { path, baseline, current };
    });
  return operationPairs;
}
