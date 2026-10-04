import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

# Set stdout encoding to utf-8 if possible
sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_DIR = r"d:\NWIS\NWIS\audit_screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BASE_URL = "http://localhost:5173"

console_logs = []
network_errors = []

def safe_log(msg_type, msg_text):
    try:
        cleaned = msg_text.encode('ascii', 'replace').decode('ascii')
        console_logs.append(f"[{msg_type}] {cleaned}")
    except Exception as e:
        console_logs.append(f"[{msg_type}] <unprintable log>")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        page.on("console", lambda msg: safe_log(msg.type, msg.text) if msg.type == "error" else None)
        page.on("requestfailed", lambda req: network_errors.append(f"FAILED: {req.url} - {req.failure}"))

        print("=== 01. LOGIN SCREEN ===")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_01_full_page.png"), full_page=True)

        # Trigger login validation error
        page.fill("#work-email", "invalid-email")
        page.fill("#password", "123")
        page.click("#sign-in-btn")
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_02_validation_error.png"))

        # Forgot password modal
        forgot_btn = page.query_selector("text=Forgot password?")
        if forgot_btn:
            forgot_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "01_login_03_forgot_password_modal.png"))
            page.click("text=Understood")
            page.wait_for_timeout(500)

        # Perform valid login
        page.fill("#work-email", "demo@oilindia.in")
        page.fill("#password", "password123")
        page.click("#sign-in-btn")
        page.wait_for_timeout(2500)

        print("=== 02. DASHBOARD ===")
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_dashboard_01_top_kpis.png"))
        
        # Scroll middle
        page.evaluate("window.scrollTo(0, 500)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_dashboard_02_operations_charts.png"))
        
        # Scroll bottom
        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "02_dashboard_03_alerts_activity.png"))

        print("=== 03. NEARBY & OFFSET WELLS ===")
        page.goto(f"{BASE_URL}/nearby-wells")
        page.wait_for_timeout(3000)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_nearby_wells_01_map_view.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "03_nearby_wells_02_filters_and_table.png"))

        # Click first well in table if exists
        first_well = page.query_selector("table tbody tr")
        if first_well:
            first_well.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "03_nearby_wells_03_selected_well_panel.png"))

        print("=== 04. WELL INTELLIGENCE / WELL DETAILS ===")
        page.goto(f"{BASE_URL}/wells/WEL-001")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "04_well_intelligence_01_overview_tab.png"))

        # Click each tab if available
        tabs = ["Well Logs", "Incidents & Events", "Risk Profile", "Documents & Reports", "Offset Well Comparison"]
        for idx, tab_name in enumerate(tabs, start=2):
            tab_btn = page.query_selector(f"button:has-text('{tab_name}')")
            if tab_btn:
                tab_btn.click()
                page.wait_for_timeout(1000)
                clean_name = tab_name.lower().replace(" ", "_").replace("&", "and")
                page.screenshot(path=os.path.join(OUTPUT_DIR, f"04_well_intelligence_0{idx}_{clean_name}_tab.png"))

        print("=== 05. OFFSET WELL COMPARISON ===")
        page.goto(f"{BASE_URL}/comparison")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_offset_well_comparison_01_controls_and_table.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_offset_well_comparison_02_formation_depth_chart.png"))

        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "05_offset_well_comparison_03_events_risk_comparison.png"))

        print("=== 06. RISK ANALYSIS ===")
        page.goto(f"{BASE_URL}/risk")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_risk_analysis_01_overview_and_cards.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_risk_analysis_02_matrix_and_breakdown.png"))

        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "06_risk_analysis_03_what_if_simulation.png"))

        print("=== 07. EVENTS & INCIDENT INTELLIGENCE ===")
        page.goto(f"{BASE_URL}/events")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "07_events_01_filters_and_table.png"))

        # Test a filter
        sev_select = page.query_selector("select")
        if sev_select:
            sev_select.select_option(index=1)
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "07_events_02_filtered_result.png"))

        # Click first row in table
        event_row = page.query_selector("table tbody tr")
        if event_row:
            event_row.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "07_events_03_event_detail_drawer.png"))

        print("=== 08. DOCUMENTS & KNOWLEDGE REPOSITORY ===")
        page.goto(f"{BASE_URL}/knowledge")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "08_documents_01_repository_table.png"))

        # Search filter
        search_inp = page.query_selector("input[placeholder*='Search']")
        if search_inp:
            search_inp.fill("drilling")
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "08_documents_02_search_filter_applied.png"))

        # Open chunk detail modal
        view_chunks_btn = page.query_selector("button:has-text('View Chunks'), button:has-text('View Details')")
        if view_chunks_btn:
            view_chunks_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "08_documents_03_document_chunk_detail_modal.png"))
            close_btn = page.query_selector("button:has-text('Close'), svg")
            if close_btn:
                close_btn.click()
                page.wait_for_timeout(500)

        print("=== 09. NWIS AI — DRILLING INTELLIGENCE ASSISTANT ===")
        page.goto(f"{BASE_URL}/ai")
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "09_nwis_ai_01_empty_chat_interface.png"))

        # Query 1: Historical / Evidence-based
        ai_input = page.query_selector("textarea, input[placeholder*='Ask']")
        if ai_input:
            ai_input.fill("What stuck pipe incidents occurred in the Digboi formation?")
            send_btn = page.query_selector("button[type='submit'], button:has-text('Send')")
            if send_btn:
                send_btn.click()
                page.wait_for_timeout(4000)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "09_nwis_ai_02_historical_query_result.png"))

        # Query 2: Prescriptive / Numerical safety query
        if ai_input:
            ai_input.fill("What exact mud weight and WOB should I use when drilling at 3200m depth?")
            send_btn = page.query_selector("button[type='submit'], button:has-text('Send')")
            if send_btn:
                send_btn.click()
                page.wait_for_timeout(4000)
                page.screenshot(path=os.path.join(OUTPUT_DIR, "09_nwis_ai_03_prescriptive_query_safety.png"))

        print("=== 10. CROSS-WELL CORRELATION ===")
        page.goto(f"{BASE_URL}/cross-well-correlation")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "10_cross_well_correlation_01_top_controls.png"))

        page.evaluate("window.scrollTo(0, 500)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "10_cross_well_correlation_02_lithology_matrix.png"))

        page.evaluate("window.scrollTo(0, 1000)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "10_cross_well_correlation_03_depth_alignment.png"))

        print("=== 11. OPERATIONS ANALYTICS ===")
        page.goto(f"{BASE_URL}/analytics")
        page.wait_for_timeout(3000)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_operations_analytics_01_kpis_and_efficiency.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_operations_analytics_02_npt_and_event_trends.png"))

        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "11_operations_analytics_03_formation_analytics.png"))

        print("=== 12. UPLOAD & PROCESS DOCUMENT ===")
        page.goto(f"{BASE_URL}/upload-processing")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "12_upload_process_01_dropzone_and_metadata.png"))

        # Check if test document can be attached or form filled
        well_input = page.query_selector("input[placeholder*='Well'], select[name*='well']")
        if well_input:
            if well_input.tag_name == "select":
                well_input.select_option(index=1)
            else:
                well_input.fill("WEL-001")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "12_upload_process_02_form_filled.png"))

        print("=== 13. AI EVIDENCE DETAIL ===")
        page.goto(f"{BASE_URL}/ai/evidence")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "13_ai_evidence_01_evidence_source_detail.png"))

        page.evaluate("window.scrollTo(0, 500)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "13_ai_evidence_02_text_snippet_and_metadata.png"))

        print("=== 14. USER PROFILE / ROLE MANAGEMENT ===")
        page.goto(f"{BASE_URL}/profile")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "14_user_profile_01_profile_overview.png"))

        edit_prof_btn = page.query_selector("button:has-text('Edit Profile')")
        if edit_prof_btn:
            edit_prof_btn.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "14_user_profile_02_edit_profile_modal.png"))
            cancel_btn = page.query_selector("button:has-text('Cancel'), button:has-text('Close')")
            if cancel_btn:
                cancel_btn.click()
                page.wait_for_timeout(500)

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "14_user_profile_03_role_permissions.png"))

        print("=== 15. SYSTEM SETTINGS ===")
        page.goto(f"{BASE_URL}/settings")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "15_system_settings_01_general_and_providers.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "15_system_settings_02_model_and_thresholds.png"))

        page.evaluate("window.scrollTo(0, 1200)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "15_system_settings_03_admin_controls.png"))

        print("=== 16. ACTIVITY & AUDIT LOG ===")
        page.goto(f"{BASE_URL}/audit")
        page.wait_for_timeout(2500)
        page.evaluate("window.scrollTo(0, 0)")
        page.screenshot(path=os.path.join(OUTPUT_DIR, "16_activity_audit_log_01_table.png"))

        page.evaluate("window.scrollTo(0, 600)")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "16_activity_audit_log_02_filtered.png"))

        # Click first row if exists
        audit_row = page.query_selector("table tbody tr")
        if audit_row:
            audit_row.click()
            page.wait_for_timeout(800)
            page.screenshot(path=os.path.join(OUTPUT_DIR, "16_activity_audit_log_03_entry_detail_modal.png"))

        print("=== 17. RESPONSIVE CHECKS ===")
        # Laptop viewport (1366x768)
        context_laptop = browser.new_context(viewport={"width": 1366, "height": 768})
        page_laptop = context_laptop.new_page()
        page_laptop.goto(f"{BASE_URL}/login")
        page_laptop.fill("#work-email", "demo@oilindia.in")
        page_laptop.fill("#password", "password123")
        page_laptop.click("#sign-in-btn")
        page_laptop.wait_for_timeout(2000)
        page_laptop.goto(f"{BASE_URL}/dashboard")
        page_laptop.wait_for_timeout(2000)
        page_laptop.screenshot(path=os.path.join(OUTPUT_DIR, "17_responsive_laptop_1366.png"))
        context_laptop.close()

        # Tablet viewport (1024x768)
        context_tablet = browser.new_context(viewport={"width": 1024, "height": 768})
        page_tablet = context_tablet.new_page()
        page_tablet.goto(f"{BASE_URL}/login")
        page_tablet.fill("#work-email", "demo@oilindia.in")
        page_tablet.fill("#password", "password123")
        page_tablet.click("#sign-in-btn")
        page_tablet.wait_for_timeout(2000)
        page_tablet.goto(f"{BASE_URL}/dashboard")
        page_tablet.wait_for_timeout(2000)
        page_tablet.screenshot(path=os.path.join(OUTPUT_DIR, "17_responsive_tablet_1024.png"))
        context_tablet.close()

        browser.close()

    print(f"DONE! Captured screenshots in {OUTPUT_DIR}")
    print(f"Console Errors Count: {len(console_logs)}")
    print(f"Network Errors Count: {len(network_errors)}")
    for log in console_logs:
        print("  -", log)

if __name__ == "__main__":
    run()
