import { CreateOperationRule, OperationPair, ParseForESLintResult } from '../types';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import {
  getApiDetails,
  getRenamedParameterTypeNameMap,
  getRenamedResponseTypeNameMap,
} from '../../utils/azure-operation-utils';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { createOperationRuleListener } from '../../utils/azure-rule-utils';
import { devConsolelog } from '../../../utils/common-utils';
import { getGlobalScope } from '../../../utils/ast-utils';
import { ignoreRequestParameterModelNameChanges } from '../../../common/config/rule-ids';
import { logger } from '../../../logging/logger';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult) => {
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);
  return createOperationRuleListener(
    ignoreRequestParameterModelNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      if (!context.sourceCode.scopeManager) {
        logger.error(
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

      // check if any para's type's name is changed
      const renamedParameterMap = operationPairs.map((pair) =>
        getRenamedParameterTypeNameMap(pair.baseline.apiDetails!, pair.current.apiDetails!)
      );
      devConsolelog(
        `🚀 📍 file: ignore-request-parameter-model-name-changes.ts:48 📍 renamedParameterMap:\n`,
        renamedParameterMap
      );

      // check if any response's type's name is changed
      const renamedResponseMap = operationPairs.map((pair) =>
        getRenamedResponseTypeNameMap(pair.baseline.apiDetails!, pair.current.apiDetails!)
      );
      devConsolelog(
        `🚀 📍 file: ignore-request-parameter-model-name-changes.ts:57 📍 renamedResponseMap:\n`,
        renamedResponseMap
      );

      return {
        TSInterfaceDeclaration(node) {},
      };
    }
  );
};
export default rule;
