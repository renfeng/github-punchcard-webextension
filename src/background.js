chrome.browserAction.onClicked.addListener(function(activeTab) {
	/*
	 * https://stackoverflow.com/questions/6782391/programmatically-open-a-chrome-plugins-options-html-page
	 */
	chrome.runtime.openOptionsPage();
});

var urlPattern1 = new RegExp("https://github.com/([^/]+)/([^/]+)/(pulse|graphs/contributors|community|graphs/traffic|graphs/commit-activity|graphs/code-frequency|network/dependencies|network|network/members)");
var urlPattern2 = new RegExp("https://github.com/([^/]+)/([^/]+)/graphs/punchcard");

/*
 * https://stackoverflow.com/questions/2149917/chrome-extensions-how-to-know-when-a-tab-has-finished-loading-from-the-backgr
 */
chrome.tabs.onUpdated.addListener(function(tabId, info) {
	console.log(tabId);
	console.log(info);
	chrome.tabs.get(tabId, function(tab) {
		var g = tab.url.match(urlPattern1);
		if (g) {
			chrome.tabs.sendMessage(tabId, {
				user: g[1],
				repo: g[2],
				page: g[3],
			});
		} else {
			g = tab.url.match(urlPattern2);
			if (g) {
				/*
				 * https://stackoverflow.com/questions/26119027/chrome-extension-stop-loading-the-page-on-launch
				 */
				chrome.tabs.executeScript(tabId, {
					code: "window.stop();",
					runAt: "document_start"
				});
				chrome.tabs.sendMessage(tabId, {
					user: g[1],
					repo: g[2],
				});
			}
		}
	});
});

//chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
//	console.log("message received by background");
//	sendResponse();
////	return true;
//});
