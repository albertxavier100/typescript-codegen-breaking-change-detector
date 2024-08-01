import {
  CreateOperationRule,
  OperationGroupPair,
  ParseForESLintResult,
  RenameMessage,
  RequestDetail,
} from '../types.js';
import { getOperationPairsWithSamePath, getRenamedParameterTypeNameMap } from '../../utils/azure-operation-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { getParserServices, RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { getOperationContexsFromEsParseResult } from '../../utils/azure-ast-utils.js';
import { ignoreRequestParameterModelNameChanges } from '../../../common/models/rules/rule-ids.js';
import { devConsolelog, getReport } from '../../../utils/common-utils.js';
import { InterfaceDeclaration } from 'ts-morph';
import { TSESTree } from '@typescript-eslint/types';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';

// LIMITATION: compare with the same position for now
// TODO: improve detection
// function getRenamedParameterWraperSet(
//   operationPairs: OperationGroupPair[],
//   service: ParserServicesWithTypeInformation
// ): {[interfaceName: string]: {baseline: RequestDetail, current: RequestDetail}} {

//   const renamedWraperMap = operationPairs.map((operationPair) => {
//     const baselineApiDetailMap = operationPair.baseline.apiDetails!
//     const currentApiDetailMap = operationPair.current.apiDetails!
//     const currentApiNames = new Set<string>(currentApiDetailMap.keys());
//     const apiNamesInBothPackage = [...baselineApiDetailMap.keys()].filter((baselineApiName) =>
//       currentApiNames.has(baselineApiName)
//     );
//     apiNamesInBothPackage.map(apiName => {
//       const baselineApiDetail = baselineApiDetailMap.get(apiName)!
//       const currentApiDetail = currentApiDetailMap.get(apiName)!
//       const baselineWrapers = baselineApiDetail.parameters.map(p => p.wraper)
//       const currentWrapers = currentApiDetail.parameters.map(p => p.wraper)

//     })
//     // return renamedWraperSet;
//   });
// }

// LIMITATION: compare with the same position for now
// TODO: improve detection
function getRenamedParameterPairs(operationPairs: OperationGroupPair[]) {
  const renamedList = operationPairs.map((operationPair) => {
    const apiNameToRenamedApiPairMapForParameters = getRenamedParameterTypeNameMap(
      operationPair.baseline.apiDetails!,
      operationPair.current.apiDetails!
    );
    return {
      currentNode: operationPair.current.node,
      renamedParameters: apiNameToRenamedApiPairMapForParameters,
    };
  });
  return renamedList;
}

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult | undefined) => {
  if (!baselineParsedResult)
    throw new Error(`ParseForESLintResult is required in ${ignoreRequestParameterModelNameChanges} rule`);
  
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);
  return createOperationRuleListener(
    ignoreRequestParameterModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const operationPairs = getOperationPairsWithSamePath(context, baselineOperationContexts);
      const renamedParameters = getRenamedParameterPairs(operationPairs);
      const service = getParserServices(context);
      // const renamedParameterWraperSet = getRenamedParameterWraperSet(operationPairs, service);
      return {
        TSInterfaceDeclaration(node) {
          // TODO: get path in node to improve perf
          for (const renamed of renamedParameters) {
            if (node !== renamed.currentNode || !renamed.renamedParameters) continue;
            renamed.renamedParameters.forEach((apiPairs) => {
              apiPairs.forEach((apiPair) => {
                getReport(context)(<RenameMessage>{
                  id: ignoreRequestParameterModelNameChanges,
                  from: apiPair.baseline,
                  to: apiPair.current,
                  type: 'request',
                });
              });
            });
          }
          // if (renamedParameterWraperSet.has(node)) {
          //   getReport(context)(<RenameMessage>{
          //     id: ignoreRequestParameterModelNameChanges,
          //     from: ,
          //     to: ,
          //     type: 'request',
          //   })
          // }
        },
      };
    }
  );
};
export default rule;
