// File: 04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ eventAggregator, uiService, quoteService, fileService, quickQuoteView, detailConfigView, calculationService, productFactory }) {
        this.eventAggregator = eventAggregator;
        this.uiService = uiService;
        this.quoteService = quoteService;
        this.fileService = fileService;
        this.quickQuoteView = quickQuoteView;
        this.detailConfigView = detailConfigView;
        this.calculationService = calculationService;
        this.productFactory = productFactory;

        this.f2InputSequence = [
            'f2-b10-wifi-qty', 'f2-b13-delivery-qty', 'f2-b14-install-qty',
            'f2-b15-removal-qty', 'f2-b17-mul-times', 'f2-b18-discount'
        ];

        this.autoSaveTimerId = null;
        console.log("AppController (Refactored with grouped subscriptions) Initialized.");
        this.initialize();
    }

    initialize() {
        this._subscribeQuickQuoteEvents();
        this._subscribeDetailViewEvents();
        this._subscribeGlobalEvents();
        this._subscribeF2Events();
        
        this._startAutoSave();
    }
    
    _subscribeQuickQuoteEvents() {
        const delegate = (handlerName, ...args) => this.quickQuoteView[handlerName](...args);

        this.eventAggregator.subscribe('numericKeyPressed', (data) => delegate('handleNumericKeyPress', data));
        this.eventAggregator.subscribe('userRequestedInsertRow', () => delegate('handleInsertRow'));
        this.eventAggregator.subscribe('userRequestedDeleteRow', () => delegate('handleDeleteRow'));
        this.eventAggregator.subscribe('userRequestedSave', () => delegate('handleSaveToFile'));
        this.eventAggregator.subscribe('userRequestedExportCSV', () => delegate('handleExportCSV'));
        this.eventAggregator.subscribe('userRequestedReset', () => delegate('handleReset', initialState.ui));
        this.eventAggregator.subscribe('userRequestedClearRow', () => delegate('handleClearRow'));
        this.eventAggregator.subscribe('userMovedActiveCell', (data) => delegate('handleMoveActiveCell', data));
        this.eventAggregator.subscribe('userRequestedCycleType', () => delegate('handleCycleType'));
        this.eventAggregator.subscribe('userRequestedCalculateAndSum', () => delegate('handleCalculateAndSum'));
        this.eventAggregator.subscribe('userToggledMultiSelectMode', () => delegate('handleToggleMultiSelectMode'));
        this.eventAggregator.subscribe('userChoseSaveThenLoad', () => delegate('handleSaveThenLoad'));
        this.eventAggregator.subscribe('typeCellLongPressed', (data) => delegate('handleTypeCellLongPress', data));
        this.eventAggregator.subscribe('typeButtonLongPressed', (data) => delegate('handleTypeButtonLongPress', data));
        this.eventAggregator.subscribe('userRequestedMultiTypeSet', () => delegate('handleMultiTypeSet'));
    }

    _subscribeDetailViewEvents() {
        const delegate = (handlerName, data) => {
            if (this.uiService.getState().currentView === 'DETAIL_CONFIG') {
                this.detailConfigView[handlerName](data);
            }
        };
        
        this.eventAggregator.subscribe('tableCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleTableCellClick(data);
            } else {
                this.detailConfigView.handleTableCellClick(data);
            }
        });
         this.eventAggregator.subscribe('sequenceCellClicked', (data) => {
            const currentView = this.uiService.getState().currentView;
            if (currentView === 'QUICK_QUOTE') {
                this.quickQuoteView.handleSequenceCellClick(data);
            } else {
                this.detailConfigView.handleSequenceCellClick(data);
            }
        });

        // Detail Config View Specific Events
        this.eventAggregator.subscribe('userRequestedFocusMode', (data) => delegate('handleFocusModeRequest', data));
        this.eventAggregator.subscribe('panelInputEnterPressed', (data) => delegate('handlePanelInputEnter', data));
        this.eventAggregator.subscribe('panelInputBlurred', (data) => delegate('handlePanelInputBlur', data));
        this.eventAggregator.subscribe('locationInputEnterPressed', (data) => delegate('handleLocationInputEnter', data));
        this.eventAggregator.subscribe('userRequestedLFEditMode', () => delegate('handleLFEditRequest'));
        this.eventAggregator.subscribe('userRequestedLFDeleteMode', () => delegate('handleLFDeleteRequest'));
        this.eventAggregator.subscribe('userToggledK3EditMode', () => delegate('handleToggleK3EditMode'));
        this.eventAggregator.subscribe('userRequestedBatchCycle', (data) => delegate('handleBatchCycle', data));
        
        this.eventAggregator.subscribe('dualChainModeChanged', (data) => delegate('handleDualChainModeChange', data));
        this.eventAggregator.subscribe('chainEnterPressed', (data) => delegate('handleChainEnterPressed', data));
        this.eventAggregator.subscribe('driveModeChanged', (data) => delegate('handleDriveModeChange', data));
        this.eventAggregator.subscribe('accessoryCounterChanged', (data) => delegate('handleAccessoryCounterChange', data));

        // [REMOVED] The subscription for the complex remote selection flow is no longer needed.
        // this.eventAggregator.subscribe('userInitiatedRemoteSelection', () => this._handleRemoteSelection());
    }

    _subscribeGlobalEvents() {
        this.eventAggregator.subscribe('userNavigatedToDetailView', () => this._handleNavigationToDetailView());
        this.eventAggregator.subscribe('userNavigatedToQuickQuoteView', () => this._handleNavigationToQuickQuoteView());
        this.eventAggregator.subscribe('userSwitchedTab', (data) => this._handleTabSwitch(data));
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
        
        this.eventAggregator.subscribe('costDiscountEntered', (data) => this._handleCostDiscountEntered(data));
    }

    _subscribeF2Events() {
        this.eventAggregator.subscribe('f2TabActivated', () => this._handleF2TabActivation());
        this.eventAggregator.subscribe('f2ValueChanged', (data) => this._handleF2ValueChange(data));
        this.eventAggregator.subscribe('f2InputEnterPressed', (data) => this._focusNextF2Input(data.id));
        this.eventAggregator.subscribe('toggleFeeExclusion', (data) => this._handleToggleFeeExclusion(data));
    }
    
    _handleCostDiscountEntered({ percentage }) {
        this.quoteService.setCostDiscount(percentage);
    }
    
    // [REMOVED] All methods related to the multi-step remote selection dialog are now obsolete and have been removed.
    // _cancelRemoteSelection() { ... }
    // _setSelectedRemoteAndActivate(costKey) { ... }
    // _showAlphaRemoteDialog() { ... }
    // _showLinxRemoteDialog() { ... }
    // _handleRemoteSelection() { ... }

    _handleToggleFeeExclusion({ feeType }) {
        this.uiService.toggleF2FeeExclusion(feeType);
        this._calculateF2Summary();
    }

    _handleF2ValueChange({ id, value }) {
        const numericValue = value === '' ? null : parseFloat(value);
        let keyToUpdate = null;

        switch (id) {
            case 'f2-b10-wifi-qty': keyToUpdate = 'wifiQty'; break;
            case 'f2-b13-delivery-qty': keyToUpdate = 'deliveryQty'; break;
            case 'f2-b14-install-qty': keyToUpdate = 'installQty'; break;
            case 'f2-b15-removal-qty': keyToUpdate = 'removalQty'; break;
            case 'f2-b17-mul-times': keyToUpdate = 'mulTimes'; break;
            case 'f2-b18-discount': keyToUpdate = 'discount'; break;
        }

        if (keyToUpdate) {
            this.uiService.setF2Value(keyToUpdate, numericValue);
            this._calculateF2Summary();
        }
    }

    _focusNextF2Input(currentId) {
        const currentIndex = this.f2InputSequence.indexOf(currentId);
        if (currentIndex > -1) {
            const nextIndex = (currentIndex + 1) % this.f2InputSequence.length;
            const nextElementId = this.f2InputSequence[nextIndex];
            this.eventAggregator.publish('focusElement', { elementId: nextElementId });
        }
    }
    
    _handleF2TabActivation() {
        const productStrategy = this.productFactory.getProductStrategy(this.quoteService.getCurrentProductType());
        const { updatedQuoteData } = this.calculationService.calculateAndSum(this.quoteService.getQuoteData(), productStrategy);
        this.quoteService.quoteData = updatedQuoteData;
        
        this.detailConfigView.driveAccessoriesView.recalculateAllDriveAccessoryPrices();
        this.detailConfigView.dualChainView.recalculateDualPrice();

        this._calculateF2Summary();
        
        this.eventAggregator.publish('focusElement', { elementId: 'f2-b10-wifi-qty' });
    }

    _calculateF2Summary() {
        const currentProductKey = this.quoteService.getQuoteData().currentProduct;
        const productSummary = this.quoteService.getQuoteData().products[currentProductKey].summary;
        const totalSumFromQuickQuote = productSummary.totalSum || 0;

        const uiState = this.uiService.getState();
        this.uiService.setF2Value('totalSumForRbTime', totalSumFromQuickQuote);

        const f2State = uiState.f2;
        const UNIT_PRICES = {
            wifi: 200,
            delivery: 100,
            install: 20,
            removal: 20
        };
        
        const winderPrice = uiState.summaryWinderPrice || 0;
        const dualPrice = uiState.dualPrice || 0;
        const motorPrice = uiState.summaryMotorPrice || 0;
        const remotePrice = uiState.summaryRemotePrice || 0;
        const chargerPrice = uiState.summaryChargerPrice || 0;
        const cordPrice = uiState.summaryCordPrice || 0;

        const wifiQty = f2State.wifiQty || 0;
        const deliveryQty = f2State.deliveryQty || 0;
        const installQty = f2State.installQty || 0;
        const removalQty = f2State.removalQty || 0;
        const mulTimes = f2State.mulTimes || 0;
        const discount = f2State.discount || 0;

        const wifiSum = wifiQty * UNIT_PRICES.wifi;
        const deliveryFee = deliveryQty * UNIT_PRICES.delivery;
        const installFee = installQty * UNIT_PRICES.install;
        const removalFee = removalQty * UNIT_PRICES.removal;

        const acceSum = winderPrice + dualPrice;
        const eAcceSum = motorPrice + remotePrice + chargerPrice + cordPrice + wifiSum;
        const surchargeFee =
            (f2State.deliveryFeeExcluded ? 0 : deliveryFee) +
            (f2State.installFeeExcluded ? 0 : installFee) +
            (f2State.removalFeeExcluded ? 0 : removalFee);

        const firstRbPrice = totalSumFromQuickQuote * mulTimes;
        const disRbPriceValue = firstRbPrice * (1 - (discount / 100));
        const disRbPrice = Math.round(disRbPriceValue * 100) / 100;

        const sumPrice = acceSum + eAcceSum + surchargeFee + disRbPrice;

        this.uiService.setF2Value('wifiSum', wifiSum);
        this.uiService.setF2Value('deliveryFee', deliveryFee);
        this.uiService.setF2Value('installFee', installFee);
        this.uiService.setF2Value('removalFee', removalFee);
        this.uiService.setF2Value('acceSum', acceSum);
        this.uiService.setF2Value('eAcceSum', eAcceSum);
        this.uiService.setF2Value('surchargeFee', surchargeFee);
        this.uiService.setF2Value('firstRbPrice', firstRbPrice);
        this.uiService.setF2Value('disRbPrice', disRbPrice);
        this.uiService.setF2Value('sumPrice', sumPrice);

        this._publishStateChange();
    }
    
    _handleNavigationToDetailView() {
        const currentView = this.uiService.getState().currentView;
        if (currentView === 'QUICK_QUOTE') {
            this.uiService.setCurrentView('DETAIL_CONFIG');
            this.detailConfigView.activateTab('k1-tab'); 
        } else {
            this.uiService.setCurrentView('QUICK_QUOTE');
            this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
            this._publishStateChange();
        }
    }

    _handleNavigationToQuickQuoteView() {
        this.uiService.setCurrentView('QUICK_QUOTE');
        this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
        this._publishStateChange();
    }

    _handleTabSwitch({ tabId }) {
        this.detailConfigView.activateTab(tabId);
    }

    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);
        if (result.success) {
            this.quoteService.quoteData = result.data;
            this.uiService.reset(initialState.ui);
            this.uiService.setSumOutdated(true);
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }
    
    _getFullState() {
        return {
            ui: this.uiService.getState(),
            quoteData: this.quoteService.getQuoteData()
        };
    }
    
    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() {
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    _startAutoSave() {
        if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); }
        this.autoSaveTimerId = setInterval(() => this._handleAutoSave(), AUTOSAVE_INTERVAL_MS);
    }

    _handleAutoSave() {
        try {
            const items = this.quoteService.getItems();
            if (!items) return;
            const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            if (hasContent) {
                const dataToSave = JSON.stringify(this.quoteService.getQuoteData());
                localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}