import { ParserServices } from '@typescript-eslint/parser';
import { TSESTree } from '@typescript-eslint/utils';
import { RuleModule, RuleListener } from '@typescript-eslint/utils/eslint-utils';
import type { VisitorKeys } from '@typescript-eslint/visitor-keys';
import type { Scope, ScopeManager } from '@typescript-eslint/scope-manager';
import { TSESTreeOptions } from '@typescript-eslint/typescript-estree';
import { AST } from '@typescript-eslint/typescript-estree';

export interface ParseForESLintResult {
  ast: TSESTree.Program & {
    range?: [number, number];
    tokens?: TSESTree.Token[];
    comments?: TSESTree.Comment[];
  };
  services: ParserServices;
  visitorKeys: VisitorKeys;
  scopeManager: ScopeManager;
}

export interface ParseAndGenerateServicesResult<T extends TSESTreeOptions> {
  ast: AST<T>;
  services: ParserServices;
}

export interface CreateOperationRule {
  (oldResult: ParseForESLintResult): RuleModule<'default', readonly unknown[], RuleListener>;
}

export interface OperationContext {
  name: string;
  path: string;
  node: TSESTree.TSInterfaceDeclaration;
}