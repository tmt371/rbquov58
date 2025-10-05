import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_app_is_ready_and_panel_works(page: Page):
    """
    This script verifies:
    1. The app-is-ready signal is correctly added to the body.
    2. The left panel toggle is visible and functional after the app is ready.
    """
    # 1. Arrange: Go to the index.html page.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # 2. Wait for the application to be fully ready.
    # This is the crucial step that waits for our new signal.
    page.wait_for_selector('body.app-is-ready', timeout=15000)
    print("App is ready signal detected.")

    # 3. Act & Assert: Now that the app is ready, test the panel.
    toggle_button = page.locator("#left-panel-toggle")
    left_panel = page.locator("#left-panel")

    # Assert Initial State
    expect(toggle_button).to_be_visible()
    expect(left_panel).not_to_have_class("is-expanded")

    # Click the toggle
    toggle_button.click()

    # Assert Expanded State
    expect(left_panel).to_have_class("is-expanded", timeout=5000)

    # Add a slight delay to ensure all CSS transitions are complete.
    page.wait_for_timeout(500)

    # 4. Screenshot: Capture the entire page for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot captured successfully at jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1000, "height": 800})
        verify_app_is_ready_and_panel_works(page)
        browser.close()

if __name__ == "__main__":
    main()