// State Management
let releases = [];
let selectedReleaseId = null;
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const feedList = document.getElementById('feedList');
const feedLoader = document.getElementById('feedLoader');
const feedError = document.getElementById('feedError');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterTabs = document.querySelectorAll('.filter-tab');

const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const refreshSpinner = document.getElementById('refreshSpinner');
const lastUpdatedLabel = document.getElementById('lastUpdatedLabel');
const resultsCount = document.getElementById('resultsCount');

// Composer DOM Elements
const composerSidebar = document.getElementById('composerSidebar');
const closeComposerBtn = document.getElementById('closeComposerBtn');
const composerEmptyState = document.getElementById('composerEmptyState');
const composerForm = document.getElementById('composerForm');
const composerBadge = document.getElementById('composerBadge');
const composerDate = document.getElementById('composerDate');
const tweetTextArea = document.getElementById('tweetTextArea');
const charCount = document.getElementById('charCount');
const charProgressRing = document.getElementById('charProgressRing');
const tweetSubmitBtn = document.getElementById('tweetSubmitBtn');
const toastContainer = document.getElementById('toastContainer');

// Constants
const CHAR_LIMIT = 280;
const RING_CIRCUMFERENCE = 56.54; // 2 * PI * r (r=9)

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchReleases();
});

// Event Listeners
function initEventListeners() {
    // Refresh buttons
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        toggleClearSearchButton();
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        toggleClearSearchButton();
        searchInput.focus();
        renderFeed();
    });

    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderFeed();
        });
    });

    // Composer Input & Submits
    tweetTextArea.addEventListener('input', updateCharCount);
    tweetSubmitBtn.addEventListener('click', publishTweet);

    // Sidebar close (Mobile)
    closeComposerBtn.addEventListener('click', () => {
        composerSidebar.classList.remove('active');
    });

    // Handle escape key to clear selection or close drawer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (composerSidebar.classList.contains('active')) {
                composerSidebar.classList.remove('active');
            }
        }
    });
}

// Toggle Clear Search Button Visibility
function toggleClearSearchButton() {
    if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
    } else {
        clearSearchBtn.classList.add('hidden');
    }
}

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        releases = data.releases || [];
        lastUpdatedLabel.textContent = `Updated: ${data.last_updated || 'Just now'}`;
        
        if (data.warning) {
            showToast(data.warning, 'info');
        } else if (forceRefresh) {
            showToast('Release notes updated successfully!', 'success');
        }

        showError(null);
        renderFeed();

        // If previously selected card is gone, reset composer
        if (selectedReleaseId && !releases.some(r => r.id === selectedReleaseId)) {
            resetComposer();
        } else if (selectedReleaseId) {
            // Re-select to update UI if data refreshed
            selectRelease(selectedReleaseId, false);
        }

    } catch (error) {
        console.error("Failed to load releases:", error);
        showError(error.message);
        showToast('Failed to fetch latest release notes.', 'error');
    } finally {
        showLoading(false);
    }
}

// Show/Hide loaders
function showLoading(isLoading) {
    if (isLoading) {
        feedLoader.classList.remove('hidden');
        feedList.classList.add('hidden');
        feedError.classList.add('hidden');
        
        refreshIcon.classList.add('hidden');
        refreshSpinner.classList.remove('hidden');
        refreshBtn.disabled = true;
    } else {
        feedLoader.classList.add('hidden');
        feedList.classList.remove('hidden');
        
        refreshIcon.classList.remove('hidden');
        refreshSpinner.classList.add('hidden');
        refreshBtn.disabled = false;
    }
}

// Show/Hide error layout
function showError(msg) {
    if (msg) {
        errorMessage.textContent = msg;
        feedError.classList.remove('hidden');
        feedList.classList.add('hidden');
        feedLoader.classList.add('hidden');
    } else {
        feedError.classList.add('hidden');
    }
}

// Render the feed cards
function renderFeed() {
    feedList.innerHTML = '';
    
    // Filter logic
    const filtered = releases.filter(item => {
        // Category Filter
        const matchesCategory = (currentFilter === 'all') || 
                               (item.type.toLowerCase() === currentFilter);
        
        // Search Filter
        const matchesSearch = !searchQuery || 
                             item.date.toLowerCase().includes(searchQuery) ||
                             item.type.toLowerCase().includes(searchQuery) ||
                             item.content_text.toLowerCase().includes(searchQuery);
                             
        return matchesCategory && matchesSearch;
    });

    resultsCount.textContent = `Showing ${filtered.length} update${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        feedList.innerHTML = `
            <div class="empty-state">
                <p>No release notes found matching your search or filters.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const isSelected = item.id === selectedReleaseId;
        const card = document.createElement('article');
        card.className = `release-card ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-id', item.id);
        
        // Class for the type badge
        const badgeClass = getBadgeClass(item.type);

        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge ${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <div class="card-actions">
                    <div class="select-indicator"></div>
                </div>
            </div>
            <div class="card-body">
                ${item.content_html}
            </div>
            <div class="card-footer">
                <button class="tweet-shortcut-btn" title="Tweet about this update">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    <span>Draft Tweet</span>
                </button>
            </div>
        `;

        // Card select click listener
        card.addEventListener('click', (e) => {
            // If they clicked on a link in the card body, let it navigate normally
            if (e.target.tagName === 'A') {
                return;
            }
            selectRelease(item.id);
        });

        // "Draft Tweet" button shortcut
        const tweetBtn = card.querySelector('.tweet-shortcut-btn');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card event double trigger
            selectRelease(item.id);
            // Focus on textarea immediately
            tweetTextArea.focus();
        });

        feedList.appendChild(card);
    });
}

// Helper to get styling class for BQ badges
function getBadgeClass(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'badge-feature';
    if (t.includes('announcement')) return 'badge-announcement';
    if (t.includes('deprecation')) return 'badge-deprecation';
    if (t.includes('issue') || t.includes('bug') || t.includes('breaking')) return 'badge-issue';
    return 'badge-update';
}

// Select a release card and populate composer
function selectRelease(id, focusComposer = true) {
    const prevSelected = document.querySelector('.release-card.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }

    selectedReleaseId = id;
    const item = releases.find(r => r.id === id);
    
    if (!item) {
        resetComposer();
        return;
    }

    // Highlight the selected card in UI
    const card = document.querySelector(`.release-card[data-id="${id}"]`);
    if (card) {
        card.classList.add('selected');
    }

    // Update Composer Content
    composerEmptyState.classList.add('hidden');
    composerForm.classList.remove('hidden');
    
    // Set meta
    composerBadge.className = `badge ${getBadgeClass(item.type)}`;
    composerBadge.textContent = item.type;
    composerDate.textContent = item.date;
    
    // Draft tweet text
    tweetTextArea.value = generateDefaultTweetText(item);
    
    // Trigger update counters
    updateCharCount();

    // Trigger sidebar toggle (useful on mobile viewports)
    composerSidebar.classList.add('active');
    
    if (focusComposer) {
        // Smoothly scroll the composer into view if on mobile, or focus
        tweetTextArea.focus();
    }
}

// Reset composer state
function resetComposer() {
    selectedReleaseId = null;
    composerEmptyState.classList.remove('hidden');
    composerForm.classList.add('hidden');
    
    const selected = document.querySelector('.release-card.selected');
    if (selected) {
        selected.classList.remove('selected');
    }
}

// Generate the smart tweet template
function generateDefaultTweetText(item) {
    const typeLabel = item.type.toUpperCase();
    const cleanDate = item.date;
    const docLink = item.link;
    
    // Draft layout: 
    // "BigQuery [TYPE] ([Date]): [Snippet]... Read more: [Link] #BigQuery #GoogleCloud"
    const prefix = `BigQuery ${typeLabel} (${cleanDate}): `;
    const suffix = `\n\nRead more: ${docLink} #BigQuery #GoogleCloud`;
    
    // Calculate space remaining for description snippet
    const maxSnippetLen = CHAR_LIMIT - (prefix.length + suffix.length) - 4; // safety margins
    
    let snippet = item.content_text;
    if (snippet.length > maxSnippetLen) {
        snippet = snippet.substring(0, maxSnippetLen - 3) + "...";
    }
    
    return `${prefix}${snippet}${suffix}`;
}

// Update Character Count and SVG Progress Ring
function updateCharCount() {
    const textLength = tweetTextArea.value.length;
    charCount.textContent = textLength;

    // SVG Ring Calculation
    const progress = Math.min(textLength / CHAR_LIMIT, 1);
    const offset = RING_CIRCUMFERENCE - (progress * RING_CIRCUMFERENCE);
    charProgressRing.style.strokeDashoffset = offset;

    // Coloring classes for warning threshold
    if (textLength >= CHAR_LIMIT) {
        charCount.style.color = '#ef4444';
        charProgressRing.className.baseVal = 'ring-progress exceeded';
        tweetSubmitBtn.disabled = false; // X allows long tweets, but warn them, or block? Let's keep it enabled but warn.
    } else if (textLength >= CHAR_LIMIT - 30) {
        charCount.style.color = '#fbbf24';
        charProgressRing.className.baseVal = 'ring-progress warning';
        tweetSubmitBtn.disabled = false;
    } else {
        charCount.style.color = 'var(--text-secondary)';
        charProgressRing.className.baseVal = 'ring-progress';
        tweetSubmitBtn.disabled = false;
    }

    if (textLength === 0) {
        tweetSubmitBtn.disabled = true;
    }
}

// Open Twitter web intent
function publishTweet() {
    const text = tweetTextArea.value.trim();
    if (!text) {
        showToast('Tweet content cannot be empty.', 'error');
        return;
    }

    // Standard Twitter intent URL
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Show toast and open popup window
    showToast('Redirecting to Twitter / X...', 'success');
    
    // Open in a centered popup window
    const width = 550;
    const height = 420;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
        tweetUrl, 
        'Publish Tweet', 
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Set icon based on toast type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.085 1.085l-.04.04m-6.162 4.487a8.25 8.25 0 1111.69 0l-11.69 0z"/></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Fade out after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 350);
    }, 4000);
}
