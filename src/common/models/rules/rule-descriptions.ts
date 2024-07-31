import {
  ignoreOperationInterfaceNameChanges,
  ignoreRequestParameterModelNameChanges,
  ignoreResponseModelNameChanges,
} from './rule-ids.js';

function createDescription(action: string) {
  return `Rest level client breaking change rule to ${action} based on inline usage (assuming request and response types are not used).`;
}

export const ruleDescriptions: { [ruleId: string]: string } = {
  [ignoreOperationInterfaceNameChanges]: createDescription('to ignore the changes in the name of operation interface'),
  [ignoreRequestParameterModelNameChanges]: createDescription('to ignore changes in the request parameter name'),
  [ignoreResponseModelNameChanges]: createDescription('to ignore changes in the reponse name'),
};
