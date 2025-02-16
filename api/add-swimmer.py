import json
import requests
from bs4 import BeautifulSoup
import os
from supabase import create_client

def get_swimmer_data(swimmer_id):
    url = f"https://www.swimcloud.com/swimmer/{swimmer_id}/"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception("Failed to fetch swimmer data")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Get basic info
    name = soup.find('h1', {'class': 'c-toolbar__title'}).text.strip()
    team = soup.find('div', {'class': 'c-toolbar__subtitle'}).text.strip()
    
    # Get profile image
    profile_image = None
    media_div = soup.find('div', {'class': 'c-toolbar__media-user'})
    if media_div:
        img = media_div.find('img')
        if img and 'src' in img.attrs:
            profile_image = img['src']
    
    # Get best times
    best_times = {}
    times_table = soup.find('table', {'class': 'c-table-clean'})
    if times_table:
        for row in times_table.find_all('tr')[1:]:  # Skip header row
            cols = row.find_all('td')
            if len(cols) >= 2:
                event = cols[0].text.strip()
                time = cols[1].text.strip()
                best_times[event] = {
                    'time': time,
                    'seconds': convert_time_to_seconds(time)
                }
    
    # Get social media links
    social_links = soup.find_all('a', {'class': 'c-social-link'})
    twitter = None
    instagram = None
    for link in social_links:
        href = link.get('href', '')
        if 'twitter.com' in href:
            twitter = href
        elif 'instagram.com' in href:
            instagram = href
    
    return {
        'id': swimmer_id,
        'name': name,
        'team': team,
        'best_times': best_times,
        'profile_image': profile_image,
        'twitter': twitter,
        'instagram': instagram,
        'elo': 1500,  # Default ELO
        'ratings_count': 0
    }

def handler(event, context):
    try:
        body = json.loads(event['body'])
        swimmer_id = body['swimmerId']
        
        # Get swimmer data
        swimmer_data = get_swimmer_data(swimmer_id)
        
        # Update Supabase
        supabase = create_client(
            os.environ.get('SUPABASE_URL'),
            os.environ.get('SUPABASE_KEY')
        )
        
        result = supabase.table('swimmer_ratings').upsert({
            'id': swimmer_data['id'],
            'name': swimmer_data['name'],
            'team': swimmer_data['team'],
            'elo': swimmer_data['elo'],
            'ratings_count': swimmer_data['ratings_count']
        }).execute()
        
        return {
            'statusCode': 200,
            'body': json.dumps(swimmer_data)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        } 