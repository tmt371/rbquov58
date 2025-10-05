import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_left_panel_layout(page: Page):
    """
    This script verifies the final reworked left panel behavior:
    1. The application loads without crashing.
    2. The toggle handle is visible on startup.
    3. The panel expands and collapses correctly on toggle clicks.
    """
    # 1. Arrange: Go to the index.html page.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # 2. Assert Initial State: Wait for the toggle to be visible,
    # which confirms the app has loaded and the handle is correctly positioned.
    toggle_button = page.locator("#left-panel-toggle")
    expect(toggle_button).to_be_visible(timeout=10000)

    left_panel = page.locator("#left-panel")
    expect(left_panel).not_to_have_class("is-expanded")
    print("Initial state verified: Toggle is visible, panel is collapsed.")

    # 3. Act: Click the toggle to expand the panel.
    # The input handler should now correctly toggle the 'is-expanded' class.
    toggle_button.click()

    # 4. Assert Expanded State: Panel is visible and has the correct class.
    expect(left_panel).to_have_class("is-expanded", timeout=5000)
    print("Expanded state verified: Panel has 'is-expanded' class.")

    # Add a slight delay to ensure all CSS transitions and JS calculations are complete.
    page.wait_for_timeout(500)

    # 5. Screenshot: Capture the entire page for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot captured successfully at jules-scratch/verification/verification.png")

    # 6. Act: Click the toggle again to collapse the panel.
    toggle_button.click()

    # 7. Assert Collapsed State: Panel is hidden again.
    expect(left_panel).not_to_have_class("is-expanded", timeout=5000)
    print("Collapsed state verified: Panel no longer has 'is-expanded' class.")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1000, "height": 800})
        verify_left_panel_layout(page)
        browser.close()

if __name__ == "__main__":
    main()