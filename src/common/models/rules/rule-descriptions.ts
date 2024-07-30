import { ignoreRequestParameterModelNameChanges, ignore_Operation_RequestParameter_Response_Rename } from './rule-ids';

function createDescription(action: string) {
  return `Rest level client breaking change rule to ${action} based on inline usage (assuming request and response types are not used).`;
}

export const ruleDescriptions: { [ruleId: string]: string } = {
  [ignore_Operation_RequestParameter_Response_Rename]: createDescription(
    'to ignore the changes in the name of operation interface'
  ),
  [ignoreRequestParameterModelNameChanges]: createDescription(
    'to ignore changes in the helper model of request parameters'
  ),
};
