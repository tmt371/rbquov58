import os
from playwright.sync_api import sync_playwright, expect, Page

def verify_left_panel_rework(page: Page):
    """
    This script verifies the new left panel behavior:
    1. Starts hidden with a visible toggle.
    2. Expands on toggle click.
    3. Verifies the '.is-expanded' class is applied for visual confirmation of position.
    """
    # 1. Arrange: Go to the index.html page.
    file_path = os.path.abspath('index.html')
    page.goto(f'file://{file_path}')

    # Wait for the UI to be ready by waiting for the left panel toggle.
    # Its presence indicates that the left-panel.html partial has been loaded.
    toggle_button = page.locator("#left-panel-toggle")
    expect(toggle_button).to_be_visible(timeout=15000) # Increased timeout for safety

    left_panel = page.locator("#left-panel")

    # 2. Assert Initial State: Panel is hidden, toggle is visible.
    # The '.is-expanded' class should not be present initially.
    expect(left_panel).not_to_have_class("is-expanded")

    # 3. Act: Click the toggle to expand the panel.
    toggle_button.click()

    # 4. Assert Expanded State: Panel is visible and has the correct class.
    # The ResizeObserver and render logic should now have run.
    expect(left_panel).to_have_class("is-expanded", timeout=5000)

    # It's difficult to assert the exact dynamic position in a script,
    # so we'll take a screenshot for visual verification of the new layout.
    # We add a slight delay to ensure all CSS transitions and JS calculations are complete.
    page.wait_for_timeout(500)

    # 5. Screenshot: Capture the entire page for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot captured successfully at jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1000, "height": 800})
        verify_left_panel_rework(page)
        browser.close()

if __name__ == "__main__":
    main()