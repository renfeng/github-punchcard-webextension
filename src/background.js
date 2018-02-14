chrome.browserAction.onClicked.addListener(function(activeTab) {
	/*
	 * https://stackoverflow.com/questions/6782391/programmatically-open-a-chrome-plugins-options-html-page
	 */
	//chrome.runtime.openOptionsPage();
});

var urlPattern1 = new RegExp("https://github.com/([^/]+)/([^/]+)/(pulse|graphs/contributors|community|graphs/traffic|graphs/commit-activity|graphs/code-frequency|network/dependencies|network|network/members)");
var urlPattern2 = new RegExp("https://github.com/([^/]+)/([^/]+)/graphs/punchcard");

/*
 * https://stackoverflow.com/questions/2149917/chrome-extensions-how-to-know-when-a-tab-has-finished-loading-from-the-backgr
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
	if (changeInfo.status != chrome.tabs.TabStatus.COMPLETE) {
		return;
	}

	console.log(tabId);
	console.log(changeInfo);

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
				 * won't reach here if the link is canceled
				 */
				/*
				 * https://stackoverflow.com/questions/26119027/chrome-extension-stop-loading-the-page-on-launch
				 * cannot stop a 404 page any more
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

/*
 * not possible to modify response
 * not possible for service worker (with both https and same origin required), either
 */
/*
 * As this function uses a blocking event handler, it requires the "webRequest" as well as the "webRequestBlocking"
 * permission in the manifest file. - https://developer.chrome.com/extensions/webRequest
 */
chrome.webRequest.onBeforeRequest.addListener(function(details) {
	console.log(details);
//	console.log("canceling");
//	return {
//		cancel: true,
//	};
	g = details.url.match(urlPattern2);
	if (g) {
		/*
		 * won't reach here if the link is canceled
		 */
		console.log("redirecting");
		return {
			/*
			 * https://stackoverflow.com/questions/6373117/how-to-get-my-extensions-id-from-javascript
			 */
			redirectUrl: "chrome-extension://" + chrome.runtime.id + "/options.html#" + g[1] + "/" + g[2],
		};
	}
}, {
	urls: ["https://github.com/*/*/graphs/punchcard"]
}, [
	"blocking"
]);
