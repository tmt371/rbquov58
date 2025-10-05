// File: 04-core-code/services/quote-service.js

/**
 * @fileoverview Service for managing quote data.
 * Acts as the single source of truth for the quoteData state object.
 * It contains all the business logic for mutating the quote data.
 */

export class QuoteService {
    constructor({ initialState, productFactory, configManager }) {
        this.quoteData = JSON.parse(JSON.stringify(initialState.quoteData));
        this.productFactory = productFactory;
        this.configManager = configManager; 
        this.initialState = initialState; // [NEW] Store initial state for resetting purposes.

        // [REFACTORED] The service no longer holds a static itemListName.
        // It will dynamically determine the correct data to use based on quoteData.currentProduct.
        console.log("QuoteService Initialized for Generic State Structure.");
    }

    // --- [NEW] Private helper methods for accessing product-specific data ---

    /**
     * Gets the key for the currently active product (e.g., 'rollerBlind').
     * @private
     */
    _getCurrentProductKey() {
        return this.quoteData.currentProduct;
    }

    /**
     * Gets the data object for the currently active product.
     * @private
     */
    _getCurrentProductData() {
        const productKey = this._getCurrentProductKey();
        return this.quoteData.products[productKey];
    }

    /**
     * Gets the summary object for the currently active product.
     * @private
     */
    _getCurrentProductSummary() {
        const productData = this._getCurrentProductData();
        return productData ? productData.summary : null;
    }
    
    // --- Public API ---

    getQuoteData() {
        return this.quoteData;
    }

    getItems() {
        // [REFACTORED] Dynamically get items from the current product's data.
        const productData = this._getCurrentProductData();
        return productData ? productData.items : [];
    }
    
    getCurrentProductType() {
        return this.quoteData.currentProduct;
    }

    insertRow(selectedIndex) {
        const items = this.getItems();
        const productStrategy = this.productFactory.getProductStrategy(this._getCurrentProductKey());
        const newItem = productStrategy.getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        return newRowIndex;
    }

    deleteRow(selectedIndex) {
        const items = this.getItems();
        const isLastRow = selectedIndex === items.length - 1;
        const item = items[selectedIndex];
        const isRowEmpty = !item.width && !item.height && !item.fabricType;

        if (isLastRow && !isRowEmpty) {
            this.clearRow(selectedIndex);
            return;
        }

        if (items.length === 1) {
            this.clearRow(selectedIndex);
            return;
        }

        items.splice(selectedIndex, 1);
    }

    clearRow(selectedIndex) {
        const itemToClear = this.getItems()[selectedIndex];
        if (itemToClear) {
            const productStrategy = this.productFactory.getProductStrategy(this._getCurrentProductKey());
            const newItem = productStrategy.getInitialItemData();
            newItem.itemId = itemToClear.itemId;
            this.getItems()[selectedIndex] = newItem;
        }
    }

    updateItemValue(rowIndex, column, value) {
        const targetItem = this.getItems()[rowIndex];
        if (!targetItem) return false;

        if (targetItem[column] !== value) {
            targetItem[column] = value;
            targetItem.linePrice = null;

            if ((column === 'width' || column === 'height') && targetItem.width && targetItem.height) {
                if ((targetItem.width * targetItem.height) > 4000000 && !targetItem.motor) {
                    targetItem.winder = 'HD';
                }
            }
            
            this.consolidateEmptyRows();
            return true;
        }
        return false;
    }
    
    updateItemProperty(rowIndex, property, value) {
        const item = this.getItems()[rowIndex];
        if (item && item[property] !== value) {
            item[property] = value;
            return true;
        }
        return false;
    }

    updateWinderMotorProperty(rowIndex, property, value) {
        const item = this.getItems()[rowIndex];
        if (!item) return false;

        if (item[property] !== value) {
            item[property] = value;
            if (value) {
                if (property === 'winder') item.motor = '';
                if (property === 'motor') item.winder = '';
            }
            return true;
        }
        return false;
    }
    
    updateAccessorySummary(data) {
        const summary = this._getCurrentProductSummary();
        if (data && summary && summary.accessories) {
            Object.assign(summary.accessories, data);
        }
    }

    setCostDiscount(percentage) {
        this.quoteData.costDiscountPercentage = percentage;
    }

    cycleK3Property(rowIndex, column) {
        const item = this.getItems()[rowIndex];
        if (!item) return false;

        const currentValue = item[column] || '';
        let nextValue = currentValue;

        switch (column) {
            case 'over':
                nextValue = (currentValue === '') ? 'O' : '';
                break;
            case 'oi':
                if (currentValue === '') nextValue = 'IN';
                else if (currentValue === 'IN') nextValue = 'OUT';
                else if (currentValue === 'OUT') nextValue = 'IN';
                break;
            case 'lr':
                if (currentValue === '') nextValue = 'L';
                else if (currentValue === 'L') nextValue = 'R';
                else if (currentValue === 'R') nextValue = 'L';
                break;
        }

        if (item[column] !== nextValue) {
            item[column] = nextValue;
            return true;
        }
        return false;
    }

    batchUpdateProperty(property, value) {
        const items = this.getItems();
        let changed = false;
        items.forEach(item => {
            if (item.width || item.height) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }
    
    batchUpdatePropertyByType(type, property, value) {
        const items = this.getItems();
        let changed = false;
        items.forEach((item, index) => {
            if (item.fabricType === type) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }

    batchUpdateLFProperties(rowIndexes, fabricName, fabricColor) {
        const items = this.getItems();
        const newFabricName = `L-Filter ${fabricName}`;
        let changed = false;

        for (const index of rowIndexes) {
            const item = items[index];
            if (item) {
                if (item.fabric !== newFabricName) {
                    item.fabric = newFabricName;
                    changed = true;
                }
                if (item.color !== fabricColor) {
                    item.color = fabricColor;
                    changed = true;
                }
            }
        }
        return changed;
    }
    
    removeLFProperties(rowIndexes) {
        const items = this.getItems();
        let changed = false;
        for (const index of rowIndexes) {
            const item = items[index];
            if (item) {
                if (item.fabric !== '') {
                    item.fabric = '';
                    changed = true;
                }
                if (item.color !== '') {
                    item.color = '';
                    changed = true;
                }
            }
        }
        return changed;
    }

    cycleItemType(rowIndex) {
        const item = this.getItems()[rowIndex];
        if (!item || (!item.width && !item.height)) return false;

        const TYPE_SEQUENCE = this.configManager.getFabricTypeSequence();
        if (TYPE_SEQUENCE.length === 0) return false; 

        const currentType = item.fabricType || TYPE_SEQUENCE[TYPE_SEQUENCE.length - 1];
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        return this.setItemType(rowIndex, nextType);
    }

    setItemType(rowIndex, newType) {
        const item = this.getItems()[rowIndex];
        if (item && item.fabricType !== newType) {
            item.fabricType = newType;
            item.linePrice = null;
            return true;
        }
        return false;
    }

    batchUpdateFabricType(newType) {
        const items = this.getItems();
        let changed = false;
        items.forEach(item => {
            if (item.width && item.height) {
                if (item.fabricType !== newType) {
                    item.fabricType = newType;
                    item.linePrice = null;
                    changed = true;

                }
            }
        });
        return changed;
    }

    batchUpdateFabricTypeForSelection(selectedIndexes, newType) {
        const items = this.getItems();
        let changed = false;
        for (const index of selectedIndexes) {
            const item = items[index];
            if (item && item.width && item.height) {
                if (item.fabricType !== newType) {
                    item.fabricType = newType;
                    item.linePrice = null;
                    changed = true;
                }
            }
        }
        return changed;
    }

    reset() {
        // [REFACTORED] Reset the entire quoteData object from the initial state blueprint.
        this.quoteData = JSON.parse(JSON.stringify(this.initialState.quoteData));
    }

    hasData() {
        const items = this.getItems();
        if (!items) return false;
        return items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
    }

    deleteMultipleRows(indexesToDelete) {
        const sortedIndexes = [...indexesToDelete].sort((a, b) => b - a);

        sortedIndexes.forEach(index => {
            this.deleteRow(index);
        });

        this.consolidateEmptyRows();
    }

    consolidateEmptyRows() {
        const items = this.getItems();
        if (!items) return;
        
        while (items.length > 1) {
            const lastItem = items[items.length - 1];
            const secondLastItem = items[items.length - 2];
            const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
            const isSecondLastItemEmpty = !secondLastItem.width && !secondLastItem.height && !secondLastItem.fabricType;

            if (isLastItemEmpty && isSecondLastItemEmpty) {
                items.pop();
            } else {
                break;
            }
        }

        const lastItem = items[items.length - 1];
        if (!lastItem) return;
        const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
        if (!isLastItemEmpty) {
            const productStrategy = this.productFactory.getProductStrategy(this._getCurrentProductKey());
            const newItem = productStrategy.getInitialItemData();
            items.push(newItem);
        }
    }
}