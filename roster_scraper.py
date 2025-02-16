#!/usr/bin/env python3
import subprocess
import sys
import psutil
import os

# Install required packages
def install_requirements():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "webdriver-manager"])

print("Installing required packages...")
install_requirements()

import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import time
import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from queue import Queue
import multiprocessing

def setup_driver():
    """Setup and return a Chrome driver with proper options"""
    chrome_options = Options()
    chrome_options.headless = False  # Set to False to see the browser
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Use webdriver_manager to handle ChromeDriver installation
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def get_team_ids():
    """Get all D1 team IDs from rankings page using Selenium to wait for content"""
    url = "https://www.swimcloud.com/country/usa/college/division/1/teams/?eventCourse=Y&gender=M&page=1&rankType=D&region=division_1&seasonId=28&sortBy=top50"
    
    driver = setup_driver()
    team_ids = []
    
    try:
        print("Loading page...")
        driver.get(url)
        
        print("Waiting for table to load...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "tbody"))
        )
        
        print("Page loaded, parsing content...")
        soup = BeautifulSoup(driver.page_source, "html.parser")
        
        # Find all team rows in the table
        for row in soup.find_all("tr"):
            try:
                link = row.find("a", href=lambda x: x and x.startswith("/team/"))
                if link:
                    team_id = link['href'].split('/')[2]
                    if team_id.isdigit():
                        team_name = link.find("strong").text.strip()
                        team_ids.append(team_id)
                        print(f"Found team: {team_name} (ID: {team_id})")
            except Exception as e:
                print(f"Error processing row: {e}")
                continue
                
    except Exception as e:
        print(f"Error loading page: {e}")
    finally:
        driver.quit()
    
    return list(set(team_ids))

def get_roster_ids(team_id):
    """Get all swimmer IDs from a team's roster using Selenium"""
    url = f"https://www.swimcloud.com/team/{team_id}/roster/"
    
    driver = setup_driver()
    swimmer_ids = []
    
    try:
        print(f"Loading roster for team {team_id}...")
        selenium_limiter.wait()  # Use slower limiter for Selenium
        driver.get(url)
        
        print("Waiting for roster table to load...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.TAG_NAME, "tbody"))
        )
        
        print("Roster loaded, parsing content...")
        soup = BeautifulSoup(driver.page_source, "html.parser")
        
        for link in soup.find_all("a", href=lambda x: x and x.startswith("/swimmer/")):
            try:
                swimmer_id = link['href'].split('/')[2]
                if swimmer_id.isdigit():
                    swimmer_ids.append(swimmer_id)
                    print(f"Found swimmer ID: {swimmer_id}")
            except:
                continue
                
    except Exception as e:
        print(f"Error loading roster: {e}")
    finally:
        driver.quit()
    
    return list(set(swimmer_ids))

# Adjust constants for rate limiting
NUM_WORKERS = 20  # Fixed number of workers
SELENIUM_DELAY = 2.0  # Delay for Selenium operations
SCRAPE_DELAY = 0.1  # Faster delay for individual swimmer scraping

# Add two rate limiters
class RateLimiter:
    def __init__(self, delay):
        self.delay = delay
        self.last_request = 0
        self.lock = threading.Lock()
        
    def wait(self):
        with self.lock:
            current_time = time.time()
            time_to_wait = self.last_request + self.delay - current_time
            if time_to_wait > 0:
                time.sleep(time_to_wait)
            self.last_request = time.time()

# Create separate limiters for different operations
selenium_limiter = RateLimiter(SELENIUM_DELAY)
scrape_limiter = RateLimiter(SCRAPE_DELAY)

def wait_for_cooldown(minutes):
    """Wait for specified minutes with countdown"""
    total_seconds = minutes * 60
    for remaining in range(total_seconds, 0, -1):
        minutes_left = remaining // 60
        seconds_left = remaining % 60
        print(f"\rCooldown: {minutes_left:02d}:{seconds_left:02d} remaining", end="")
        time.sleep(1)
    print("\nCooldown complete, resuming scraping...")

def scrape_swimmer(swimmer_id):
    """Scrape swimmer info with 403 error handling"""
    scrape_limiter.wait()  # Use faster limiter for scraping
    
    url = f"https://swimcloud.com/swimmer/{swimmer_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 403:
            raise Exception("403_ERROR")  # Special exception for 403
        if response.status_code == 429:
            print(f"Rate limited on swimmer {swimmer_id}, waiting 3 seconds...")
            time.sleep(3)
            return scrape_swimmer(swimmer_id)  # Retry
        if response.status_code != 200:
            print(f"Failed to fetch swimmer {swimmer_id} (HTTP {response.status_code})")
            return None
            
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Extract data using your existing scraping code
        name = None
        current_team = None
        header_div = soup.find("div", class_="c-toolbar__header-content")
        if header_div:
            h1 = header_div.find("h1", class_="c-toolbar__title")
            if h1:
                span = h1.find("span")
                if span:
                    name = span.get_text(strip=True)
            meta = header_div.find("div", class_="c-toolbar__meta")
            if meta:
                team_link = meta.find("a", href=lambda x: x and x.startswith("/team/"))
                if team_link:
                    current_team = team_link.get_text(strip=True)

        # Extract teams
        teams = []
        teams_ul = soup.find("ul", class_="c-list c-list--multiline")
        if teams_ul:
            team_items = teams_ul.find_all("li", class_="c-list__item")
            for item in team_items:
                team_anchor = item.find("a", href=lambda x: x and x.startswith("/team/"))
                if team_anchor:
                    team_name = team_anchor.get_text(strip=True)
                    if team_name and team_name not in teams:
                        teams.append(team_name)

        # Extract best times
        best_times = []
        rows = soup.find_all("tr")
        for row in rows:
            time_td = row.find("td", class_="u-text-end u-text-semi")
            event_td = row.find("td", class_="u-text-truncate")
            if time_td and event_td:
                time_value = time_td.get_text(strip=True)
                event_value = event_td.get_text(strip=True)
                best_times.append({
                    "event": event_value,
                    "time": time_value
                })

        return {
            "swimmer_id": swimmer_id,
            "name": name,
            "current_team": current_team,
            "teams": teams,
            "best_times": best_times
        }
        
    except Exception as e:
        if str(e) == "403_ERROR":
            raise  # Re-raise 403 error to be caught by scrape_team
        print(f"Error scraping swimmer {swimmer_id}: {e}")
        return None

def process_team(team_id):
    """Process a single team and its roster with rate limiting"""
    try:
        print(f"\nProcessing team {team_id}...")
        swimmer_ids = get_roster_ids(team_id)
        
        # Process swimmers in parallel but with limited concurrency
        swimmers = []
        with ThreadPoolExecutor(max_workers=min(NUM_WORKERS, len(swimmer_ids))) as executor:
            future_to_swimmer = {executor.submit(scrape_swimmer, sid): sid 
                               for sid in swimmer_ids}
            
            for future in as_completed(future_to_swimmer):
                sid = future_to_swimmer[future]
                try:
                    result = future.result()
                    if result:
                        swimmers.append(result)
                        print(f"Scraped swimmer {sid}")
                except Exception as e:
                    print(f"Error scraping swimmer {sid}: {e}")
        
        return swimmers
    except Exception as e:
        print(f"Error processing team {team_id}: {e}")
        return []

def save_roster_ids():
    """First phase: Get and save all roster IDs using parallel processing"""
    print("Phase 1: Collecting roster IDs...")
    
    # Get all team IDs
    team_ids = get_team_ids()
    print(f"Found {len(team_ids)} teams")
    
    # Dictionary to store team->roster mappings
    team_rosters = {}
    
    # Process teams in parallel
    with ThreadPoolExecutor(max_workers=50) as executor:  # Increased workers for roster collection
        future_to_team = {executor.submit(get_roster_ids, tid): tid for tid in team_ids}
        
        for future in as_completed(future_to_team):
            tid = future_to_team[future]
            try:
                swimmer_ids = future.result()
                if swimmer_ids:
                    team_rosters[tid] = swimmer_ids
                    print(f"Got {len(swimmer_ids)} swimmers for team {tid}")
            except Exception as e:
                print(f"Error getting roster for team {tid}: {e}")
    
    # Save to JSON file
    with open('rosters.json', 'w') as f:
        json.dump(team_rosters, f)
    print(f"\nSaved roster IDs for {len(team_rosters)} teams to rosters.json")

def scrape_team(team_id, swimmer_ids):
    """Second phase: Scrape a specific team's swimmers with 403 handling"""
    print(f"\nProcessing team {team_id} with {len(swimmer_ids)} swimmers...")
    
    while True:  # Keep trying until successful or all swimmers done
        try:
            # Check for existing file and get already scraped swimmers
            output_file = f"output/team_{team_id}_roster.xlsx"
            scraped_swimmers = set()
            if os.path.exists(output_file):
                try:
                    existing_df = pd.read_excel(output_file)
                    scraped_swimmers = set(str(sid) for sid in existing_df['Swimmer ID'])
                    print(f"Found {len(scraped_swimmers)} already scraped swimmers")
                except Exception as e:
                    print(f"Error reading existing file: {e}")
            
            # Filter out already scraped swimmers
            swimmers_to_scrape = [sid for sid in swimmer_ids if str(sid) not in scraped_swimmers]
            print(f"{len(swimmers_to_scrape)} swimmers remaining to scrape")
            
            if not swimmers_to_scrape:
                print("All swimmers already scraped!")
                return []
            
            # Scrape remaining swimmers
            swimmers = []
            with ThreadPoolExecutor(max_workers=min(NUM_WORKERS, len(swimmers_to_scrape))) as executor:
                future_to_swimmer = {executor.submit(scrape_swimmer, sid): sid 
                                   for sid in swimmers_to_scrape}
                
                for future in as_completed(future_to_swimmer):
                    sid = future_to_swimmer[future]
                    try:
                        result = future.result()
                        if result:
                            swimmers.append(result)
                            print(f"Scraped swimmer {sid}")
                            
                            # Save progress after each swimmer
                            if swimmers:
                                save_to_excel(swimmers, output_file, mode='append')
                                swimmers = []  # Clear after saving
                                
                    except Exception as e:
                        if str(e) == "403_ERROR":
                            print("\nReceived 403 error - IP might be blocked")
                            print("Starting 5-minute cooldown...")
                            wait_for_cooldown(5)
                            raise  # Re-raise to restart the team
                        print(f"Error scraping swimmer {sid}: {e}")
            
            return swimmers  # Successfully completed
            
        except Exception as e:
            if str(e) == "403_ERROR":
                continue  # Restart the team after cooldown
            print(f"Error processing team {team_id}: {e}")
            return []

def scrape_teams():
    """Second phase: Process saved rosters with redo option"""
    print("\nPhase 2: Processing saved rosters...")
    
    # Load saved roster IDs
    try:
        with open('rosters.json', 'r') as f:
            team_rosters = json.load(f)
    except FileNotFoundError:
        print("Error: rosters.json not found. Run save_roster_ids() first.")
        return
    
    print(f"Loaded {len(team_rosters)} teams from rosters.json")
    
    # Get list of already processed teams
    processed_teams = set()
    if os.path.exists("output"):
        for filename in os.listdir("output"):
            if filename.startswith("team_") and filename.endswith("_roster.xlsx"):
                team_id = filename.split("_")[1]
                processed_teams.add(team_id)
        if processed_teams:
            print(f"\nFound {len(processed_teams)} already processed teams:")
            for tid in processed_teams:
                print(f"Team {tid}: already processed")
    
    # Get unprocessed teams
    unprocessed_teams = [tid for tid in team_rosters.keys() if tid not in processed_teams]
    print(f"\n{len(unprocessed_teams)} teams remaining to process")
    
    # Ask user what they want to do
    print("\nOptions:")
    print("1. Process remaining teams")
    print("2. Redo specific team")
    choice = input("Enter your choice (1 or 2): ")
    
    if choice == "1":
        # Process remaining teams
        print("\nProcessing remaining teams:")
        for team_id in unprocessed_teams:
            print(f"Team {team_id}: {len(team_rosters[team_id])} swimmers")
            try:
                print(f"\nProcessing team {team_id}...")
                swimmers = scrape_team(team_id, team_rosters[team_id])
                if swimmers:
                    print(f"Successfully processed team {team_id}")
                else:
                    print(f"No new swimmers processed for team {team_id}")
            except Exception as e:
                print(f"Error processing team {team_id}: {e}")
                continue
    
    elif choice == "2":
        # Redo specific team
        print("\nAvailable teams to redo:")
        all_teams = sorted(team_rosters.keys())
        for i, tid in enumerate(all_teams, 1):
            swimmer_count = len(team_rosters[tid])
            status = "processed" if tid in processed_teams else "not processed"
            print(f"{i}. Team {tid}: {swimmer_count} swimmers ({status})")
        
        try:
            team_idx = int(input("\nEnter team number to redo: ")) - 1
            if 0 <= team_idx < len(all_teams):
                team_id = all_teams[team_idx]
                
                # Delete existing file if it exists
                output_file = f"output/team_{team_id}_roster.xlsx"
                if os.path.exists(output_file):
                    os.remove(output_file)
                    print(f"Deleted existing file for team {team_id}")
                
                # Process team
                print(f"\nRedoing team {team_id}...")
                swimmers = scrape_team(team_id, team_rosters[team_id])
                if swimmers:
                    print(f"Successfully reprocessed team {team_id}")
                else:
                    print(f"Failed to reprocess team {team_id}")
            else:
                print("Invalid team number")
        except ValueError:
            print("Invalid input")
    
    else:
        print("Invalid choice")
    
    print("\nScraping complete")

def save_to_excel(results, filename, mode='write'):
    """Thread-safe Excel saving with append mode"""
    if not results:
        return
        
    # Ensure output directory exists
    os.makedirs("output", exist_ok=True)
    
    flattened = []
    for res in results:
        if res:
            teams_str = ", ".join(res["teams"]) if res["teams"] else ""
            best_times_str = "; ".join([f"{bt['event']}: {bt['time']}" 
                                      for bt in res["best_times"]]) if res["best_times"] else ""
            flattened.append({
                "Swimmer ID": res["swimmer_id"],
                "Name": res["name"],
                "Current Team": res["current_team"],
                "Teams": teams_str,
                "Best Times": best_times_str
            })
    
    # Use a lock for thread-safe file writing
    with threading.Lock():
        df = pd.DataFrame(flattened)
        if mode == 'append' and os.path.exists(filename):
            existing_df = pd.read_excel(filename)
            df = pd.concat([existing_df, df], ignore_index=True)
        df.to_excel(filename, index=False)
        print(f"Saved {len(results)} swimmers to {filename}")

def cleanup_chrome():
    """Close all Chrome windows and chromedriver processes"""
    print("Cleaning up Chrome processes...")
    
    # Kill Chrome processes
    for proc in psutil.process_iter(['name']):
        try:
            # Check for both Chrome and ChromeDriver
            if proc.info['name'] and ('chrome' in proc.info['name'].lower() or 
                                    'chromedriver' in proc.info['name'].lower()):
                proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    print("Cleanup complete")

def get_swimmer_info(swimmer_id):
    """Get profile image URL and social media links from swimmer's page"""
    url = f"https://www.swimcloud.com/swimmer/{swimmer_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Get profile image - updated selector
            media_div = soup.find('div', {'class': 'c-toolbar__media-user'})
            profile_image = None
            if media_div:
                img = media_div.find('img')
                if img and 'src' in img.attrs:
                    profile_image = img['src']
            
            # Get social media links
            social_links = {}
            social_list = soup.find('ul', {'class': 'o-list-inline'})
            if social_list:
                for link in social_list.find_all('a', {'class': 'btn-icon-plain'}):
                    href = link.get('href', '')
                    if 'twitter.com' in href or 'x.com' in href:
                        social_links['twitter'] = href
                    elif 'instagram.com' in href:
                        social_links['instagram'] = href
            
            return {
                'profile_image': profile_image,
                'twitter': social_links.get('twitter'),
                'instagram': social_links.get('instagram')
            }
            
        return None
    except Exception as e:
        print(f"Error fetching info for swimmer {swimmer_id}: {e}")
        return None

def add_profile_images():
    """Add profile images and social media links to existing roster files"""
    print("\nAdding profile images and social media links to roster files...")
    
    # Get list of roster files
    if not os.path.exists("output"):
        print("Error: output directory not found")
        return
        
    roster_files = [f for f in os.listdir("output") if f.endswith("_roster.xlsx")]
    if not roster_files:
        print("No roster files found in output directory")
        return
    
    print(f"\nFound {len(roster_files)} roster files:")
    for i, filename in enumerate(roster_files, 1):
        print(f"{i}. {filename}")
    
    try:
        file_idx = int(input("\nEnter file number to process (0 for all): ")) - 1
        
        files_to_process = roster_files[file_idx:file_idx+1] if file_idx >= 0 else roster_files
        
        for filename in files_to_process:
            print(f"\nProcessing {filename}...")
            filepath = os.path.join("output", filename)
            
            # Read existing file
            df = pd.read_excel(filepath)
            
            # Check for existing columns
            new_columns = ['Profile Image', 'Twitter', 'Instagram']
            existing_columns = [col for col in new_columns if col in df.columns]
            if existing_columns:
                columns_str = ", ".join(existing_columns)
                choice = input(f"{columns_str} column(s) already exist. Overwrite? (y/n): ")
                if choice.lower() != 'y':
                    continue
            
            # Process each swimmer
            profile_images = []
            twitter_links = []
            instagram_links = []
            
            for idx, row in df.iterrows():
                swimmer_id = str(row['Swimmer ID'])
                print(f"Getting info for {row['Name']} (ID: {swimmer_id})...", end=' ', flush=True)
                
                info = get_swimmer_info(swimmer_id)
                if info:
                    profile_images.append(info['profile_image'])
                    twitter_links.append(info['twitter'])
                    instagram_links.append(info['instagram'])
                    
                    found_items = []
                    if info['profile_image']: found_items.append('image')
                    if info['twitter']: found_items.append('twitter')
                    if info['instagram']: found_items.append('instagram')
                    
                    print(f"Found: {', '.join(found_items) if found_items else 'none'}")
                else:
                    profile_images.append(None)
                    twitter_links.append(None)
                    instagram_links.append(None)
                    print('none')
                
                # Add small delay to avoid rate limiting
                time.sleep(0.5)
            
            # Add/update columns
            df['Profile Image'] = profile_images
            df['Twitter'] = twitter_links
            df['Instagram'] = instagram_links
            
            # Save updated file
            df.to_excel(filepath, index=False)
            print(f"\nUpdated {filepath}")
            print(f"Added {sum(1 for url in profile_images if url)} profile images")
            print(f"Added {sum(1 for url in twitter_links if url)} Twitter links")
            print(f"Added {sum(1 for url in instagram_links if url)} Instagram links")
            
    except ValueError:
        print("Invalid input")
    except IndexError:
        print("Invalid file number")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    try:
        # Update menu choices
        print("1. Collect roster IDs")
        print("2. Scrape/redo swimmers")
        print("3. Add profile images")
        print("4. Cleanup Chrome")
        
        choice = input("Enter your choice (1-4): ")
        if choice == '1':
            save_roster_ids()
        elif choice == '2':
            scrape_teams()
        elif choice == '3':
            add_profile_images()
        elif choice == '4':
            cleanup_chrome()
        else:
            print("Invalid choice")
    finally:
        cleanup_chrome() 