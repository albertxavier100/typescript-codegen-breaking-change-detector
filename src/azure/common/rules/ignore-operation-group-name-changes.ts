import { CreateOperationRule, ParseForESLintResult, RenameMessage } from '../types.js';
import { RuleListener, getParserServices } from '@typescript-eslint/utils/eslint-utils';
import {
  convertToMorphNode,
  findAllDeclarationsUnder,
  getGlobalScope,
  getTypeReferencesUnder,
  isInterfaceDeclarationNode,
  isNodeTypeAssignableTo,
  isTypeAliasDeclarationNode,
  tryFindDeclaration,
} from '../../../utils/ast-utils.js';
import { getOperationContexsFromEsParseResult, restLevelClient } from '../../utils/azure-ast-utils.js';

import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { TSESTree } from '@typescript-eslint/types';
import { createOperationRuleListener } from '../../utils/azure-rule-utils.js';
import {
  findDeclarationOfTypeReferenceForRoutes,
  ignoreOperationGroupNameChanges,
} from '../../../common/models/rules/rule-ids.js';
import { getReport } from '../../../utils/common-utils.js';

const rule: CreateOperationRule = (baselineParsedResult: ParseForESLintResult | undefined) => {
  if (!baselineParsedResult)
    throw new Error(`ParseForESLintResult is required in ${ignoreOperationGroupNameChanges} rule`);
  const baselineOperationContexts = getOperationContexsFromEsParseResult(baselineParsedResult);

  return createOperationRuleListener(
    ignoreOperationGroupNameChanges,
    (context: RuleContext<string, readonly unknown[]>): RuleListener => {
      const currentService = getParserServices(context);
      const currentGlobalScope = getGlobalScope(context.sourceCode.scopeManager);
      const currentOperationContexts = restLevelClient.findOperationsContext(currentGlobalScope, currentService);
      // debug
      {
        currentOperationContexts.forEach((c) => {
          console.log('..c..', c.name, c.node.id.name);
          const moNode = convertToMorphNode(c.node, currentService);
          const result = findAllDeclarationsUnder(moNode, currentGlobalScope, currentService);
          result.interfaces.forEach((i) => console.log('..--i--', i.getName()));
          result.typeAliases.forEach((t) => console.log('..--t--', t.getName()));
        });
        // currentOperationContexts.forEach((c) => {
        //   console.log('\nname', c.name);
        //   const moNode = convertToMorphNode(c.node, currentService);
        //   const types = getTypeReferencesUnder(moNode);
        //   types.forEach((t) => {
        //     const x = tryFindDeclaration(t.getText(), currentGlobalScope, isInterfaceDeclarationNode);
        //     if (x) {
        //       console.log('xxx ---', t.getText());
        //       console.log('xxx ???', x.id.name);
        //       const moNodeX = convertToMorphNode(x, currentService);
        //       const xx = getTypeReferencesUnder(moNodeX);
        //       xx.forEach((a) => {
        //         console.log('   aaa ---', a.getText());
        //       });
        //     }
        //     const y = tryFindDeclaration(t.getText(), currentGlobalScope, isTypeAliasDeclarationNode);
        //     if (y) {
        //       console.log('yyy ---', t.getText());
        //       console.log('yyy ???', y?.id.name);
        //     }
        //   });
        // });
      }
      //
      const renamedOperationContexts = new Map<
        string,
        { node: TSESTree.TSInterfaceDeclaration; from: string; to: string }
      >();
      currentOperationContexts.forEach((currentOperationContext, path) => {
        const isPathChange = !baselineOperationContexts.has(path);
        if (isPathChange) {
          return;
        }
        const baselineOperationContext = baselineOperationContexts.get(path)!;
        const isOperationNameChange = currentOperationContext.name !== baselineOperationContext.name;
        if (!isOperationNameChange) return;
        const isTypeCompatible = isNodeTypeAssignableTo(
          currentOperationContext.node,
          baselineOperationContext.node,
          context
        );
        if (isTypeCompatible) {
          renamedOperationContexts.set(path, {
            node: currentOperationContext.node,
            from: baselineOperationContext.name,
            to: currentOperationContext.name,
          });
        }
      });

      return {
        TSInterfaceDeclaration(node) {
          // TODO: get path in node to improve perf
          for (const [_, value] of renamedOperationContexts) {
            if (value.node !== node) continue;
            getReport(context)(<RenameMessage>{
              id: ignoreOperationGroupNameChanges,
              from: value.from,
              to: value.to,
              type: 'operation-group',
            });
            return;
          }
        },
      };
    }
  );
};
export default rule;
