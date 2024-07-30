import { CreateOperationRule, OperationPair, ParseForESLintResult, RenameMessage } from '../types';
import { getOperationPairsWithSamePath, getRenamedParameterTypeNameMap } from '../../utils/azure-operation-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { getOperationContexsFromEsParseResult } from '../../utils/azure-ast-utils';
import { ignoreRequestParameterModelNameChanges } from '../../../common/models/rules/rule-ids';
import { getReport } from '../../../utils/common-utils';

function getRenamedParameterPairs(operationPairs: OperationPair[]) {
  const renamedList = operationPairs.map((operationPair) => {
    const apiNameToRenamedApiPairMapForParameters = getRenamedParameterTypeNameMap(
      operationPair.baseline.apiDetails!,
      operationPair.current.apiDetails!
    );
    return {
      path: operationPair.path,
      currentNode: operationPair.current.node,
      renamedParameters: apiNameToRenamedApiPairMapForParameters,
    };
  });
  return renamedList;
}

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);
  return createOperationRuleListener(
    ignoreRequestParameterModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const operationPairs = getOperationPairsWithSamePath(context, baselineOperationContexts);
      const renamedList = getRenamedParameterPairs(operationPairs);

      return {
        TSInterfaceDeclaration(node) {
          // TODO: get path in node to improve perf
          for (const renamed of renamedList) {
            if (node !== renamed.currentNode) {
              continue;
            }
            if (renamed.renamedParameters) {
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
            return;
          }
        },
      };
    }
  );
};
export default rule;
