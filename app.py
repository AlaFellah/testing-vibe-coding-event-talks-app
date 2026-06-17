import os
import requests
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup, NavigableString
import xml.etree.ElementTree as ET
from datetime import datetime

app = Flask(__name__)

# In-memory cache for release notes
cache = {
    'data': None,
    'last_updated': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes(xml_content):
    root = ET.fromstring(xml_content)
    # The namespace in Atom feeds
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', ns)
    
    parsed_items = []
    
    for entry in entries:
        entry_id_elem = entry.find('atom:id', ns)
        entry_id_text = entry_id_elem.text if entry_id_elem is not None else ""
        
        date_elem = entry.find('atom:title', ns)
        date_str = date_elem.text if date_elem is not None else ""
        
        updated_elem = entry.find('atom:updated', ns)
        updated_str = updated_elem.text if updated_elem is not None else ""
        
        # Parse link
        link_elem = entry.find('atom:link', ns)
        link_href = link_elem.attrib.get('href', 'https://cloud.google.com/bigquery/docs/release-notes') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or not content_elem.text:
            continue
            
        content_html = content_elem.text
        
        # Split entry content into items by heading tags (h3 or h4)
        soup = BeautifulSoup(content_html, 'html.parser')
        
        current_type = "Update"
        current_elements = []
        item_index = [0]
        
        def save_item(q_type, q_elements):
            if not q_elements:
                return
            
            html_parts = []
            text_parts = []
            for el in q_elements:
                if isinstance(el, NavigableString):
                    html_parts.append(str(el))
                    text_parts.append(str(el))
                else:
                    html_parts.append(str(el))
                    text_parts.append(el.get_text())
            
            content_h = "".join(html_parts).strip()
            # Clean up whitespace in text
            content_t = " ".join(" ".join(text_parts).split()).strip()
            
            if not content_t:
                return
                
            # Clean up the type string (e.g. remove trailing colons or whitespace)
            clean_type = q_type.strip().rstrip(':')
            if not clean_type:
                clean_type = "Update"
                
            parsed_items.append({
                'id': f"{entry_id_text}_{item_index[0]}",
                'date': date_str,
                'updated': updated_str,
                'link': link_href,
                'type': clean_type,
                'content_html': content_h,
                'content_text': content_t
            })
            item_index[0] += 1

        for child in soup.contents:
            if child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                save_item(current_type, current_elements)
                current_elements = []
                current_type = child.get_text().strip()
            else:
                current_elements.append(child)
                
        save_item(current_type, current_elements)
        
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or cache['data'] is None:
        try:
            response = requests.get(FEED_URL, timeout=10)
            response.raise_for_status()
            releases = parse_release_notes(response.content)
            
            cache['data'] = releases
            cache['last_updated'] = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        except Exception as e:
            if cache['data'] is not None:
                # Return cached data if feed fails
                return jsonify({
                    'releases': cache['data'],
                    'last_updated': cache['last_updated'],
                    'warning': f"Failed to refresh. Showing cached data. Error: {str(e)}"
                })
            return jsonify({'error': f"Failed to fetch feed: {str(e)}"}), 500
            
    return jsonify({
        'releases': cache['data'],
        'last_updated': cache['last_updated']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
