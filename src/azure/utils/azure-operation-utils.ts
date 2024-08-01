import {
  ApiContext,
  ApiDetail,
  OperationGroupContext,
  OperationGroupPair,
  RenamePair,
  RequestDetail,
  ResponseDetail,
} from '../common/types.js';
import { getRequestParametersInfo, restLevelClient } from './azure-ast-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { getGlobalScope } from '../../utils/ast-utils.js';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { ignoreRequestParameterModelNameChanges } from '../../common/models/rules/rule-ids.js';

// IMPORTANT: functions or variables named with "operation" should be "operationGroup". functions or variables named with "api" should be "operation"
// TODO: correct naming
function getApiDetail(api: ApiContext): ApiDetail {
  const requestInfo = api.partialParameterTypes.reduce((arr, wraper) => {
    const detail = getRequestParametersInfo(wraper);
    arr = arr.concat(detail);
    return arr;
  }, new Array<RequestDetail>());
  const responseInfo = Array.from(api.responseTypes.entries()).map((e) => <ResponseDetail>{ type: e[0], node: e[1] });
  return { parameters: requestInfo, responseTypes: responseInfo };
}

function getRenamedParameterOrResponseTypePairs(
  baselineTypes: (RequestDetail | ResponseDetail)[],
  currentTypes: (RequestDetail | ResponseDetail)[]
) {
  const count = Math.min(baselineTypes.length, currentTypes.length);
  let renamedPairs: RenamePair[] = [];
  // TODO: support better detection
  // LIMITATION: it can only detect rename in the same position/order
  for (let i = 0; i < count; i++) {
    const baselineDetail = baselineTypes[i];
    const currentDetail = currentTypes[i];

    if (
      baselineDetail.node &&
      currentDetail.node &&
      baselineDetail.type &&
      currentDetail.type &&
      baselineDetail.node.getType().isAssignableTo(currentDetail.node.getType()) &&
      currentDetail.node.getType().isAssignableTo(baselineDetail.node.getType()) &&
      baselineDetail.type !== currentDetail.type
    ) {
      renamedPairs.push({ baseline: baselineDetail.type, current: currentDetail.type });
    }
  }
  return renamedPairs;
}

function getRenamedResponseTypePairs(baseline: ApiDetail, current: ApiDetail): RenamePair[] {
  return getRenamedParameterOrResponseTypePairs(baseline.responseTypes, current.responseTypes);
}

function getRenamedParameterTypePairs(baseline: ApiDetail, current: ApiDetail): RenamePair[] {
  return getRenamedParameterOrResponseTypePairs(baseline.parameters, current.parameters);
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
  const getTypesFunc = (apiDetail: ApiDetail): (string | undefined)[] => apiDetail.responseTypes.map((p) => p.type);
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
  baselineOperationContexts: Map<string, OperationGroupContext>
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
  const operationPairs: OperationGroupPair[] = baselineOperationPaths
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
