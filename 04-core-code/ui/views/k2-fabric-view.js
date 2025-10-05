// File: 04-core-code/ui/views/k2-fabric-view.js

/**
 * @fileoverview A dedicated sub-view for handling all logic related to the K2 (Fabric) tab.
 */
export class K2FabricView {
    constructor({ quoteService, uiService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;
        console.log("K2FabricView Initialized.");
    }

    /**
     * Handles the request to enter or exit the Fabric & Color editing mode.
     */
    handleFocusModeRequest() {
        const currentMode = this.uiService.getState().activeEditMode;
        const newMode = currentMode === 'K2' ? null : 'K2';

        if (newMode) {
            const items = this.quoteService.getItems();
            const { lfModifiedRowIndexes } = this.uiService.getState();
            const eligibleTypes = ['B2', 'B3', 'B4'];
            const hasConflict = items.some((item, index) => 
                eligibleTypes.includes(item.fabricType) && lfModifiedRowIndexes.has(index)
            );

            if (hasConflict) {
                this.eventAggregator.publish('showConfirmationDialog', {
                    message: 'Some eligible items (B2, B3, B4) have Light-Filter settings. Continuing will overwrite this data. Proceed?',
                    closeOnOverlayClick: false,
                    layout: [
                        [
                            { type: 'button', text: 'Continue', callback: () => this._enterFCMode(true) },
                            { type: 'button', text: 'Cancel', className: 'secondary', callback: () => {} }
                        ]
                    ]
                });
            } else {
                this._enterFCMode(false);
            }
        } else {
            this._exitAllK2Modes();
        }
    }

    _enterFCMode(isOverwriting) {
        if (isOverwriting) {
            const items = this.quoteService.getItems();
            const { lfModifiedRowIndexes } = this.uiService.getState();
            const indexesToClear = new Set();
            const eligibleTypes = ['B2', 'B3', 'B4'];
            items.forEach((item, index) => {
                if (eligibleTypes.includes(item.fabricType) && lfModifiedRowIndexes.has(index)) {
                    indexesToClear.add(index);
                }
            });
            if (indexesToClear.size > 0) {
                this.uiService.removeLFModifiedRows(indexesToClear);
            }
        }
        this.uiService.setActiveEditMode('K2');
        this._updatePanelInputsState(); 
        this.uiService.setActiveCell(null, null);
        this.publish();
    }

    handlePanelInputBlur({ type, field, value }) {
        const { lfSelectedRowIndexes } = this.uiService.getState();
        
        if (type === 'LF') {
            const fNameInput = document.querySelector('input[data-type="LF"][data-field="fabric"]');
            const fColorInput = document.querySelector('input[data-type="LF"][data-field="color"]');
            
            if (fNameInput && fColorInput && fNameInput.value && fColorInput.value) {
                this.quoteService.batchUpdateLFProperties(lfSelectedRowIndexes, fNameInput.value, fColorInput.value);
                this.uiService.addLFModifiedRows(lfSelectedRowIndexes);
            }
        } else {
            this.quoteService.batchUpdatePropertyByType(type, field, value);
        }
        
        this.publish();
    }

    handlePanelInputEnter() {
        const inputs = Array.from(document.querySelectorAll('.panel-input:not([disabled])'));
        const activeElement = document.activeElement;
        const currentIndex = inputs.indexOf(activeElement);
        const nextInput = inputs[currentIndex + 1];

        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            if (activeElement.dataset.type === 'LF' || (activeElement.dataset.type !== 'LF' && this.uiService.getState().activeEditMode === 'K2')) {
                 const { lfSelectedRowIndexes } = this.uiService.getState();
                 const fNameInput = document.querySelector('input[data-type="LF"][data-field="fabric"]');
                 const fColorInput = document.querySelector('input[data-type="LF"][data-field="color"]');

                if (fNameInput && fColorInput && fNameInput.value && fColorInput.value && lfSelectedRowIndexes.size > 0) {
                    this.quoteService.batchUpdateLFProperties(lfSelectedRowIndexes, fNameInput.value, fColorInput.value);
                    this.uiService.addLFModifiedRows(lfSelectedRowIndexes);
                }
            }
            
            this._exitAllK2Modes();
        }
    }

    handleSequenceCellClick({ rowIndex }) {
        const { activeEditMode } = this.uiService.getState();

        if (activeEditMode === 'K2_LF_SELECT' || activeEditMode === 'K2_LF_DELETE_SELECT') {
            const item = this.quoteService.getItems()[rowIndex];
            
            if (activeEditMode === 'K2_LF_DELETE_SELECT') {
                const { lfModifiedRowIndexes } = this.uiService.getState();
                if (!lfModifiedRowIndexes.has(rowIndex)) {
                    this.eventAggregator.publish('showNotification', { message: 'Only items with a Light-Filter setting (pink background) can be selected for deletion.', type: 'error' });
                    return;
                }
            }

            const eligibleTypes = ['B2', 'B3', 'B4'];
            if (activeEditMode === 'K2_LF_SELECT' && !eligibleTypes.includes(item.fabricType)) {
                this.eventAggregator.publish('showNotification', { message: 'Only items with TYPE "B2", "B3", or "B4" can be selected.', type: 'error' });
                return;
            }
            this.uiService.toggleLFSelection(rowIndex);
            
            if (activeEditMode === 'K2_LF_SELECT') {
                this._updatePanelInputsState();
            }
            this.publish();
        }
    }

    handleLFEditRequest() {
        const { activeEditMode } = this.uiService.getState();
        
        if (activeEditMode === 'K2_LF_SELECT') {
            this._exitAllK2Modes();
        } else {
            this.uiService.setActiveEditMode('K2_LF_SELECT');
            this.eventAggregator.publish('showNotification', { message: 'Please select items with TYPE \'B2\', \'B3\', or \'B4\' to edit.' });
            this.publish();
        }
    }

    handleLFDeleteRequest() {
        const { activeEditMode } = this.uiService.getState();
        
        if (activeEditMode === 'K2_LF_DELETE_SELECT') {
            const { lfSelectedRowIndexes } = this.uiService.getState();
            if (lfSelectedRowIndexes.size > 0) {
                this.quoteService.removeLFProperties(lfSelectedRowIndexes);
                this.uiService.removeLFModifiedRows(lfSelectedRowIndexes);
                this.eventAggregator.publish('showNotification', { message: 'Light-Filter settings have been cleared.' });
            }
            this._exitAllK2Modes();
        } else {
            this.uiService.setActiveEditMode('K2_LF_DELETE_SELECT');
            this.eventAggregator.publish('showNotification', { message: 'Please select the roller blinds for which you want to cancel the Light-Filter fabric setting. After selection, click the LF-Del button again.' });
            this.publish();
        }
    }

    _exitAllK2Modes() {
        this.uiService.setActiveEditMode(null);
        this.uiService.clearRowSelection();
        this.uiService.clearLFSelection();
        this._updatePanelInputsState();
        this.publish();
    }

    _updatePanelInputsState() {
        const { activeEditMode, lfSelectedRowIndexes } = this.uiService.getState();
        const items = this.quoteService.getItems();
        const presentTypes = new Set(items.map(item => item.fabricType).filter(Boolean));
        
        const allPanelInputs = document.querySelectorAll('.panel-input');
        let firstEnabledInput = null;
        
        if (activeEditMode === 'K2') {
            allPanelInputs.forEach(input => {
                const type = input.dataset.type;
                const field = input.dataset.field;

                if (type !== 'LF') {
                    const isEnabled = presentTypes.has(type);
                    input.disabled = !isEnabled;

                    if (isEnabled) {
                        if (!firstEnabledInput) {
                            firstEnabledInput = input;
                        }
                        const itemWithData = items.find(item => item.fabricType === type && typeof item[field] === 'string');
                        input.value = itemWithData ? itemWithData[field] : '';
                    } else {
                        input.value = '';
                    }
                } else {
                    input.disabled = true;
                }
            });

            if (firstEnabledInput) {
                setTimeout(() => {
                    firstEnabledInput.focus();
                    firstEnabledInput.select();
                }, 50);
            }
        } else if (activeEditMode === 'K2_LF_SELECT') {
            allPanelInputs.forEach(input => {
                const isLFRow = input.dataset.type === 'LF';
                const hasSelection = lfSelectedRowIndexes.size > 0;
                input.disabled = !(isLFRow && hasSelection);
            });
        } else {
             allPanelInputs.forEach(input => {
                input.disabled = true;
                input.value = '';
            });
        }
    }
    
    /**
     * This method is called by the main DetailConfigView when the K2 tab becomes active.
     */
    activate() {
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'fabric', 'color']);
    }
}