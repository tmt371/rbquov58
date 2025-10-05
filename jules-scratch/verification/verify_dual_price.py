import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_dual_price_fix(page: Page):
    """
    This script verifies that the Dual price calculation and display are working correctly.
    """
    # 1. Arrange: Go to the index.html page.
    # Get the absolute path to the index.html file.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # Handle the initial confirmation dialog for restoring data.
    # We'll just dismiss it to start with a clean slate.
    page.once("dialog", lambda dialog: dialog.dismiss())

    # Handle the welcome dialog which asks for a discount percentage.
    # 1. Wait for the dialog overlay to become visible.
    dialog_overlay = page.locator("#confirmation-dialog-overlay")
    expect(dialog_overlay).to_be_visible(timeout=10000)

    # 2. Wait for the input field within the dialog to be visible.
    discount_input = dialog_overlay.locator("#dialog-input-cost-dis")
    expect(discount_input).to_be_visible()

    # 3. Fill in a valid value.
    discount_input.fill("0")

    # 4. Find and click the "Confirm" button.
    confirm_button = dialog_overlay.get_by_role("button", name="Confirm")
    expect(confirm_button).to_be_visible()
    confirm_button.click()

    # Now, wait for the main table to become visible after the dialog is dismissed.
    expect(page.locator("#results-table")).to_be_visible()

    # 2. Act: Navigate the UI to trigger the calculation.

    # Expand the left panel
    left_panel_toggle = page.locator("#left-panel-toggle")
    left_panel_toggle.click()

    # Click the K5 tab
    k5_tab = page.locator("#k5-tab")
    expect(k5_tab).to_be_visible()
    k5_tab.click()

    # Click the 'Dual' button to enter dual mode
    dual_button = page.locator("#btn-k4-dual")
    expect(dual_button).to_be_visible()
    dual_button.click()
    expect(dual_button).to_have_class("feature-button active")

    # Add width and height to the first two rows to make them valid items
    page.locator('tr[data-row-index="0"] td[data-column="width"]').click()
    page.keyboard.press("1")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("Enter")
    page.locator('tr[data-row-index="0"] td[data-column="height"]').click()
    page.keyboard.press("1")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("Enter")

    page.locator('tr[data-row-index="1"] td[data-column="width"]').click()
    page.keyboard.press("1")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("Enter")
    page.locator('tr[data-row-index="1"] td[data-column="height"]').click()
    page.keyboard.press("1")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("0")
    page.keyboard.press("Enter")

    # Select the first two rows for 'Dual'
    page.locator('tr[data-row-index="0"] td[data-column="dual"]').click()
    page.locator('tr[data-row-index="1"] td[data-column="dual"]').click()

    # Click the dual button again to trigger calculation
    dual_button.click()

    # 3. Assert: Check if the price is displayed correctly.
    dual_price_display = page.locator("#k4-dual-price-display .price-value")
    # The expected price for one pair of dual brackets is $10.
    expect(dual_price_display).to_have_text("$10")

    # 4. Screenshot: Capture the left panel for visual verification.
    left_panel = page.locator("#left-panel")
    left_panel.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_dual_price_fix(page)
        browser.close()

if __name__ == "__main__":
    main()