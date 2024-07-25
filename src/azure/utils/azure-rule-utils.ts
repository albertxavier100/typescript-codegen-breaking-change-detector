import { ESLintUtils } from '@typescript-eslint/utils';
import { ruleDescriptions } from '../../common/config/rule-descriptions';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { RuleListener } from '@typescript-eslint/utils/eslint-utils';

// TODO: provide correct endpint
const endpoint = 'https://a.b.c/rules';
const createRule = ESLintUtils.RuleCreator((name) => `${endpoint}/${name}`);

export function createOperationRuleListener(
  id: string,
  createListener: (
    context: RuleContext<string, readonly unknown[]>,
  ) => RuleListener
) {
  const messages = { default: '{{name}}' };
  const defaultOptions: ReadonlyArray<unknown> = [];
  const rule = createRule({
    name: id,
    meta: {
      docs: {
        description: ruleDescriptions[id]
      },
      messages,
      schema: [],
      type: 'problem'
    },
    defaultOptions,
    create(context) {
      const listener = createListener(context);
      return listener;
    }
  });
  return rule;
}
