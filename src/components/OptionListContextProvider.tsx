import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useOnyx} from 'react-native-onyx';
import usePrevious from '@hooks/usePrevious';
import {createOptionFromReport, createOptionList} from '@libs/OptionsListUtils';
import type {OptionList, SearchOption} from '@libs/OptionsListUtils';
import {isSelfDM} from '@libs/ReportUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, Report} from '@src/types/onyx';
import {usePersonalDetails} from './OnyxProvider';

type OptionsListContextProps = {
    /** List of options for reports and personal details */
    options: OptionList;
    /** Function to initialize the options */
    initializeOptions: () => void;
    /** Flag to check if the options are initialized */
    areOptionsInitialized: boolean;
    /** Function to reset the options */
    resetOptions: () => void;
};

type OptionsListProviderProps = {
    /** Actual content wrapped by this component */
    children: React.ReactNode;
};

const OptionsListContext = createContext<OptionsListContextProps>({
    options: {
        reports: [],
        personalDetails: [],
    },
    initializeOptions: () => {},
    areOptionsInitialized: false,
    resetOptions: () => {},
});

const isEqualPersonalDetail = (prevPersonalDetail: PersonalDetails, personalDetail: PersonalDetails) =>
    prevPersonalDetail?.firstName === personalDetail?.firstName &&
    prevPersonalDetail?.lastName === personalDetail?.lastName &&
    prevPersonalDetail?.login === personalDetail?.login &&
    prevPersonalDetail?.displayName === personalDetail?.displayName;

function OptionsListContextProvider({children}: OptionsListProviderProps) {
    const areOptionsInitialized = useRef(false);
    const [options, setOptions] = useState<OptionList>({
        reports: [],
        personalDetails: [],
    });
    const [preferredLocale] = useOnyx(ONYXKEYS.NVP_PREFERRED_LOCALE, {canBeMissing: true});
    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {canBeMissing: true});

    const personalDetails = usePersonalDetails();
    const prevPersonalDetails = usePrevious(personalDetails);

    /**
     * This effect is used to update the options list when reports change.
     */
    useEffect(() => {
        // there is no need to update the options if the options are not initialized
        if (!areOptionsInitialized.current || !reports) {
            return;
        }
        // Since reports updates can happen in bulk, and some reports depend on other reports, we need to recreate the whole list from scratch.
        const newReports = createOptionList(personalDetails, reports).reports;

        setOptions((prevOptions) => {
            const newOptions = {
                ...prevOptions,
                reports: newReports,
            };

            return newOptions;
        });

        // eslint-disable-next-line react-compiler/react-compiler
    }, [reports, personalDetails, preferredLocale]);

    /**
     * This effect is used to update the options list when personal details change.
     */
    useEffect(() => {
        // there is no need to update the options if the options are not initialized
        if (!areOptionsInitialized.current) {
            return;
        }

        if (!personalDetails) {
            return;
        }

        // Handle initial personal details load. This initialization is required here specifically to prevent
        // UI freezing that occurs when resetting the app from the troubleshooting page.
        if (!prevPersonalDetails) {
            const {personalDetails: newPersonalDetailsOptions, reports: newReports} = createOptionList(personalDetails, reports);
            setOptions((prevOptions) => ({
                ...prevOptions,
                personalDetails: newPersonalDetailsOptions,
                reports: newReports,
            }));
            return;
        }

        const newReportOptions: Array<{
            replaceIndex: number;
            newReportOption: SearchOption<Report>;
        }> = [];

        Object.keys(personalDetails).forEach((accountID) => {
            const prevPersonalDetail = prevPersonalDetails?.[accountID];
            const personalDetail = personalDetails[accountID];

            if (prevPersonalDetail && personalDetail && isEqualPersonalDetail(prevPersonalDetail, personalDetail)) {
                return;
            }

            Object.values(reports ?? {})
                .filter((report) => !!Object.keys(report?.participants ?? {}).includes(accountID) || (isSelfDM(report) && report?.ownerAccountID === Number(accountID)))
                .forEach((report) => {
                    if (!report) {
                        return;
                    }
                    const newReportOption = createOptionFromReport(report, personalDetails);
                    const replaceIndex = options.reports.findIndex((option) => option.reportID === report.reportID);
                    newReportOptions.push({
                        newReportOption,
                        replaceIndex,
                    });
                });
        });

        // since personal details are not a collection, we need to recreate the whole list from scratch
        const newPersonalDetailsOptions = createOptionList(personalDetails).personalDetails;

        setOptions((prevOptions) => {
            const newOptions = {...prevOptions};
            newOptions.personalDetails = newPersonalDetailsOptions;
            newReportOptions.forEach((newReportOption) => (newOptions.reports[newReportOption.replaceIndex] = newReportOption.newReportOption));
            return newOptions;
        });

        // This effect is used to update the options list when personal details change so we ignore all dependencies except personalDetails
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [personalDetails]);

    const loadOptions = useCallback(() => {
        const optionLists = createOptionList(personalDetails, reports);
        setOptions({
            reports: optionLists.reports,
            personalDetails: optionLists.personalDetails,
        });
    }, [personalDetails, reports]);

    const initializeOptions = useCallback(() => {
        loadOptions();
        areOptionsInitialized.current = true;
    }, [loadOptions]);

    const resetOptions = useCallback(() => {
        if (!areOptionsInitialized.current) {
            return;
        }

        areOptionsInitialized.current = false;
        setOptions({
            reports: [],
            personalDetails: [],
        });
    }, []);

    return (
        <OptionsListContext.Provider // eslint-disable-next-line react-compiler/react-compiler
            value={useMemo(() => ({options, initializeOptions, areOptionsInitialized: areOptionsInitialized.current, resetOptions}), [options, initializeOptions, resetOptions])}
        >
            {children}
        </OptionsListContext.Provider>
    );
}

const useOptionsListContext = () => useContext(OptionsListContext);

// Hook to use the OptionsListContext with an initializer to load the options
const useOptionsList = (options?: {shouldInitialize: boolean}) => {
    const {shouldInitialize = true} = options ?? {};
    const {initializeOptions, options: optionsList, areOptionsInitialized, resetOptions} = useOptionsListContext();
    const [isLoadingApp] = useOnyx(ONYXKEYS.IS_LOADING_APP, {canBeMissing: true});

    useEffect(() => {
        if (!shouldInitialize || areOptionsInitialized || isLoadingApp) {
            return;
        }

        initializeOptions();
    }, [shouldInitialize, initializeOptions, areOptionsInitialized, isLoadingApp]);

    return {
        initializeOptions,
        options: optionsList,
        areOptionsInitialized,
        resetOptions,
    };
};

export default OptionsListContextProvider;

export {useOptionsList, OptionsListContext};
