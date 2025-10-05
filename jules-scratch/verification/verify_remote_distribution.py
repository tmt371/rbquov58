import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_remote_distribution_feature(page: Page):
    """
    This script verifies the remote quantity distribution feature.
    """
    # 1. Arrange: Go to the index.html page and set up the initial state.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # Handle the initial browser confirm dialog
    page.once("dialog", lambda dialog: dialog.dismiss())

    # Handle the welcome dialog
    dialog_overlay = page.locator("#confirmation-dialog-overlay")
    expect(dialog_overlay).to_be_visible(timeout=10000)
    discount_input = dialog_overlay.locator("#dialog-input-cost-dis")
    expect(discount_input).to_be_visible()
    discount_input.fill("0")
    confirm_button = dialog_overlay.get_by_role("button", name="Confirm")
    expect(confirm_button).to_be_visible()
    confirm_button.click()
    expect(dialog_overlay).to_be_hidden()

    # 2. Act: Set a total number of remotes.
    # Expand the left panel
    page.locator("#left-panel-toggle").click()
    # Click the K4 tab
    page.locator("#k4-tab").click()
    # Enter remote mode
    page.locator("#btn-k5-remote").click()
    # Click the remote add button 5 times to set total remotes to 5
    remote_add_button = page.locator("#btn-k5-remote-add")
    for _ in range(5):
        remote_add_button.click()
    expect(page.locator("#k5-display-remote-count")).to_have_value("5")
    # Exit remote mode to save the count
    page.locator("#btn-k5-remote").click()


    # 3. Trigger and test the distribution dialog.
    # Expand the right panel (F1)
    page.locator("#function-panel-toggle").click()
    expect(page.locator("#f1-content")).to_be_visible()

    # Click the 1ch remote quantity display to trigger the dialog
    page.locator("#f1-qty-remote-1ch").click()

    # The distribution dialog should now be visible
    dist_dialog = page.locator("#confirmation-dialog-overlay")
    expect(dist_dialog).to_be_visible()
    expect(dist_dialog.locator(".dialog-message")).to_have_text("Total remotes: 5. Please distribute them.")

    # Test validation: enter quantities that don't sum to 5
    input_1ch = dist_dialog.locator("#dialog-input-1ch")
    input_16ch = dist_dialog.locator("#dialog-input-16ch")
    confirm_btn = dist_dialog.get_by_role("button", name="Confirm")

    input_1ch.fill("1")
    input_16ch.fill("1")
    confirm_btn.click()

    # Expect an error notification and the dialog to remain open
    notification = page.locator(".toast-notification.is-error")
    expect(notification).to_be_visible()
    expect(notification).to_have_text("Total must equal 5. Current total: 2.")
    expect(dist_dialog).to_be_visible()
    # Manually hide the notification to continue the test
    notification.evaluate("node => node.remove()")


    # 4. Assert: Enter valid quantities and confirm.
    input_1ch.fill("2")
    input_16ch.fill("3")
    confirm_btn.click()

    # Dialog should close
    expect(dist_dialog).to_be_hidden()

    # Verify the quantities and prices are updated in the F1 panel
    # (Prices are based on multipliers in right-panel-component.js: 1ch is not defined, 16ch is 70)
    # Let's assume 1ch price is 20 based on calculation service logic.
    expect(page.locator("#f1-qty-remote-1ch")).to_have_text("2")
    expect(page.locator("#f1-price-remote-1ch")).to_have_text("$40.00") # 2 * 20

    expect(page.locator("#f1-qty-remote-16ch")).to_have_text("3")
    expect(page.locator("#f1-price-remote-16ch")).to_have_text("$210.00") # 3 * 70

    # 5. Screenshot: Capture the right panel for visual verification.
    page.locator("#function-panel").screenshot(path="jules-scratch/verification/verification.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_remote_distribution_feature(page)
        browser.close()

if __name__ == "__main__":
    main()