import { CreateOperationRule, OperationGroupPair, ParseForESLintResult, RenameMessage } from '../types.js';
import { getOperationPairsWithSamePath, getRenamedResponseTypeNameMap } from '../../utils/azure-operation-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { getOperationContexsFromEsParseResult } from '../../utils/azure-ast-utils.js';
import { ignoreResponseModelNameChanges } from '../../../common/models/rules/rule-ids.js';
import { devConsolelog, getReport } from '../../../utils/common-utils.js';

// LIMITATION: compare with the same position for now
// TODO: improve detection
function getRenamedResponsePairs(operationPairs: OperationGroupPair[]) {
  const renamedList = operationPairs.map((operationPair) => {
    const apiNameToRenamedApiPairMapForResponses = getRenamedResponseTypeNameMap(
      operationPair.baseline.apiDetails!,
      operationPair.current.apiDetails!
    );
    return {
      path: operationPair.path,
      currentNode: operationPair.current.node,
      renamedResponses: apiNameToRenamedApiPairMapForResponses,
    };
  });
  return renamedList;
}

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult | undefined) => {
  if (!baselineParsedResult)
    throw new Error(`ParseForESLintResult is required in ${ignoreResponseModelNameChanges} rule`);

  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);
  return createOperationRuleListener(
    ignoreResponseModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const operationPairs = getOperationPairsWithSamePath(context, baselineOperationContexts);
      const renamedList = getRenamedResponsePairs(operationPairs);

      return {
        TSInterfaceDeclaration(node) {
          // TODO: get path in node to improve perf
          for (const renamed of renamedList) {
            if (node !== renamed.currentNode || !renamed.renamedResponses) continue;
            renamed.renamedResponses.forEach((apiPairs) => {
              apiPairs.forEach((apiPair) => {
                getReport(context)(<RenameMessage>{
                  id: ignoreResponseModelNameChanges,
                  from: apiPair.baseline,
                  to: apiPair.current,
                  type: 'response',
                });
              });
            });
          }
        },
      };
    }
  );
};
export default rule;
