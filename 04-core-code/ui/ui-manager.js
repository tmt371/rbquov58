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
        this.calculationService = calculationService;

        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        
        // Buttons are now managed by their respective components/handlers
        // This makes UIManager a purer orchestrator of rendering.
        
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
            this.calculationService
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
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
        this._initializeResizeObserver();
    }

    _initializeResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            if (this.leftPanelElement.classList.contains('is-expanded')) {
                this._updateExpandedPanelPosition();
            }
        });
        resizeObserver.observe(this.appElement);
    }

    _updateExpandedPanelPosition() {
        if (!this.leftPanelElement || !this.numericKeyboardPanel) return;

        const key7 = this.numericKeyboardPanel.querySelector('#key-7');
        const key0 = this.numericKeyboardPanel.querySelector('#key-0');
        const typeKey = this.numericKeyboardPanel.querySelector('#key-type');

        if (!key7 || !key0 || !typeKey) {
            console.error("One or more reference elements for panel positioning are missing.");
            return;
        }

        const key7Rect = key7.getBoundingClientRect();
        const key0Rect = key0.getBoundingClientRect();
        const typeKeyRect = typeKey.getBoundingClientRect();

        const newTop = key7Rect.top;
        const newWidth = typeKeyRect.left + (typeKeyRect.width / 2);
        const newHeight = key0Rect.bottom - key7Rect.top;

        this.leftPanelElement.style.top = `${newTop}px`;
        this.leftPanelElement.style.width = `${newWidth}px`;
        this.leftPanelElement.style.height = `${newHeight}px`;

        this.leftPanelElement.style.setProperty('--left-panel-width', `${newWidth}px`);
    }

    render(state) {
        const isDetailView = state.ui.currentView === 'DETAIL_CONFIG';
        this.appElement.classList.toggle('detail-view-active', isDetailView);

        const currentProductKey = state.quoteData.currentProduct;
        const currentProductData = state.quoteData.products[currentProductKey];

        this.tableComponent.render(state);
        this.summaryComponent.render(currentProductData.summary, state.ui.isSumOutdated);
        this.leftPanelComponent.render(state.ui, state.quoteData);
        this.rightPanelComponent.render(state);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._scrollToActiveCell(state);
    }

    _updateLeftPanelState(currentView) {
        if (this.leftPanelElement) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanelElement.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                setTimeout(() => this._updateExpandedPanelPosition(), 0);
            }
        }
    }

    /**
     * [REFACTORED] Updates button states based on the length of the multi-select array.
     */
    _updateButtonStates(state) {
        const { multiSelectSelectedIndexes } = state.ui;
        const selectionCount = multiSelectSelectedIndexes.length;
        
        const currentProductKey = state.quoteData.currentProduct;
        const items = state.quoteData.products[currentProductKey].items;

        const insertButton = document.getElementById('f1-key-insert');
        const deleteButton = document.getElementById('f1-key-delete');
        const mSetButton = document.getElementById('key-m-set'); // The new button
        const clearButton = document.getElementById('key-clear');

        // Insert is only enabled when exactly ONE row is selected.
        if (insertButton) {
            let insertDisabled = true;
            if (selectionCount === 1) {
                const selectedIndex = multiSelectSelectedIndexes[0];
                const isLastRow = selectedIndex === items.length - 1;
                if (!isLastRow) {
                    const nextItem = items[selectedIndex + 1];
                    const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                    if (!isNextRowEmpty) {
                        insertDisabled = false;
                    }
                }
            }
            insertButton.disabled = insertDisabled;
        }

        // Delete is enabled when ONE OR MORE rows are selected.
        if (deleteButton) {
            deleteButton.disabled = selectionCount === 0;
        }
        
        // M-SET (new) and T-SET (old) are enabled when ONE OR MORE rows are selected.
        if (mSetButton) {
            mSetButton.disabled = selectionCount === 0;
        }
        
        // Clear is only enabled when exactly ONE row is selected.
        if (clearButton) {
            clearButton.disabled = selectionCount !== 1;
        }
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