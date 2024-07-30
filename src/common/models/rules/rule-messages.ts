import { RenameMessage, RuleMessageContext } from '../../../azure/common/types';

export const renameRuleMessageConverter: RuleMessageContext<RenameMessage> = {
  parse(content: string): RenameMessage {
    const message = JSON.parse(content) as RenameMessage;
    return message;
  },
  stringify(message: RenameMessage): string {
    return JSON.stringify(message);
  },
};
