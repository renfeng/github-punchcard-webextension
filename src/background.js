/*
 * https://stackoverflow.com/questions/17377337/where-to-find-extensions-installed-folder-for-google-chrome-on-mac
 */

/*
 * Punchcard will be added to the menu on the pages under Insights.
 *  - Pulse (pulse)
 *  - Contributors (graphs/contributors)
 *  - Community (community)
 *  - Traffic (graphs/traffic)
 *  - Commits (graphs/commit-activity)
 *  - Code frequency (graphs/code-frequency)
 *  - Dependency graph (network/dependencies)
 *  - Network (network)
 *  - Forks (network/members)
 *
 * Note: it's impossible to precisely match the minimum set of relevant urls.
 * So, a simple pattern is chosen, content_scripts.matches = "https://github.com/*"
 *
 * See https://developer.chrome.com/extensions/match_patterns
 *
 * Regular expressions will narrow the scope, and extract repository id.
 */
var insightPageUrlPattern = new RegExp("https://github.com/([^/]+)/([^/]+)/(pulse|graphs/contributors|community|graphs/traffic|graphs/commit-activity|graphs/code-frequency|network/dependencies|network|network/members)");

/*
 * Punchcard will be served as a replacement of the 404 page for Chrome.
 */
var punchcardUrlPattern = new RegExp("https://github.com/([^/]+)/([^/]+)/graphs/punchcard");

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {

	/*
	 * https://stackoverflow.com/questions/2149917/chrome-extensions-how-to-know-when-a-tab-has-finished-loading-from-the-backgr
	 */
	if (!changeInfo.status) {
		return;
	}

	chrome.tabs.get(tabId, function(tab) {

		g = tab.url.match(insightPageUrlPattern);
		if (g) {
			chrome.tabs.sendMessage(tabId, {
				action: "insert-menu",
				user: g[1],
				repo: g[2],
			}, function(response) {
				if (response) {
					console.log(tab.url);
					console.log(response);
				} else {
					console.log(chrome.runtime.lastError);
				}
			});
			return;
		}

		/*
		 * Here are some ideas tested and abandoned.
		 *  - chrome.webRequest cannot be used to modified http response. Neither is redirect desirable as it changes url.
		 *  - a 404 page cannot be stopped from loading using the technique found here,
		 *    https://stackoverflow.com/questions/26119027/chrome-extension-stop-loading-the-page-on-launch
		 *  - impossible to intercept an http request (to a 404 page, graphs/punchcard) with service worker
		 *    because both https and same origin required.
		 *    And, it's impossible to serve service workers from CDN/remote origin,
		 *    https://github.com/w3c/ServiceWorker/issues/940
		 */
		g = tab.url.match(punchcardUrlPattern);
		if (g) {
			/*
			 * For punch card graph, which is a 404 page, load sample page (/pulse) as early as possible
			 * (by setting content_scripts.run_at = "document_start", and content script caching sample page in sessionStorage)
			 */
			chrome.tabs.sendMessage(tabId, {
				action: "render-graph",
				user: g[1],
				repo: g[2],
			}, function(response) {
				if (response) {
					console.log(tab.url);
					console.log(response);
				} else {
					console.log(chrome.runtime.lastError);
				}
			});
		}
	});
});

/*
 * https://developer.chrome.com/apps/runtime#method-sendMessage
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	sendResponse("message received by background");
});
