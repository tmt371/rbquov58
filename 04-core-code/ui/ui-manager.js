// File: 04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';
import { LeftPanelComponent } from './left-panel-component.js';
import { RightPanelComponent } from './right-panel-component.js';

export class UIManager {
    constructor(appElement, eventAggregator, calculationService) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;
        this.calculationService = calculationService; // [NEW] Store service

        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mSelButton = document.getElementById('key-m-sel');
        this.clearButton = document.getElementById('key-clear');
        this.leftPanelElement = document.getElementById('left-panel');

        const tableElement = document.getElementById('results-table');
        this.tableComponent = new TableComponent(tableElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.leftPanelComponent = new LeftPanelComponent(this.leftPanelElement);

        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            expandedClass: 'is-expanded',
            retractEventName: 'operationSuccessfulAutoHidePanel'
        });
        
        this.rightPanelComponent = new RightPanelComponent(
            document.getElementById('function-panel'),
            this.eventAggregator,
            this.calculationService // [NEW] Pass service down
        );

        this.notificationComponent = new NotificationComponent({
            containerElement: document.getElementById('toast-container'),
            eventAggregator: this.eventAggregator
        });

        this.dialogComponent = new DialogComponent({
            overlayElement: document.getElementById('confirmation-dialog-overlay'),
            eventAggregator: this.eventAggregator
        });

        this.initialize();
        this._initializeLeftPanelLayout();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this._initializeResizeObserver();
    }

    _initializeResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            // Recalculate position whenever the app's size changes, if the panel is expanded.
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._updateExpandedPanelPosition();
            }
        });
        // Observe the main app container for size changes.
        resizeObserver.observe(this.appElement);
    }

    _updateExpandedPanelPosition() {
        if (!this.leftPanelElement) return;

        const keyboardToggle = document.getElementById('panel-toggle');
        const typeKey = document.getElementById('key-type');

        if (!keyboardToggle || !typeKey) {
            console.error("One or more reference elements for panel positioning are missing.");
            return;
        }

        const keyboardToggleRect = keyboardToggle.getBoundingClientRect();
        const typeKeyRect = typeKey.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Calculate new position and size
        const newTop = keyboardToggleRect.bottom;
        const newWidth = typeKeyRect.left + (typeKeyRect.width / 2);
        const newHeight = viewportHeight - newTop;

        // Apply styles
        this.leftPanelElement.style.top = `${newTop}px`;
        this.leftPanelElement.style.width = `${newWidth}px`;
        this.leftPanelElement.style.height = `${newHeight}px`;
    }

    render(state) {
        const isDetailView = state.ui.currentView === 'DETAIL_CONFIG';
        this.appElement.classList.toggle('detail-view-active', isDetailView);

        // [NEW] Get the current product's data based on the new state structure.
        const currentProductKey = state.quoteData.currentProduct;
        const currentProductData = state.quoteData.products[currentProductKey];

        // The table component receives the full state and is responsible for extracting the items list itself.
        // This will be modified in the table-component.js file.
        this.tableComponent.render(state);

        // [REFACTORED] Pass the product-specific summary to the summary component.
        this.summaryComponent.render(currentProductData.summary, state.ui.isSumOutdated);

        // The left panel component also receives the full state objects.
        // It will be modified internally to read from the new structure.
        this.leftPanelComponent.render(state.ui, state.quoteData);
        
        // [MODIFIED] Pass the full state object to the right panel component.
        this.rightPanelComponent.render(state);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._scrollToActiveCell(state);
    }

    
    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            
            if (isExpanded) {
                this._adjustLeftPanelLayout();
            }
            
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);
        }
    }

    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiSelectMode, multiSelectSelectedIndexes } = state.ui;
        // [REFACTORED] Get items from the correct location in the new state structure.
        const currentProductKey = state.quoteData.currentProduct;
        const items = state.quoteData.products[currentProductKey].items;

        const isSingleRowSelected = selectedRowIndex !== null;
        
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) { insertDisabled = false; }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        let deleteDisabled = true;
        if (isMultiSelectMode) {
            if (multiSelectSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mSelDisabled = !isSingleRowSelected && !isMultiSelectMode;
        if (this.mSelButton) {
            this.mSelButton.disabled = mSelDisabled;
            this.mSelButton.style.backgroundColor = isMultiSelectMode ? '#f5c6cb' : '';
        }

        if (this.clearButton) this.clearButton.disabled = !isSingleRowSelected;
    }
    
    _scrollToActiveCell(state) {
        if (!state.ui.activeCell) return;
        const { rowIndex, column } = state.ui.activeCell;
        const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
        if (activeCellElement) {
            activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}