from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:8000")

        # Wait for the main application to load
        page.wait_for_selector("#left-panel-toggle", timeout=10000)

        # Use the virtual keyboard to enter dimensions and type
        # Enter Width
        page.click("#key-w")
        page.click("#key-1")
        page.click("#key-0")
        page.click("#key-0")

        # Enter Height
        page.click("#key-h")
        page.click("#key-1")
        page.click("#key-5")
        page.click("#key-0")

        # Set the Type
        page.click("#key-type")

        # Confirm entry
        page.click("#key-enter")

        # Wait for the row to be populated, using the price as an indicator
        expect(page.locator("tr[data-row-index='0'] td[data-column='Price']")).not_to_be_empty()

        # Open the function panel to reveal the tabs
        page.click("#function-panel-toggle")

        # Click on the F2 tab to go to the detail view
        page.click("#f2-tab")

        # Click on the K5 tab
        page.wait_for_selector("#k5-tab", timeout=5000)
        page.click("#k5-tab")

        # Wait for the summary total to be displayed and take a screenshot
        page.wait_for_selector("#summary-accessories-total-value")
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)