import { QuoteService } from './quote-service.js';
import { StateService } from './state-service.js';
import { EventAggregator } from '../event-aggregator.js';

// --- Mock Dependencies ---
const getMockInitialItem = () => ({
    itemId: 'item-1',
    width: null, height: null, fabricType: null, linePrice: null,
    location: '', fabric: '', color: '', over: '',
    oi: '', lr: '', dual: '', chain: null, winder: '', motor: ''
});

const mockProductStrategy = {
    getInitialItemData: () => ({ ...getMockInitialItem(), itemId: `item-${Date.now()}` })
};

const mockProductFactory = {
    getProductStrategy: () => mockProductStrategy
};

const mockConfigManager = {
    getFabricTypeSequence: () => ['B1', 'B2', 'B3', 'B4', 'B5', 'SN']
};

const getMockInitialState = () => ({
    quoteData: {
        currentProduct: 'rollerBlind',
        products: {
            rollerBlind: {
                items: [{ ...getMockInitialItem() }],
                summary: { totalSum: 0, accessories: {} }
            }
        },
        costDiscountPercentage: 0,
        customer: {}
    },
    ui: {} // Add a mock ui state object
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

    it('should clear the last data row instead of deleting it', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        let items = getItemsFromState();
        expect(items.length).toBe(2); // Item with data + one empty row
        
        quoteService.deleteRow(0);
        items = getItemsFromState();
        expect(items.length).toBe(1); // Should be left with one empty row
        expect(items[0].width).toBeNull();
    });

    it('should ensure only one empty row exists at the end of the list after updates', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        let items = getItemsFromState();
        expect(items.length).toBe(2);

        quoteService.updateItemValue(1, 'width', 2000);
        items = getItemsFromState();
        expect(items.length).toBe(3);

        quoteService.deleteRow(1);
        items = getItemsFromState();
        expect(items.length).toBe(2);
        expect(items[items.length - 1].width).toBeNull();
    });

    it('should cycle through all fabric types and update the state', () => {
        quoteService.updateItemValue(0, 'width', 1000);
        quoteService.updateItemValue(0, 'height', 1000);
        
        expect(getItemsFromState()[0].fabricType).toBeNull();

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B1');

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B2');

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B3');

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B4');

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B5');

        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('SN');

        // Seventh cycle should loop back to B1
        quoteService.cycleItemType(0);
        expect(getItemsFromState()[0].fabricType).toBe('B1');
    });
});