## API Report File for "@azure/arm-networkanalytics"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Client } from '@azure-rest/core-client';
import { HttpResponse } from '@azure-rest/core-client';
import { OperationOptions } from '@azure-rest/core-client';
import { OperationState } from '@azure/core-lro';
import { Paged } from '@azure/core-paging';
import { PollerLike } from '@azure/core-lro';
import { RawHttpHeaders } from '@azure/core-rest-pipeline';
import { RequestParameters } from '@azure-rest/core-client';
import { StreamableMethod } from '@azure-rest/core-client';

// @public
export function $delete(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, options?: DataProductsDeleteOptionalParams): PollerLike<OperationState<void>, void>;

// @public (undocumented)
export function _$deleteDeserialize(result: DataProductsDelete202Response | DataProductsDelete204Response | DataProductsDeleteDefaultResponse | DataProductsDeleteLogicalResponse): Promise<void>;

// @public (undocumented)
export function _$deleteSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, options?: DataProductsDeleteOptionalParams): StreamableMethod<DataProductsDelete202Response | DataProductsDelete204Response | DataProductsDeleteDefaultResponse | DataProductsDeleteLogicalResponse>;

// @public
export function addUserRole(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: RoleAssignmentCommonProperties_2, options?: DataProductsAddUserRoleOptionalParams): Promise<RoleAssignmentDetail_2>;

// @public (undocumented)
export function _addUserRoleDeserialize(result: DataProductsAddUserRole200Response | DataProductsAddUserRoleDefaultResponse): Promise<RoleAssignmentDetail_2>;

// @public (undocumented)
export function _addUserRoleSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: RoleAssignmentCommonProperties_2, options?: DataProductsAddUserRoleOptionalParams): StreamableMethod<DataProductsAddUserRole200Response | DataProductsAddUserRoleDefaultResponse>;

// @public
export function create(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, resource: DataProduct_2, options?: DataProductsCreateOptionalParams): PollerLike<OperationState<DataProduct_2>, DataProduct_2>;

// @public (undocumented)
export function _createDeserialize(result: DataProductsCreate200Response | DataProductsCreate201Response | DataProductsCreateDefaultResponse | DataProductsCreateLogicalResponse): Promise<DataProduct_2>;

// @public (undocumented)
export function _createSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, resource: DataProduct_2, options?: DataProductsCreateOptionalParams): StreamableMethod<DataProductsCreate200Response | DataProductsCreate201Response | DataProductsCreateDefaultResponse | DataProductsCreateLogicalResponse>;

// @public
export function generateStorageAccountSasToken(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: AccountSas_2, options?: DataProductsGenerateStorageAccountSasTokenOptionalParams): Promise<AccountSasToken>;

// @public (undocumented)
export function _generateStorageAccountSasTokenDeserialize(result: DataProductsGenerateStorageAccountSasToken200Response | DataProductsGenerateStorageAccountSasTokenDefaultResponse): Promise<AccountSasToken>;

// @public (undocumented)
export function _generateStorageAccountSasTokenSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: AccountSas_2, options?: DataProductsGenerateStorageAccountSasTokenOptionalParams): StreamableMethod<DataProductsGenerateStorageAccountSasToken200Response | DataProductsGenerateStorageAccountSasTokenDefaultResponse>;

// @public
export function get(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, options?: DataProductsGetOptionalParams): Promise<DataProduct_2>;

// @public (undocumented)
export function _getDeserialize(result: DataProductsGet200Response | DataProductsGetDefaultResponse): Promise<DataProduct_2>;

// @public (undocumented)
export function _getSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, options?: DataProductsGetOptionalParams): StreamableMethod<DataProductsGet200Response | DataProductsGetDefaultResponse>;

// @public
export function listByResourceGroup(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, options?: DataProductsListByResourceGroupOptionalParams): PagedAsyncIterableIterator<DataProduct_2>;

// @public (undocumented)
export function _listByResourceGroupDeserialize(result: DataProductsListByResourceGroup200Response | DataProductsListByResourceGroupDefaultResponse): Promise<DataProductListResult>;

// @public (undocumented)
export function _listByResourceGroupSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, options?: DataProductsListByResourceGroupOptionalParams): StreamableMethod<DataProductsListByResourceGroup200Response | DataProductsListByResourceGroupDefaultResponse>;

// @public
export function listBySubscription(context: NetworkAnalyticsContext, subscriptionId: string, options?: DataProductsListBySubscriptionOptionalParams): PagedAsyncIterableIterator<DataProduct_2>;

// @public (undocumented)
export function _listBySubscriptionDeserialize(result: DataProductsListBySubscription200Response | DataProductsListBySubscriptionDefaultResponse): Promise<DataProductListResult>;

// @public (undocumented)
export function _listBySubscriptionSend(context: NetworkAnalyticsContext, subscriptionId: string, options?: DataProductsListBySubscriptionOptionalParams): StreamableMethod<DataProductsListBySubscription200Response | DataProductsListBySubscriptionDefaultResponse>;

// @public
export function listRolesAssignments(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: Record<string, any>, options?: DataProductsListRolesAssignmentsOptionalParams): Promise<ListRoleAssignments>;

// @public (undocumented)
export function _listRolesAssignmentsDeserialize(result: DataProductsListRolesAssignments200Response | DataProductsListRolesAssignmentsDefaultResponse): Promise<ListRoleAssignments>;

// @public (undocumented)
export function _listRolesAssignmentsSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: Record<string, any>, options?: DataProductsListRolesAssignmentsOptionalParams): StreamableMethod<DataProductsListRolesAssignments200Response | DataProductsListRolesAssignmentsDefaultResponse>;

// @public
export function removeUserRole(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: RoleAssignmentDetail_2, options?: DataProductsRemoveUserRoleOptionalParams): Promise<void>;

// @public (undocumented)
export function _removeUserRoleDeserialize(result: DataProductsRemoveUserRole204Response | DataProductsRemoveUserRoleDefaultResponse): Promise<void>;

// @public (undocumented)
export function _removeUserRoleSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: RoleAssignmentDetail_2, options?: DataProductsRemoveUserRoleOptionalParams): StreamableMethod<DataProductsRemoveUserRole204Response | DataProductsRemoveUserRoleDefaultResponse>;

// @public
export function rotateKey(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: KeyVaultInfo_2, options?: DataProductsRotateKeyOptionalParams): Promise<void>;

// @public (undocumented)
export function _rotateKeyDeserialize(result: DataProductsRotateKey204Response | DataProductsRotateKeyDefaultResponse): Promise<void>;

// @public (undocumented)
export function _rotateKeySend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, body: KeyVaultInfo_2, options?: DataProductsRotateKeyOptionalParams): StreamableMethod<DataProductsRotateKey204Response | DataProductsRotateKeyDefaultResponse>;

// @public
export function update(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, properties: DataProductUpdate_2, options?: DataProductsUpdateOptionalParams): PollerLike<OperationState<DataProduct_2>, DataProduct_2>;

// @public (undocumented)
export function _updateDeserialize(result: DataProductsUpdate200Response | DataProductsUpdate202Response | DataProductsUpdateDefaultResponse | DataProductsUpdateLogicalResponse): Promise<DataProduct_2>;

// @public (undocumented)
export function _updateSend(context: NetworkAnalyticsContext, subscriptionId: string, resourceGroupName: string, dataProductName: string, properties: DataProductUpdate_2, options?: DataProductsUpdateOptionalParams): StreamableMethod<DataProductsUpdate200Response | DataProductsUpdate202Response | DataProductsUpdateDefaultResponse | DataProductsUpdateLogicalResponse>;

// (No @packageDocumentation comment for this package)

```
