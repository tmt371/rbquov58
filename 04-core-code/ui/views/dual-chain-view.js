// File: 04-core-code/ui/views/dual-chain-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the Dual/Chain tab.
 */
export class DualChainView {
    constructor({ quoteService, uiService, calculationService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.calculationService = calculationService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;
        console.log("DualChainView Initialized.");
    }

    /**
     * Handles the toggling of modes (dual, chain).
     */
    handleModeChange({ mode }) {
        const currentMode = this.uiService.getState().dualChainMode;
        const newMode = currentMode === mode ? null : mode;

        if (currentMode === 'dual') {
            const isValid = this.recalculateDualPrice();
            if (!isValid) {
                return;
            }
        }
        
        this.uiService.setDualChainMode(newMode);

        if (newMode === 'dual') {
            // When entering dual mode, clear any previous price from the central state
            this.quoteService.updateAccessorySummary({ dualCostSum: null });
        }
        
        if (!newMode) {
            this.uiService.setTargetCell(null);
            this.uiService.clearDualChainInputValue();
        }

        this.publish();
    }

    /**
     * Calculates the price for Dual brackets and updates the central quoteData.
     */
    recalculateDualPrice() {
        const items = this.quoteService.getItems();
        const productType = this.quoteService.getCurrentProductType();

        const selectedIndexes = items.reduce((acc, item, index) => {
            if (item.dual === 'D') {
                acc.push(index);
            }
            return acc;
        }, []);

        const dualCount = selectedIndexes.length;

        if (dualCount % 2 !== 0) {
            this.eventAggregator.publish('showNotification', {
                message: 'The total count of Dual Brackets (D) must be an even number. Please correct the selection.',
                type: 'error'
            });
            return false;
        }

        for (let i = 0; i < dualCount; i += 2) {
            if (selectedIndexes[i+1] !== selectedIndexes[i] + 1) {
                this.eventAggregator.publish('showNotification', {
                    message: 'Dual Brackets (D) must be set on adjacent items. Please check your selection.',
                    type: 'error'
                });
                return false;
            }
        }
        
        const price = this.calculationService.calculateAccessoryPrice(productType, 'dual', { items });
        // [FIX] Update the central state directly.
        this.quoteService.updateAccessorySummary({ dualCostSum: price });
        this._updateSummaryAccessoriesTotal();
        return true;
    }

    /**
     * Handles the Enter key press in the chain input box.
     */
    handleChainEnterPressed({ value }) {
        const { targetCell: currentTarget } = this.uiService.getState();
        if (!currentTarget) return;

        const valueAsNumber = Number(value);
        if (value !== '' && (!Number.isInteger(valueAsNumber) || valueAsNumber <= 0)) {
            this.eventAggregator.publish('showNotification', {
                message: 'Only positive integers are allowed.',
                type: 'error'
            });
            return;
        }

        const valueToSave = value === '' ? null : valueAsNumber;
        this.quoteService.updateItemProperty(currentTarget.rowIndex, currentTarget.column, valueToSave);
        
        this.uiService.setTargetCell(null);
        this.uiService.clearDualChainInputValue();
        this.publish();
    }

    /**
     * Handles clicks on table cells when a mode is active.
     */
    handleTableCellClick({ rowIndex, column }) {
        const { dualChainMode } = this.uiService.getState();
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        if (dualChainMode === 'dual' && column === 'dual') {
            const newValue = item.dual === 'D' ? '' : 'D';
            this.quoteService.updateItemProperty(rowIndex, 'dual', newValue);
            this.publish();
        }

        if (dualChainMode === 'chain' && column === 'chain') {
            this.uiService.setTargetCell({ rowIndex, column: 'chain' });
            this.uiService.setDualChainInputValue(item.chain || '');
            this.publish();

            setTimeout(() => {
                const inputBox = document.getElementById('k4-input-display');
                inputBox?.focus();
                inputBox?.select();
            }, 50); 
        }
    }
    
    /**
     * This method is called by the main DetailConfigView when the K5 tab becomes active.
     */
    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location', 'dual', 'chain']);
        // [FIX] No longer copies state. Just ensures the total is up-to-date.
        this._updateSummaryAccessoriesTotal();
        this.publish(); // Publish state change to ensure UI re-renders with correct totals.
    }

    /**
     * Calculates the total of all accessories and updates the UI service.
     * [FIX] Reads all values from the single source of truth (quoteData) and sums all six components.
     */
    _updateSummaryAccessoriesTotal() {
        const quoteData = this.quoteService.getQuoteData();
        const accessories = quoteData.products[quoteData.currentProduct]?.summary?.accessories;

        if (!accessories) {
            this.uiService.setSummaryAccessoriesTotal(0);
            return;
        }

        const dualPrice = accessories.dualCostSum || 0;
        const winderPrice = accessories.winderCostSum || 0;
        const motorPrice = accessories.motorCostSum || 0;
        const remotePrice = accessories.remoteCostSum || 0;
        const chargerPrice = accessories.chargerCostSum || 0;
        const cordPrice = accessories.cordCostSum || 0;

        const total = dualPrice + winderPrice + motorPrice + remotePrice + chargerPrice + cordPrice;
        
        this.uiService.setSummaryAccessoriesTotal(total);
    }
}