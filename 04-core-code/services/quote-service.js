// File: 04-core-code/services/quote-service.js

/**
 * @fileoverview Service for managing quote data.
 * Acts as the single source of truth for the quoteData state object.
 * It contains all the business logic for mutating the quote data.
 */

export class QuoteService {
    constructor({ stateService, productFactory, configManager }) {
        this.stateService = stateService;
        this.productFactory = productFactory;
        this.configManager = configManager; 
        console.log("QuoteService refactored to be a stateless logic processor.");
    }

    // --- Private helper methods for accessing product-specific data ---

    _getCurrentProductKey() {
        const { quoteData } = this.stateService.getState();
        return quoteData.currentProduct;
    }

    getCurrentProductData() {
        const { quoteData } = this.stateService.getState();
        const productKey = this._getCurrentProductKey();
        return quoteData.products[productKey];
    }

    _getCurrentProductSummary() {
        const productData = this.getCurrentProductData();
        return productData ? productData.summary : null;
    }
    
    // --- Public API ---

    getQuoteData() {
        const { quoteData } = this.stateService.getState();
        return quoteData;
    }

    getItems() {
        const productData = this.getCurrentProductData();
        return productData ? productData.items : [];
    }
    
    getCurrentProductType() {
        const { quoteData } = this.stateService.getState();
        return quoteData.currentProduct;
    }

    insertRow(selectedIndex) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const items = [...productData.items];

        const productStrategy = this.productFactory.getProductStrategy(productKey);
        const newItem = productStrategy.getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });

        return newRowIndex;
    }

    deleteRow(selectedIndex) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        let items = [...productData.items];

        const isLastRow = selectedIndex === items.length - 1;
        const item = items[selectedIndex];
        const isRowEmpty = !item.width && !item.height && !item.fabricType;

        if ((isLastRow && !isRowEmpty) || items.length === 1) {
            const productStrategy = this.productFactory.getProductStrategy(productKey);
            const newItem = productStrategy.getInitialItemData();
            newItem.itemId = items[selectedIndex].itemId;
            items[selectedIndex] = newItem;
        } else {
            items.splice(selectedIndex, 1);
        }

        items = this._consolidateEmptyRows(items, productKey);

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
    }

    clearRow(selectedIndex) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const items = [...productData.items];

        const itemToClear = items[selectedIndex];
        if (itemToClear) {
            const productStrategy = this.productFactory.getProductStrategy(productKey);
            const newItem = productStrategy.getInitialItemData();
            newItem.itemId = itemToClear.itemId;
            items[selectedIndex] = newItem;

            const newProductData = { ...productData, items };
            const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
            this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
        }
    }

    updateItemValue(rowIndex, column, value) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        let items = [...productData.items];

        const targetItem = items[rowIndex];
        if (!targetItem || targetItem[column] === value) return false;
        
        const newItem = { ...targetItem, [column]: value };

        // [CORRECTED] The extra '}' that caused the syntax error was here. It has been removed.
        if ((column === 'width' || column === 'height') && newItem.width && newItem.height) {
            const logicThresholds = this.configManager.getLogicThresholds();
            if (logicThresholds && (newItem.width * newItem.height) > logicThresholds.hdWinderThresholdArea && !newItem.motor) {
                newItem.winder = 'HD';
            }
        }

        items[rowIndex] = newItem;

        items = this._consolidateEmptyRows(items, productKey);

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });

        return true;
    }
    
    updateItemProperty(rowIndex, property, value) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const items = [...productData.items];
        const item = items[rowIndex];

        if (!item || item[property] === value) return false;

        items[rowIndex] = { ...item, [property]: value };

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });

        return true;
    }

    updateWinderMotorProperty(rowIndex, property, value) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const items = [...productData.items];
        const item = items[rowIndex];

        if (!item || item[property] === value) return false;

        const newItem = { ...item, [property]: value };
        if (value) {
            if (property === 'winder') newItem.motor = '';
            if (property === 'motor') newItem.winder = '';
        }
        items[rowIndex] = newItem;

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });

        return true;
    }
    
    updateAccessorySummary(data) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const summary = productData.summary;

        if (!data || !summary || !summary.accessories) return;

        const newAccessories = { ...summary.accessories, ...data };
        const newSummary = { ...summary, accessories: newAccessories };
        const newProductData = { ...productData, summary: newSummary };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
    }

    setCostDiscount(percentage) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const newQuoteData = { ...quoteData, costDiscountPercentage: percentage };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
    }

    cycleK3Property(rowIndex, column) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];
        const items = [...productData.items];
        const item = items[rowIndex];

        if (!item) return false;

        const currentValue = item[column] || '';
        let nextValue = currentValue;

        switch (column) {
            case 'over': nextValue = (currentValue === '') ? 'O' : ''; break;
            case 'oi': nextValue = (currentValue === '') ? 'IN' : (currentValue === 'IN' ? 'OUT' : 'IN'); break;
            case 'lr': nextValue = (currentValue === '') ? 'L' : (currentValue === 'L' ? 'R' : 'L'); break;
        }

        if (item[column] === nextValue) return false;

        items[rowIndex] = { ...item, [column]: nextValue };
        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
        return true;
    }

    _updateItems(updateLogic) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];

        const { newItems, changed } = updateLogic([...productData.items]);

        if (changed) {
            const newProductData = { ...productData, items: newItems };
            const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
            this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
        }
        return changed;
    }

    batchUpdateProperty(property, value) {
        return this._updateItems(items => {
            let changed = false;
            const newItems = items.map(item => {
                if ((item.width || item.height) && item[property] !== value) {
                    changed = true;
                    return { ...item, [property]: value };
                }
                return item;
            });
            return { newItems, changed };
        });
    }
    
    batchUpdatePropertyByType(type, property, value, indexesToExclude = new Set()) {
        return this._updateItems(items => {
            let changed = false;
            const newItems = items.map((item, index) => {
                if (!indexesToExclude.has(index) && item.fabricType === type && item[property] !== value) {
                    changed = true;
                    return { ...item, [property]: value };
                }
                return item;
            });
            return { newItems, changed };
        });
    }

    batchUpdateLFProperties(rowIndexes, fabricName, fabricColor) {
        const newFabricName = `L-Filter ${fabricName}`;
        return this._updateItems(items => {
            let changed = false;
            const newItems = items.map((item, index) => {
                if (rowIndexes.includes(index)) {
                    const newItem = { ...item };
                    if (newItem.fabric !== newFabricName) {
                        newItem.fabric = newFabricName;
                        changed = true;
                    }
                    if (newItem.color !== fabricColor) {
                        newItem.color = fabricColor;
                        changed = true;
                    }
                    return newItem;
                }
                return item;
            });
            return { newItems, changed };
        });
    }
    
    removeLFProperties(rowIndexes) {
        return this._updateItems(items => {
            let changed = false;
            const newItems = items.map((item, index) => {
                if (rowIndexes.includes(index)) {
                    const newItem = { ...item };
                    if (newItem.fabric !== '') {
                        newItem.fabric = '';
                        changed = true;
                    }
                    if (newItem.color !== '') {
                        newItem.color = '';
                        changed = true;
                    }
                    return newItem;
                }
                return item;
            });
            return { newItems, changed };
        });
    }

    _updateAndGetChangedIndexes(updateLogic) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];

        const { newItems, changedIndexes } = updateLogic([...productData.items]);

        if (changedIndexes.length > 0) {
            const newProductData = { ...productData, items: newItems };
            const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
            this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
        }
        return changedIndexes;
    }

    cycleItemType(rowIndex) {
        const item = this.getItems()[rowIndex];
        if (!item || (!item.width && !item.height)) return [];

        const TYPE_SEQUENCE = this.configManager.getFabricTypeSequence();
        if (TYPE_SEQUENCE.length === 0) return [];

        const currentType = item.fabricType || TYPE_SEQUENCE[TYPE_SEQUENCE.length - 1];
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        return this.setItemType(rowIndex, nextType);
    }

    setItemType(rowIndex, newType) {
        return this._updateAndGetChangedIndexes(items => {
            const changedIndexes = [];
            const item = items[rowIndex];
            if (item && item.fabricType !== newType) {
                items[rowIndex] = { ...item, fabricType: newType, linePrice: null, fabric: '', color: '' };
                changedIndexes.push(rowIndex);
            }
            return { newItems: items, changedIndexes };
        });
    }

    batchUpdateFabricType(newType) {
        return this._updateAndGetChangedIndexes(items => {
            const changedIndexes = [];
            const newItems = items.map((item, index) => {
                if (item.width && item.height && item.fabricType !== newType) {
                    changedIndexes.push(index);
                    return { ...item, fabricType: newType, linePrice: null, fabric: '', color: '' };
                }
                return item;
            });
            return { newItems, changedIndexes };
        });
    }

    batchUpdateFabricTypeForSelection(selectedIndexes, newType) {
        return this._updateAndGetChangedIndexes(items => {
            const changedIndexes = [];
            const newItems = items.map((item, index) => {
                if (selectedIndexes.includes(index) && item.width && item.height && item.fabricType !== newType) {
                    changedIndexes.push(index);
                    return { ...item, fabricType: newType, linePrice: null, fabric: '', color: '' };
                }
                return item;
            });
            return { newItems, changedIndexes };
        });
    }

    reset() {
        // This needs access to the absolute initial state, which StateService should provide.
        // For now, this is a simplified implementation. Awaiting StateService enhancement.
        console.warn("QuoteService.reset() is not fully implemented pending StateService enhancements.");
        // const initialState = this.stateService.getInitialState();
        // this.stateService.updateState(initialState);
    }

    hasData() {
        const items = this.getItems();
        if (!items) return false;
        return items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
    }

    deleteMultipleRows(indexesToDelete) {
        const currentState = this.stateService.getState();
        const { quoteData } = currentState;
        const productKey = this._getCurrentProductKey();
        const productData = quoteData.products[productKey];

        const sortedIndexes = [...indexesToDelete].sort((a, b) => b - a);
        let items = [...productData.items];

        sortedIndexes.forEach(index => {
            items.splice(index, 1);
        });

        if (items.length === 0) {
            const productStrategy = this.productFactory.getProductStrategy(productKey);
            items.push(productStrategy.getInitialItemData());
        }

        items = this._consolidateEmptyRows(items, productKey);

        const newProductData = { ...productData, items };
        const newQuoteData = { ...quoteData, products: { ...quoteData.products, [productKey]: newProductData } };
        this.stateService.updateState({ ...currentState, quoteData: newQuoteData });
    }

    _consolidateEmptyRows(items, productKey) {
        let newItems = [...items];
        if (!newItems) return [];
        
        while (newItems.length > 1) {
            const lastItem = newItems[newItems.length - 1];
            const secondLastItem = newItems[newItems.length - 2];
            const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
            const isSecondLastItemEmpty = !secondLastItem.width && !secondLastItem.height && !secondLastItem.fabricType;

            if (isLastItemEmpty && isSecondLastItemEmpty) {
                newItems.pop();
            } else {
                break;
            }
        }

        const lastItem = newItems[newItems.length - 1];
        if (!lastItem) return newItems;

        const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
        if (!isLastItemEmpty) {
            const productStrategy = this.productFactory.getProductStrategy(productKey);
            const newItem = productStrategy.getInitialItemData();
            newItems.push(newItem);
        }
        return newItems;
    }
}