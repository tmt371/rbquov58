// File: 04-core-code/services/state-service.js

/**
 * @fileoverview Service for managing the entire application state.
 * Acts as the single source of truth.
 * State should be read from here, and all updates must be dispatched through this service.
 */
export class StateService {
    /**
     * @param {object} initialState The initial state of the entire application.
     * @param {EventAggregator} eventAggregator The event aggregator instance.
     */
    constructor({ initialState, eventAggregator }) {
        this._state = initialState;
        this.eventAggregator = eventAggregator;
        console.log("StateService Finalized.");
    }

    /**
     * Returns the current state. Since all state updates are now immutable,
     * we can safely return a direct reference to the state object.
     * @returns {object} The current application state.
     */
    getState() {
        return this._state;
    }

    /**
     * Updates the state with a new state object and publishes an internal event.
     * @param {object} newState The new state.
     */
    updateState(newState) {
        this._state = newState;
        // Publishing the new state directly, as getState() no longer deep copies.
        this.eventAggregator.publish('_internalStateUpdated', this._state);
    }
}