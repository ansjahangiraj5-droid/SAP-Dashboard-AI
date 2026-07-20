/**
 * AI Smart Dashboard Builder — Component
 * Root UIComponent bootstrapped by ComponentSupport.
 */
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "ai/dashboard/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("ai.dashboard.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * Lifecycle: called once when the component is initialised.
         * Creates global device model and initialises the router.
         */
        init: function () {
            // Call parent init first
            UIComponent.prototype.init.apply(this, arguments);

            // Set device model so views can react to screen size
            this.setModel(models.createDeviceModel(), "device");

            // Set empty application state model
            this.setModel(models.createAppStateModel(), "appState");

            // Initialise router defined in manifest.json
            this.getRouter().initialize();
        },

        /**
         * Return the content density class based on device type.
         * Used by views to set compact / cozy mode.
         * @returns {string} CSS class name
         */
        getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (!Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }
    });
});
