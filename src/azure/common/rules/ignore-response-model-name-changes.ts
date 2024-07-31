import { CreateOperationRule, OperationPair, ParseForESLintResult, RenameMessage } from '../types.js';
import { getOperationPairsWithSamePath, getRenamedResponseTypeNameMap } from '../../utils/azure-operation-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { getOperationContexsFromEsParseResult } from '../../utils/azure-ast-utils.js';
import { ignoreResponseModelNameChanges } from '../../../common/models/rules/rule-ids.js';
import { getReport } from '../../../utils/common-utils.js';

function getRenamedResponsePairs(operationPairs: OperationPair[]) {
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

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
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
            if (node !== renamed.currentNode) {
              continue;
            }
            if (renamed.renamedResponses) {
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
            return;
          }
        },
      };
    }
  );
};
export default rule;
