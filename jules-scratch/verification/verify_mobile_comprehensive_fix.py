import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_mobile_fix(page: Page):
    """
    This script comprehensively verifies the mobile event handling fix by testing
    multiple buttons that now use the addSafeEventListener helper.
    """
    # 1. Arrange: Go to the index.html page and handle initial dialogs.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    page.once("dialog", lambda dialog: dialog.dismiss())

    dialog_overlay = page.locator("#confirmation-dialog-overlay")
    expect(dialog_overlay).to_be_visible(timeout=15000) # Increased timeout
    discount_input = dialog_overlay.locator("#dialog-input-cost-dis")
    expect(discount_input).to_be_visible()
    discount_input.fill("0")
    confirm_button = dialog_overlay.get_by_role("button", name="Confirm")
    expect(confirm_button).to_be_visible()
    confirm_button.click()
    expect(dialog_overlay).to_be_hidden()

    # 2. Act & Assert (Test Case 1: Original Bug - Dual Button)
    # Expand the left panel
    page.locator("#left-panel-toggle").tap()

    # Navigate to the K5 tab
    k5_tab = page.locator("#k5-tab")
    expect(k5_tab).to_be_visible()
    k5_tab.tap()

    # Tap the 'Dual' button to enter dual mode
    dual_button = page.locator("#btn-k4-dual")
    expect(dual_button).to_be_visible()
    dual_button.tap()
    expect(dual_button).to_have_class("feature-button active")

    # Add items to the quote to enable calculation
    page.locator('tr[data-row-index="0"] td[data-column="width"]').tap()
    page.keyboard.press("1000")
    page.keyboard.press("Enter")
    page.locator('tr[data-row-index="0"] td[data-column="height"]').tap()
    page.keyboard.press("1000")
    page.keyboard.press("Enter")

    page.locator('tr[data-row-index="1"] td[data-column="width"]').tap()
    page.keyboard.press("1000")
    page.keyboard.press("Enter")
    page.locator('tr[data-row-index="1"] td[data-column="height"]').tap()
    page.keyboard.press("1000")
    page.keyboard.press("Enter")

    # Mark items for 'Dual'
    page.locator('tr[data-row-index="0"] td[data-column="dual"]').tap()
    page.locator('tr[data-row-index="1"] td[data-column="dual"]').tap()

    # Tap the dual button again to trigger calculation
    dual_button.tap()
    expect(dual_button).not_to_have_class("feature-button active")

    # Assert the price is displayed
    dual_price_display = page.locator("#k4-dual-price-display .price-value")
    expect(dual_price_display).to_have_text("$10")

    # 3. Act & Assert (Test Case 2: General Button - K3 Edit)
    # Navigate to the K3 tab
    k3_tab = page.locator("#k3-tab")
    k3_tab.tap()

    # Tap the 'Edit' button
    edit_button = page.locator("#btn-k3-edit")
    expect(edit_button).to_be_visible()
    edit_button.tap()

    # Assert that the button is now active
    expect(edit_button).to_have_class("feature-button active")

    # Tap again to deactivate
    edit_button.tap()
    expect(edit_button).not_to_have_class("feature-button active")

    # 4. Screenshot: Capture the left panel showing the successful dual price calculation.
    k5_tab.tap() # Go back to K5 to show the result
    left_panel = page.locator("#left-panel")
    left_panel.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        pixel_5 = p.devices['Pixel 5']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**pixel_5)
        page = context.new_page()

        verify_mobile_fix(page)

        context.close()
        browser.close()

if __name__ == "__main__":
    main()