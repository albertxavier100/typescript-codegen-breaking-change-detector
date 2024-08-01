import { CreateOperationRule, ParseForESLintResult, RenameMessage } from '../types.js';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { devConsolelog, getReport } from '../../../utils/common-utils.js';
import { getGlobalScope, isChildOfInterface, isNodeTypeAssignableTo } from '../../../utils/ast-utils.js';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import { findDeclarationOfTypeReferenceForRoutes } from '../../../common/models/rules/rule-ids.js';

const rule: CreateOperationRule = (_: ParseForESLintResult | undefined) => {
  return createOperationRuleListener(
    findDeclarationOfTypeReferenceForRoutes,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      return {
        TSTypeReference(node) {
          const isUsedInRoutes = isChildOfInterface('Routes', node);
          if (isUsedInRoutes)
            console.log(`🚀 ✶ isUsedInRoutes ✶ 🦄:`, isUsedInRoutes, (node.typeName as TSESTree.Identifier)?.name);
          // TODO: typealias
        },
      };
    }
  );
};
export default rule;
