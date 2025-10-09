import { QuoteService } from './quote-service.js';
import { StateService } from './state-service.js';
import { EventAggregator } from '../event-aggregator.js';
import { initialState } from '../config/initial-state.js';

// --- Mock Dependencies ---
const getMockInitialItem = () => ({
    itemId: 'item-1',
    width: null, height: null, fabricType: null, linePrice: null,
    location: '', fabric: '', color: '', over: '',
    oi: '', lr: '', dual: '', chain: null, winder: '', motor: ''
});

const mockProductStrategy = {
    getInitialItemData: () => ({ ...getMockInitialItem(), itemId: `mock-uuid-${Math.random()}` })
};

const mockProductFactory = {
    getProductStrategy: () => mockProductStrategy
};

const mockConfigManager = {
    getFabricTypeSequence: () => ['B1', 'B2', 'B3', 'B4', 'B5', 'SN'],
    getLogicThresholds: () => ({
        hdWinderThresholdArea: 4000000
    })
};

// [REFACTORED] The mock initial state now includes the new uiMetadata object.
const getMockInitialState = () => ({
    quoteData: {
        currentProduct: 'rollerBlind',
        products: {
            rollerBlind: {
                items: [{ ...getMockInitialItem() }],
                summary: { totalSum: 0, accessories: {} }
            }
        },
        uiMetadata: {
            lfModifiedRowIndexes: []
        },
        costDiscountPercentage: 0,
        customer: {}
    },
    ui: {}
});

// --- Test Suite ---
describe('QuoteService (Refactored)', () => {
    let quoteService;
    let stateService;
    let eventAggregator;

    beforeEach(() => {
        eventAggregator = new EventAggregator();
        stateService = new StateService({
            initialState: getMockInitialState(),
            eventAggregator
        });
        quoteService = new QuoteService({
            stateService,
            productFactory: mockProductFactory,
            configManager: mockConfigManager
        });
    });

    const getItemsFromState = () => {
        return stateService.getState().quoteData.products.rollerBlind.items;
    };

    it('should initialize with a single empty row in the state', () => {
        const items = getItemsFromState();
        expect(items).toHaveLength(1);
        expect(items[0]).toEqual(expect.objectContaining({
            width: null, height: null, fabricType: null, location: ''
        }));
    });

    it('should insert a new row and update the state', () => {
        quoteService.insertRow(0);
        const items = getItemsFromState();
        expect(items).toHaveLength(2);
        expect(items[1].itemId).not.toBe(items[0].itemId);
    });

    it('should delete a row and update the state', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        quoteService.insertRow(0);
        quoteService.updateItemValue(1, 'width', 2000);

        let items = getItemsFromState();
        expect(items).toHaveLength(3);

        quoteService.deleteRow(0);
        items = getItemsFromState();
        expect(items).toHaveLength(2);
        expect(items[0].width).toBe(2000);
    });
});