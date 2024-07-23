import { AST_NODE_TYPES, ESLintUtils, TSESTree as t } from '@typescript-eslint/utils';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';
import { logger } from '../logging/logger';

function getOperationNames(program: SourceCode.Program) {
  const getRoutesDeclaration = (statement: t.ProgramStatement) =>
    (statement as t.ExportNamedDeclaration)?.declaration as t.TSInterfaceDeclaration;
  const getRoutesName = (statement: t.ProgramStatement) => getRoutesDeclaration(statement)?.id?.name;
  const routesDeclarations = program.body
    .filter((statement) => {
      return getRoutesName(statement) === 'Routes';
    })
    .map((statement) => {
      return getRoutesDeclaration(statement);
    });
  if (routesDeclarations.length !== 1) {
    const message = `Failed to find "Routes", found ${routesDeclarations.length} "Routes"`;
    logger.error(message);
    throw new Error(message);
  }
  const routes = routesDeclarations[0];
  const operationNames = routes.body.body.map((call) => {
    const callSignature = call as t.TSCallSignatureDeclaration;
    const returnType = callSignature?.returnType?.typeAnnotation as t.TSTypeReference;
    const operationName = (returnType.typeName as t.Identifier).name;
    return operationName;
  });
  return new Set<string>(operationNames);
}

const endpoint = 'https://typescript-eslint.io/rules';
export const createRule = ESLintUtils.RuleCreator((name) => `${endpoint}/${name}`);
export default createRule({
  name: 'rest-level-client-breaking-change-rule',
  meta: {
    docs: {
      description:
        'Rest level client breaking change rule based on inline usage, i.e. assume request and response types are not used.'
    },
    messages: {
      'ignore-operation-name': '{{name}}'
    },
    schema: [],
    type: 'problem'
  },
  defaultOptions: [],
  create(context) {
    const ast = context.sourceCode.ast;
    const operationNames = getOperationNames(ast);
    console.log('opname', operationNames);

    return {
      TSInterfaceDeclaration(node) {
        if (operationNames.has(node.id.name)) {
          context.report({ node: node, messageId: 'ignore-operation-name', data: { name: node.id.name } });
        }
      }
    };
  }
});
