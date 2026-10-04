import { createSlice } from "@reduxjs/toolkit";
import apiService from "../../api/apiService";
import { formatAxiosErrorMessage } from "../../utils/common";
import { endPoints } from "../../api/endpoints";
import { apiUrlBuilder } from "../../utils/util";

const SocialIntegrationInitialState = {
    meta: {
        configuration: {
            isLoading: false,
            data: null,
            error: null,
        },
        updateConfiguration: {
            isLoading: false,
            data: null,
            error: null,
        },
        deleteConfiguration: {
            isLoading: false,
            data: null,
            error: null,
        },
    }
};

export const SocialSlice = createSlice({
    name: "socialintegration",
    initialState: { ...SocialIntegrationInitialState },
    reducers: {
        SocialConfigurationRequesting: (state) => {
            state.meta.configuration.isLoading = true;
        },
        SocialConfigurationSuccess: (state, action) => {
            state.meta.configuration.isLoading = false;
            state.meta.configuration.error = null;
            state.meta.configuration.data = action.payload.data.results;
        },
        SocialConfigurationError: (state, action) => {
            state.meta.configuration.isLoading = false;
            state.meta.configuration.error = action.payload;
        },
        SocialConfigurationReset: (state) => {
            state.meta.configuration = SocialIntegrationInitialState.meta.configuration;
        },

        SocialUpdateConfigurationRequesting: (state) => {
            state.meta.updateConfiguration.isLoading = true;
        },
        SocialUpdateConfigurationSuccess: (state, action) => {
            state.meta.updateConfiguration.isLoading = false;
            state.meta.updateConfiguration.error = null;
            state.meta.updateConfiguration.data = action?.payload?.data;
        },
        SocialUpdateConfigurationError: (state, action) => {
            state.meta.updateConfiguration.isLoading = false;
            state.meta.updateConfiguration.error = action.payload;
        },
        SocialUpdateConfigurationReset: (state) => {
            state.meta.updateConfiguration = SocialIntegrationInitialState.meta.configuration;
        },


        SocialDeleteConfigurationRequesting: (state) => {
            state.meta.deleteConfiguration.isLoading = true;
        },
        SocialDeleteConfigurationSuccess: (state) => {
            state.meta.deleteConfiguration.isLoading = false;
            state.meta.deleteConfiguration.error = null;
            state.meta.deleteConfiguration.data = "deleted";
        },
        SocialDeleteConfigurationError: (state, action) => {
            state.meta.deleteConfiguration.isLoading = false;
            state.meta.deleteConfiguration.data = null;
            state.meta.deleteConfiguration.error = action.payload;
        },
        SocialDeleteConfigurationReset: (state) => {
            state.meta.deleteConfiguration = SocialIntegrationInitialState.meta.deleteConfiguration;
        },
    }
});

export const SocialConfigurationAPI = (params = {}) => async (dispatch) => {
    dispatch(SocialConfigurationRequesting());
    apiService
        .get(endPoints.integration.social.config, {params})
        .then((response) => {
            dispatch(SocialConfigurationSuccess(response.data));
        })
        .catch((error) => {
            dispatch(SocialConfigurationError(formatAxiosErrorMessage(error)));
        });
};

export const SocialDeleteConfigurationAPI = (id) => async (dispatch) => {
    dispatch(SocialDeleteConfigurationRequesting());
    apiService
        .delete(apiUrlBuilder(endPoints.integration.social.config + `${id}/`), {})
        .then((response) => {
            dispatch(SocialDeleteConfigurationSuccess(response.data));
        })
        .catch((error) => {
            dispatch(SocialDeleteConfigurationError(formatAxiosErrorMessage(error)));
        });
};

export const SocialUpdatePageConfigurationAPI = (payload) => async (dispatch) => {
    dispatch(SocialUpdateConfigurationRequesting());
    apiService
        .put(apiUrlBuilder(endPoints.integration.social.pageConfig), payload)
        .then((response) => {
            dispatch(SocialUpdateConfigurationSuccess(response.data));
        })
        .catch((error) => {
            dispatch(SocialUpdateConfigurationError(formatAxiosErrorMessage(error)));
        });
};

// Export Actions
export const {
    SocialConfigurationRequesting,
    SocialConfigurationSuccess,
    SocialConfigurationError,
    SocialConfigurationReset,

    SocialDeleteConfigurationRequesting,
    SocialDeleteConfigurationSuccess,
    SocialDeleteConfigurationError,
    SocialDeleteConfigurationReset,

    SocialUpdateConfigurationRequesting,
    SocialUpdateConfigurationReset,
    SocialUpdateConfigurationError,
    SocialUpdateConfigurationSuccess,
} = SocialSlice.actions;

// Selector
export const SocialState = (state) => state.social;

// Reducer
export default SocialSlice.reducer;
