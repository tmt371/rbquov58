import re
from playwright.sync_api import Page, expect, sync_playwright

def verify_k5_total(page: Page):
    """
    This script verifies that the total accessories price on the K5 tab
    is calculated correctly, including the price for 'Dual' accessories.
    """
    # 1. Navigate to the application.
    page.goto("http://localhost:8000")

    # Wait for a stable element that indicates the app is ready.
    expect(page.locator("#left-panel-toggle")).to_be_visible()

    # 2. Add some data to the quote to work with
    # Explicitly wait for the first cell to be visible before clicking.
    first_width_cell = page.locator('td[data-column="width"]').first
    expect(first_width_cell).to_be_visible()
    first_width_cell.click()

    page.locator('#key-1').click()
    page.locator('#key-0').click()
    page.locator('#key-0').click()
    page.locator('#key-enter').click()

    # Click on the first cell of the 'height' column and enter a value
    page.locator('td[data-column="height"]').first.click()
    page.locator('#key-1').click()
    page.locator('#key-5').click()
    page.locator('#key-0').click()
    page.locator('#key-enter').click()

    # Click on the second cell of the 'width' column and enter a value
    page.locator('tr[data-row-index="1"] td[data-column="width"]').click()
    page.locator('#key-1').click()
    page.locator('#key-0').click()
    page.locator('#key-0').click()
    page.locator('#key-enter').click()

    # Click on the second cell of the 'height' column and enter a value
    page.locator('tr[data-row-index="1"] td[data-column="height"]').click()
    page.locator('#key-1').click()
    page.locator('#key-5').click()
    page.locator('#key-0').click()
    page.locator('#key-enter').click()

    # 3. Switch to the detail view by clicking the left panel toggle.
    left_panel_toggle = page.locator("#left-panel-toggle")
    expect(left_panel_toggle).to_be_visible()
    left_panel_toggle.click()
    expect(page.locator("#left-panel")).to_have_class(re.compile(r'is-expanded'))

    # 4. Go to the K5 tab.
    k5_tab = page.locator("#k5-tab")
    k5_tab.click()
    expect(page.locator("#k5-content")).to_be_visible()

    # 5. Click the 'Dual' button to enter dual mode.
    dual_button = page.locator("#btn-k4-dual")
    dual_button.click()

    # 6. Click on the first two cells in the 'dual' column to mark them as 'D'.
    page.locator('tr[data-row-index="0"] td[data-column="dual"]').click()
    page.locator('tr[data-row-index="1"] td[data-column="dual"]').click()

    # Exit dual mode to trigger calculation
    dual_button.click()

    # 7. Wait for prices to update and get the values
    page.wait_for_timeout(1000) # wait for calculations

    def get_price(selector):
        value = page.locator(selector).input_value()
        try:
            # Extract number from string like "$123.45"
            return float(re.search(r'[\d\.]+', value).group())
        except (ValueError, AttributeError):
            return 0.0

    dual_price_text = page.locator("#k4-dual-price-display .price-value").inner_text()
    dual_price = float(re.search(r'[\d\.]+', dual_price_text).group()) if dual_price_text else 0.0

    winder_price = get_price("#k5-display-winder-summary")
    motor_price = get_price("#k5-display-motor-summary")
    remote_price = get_price("#k5-display-remote-summary")
    charger_price = get_price("#k5-display-charger-summary")
    cord_price = get_price("#k5-display-cord-summary")

    # 8. Calculate the expected total
    expected_total = dual_price + winder_price + motor_price + remote_price + charger_price + cord_price

    # 9. Get the actual total from the UI
    actual_total = get_price("#k5-display-accessories-total")

    # 10. Assert that the actual total matches the expected total.
    expect(page.locator("#k5-display-accessories-total")).to_have_value(re.compile(f'\\${expected_total:,.2f}'))

    # 11. Take a screenshot for visual confirmation.
    page.screenshot(path="jules-scratch/verification/k5-total-verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_k5_total(page)
        browser.close()

if __name__ == "__main__":
    main()