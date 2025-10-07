// /04-core-code/services/calculation-service.js

/**
 * @fileoverview Service for handling all price and sum calculations.
 * Acts as a generic executor that delegates product-specific logic to a strategy.
 */
export class CalculationService {
    constructor({ stateService, productFactory, configManager }) {
        this.stateService = stateService; // Added for consistency, though not heavily used yet.
        this.productFactory = productFactory;
        this.configManager = configManager;
        console.log("CalculationService Initialized.");
    }

    /**
     * Calculates line prices for all valid items and the total sum using a provided product strategy.
     * This method is purely functional: it receives data and returns a new object with the results,
     * without causing any side effects or state mutations.
     */
    calculateAndSum(quoteData, productStrategy) {
        if (!productStrategy) {
            console.error("CalculationService: productStrategy is required for calculateAndSum.");
            return { quoteData, firstError: { message: "Product strategy not provided." } };
        }

        const currentProductKey = quoteData.currentProduct;
        const currentProductData = quoteData.products[currentProductKey];
        
        let firstError = null;

        const newItems = currentProductData.items.map((item, index) => {
            const newItem = { ...item, linePrice: null };
            if (item.width && item.height && item.fabricType) {
                const priceMatrix = this.configManager.getPriceMatrix(item.fabricType);
                const result = productStrategy.calculatePrice(item, priceMatrix);
                
                if (result.price !== null) {
                    newItem.linePrice = result.price;
                } else if (result.error && !firstError) {
                    const errorColumn = result.error.toLowerCase().includes('width') ? 'width' : 'height';
                    firstError = {
                        message: `Row ${index + 1}: ${result.error}`,
                        rowIndex: index,
                        column: errorColumn
                    };
                }
            }
            return newItem;
        });

        const itemsTotal = newItems.reduce((sum, item) => sum + (item.linePrice || 0), 0);
        
        let accessoriesTotal = 0;
        const currentSummary = currentProductData.summary;
        if (currentSummary && currentSummary.accessories) {
            const acc = currentSummary.accessories;
            accessoriesTotal += acc.winder?.price || 0;
            accessoriesTotal += acc.motor?.price || 0;
            accessoriesTotal += acc.remote?.price || 0;
            accessoriesTotal += acc.charger?.price || 0;
            accessoriesTotal += acc.cord3m?.price || 0;
        }

        const newSummary = {
            ...currentSummary,
            totalSum: itemsTotal + accessoriesTotal
        };

        const newProductData = {
            ...currentProductData,
            items: newItems,
            summary: newSummary
        };

        const updatedQuoteData = {
            ...quoteData,
            products: {
                ...quoteData.products,
                [currentProductKey]: newProductData
            }
        };

        return { updatedQuoteData, firstError };
    }

    /**
     * [MODIFIED] Generic bridge method to calculate accessory prices OR costs.
     * It now checks if a specific 'costKey' is passed in the data object.
     * If so, it calculates cost. Otherwise, it calculates the sale price.
     * @param {string} productType - The product type (e.g., 'rollerBlind').
     * @param {string} accessoryName - The generic name of the accessory (e.g., 'remote').
     * @param {object} data - Data needed for calculation (e.g., { items }, { count, costKey }).
     * @returns {number} The calculated price or cost.
     */
    calculateAccessoryPrice(productType, accessoryName, data) {
        const productStrategy = this.productFactory.getProductStrategy(productType);
        if (!productStrategy) return 0;

        const { accessoryPriceKeyMap, accessoryMethodNameMap } = this.configManager.getAccessoryMappings();
        let priceKey;

        // Check if a specific cost key is passed for cost calculation
        if (data && data.costKey) {
            priceKey = data.costKey;
        } else {
            // Otherwise, use the standard sale price mapping from the config
            priceKey = accessoryPriceKeyMap[accessoryName];
        }
        
        if (!priceKey) {
            console.error(`No price key found for accessory: ${accessoryName}`);
            return 0;
        }

        const pricePerUnit = this.configManager.getAccessoryPrice(priceKey);
        if (pricePerUnit === null) return 0;

        const methodName = accessoryMethodNameMap[accessoryName];
        
        if (methodName && productStrategy[methodName]) {
            const args = (data.items) ? [data.items, pricePerUnit] : [data.count, pricePerUnit];
            return productStrategy[methodName](...args);
        }

        return 0;
    }

    /**
     * [NEW] Calculates the total price for a given F1 panel component based on its quantity.
     * @param {string} componentKey - The key identifying the component from the F1 panel (e.g., 'winder', 'motor').
     * @param {number} quantity - The quantity entered by the user.
     * @returns {number} The calculated total price for the component.
     */
    calculateF1ComponentPrice(componentKey, quantity) {
        if (typeof quantity !== 'number' || quantity < 0) {
            return 0;
        }

        const keyMap = {
            'winder': 'winderHD',
            'motor': 'motorStandard',
            'remote-1ch': 'remoteSingleChannel',
            'remote-16ch': 'remoteMultiChannel16',
            'charger': 'charger',
            '3m-cord': 'cord3m',
            'dual-combo': 'comboBracket',
            'slim': 'slimComboBracket'
        };

        const accessoryKey = keyMap[componentKey];
        if (!accessoryKey) {
            console.error(`No accessory key found for F1 component: ${componentKey}`);
            return 0;
        }

        const unitPrice = this.configManager.getAccessoryPrice(accessoryKey);
        if (unitPrice === null) {
            return 0;
        }

        return unitPrice * quantity;
    }

    /**
     * [NEW] Calculates all values for the F2 summary panel.
     * This logic was moved from app-controller.js to centralize business calculations.
     * @param {object} quoteData - The entire quote data object.
     * @param {object} f2State - The state object for the F2 panel from uiService.
     * @returns {object} An object containing all calculated F2 summary values.
     */
    calculateF2Summary(quoteData, f2State) {
        const currentProductKey = quoteData.currentProduct;
        const productSummary = quoteData.products[currentProductKey].summary;
        const totalSumFromQuickQuote = productSummary.totalSum || 0;

        const f2Config = this.configManager.getF2Config();
        const UNIT_PRICES = f2Config.unitPrices || {};

        const accessories = productSummary.accessories || {};
        const winderPrice = accessories.winderCostSum || 0;
        const dualPrice = accessories.dualCostSum || 0;
        const motorPrice = accessories.motorCostSum || 0;
        const remotePrice = accessories.remoteCostSum || 0;
        const chargerPrice = accessories.chargerCostSum || 0;
        const cordPrice = accessories.cordCostSum || 0;

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

        return {
            totalSumForRbTime: totalSumFromQuickQuote,
            wifiSum,
            deliveryFee,
            installFee,
            removalFee,
            firstRbPrice,
            disRbPrice,
            sumPrice
        };
    }
}