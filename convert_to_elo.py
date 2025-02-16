import pandas as pd
import json
import os
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from tqdm import tqdm
import time
from supabase import create_client, Client
from dotenv import load_dotenv
import argparse
import sys

# Load environment variables
load_dotenv()
supabase: Client = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

# Add a rate limiter to prevent overloading
class RateLimiter:
    def __init__(self, max_per_second=10):
        self.lock = threading.Lock()
        self.last_request = 0
        self.min_interval = 1.0 / max_per_second

    def wait(self):
        with self.lock:
            elapsed = time.time() - self.last_request
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)
            self.last_request = time.time()

rate_limiter = RateLimiter(max_per_second=20)  # Adjust rate as needed

def convert_times_to_seconds(time_str):
    """Convert swimming time string to seconds"""
    if not isinstance(time_str, str):
        return None
    
    try:
        # Remove any whitespace
        time_str = time_str.strip()
        
        # Handle minute:second.millisecond format
        if ':' in time_str:
            minutes, rest = time_str.split(':')
            if '.' in rest:
                seconds, milliseconds = rest.split('.')
                return float(minutes) * 60 + float(seconds) + float(milliseconds) / 100
            else:
                return float(minutes) * 60 + float(rest)
        # Handle second.millisecond format
        elif '.' in time_str:
            seconds, milliseconds = time_str.split('.')
            return float(seconds) + float(milliseconds) / 100
        # Handle just seconds
        else:
            return float(time_str)
    except Exception as e:
        print(f"Error converting time {time_str}: {e}")
        return None

def get_profile_image(swimmer_id):
    """Get profile image URL from swimmer page"""
    try:
        url = f"https://www.collegeswimming.com/swimmer/{swimmer_id}/"
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Look for profile image in the media-user div
            media_div = soup.find('div', {'class': 'c-toolbar__media-user'})
            if media_div:
                img = media_div.find('img')
                if img and 'src' in img.attrs:
                    return img['src']
    except Exception as e:
        print(f"Error fetching profile for {swimmer_id}: {e}")
    return None

def process_swimmer(row):
    """Process a single swimmer (for parallel processing)"""
    try:
        swimmer_id = str(row['Swimmer ID'])
        
        # Get profile image URL from swimmer page
        profile_image = get_profile_image(swimmer_id) if not pd.notna(row.get('Profile Image')) else row.get('Profile Image')
        
        name_parts = row['Name'].split()
        initials = ''.join(part[0] for part in name_parts if part)[:2].upper()
        
        # Parse best times into structured format
        best_times = {}
        if isinstance(row['Best Times'], str):
            for time_entry in row['Best Times'].split(';'):
                try:
                    parts = time_entry.strip().split(':', 1)
                    if len(parts) == 2:
                        event = parts[0].strip()
                        time = parts[1].strip()
                        seconds = convert_times_to_seconds(time)
                        if seconds:
                            best_times[event] = {
                                'time': time,
                                'seconds': seconds
                            }
                except Exception as e:
                    continue

        # Clean social media links
        twitter = row.get('Twitter')
        twitter = None if pd.isna(twitter) else twitter
        instagram = row.get('Instagram')
        instagram = None if pd.isna(instagram) else instagram

        return {
            'id': swimmer_id,
            'name': row['Name'],
            'team': row['Current Team'] if pd.notna(row['Current Team']) else "Unknown",
            'best_times': best_times,
            'elo': 1500,
            'ratings_count': 0,
            'profile_image': profile_image,
            'initials': initials if not profile_image else None,
            'twitter': twitter,
            'instagram': instagram
        }
    except Exception as e:
        print(f"Error processing swimmer {row.get('Name', 'Unknown')}: {e}")
        return None

def process_excel_files():
    """Convert all Excel files to a single JSON with ELO ratings using parallel processing"""
    output_dir = Path("output")
    swimmers = {}
    
    # Get total number of swimmers for progress bar
    total_swimmers = 0
    dfs = []
    for excel_file in output_dir.glob("team_*_roster.xlsx"):
        df = pd.read_excel(excel_file)
        total_swimmers += len(df)
        dfs.append(df)
        print(f"Found {len(df)} swimmers in {excel_file.name}")

    print(f"\nProcessing {total_swimmers} swimmers...")
    
    # Process all swimmers in parallel
    with ThreadPoolExecutor(max_workers=min(32, os.cpu_count() * 4)) as executor:
        futures = []
        for df in dfs:
            for _, row in df.iterrows():
                futures.append(executor.submit(process_swimmer, row))
        
        # Process results with progress bar
        with tqdm(total=len(futures), desc="Converting swimmers") as pbar:
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        swimmers[result['id']] = result
                    pbar.update(1)
                except Exception as e:
                    print(f"Error processing swimmer: {e}")
                    pbar.update(1)
    
    # Custom JSON encoder to handle NaN values
    class CustomJSONEncoder(json.JSONEncoder):
        def default(self, obj):
            if pd.isna(obj) or obj is pd.NaT:
                return None
            return super().default(obj)
        
        def encode(self, obj):
            if isinstance(obj, dict):
                return super().encode({
                    k: (None if pd.isna(v) else v)
                    for k, v in obj.items()
                })
            return super().encode(obj)

    # Save to JSON file with custom encoder
    os.makedirs('public', exist_ok=True)
    with open('public/swimmers.json', 'w') as f:
        json.dump(swimmers, f, cls=CustomJSONEncoder)
    
    print(f"\nProcessed {len(swimmers)} swimmers successfully")
    print(f"Data saved to public/swimmers.json")

    # Update Supabase - also handle NaN values
    print("\nUpdating Supabase database...")
    supabase_data = []
    for swimmer in swimmers.values():
        # Convert any NaN values to None for Supabase
        clean_swimmer = {
            'id': swimmer['id'],
            'name': swimmer['name'],
            'team': None if pd.isna(swimmer['team']) else swimmer['team'],
            'elo': float(swimmer['elo']),  # Ensure it's a float
            'ratings_count': int(swimmer['ratings_count'])  # Ensure it's an int
        }
        supabase_data.append(clean_swimmer)

    try:
        # Just use upsert to update/insert records
        batch_size = 100
        for i in range(0, len(supabase_data), batch_size):
            batch = supabase_data[i:i + batch_size]
            result = supabase.table('swimmer_ratings').upsert(batch).execute()
            print(f"Updated batch {i//batch_size + 1}/{(len(supabase_data) + batch_size - 1)//batch_size}")
        
        print("Supabase update complete!")
    except Exception as e:
        print(f"Error updating Supabase: {e}")

# Add this at the top with other imports
parser = argparse.ArgumentParser()
parser.add_argument('--single-swimmer', type=str, help='Process a single swimmer ID')
args = parser.parse_args()

# Add this new function
def fetch_single_swimmer(swimmer_id):
    """Fetch data for a single swimmer from SwimCloud"""
    try:
        url = f"https://www.swimcloud.com/swimmer/{swimmer_id}/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch swimmer data: Status {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get basic info
        name = soup.find('h1', {'class': 'c-toolbar__title'}).text.strip()
        
        # Get team name from the toolbar meta section
        team = "Unknown"
        meta_div = soup.find('div', {'class': 'c-toolbar__meta'})
        if meta_div:
            team_link = meta_div.find('a', href=lambda x: x and x.startswith('/team/'))
            if team_link:
                team = team_link.text.strip()
        
        # Get best times using the same approach as roster_scraper.py
        best_times = {}
        
        # Find all rows in the page
        rows = soup.find_all("tr")
        for row in rows:
            time_td = row.find("td", class_="u-text-end u-text-semi")
            event_td = row.find("td", class_="u-text-truncate")
            if time_td and event_td:
                event = event_td.text.strip()
                time = time_td.text.strip()
                
                # Only process if we have both event and time
                if event and time:
                    seconds = convert_times_to_seconds(time)
                    if seconds:
                        # Format event name consistently
                        event_parts = event.split()
                        if len(event_parts) >= 3:
                            distance = event_parts[0]
                            course = event_parts[1][0].upper()  # Take first letter (Y/M) and capitalize
                            stroke = ' '.join(event_parts[2:]).upper()  # Rest is the stroke
                            formatted_event = f"{distance} {course} {stroke}"
                            
                            # Only update if it's a faster time or if we don't have this event yet
                            if formatted_event not in best_times or seconds < best_times[formatted_event]['seconds']:
                                best_times[formatted_event] = {
                                    'time': time,
                                    'seconds': seconds
                                }
                                print(f"Added/Updated time for {formatted_event}: {time} ({seconds}s)")
        
        # Get profile image
        profile_image = None
        media_div = soup.find('div', {'class': 'c-toolbar__media-user'})
        if media_div:
            img = media_div.find('img')
            if img and 'src' in img.attrs:
                profile_image = img['src']
        
        # Get social media links
        social_links = soup.find_all('a', {'class': 'btn-icon-plain'})
        twitter = None
        instagram = None
        for link in social_links:
            href = link.get('href', '')
            if 'twitter.com' in href:
                twitter = href
            elif 'instagram.com' in href:
                instagram = href
        
        # Create swimmer data
        swimmer_data = {
            'id': swimmer_id,
            'name': name,
            'team': team,
            'best_times': best_times,
            'elo': 1500,
            'ratings_count': 0,
            'profile_image': profile_image,
            'initials': ''.join(part[0] for part in name.split()[:2]).upper(),
            'twitter': twitter,
            'instagram': instagram
        }
        
        # Update Supabase
        supabase.table('swimmer_ratings').upsert({
            'id': swimmer_id,
            'name': name,
            'team': team,
            'elo': 1500,
            'ratings_count': 0
        }).execute()
        
        return swimmer_data
        
    except Exception as e:
        print(f"Error fetching swimmer {swimmer_id}: {e}", file=sys.stderr)
        return None

# Modify the main execution
if __name__ == "__main__":
    if args.single_swimmer:
        # Process single swimmer
        swimmer_data = fetch_single_swimmer(args.single_swimmer)
        if swimmer_data:
            # Print debug info to stderr
            print(f"\nScraping times for {swimmer_data['name']}...", file=sys.stderr)
            print(f"Team: {swimmer_data['team']}", file=sys.stderr)
            print("\nBest Times:", file=sys.stderr)
            print("-" * 40, file=sys.stderr)
            for event, data in swimmer_data['best_times'].items():
                print(f"{event:<30} {data['time']:>10}", file=sys.stderr)
            print("-" * 40, file=sys.stderr)
            print(f"Total events found: {len(swimmer_data['best_times'])}\n", file=sys.stderr)
            
            # Print only the JSON data to stdout
            print(json.dumps(swimmer_data))
        else:
            print(json.dumps({"error": "Failed to fetch swimmer data"}))
    else:
        # Normal processing of all swimmers
        process_excel_files() 