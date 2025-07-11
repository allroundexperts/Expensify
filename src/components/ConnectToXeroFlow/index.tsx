import React, {useEffect, useState} from 'react';
import RequireTwoFactorAuthenticationModal from '@components/RequireTwoFactorAuthenticationModal';
import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {getXeroSetupLink} from '@libs/actions/connections/Xero';
import {close} from '@libs/actions/Modal';
import Navigation from '@libs/Navigation/Navigation';
import {openLink} from '@userActions/Link';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {ConnectToXeroFlowProps} from './types';

function ConnectToXeroFlow({policyID}: ConnectToXeroFlowProps) {
    const {translate} = useLocalize();
    const {environmentURL} = useEnvironment();

    const [account] = useOnyx(ONYXKEYS.ACCOUNT, {canBeMissing: false});
    const is2FAEnabled = account?.requiresTwoFactorAuth;

    const [isRequire2FAModalOpen, setIsRequire2FAModalOpen] = useState(false);

    useEffect(() => {
        if (!is2FAEnabled) {
            setIsRequire2FAModalOpen(true);
            return;
        }
        openLink(getXeroSetupLink(policyID), environmentURL);
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, []);

    if (!is2FAEnabled) {
        return (
            <RequireTwoFactorAuthenticationModal
                onSubmit={() => {
                    setIsRequire2FAModalOpen(false);
                    close(() => Navigation.navigate(ROUTES.SETTINGS_2FA_ROOT.getRoute(ROUTES.POLICY_ACCOUNTING.getRoute(policyID), getXeroSetupLink(policyID))));
                }}
                onCancel={() => {
                    setIsRequire2FAModalOpen(false);
                }}
                isVisible={isRequire2FAModalOpen}
                description={translate('twoFactorAuth.twoFactorAuthIsRequiredDescription')}
            />
        );
    }
}

export default ConnectToXeroFlow;
