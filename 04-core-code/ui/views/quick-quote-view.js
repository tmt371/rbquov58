// File: 04-core-code/ui/views/quick-quote-view.js

/**
 * @fileoverview View module responsible for all logic related to the Quick Quote screen.
 */
export class QuickQuoteView {
    constructor({ quoteService, calculationService, focusService, fileService, uiService, eventAggregator, productFactory, configManager, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.calculationService = calculationService;
        this.focusService = focusService;
        this.fileService = fileService;
        this.uiService = uiService;
        this.eventAggregator = eventAggregator;
        this.productFactory = productFactory;
        this.configManager = configManager;
        this.publish = publishStateChangeCallback;
        this.currentProduct = 'rollerBlind';
    }

    // [REMOVED] The handleToggleMultiSelectMode method is no longer needed as multi-select is now the default.

    /**
     * [REFACTORED] Handles sequence cell clicks. Logic is simplified to always toggle multi-select.
     */
    handleSequenceCellClick({ rowIndex }) {
        const items = this.quoteService.getItems();
        const item = items[rowIndex];
        const isLastRowEmpty = (rowIndex === items.length - 1) && (!item.width && !item.height);

        if (isLastRowEmpty) {
            this.eventAggregator.publish('showNotification', { message: "Cannot select the final empty row.", type: 'error' });
            return;
        }
        this.uiService.toggleMultiSelectSelection(rowIndex);
        this.publish();
    }

    /**
     * [REFACTORED] Added a guard clause to prevent deleting multiple items at once.
     */
    handleDeleteRow() {
        const { multiSelectSelectedIndexes } = this.uiService.getState();

        if (multiSelectSelectedIndexes.length > 1) {
            this.eventAggregator.publish('showConfirmationDialog', {
                message: '一次只能刪除一支捲簾。',
                layout: [[{ type: 'button', text: '確定', colspan: 3 }]]
            });
            return;
        }

        const selectedIndex = multiSelectSelectedIndexes.length > 0 ? multiSelectSelectedIndexes[0] : null;

        if (selectedIndex === null) return;

        this.quoteService.deleteRow(selectedIndex);
        this.uiService.clearMultiSelectSelection(); // Clear selection after deletion
        this.uiService.setSumOutdated(true);
        this.focusService.focusAfterDelete();
        
        this.publish();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    /**
     * [REFACTORED] Added a guard clause to ensure insertion is only performed on a single selection.
     */
    handleInsertRow() {
        const { multiSelectSelectedIndexes } = this.uiService.getState();

        if (multiSelectSelectedIndexes.length !== 1) {
            this.eventAggregator.publish('showConfirmationDialog', {
                message: '插入新捲簾僅能於單一項次之下執行。',
                layout: [[{ type: 'button', text: '確定', colspan: 3 }]]
            });
            return;
        }
        
        const selectedIndex = multiSelectSelectedIndexes[0];
        const items = this.quoteService.getItems();
        const isLastRow = selectedIndex === items.length - 1;
        if (isLastRow) {
             this.eventAggregator.publish('showNotification', { message: "Cannot insert after the last row.", type: 'error' });
             return;
        }
        const nextItem = items[selectedIndex + 1];
        const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
        if (isNextRowEmpty) {
            this.eventAggregator.publish('showNotification', { message: "Cannot insert before an empty row.", type: 'error' });
            return;
        }

        const newRowIndex = this.quoteService.insertRow(selectedIndex);
        this.uiService.clearMultiSelectSelection(); // Clear old selection
        this.uiService.setActiveCell(newRowIndex, 'width');
        this.publish();
        this.eventAggregator.publish('operationSuccessfulAutoHidePanel');
    }

    handleNumericKeyPress({ key }) {
        if (!isNaN(parseInt(key))) {
            this.uiService.appendInputValue(key);
        } else if (key === 'DEL') {
            this.uiService.deleteLastInputChar();
        } else if (key === 'W' || key === 'H') {
            this.focusService.focusFirstEmptyCell(key === 'W' ? 'width' : 'height');
        } else if (key === 'ENT') {
            this._commitValue();
            return;
        }
        this.publish();
    }

    _commitValue() {
        const { inputValue, inputMode, activeCell } = this.uiService.getState();
        const value = inputValue === '' ? null : parseInt(inputValue, 10);
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        const validationRules = productStrategy.getValidationRules();
        const rule = validationRules[inputMode];

        if (rule && value !== null && (isNaN(value) || value < rule.min || value > rule.max)) {
            this.eventAggregator.publish('showNotification', { message: `${rule.name} must be between ${rule.min} and ${rule.max}.`, type: 'error' });
            this.uiService.clearInputValue();
            this.publish();
            return;
        }
        const changed = this.quoteService.updateItemValue(activeCell.rowIndex, activeCell.column, value);
        if (changed) {
            this.uiService.setSumOutdated(true);
        }
        this.focusService.focusAfterCommit();
    }

    handleSaveToFile() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.saveToJson(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }

    handleExportCSV() {
        const quoteData = this.quoteService.getQuoteData();
        const result = this.fileService.exportToCsv(quoteData);
        const notificationType = result.success ? 'info' : 'error';
        this.eventAggregator.publish('showNotification', { message: result.message, type: notificationType });
    }
    
    handleReset() {
        if (window.confirm("This will clear all data. Are you sure?")) {
            this.quoteService.reset();
            this.uiService.reset();
            this.eventAggregator.publish('showNotification', { message: 'Quote has been reset.' });
        }
    }
    
    handleClearRow() {
        const { multiSelectSelectedIndexes } = this.uiService.getState();
        const selectedIndex = multiSelectSelectedIndexes.length === 1 ? multiSelectSelectedIndexes[0] : null;

        if (selectedIndex === null) {
            this.eventAggregator.publish('showNotification', { message: 'Please select a single row to clear.', type: 'error' });
            return;
        }
        this.focusService.focusAfterClear(selectedIndex); // Pass selectedIndex
        this.quoteService.clearRow(selectedIndex);
        this.uiService.clearMultiSelectSelection();
        this.uiService.setSumOutdated(true);
    }
    
    handleMoveActiveCell({ direction }) {
        this.focusService.moveActiveCell(direction);
        this.publish();
    }
    
    handleTableCellClick({ rowIndex, column }) {
        const item = this.quoteService.getItems()[rowIndex];
        if (!item) return;

        this.uiService.clearMultiSelectSelection();

        if (column === 'width' || column === 'height') {
            this.uiService.setActiveCell(rowIndex, column);
            this.uiService.setInputValue(item[column]);
        } else if (column === 'TYPE') {
            this.uiService.setActiveCell(rowIndex, column);
            const changedIndexes = this.quoteService.cycleItemType(rowIndex);
            if (changedIndexes.length > 0) {
                this.quoteService.removeLFModifiedRows(changedIndexes);
                this.uiService.setSumOutdated(true);
            }
        }
        this.publish();
    }
    
    handleCycleType() {
        const items = this.quoteService.getItems();
        const eligibleItems = items.filter(item => item.width && item.height);
        if (eligibleItems.length === 0) return;
        
        const TYPE_SEQUENCE = this.configManager.getFabricTypeSequence();
        if (TYPE_SEQUENCE.length === 0) return;

        const firstType = eligibleItems[0].fabricType || TYPE_SEQUENCE[TYPE_SEQUENCE.length - 1];
        const currentIndex = TYPE_SEQUENCE.indexOf(firstType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        const changedIndexes = this.quoteService.batchUpdateFabricType(nextType);
        if (changedIndexes.length > 0) {
            this.quoteService.removeLFModifiedRows(changedIndexes);
            this.uiService.setSumOutdated(true);
        }
    }

    _showFabricTypeDialog(callback, dialogTitle = 'Select a fabric type:') {
        const fabricTypes = this.configManager.getFabricTypeSequence();
        if (fabricTypes.length === 0) return;

        const layout = fabricTypes.map(type => {
            const matrix = this.configManager.getPriceMatrix(type);
            const name = matrix ? matrix.name : 'Unknown';

            return [
                { type: 'button', text: type, callback: () => callback(type), colspan: 1 },
                { type: 'text', text: name, colspan: 2 }
            ];
        });

        layout.push([
            { type: 'text', text: '', colspan: 2 },
            { type: 'button', text: 'Cancel', className: 'secondary cancel-cell', callback: () => {}, colspan: 1 }
        ]);

        this.eventAggregator.publish('showConfirmationDialog', {
            message: dialogTitle,
            layout: layout,
            position: 'bottomThird'
        });
    }

    handleTypeCellLongPress({ rowIndex }) {
        const item = this.quoteService.getItems()[rowIndex];
        if (!item || (!item.width && !item.height)) {
            this.eventAggregator.publish('showNotification', { message: 'Cannot set type for an empty row.', type: 'error' });
            return;
        }
        this._showFabricTypeDialog((newType) => {
            const changedIndexes = this.quoteService.setItemType(rowIndex, newType);
            if (changedIndexes.length > 0) {
                this.quoteService.removeLFModifiedRows(changedIndexes);
                this.uiService.setSumOutdated(true);
            }
            return changedIndexes.length > 0;
        }, `Set fabric type for Row #${rowIndex + 1}:`);
    }

    handleTypeButtonLongPress() {
        this._showFabricTypeDialog((newType) => {
            const changedIndexes = this.quoteService.batchUpdateFabricType(newType);
            if (changedIndexes.length > 0) {
                this.quoteService.removeLFModifiedRows(changedIndexes);
                this.uiService.setSumOutdated(true);
            }
            return changedIndexes.length > 0;
        }, 'Set fabric type for ALL rows:');
    }

    handleMultiTypeSet() {
        const { multiSelectSelectedIndexes } = this.uiService.getState();

        if (multiSelectSelectedIndexes.length === 0) {
            this.eventAggregator.publish('showNotification', { message: 'Please select one or more rows to set the fabric type.', type: 'error' });
            return;
        }

        const title = `Set fabric type for ${multiSelectSelectedIndexes.length} selected rows:`;
        this._showFabricTypeDialog((newType) => {
            const changedIndexes = this.quoteService.batchUpdateFabricTypeForSelection(multiSelectSelectedIndexes, newType);
            if (changedIndexes.length > 0) {
                this.quoteService.removeLFModifiedRows(changedIndexes);
                this.uiService.clearMultiSelectSelection(); // Clear selection after applying
                this.uiService.setSumOutdated(true);
            }
            return changedIndexes.length > 0;
        }, title);
    }

    handleCalculateAndSum() {
        const currentQuoteData = this.quoteService.getQuoteData();
        const productStrategy = this.productFactory.getProductStrategy(this.currentProduct);
        const { updatedQuoteData, firstError } = this.calculationService.calculateAndSum(currentQuoteData, productStrategy);

        this.quoteService.setQuoteData(updatedQuoteData);

        if (firstError) {
            this.uiService.setSumOutdated(true);
            this.eventAggregator.publish('showNotification', { message: firstError.message, type: 'error' });
            this.uiService.setActiveCell(firstError.rowIndex, firstError.column);
        } else {
            this.uiService.setSumOutdated(false);
        }
    }

    handleSaveThenLoad() {
        this.handleSaveToFile();
        this.eventAggregator.publish('triggerFileLoad');
    }
}