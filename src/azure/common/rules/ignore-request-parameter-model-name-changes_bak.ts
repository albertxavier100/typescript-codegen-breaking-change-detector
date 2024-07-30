import { CreateOperationRule, OperationContext, OperationPair, ParseForESLintResult, RenameMessage } from '../types';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils';
import { getOperationPairsWithSamePath, getRenamedParameterTypeNameMap } from '../../utils/azure-operation-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { getGlobalScope } from '../../../utils/ast-utils';
import { ignoreRequestParameterModelNameChanges } from '../../../common/models/rules/rule-ids';
import { logger } from '../../../logging/logger';
import { renameRuleMessageConverter } from '../../../common/models/rules/rule-messages';

function getRenamedParameterPairs(operationPairs: OperationPair[]) {
  const renamedList = operationPairs.map((operationPair) => {
    const apiNameToRenamedApiPairMapForParameters = getRenamedParameterTypeNameMap(
      operationPair.baseline.apiDetails!,
      operationPair.current.apiDetails!
    );
    // const apiNameToRenamedApiPairMapForResponses = getRenamedResponseTypeNameMap(
    //   operationPair.baseline.apiDetails!,
    //   operationPair.current.apiDetails!
    // );
    return {
      path: operationPair.path,
      currentNode: operationPair.current.node,
      renamedParameters: apiNameToRenamedApiPairMapForParameters,
      // renamedResponses: apiNameToRenamedApiPairMapForResponses,
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
                  const message = renameRuleMessageConverter.stringify({
                    from: apiPair.baseline,
                    to: apiPair.current,
                    type: 'request',
                  });
                  context.report({ messageId: 'default', node, data: { message } });
                });
              });
            }
            // if (renamed.renamedResponses) {
            //   renamed.renamedResponses.forEach((apiPairs) => {
            //     apiPairs.forEach((apiPair) => {
            //       const message = renameRuleMessageConverter.stringify({
            //         id: ignoreRequestParameterModelNameChanges,
            //         from: apiPair.baseline,
            //         to: apiPair.current,
            //         type: 'response',
            //       });
            //       context.report({ messageId: 'default', node, data: { message } });
            //     });
            //   });
            // }
            return;
          }
        },
      };
    }
  );
};
export default rule;
