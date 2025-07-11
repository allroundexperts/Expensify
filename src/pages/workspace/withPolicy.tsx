import type {ComponentType, ForwardedRef, RefAttributes} from 'react';
import React, {forwardRef} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import useOnyx from '@hooks/useOnyx';
import type {PlatformStackRouteProp} from '@libs/Navigation/PlatformStackNavigation/types';
import type {AuthScreensParamList, ReimbursementAccountNavigatorParamList, SettingsNavigatorParamList, WorkspaceSplitNavigatorParamList} from '@navigation/types';
import {updateLastAccessedWorkspace} from '@userActions/Policy/Policy';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type * as OnyxTypes from '@src/types/onyx';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

type NavigatorsParamList = AuthScreensParamList & SettingsNavigatorParamList & ReimbursementAccountNavigatorParamList & WorkspaceSplitNavigatorParamList;

type PolicyRouteName =
    | typeof SCREENS.REIMBURSEMENT_ACCOUNT_ROOT
    | typeof SCREENS.WORKSPACE.INITIAL
    | typeof SCREENS.WORKSPACE.PROFILE
    | typeof SCREENS.WORKSPACE.MORE_FEATURES
    | typeof SCREENS.WORKSPACE.MEMBERS
    | typeof SCREENS.WORKSPACE.EXPENSIFY_CARD
    | typeof SCREENS.WORKSPACE.COMPANY_CARDS
    | typeof SCREENS.WORKSPACE.INVITE
    | typeof SCREENS.WORKSPACE.INVITE_MESSAGE
    | typeof SCREENS.WORKSPACE.INVITE_MESSAGE_ROLE
    | typeof SCREENS.WORKSPACE.WORKFLOWS_PAYER
    | typeof SCREENS.WORKSPACE.WORKFLOWS
    | typeof SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_NEW
    | typeof SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_EDIT
    | typeof SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_EXPENSES_FROM
    | typeof SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_APPROVER
    | typeof SCREENS.WORKSPACE.WORKFLOWS_AUTO_REPORTING_MONTHLY_OFFSET
    | typeof SCREENS.WORKSPACE.WORKFLOWS_AUTO_REPORTING_FREQUENCY
    | typeof SCREENS.WORKSPACE.MEMBER_DETAILS
    | typeof SCREENS.WORKSPACE.MEMBER_CUSTOM_FIELD
    | typeof SCREENS.WORKSPACE.MEMBER_NEW_CARD
    | typeof SCREENS.WORKSPACE.INVOICES
    | typeof SCREENS.WORKSPACE.OWNER_CHANGE_CHECK
    | typeof SCREENS.WORKSPACE.TAX_EDIT
    | typeof SCREENS.WORKSPACE.ADDRESS
    | typeof SCREENS.WORKSPACE.CATEGORIES_SETTINGS
    | typeof SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_SETTINGS
    | typeof SCREENS.WORKSPACE.DISTANCE_RATE_TAX_RATE_EDIT
    | typeof SCREENS.WORKSPACE.DISTANCE_RATE_TAX_RECLAIMABLE_ON_EDIT
    | typeof SCREENS.WORKSPACE.REPORT_FIELDS_CREATE
    | typeof SCREENS.WORKSPACE.REPORT_FIELDS_LIST_VALUES
    | typeof SCREENS.WORKSPACE.REPORT_FIELDS_EDIT_INITIAL_VALUE
    | typeof SCREENS.WORKSPACE.REPORT_FIELDS_VALUE_SETTINGS
    | typeof SCREENS.WORKSPACE.ACCOUNTING.CARD_RECONCILIATION
    | typeof SCREENS.WORKSPACE.RULES
    | typeof SCREENS.WORKSPACE.EXPENSIFY_CARD_ISSUE_NEW
    | typeof SCREENS.WORKSPACE.COMPANY_CARDS_ASSIGN_CARD;

type PolicyRoute = PlatformStackRouteProp<NavigatorsParamList, PolicyRouteName>;

function getPolicyIDFromRoute(route: PolicyRoute): string | undefined {
    return route?.params?.policyID;
}

type WithPolicyOnyxProps = {
    policy: OnyxEntry<OnyxTypes.Policy>;
    policyDraft: OnyxEntry<OnyxTypes.Policy>;
    isLoadingPolicy: boolean;
};

type WithPolicyProps = WithPolicyOnyxProps & {
    route: PolicyRoute;
};

const policyDefaultProps: WithPolicyOnyxProps = {
    policy: {} as OnyxTypes.Policy,
    policyDraft: {} as OnyxTypes.Policy,
    isLoadingPolicy: false,
};

/*
 * HOC for connecting a policy in Onyx corresponding to the policyID in route params
 */
export default function <TProps extends WithPolicyProps, TRef>(
    WrappedComponent: ComponentType<TProps & RefAttributes<TRef>>,
): React.ComponentType<Omit<TProps, keyof WithPolicyOnyxProps> & RefAttributes<TRef>> {
    function WithPolicy(props: Omit<TProps, keyof WithPolicyOnyxProps>, ref: ForwardedRef<TRef>) {
        const policyID = getPolicyIDFromRoute(props.route as PolicyRoute);
        const [hasLoadedApp] = useOnyx(ONYXKEYS.HAS_LOADED_APP, {canBeMissing: true});
        const [policy, policyResults] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {canBeMissing: true});
        const [policyDraft, policyDraftResults] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY_DRAFTS}${policyID}`, {canBeMissing: true});
        /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */
        const isLoadingPolicy = !hasLoadedApp || isLoadingOnyxValue(policyResults, policyDraftResults);

        if (policyID && policyID.length > 0) {
            updateLastAccessedWorkspace(policyID);
        }

        return (
            <WrappedComponent
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...(props as TProps)}
                policy={policy}
                policyDraft={policyDraft}
                isLoadingPolicy={isLoadingPolicy}
                ref={ref}
            />
        );
    }

    WithPolicy.displayName = `WithPolicy`;

    return forwardRef(WithPolicy);
}

export {policyDefaultProps};
export type {WithPolicyOnyxProps, WithPolicyProps};
