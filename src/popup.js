/*
 * https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769
 */
var isFirefox = typeof InstallTrigger != 'undefined';

/*
 * https://stackoverflow.com/questions/5039875/debug-popup-html-of-a-chrome-extension
 */
document.querySelector("#diagnose").onclick = function() {
	/*
	 * https://stackoverflow.com/questions/6782391/programmatically-open-a-chrome-plugins-options-html-page
	 */
	chrome.runtime.openOptionsPage();
	return false;
}

/*
 * https://stackoverflow.com/questions/13359421/chrome-extension-get-current-tab-from-popup
 *
 * chrome.tabs.getCurrent() may return undefined if called from a
 * non-tab context (for example: a background page or popup view).
 * https://developer.chrome.com/extensions/tabs#method-getCurrent
 */
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
	var tab = tabs[0];
	var urlPattern1 = new RegExp("^https://github.com/([^/]+)/([^/#]+)");
	var g = tab.url.match(urlPattern1);
	if (g) {
		var user = g[1];
		var repo = g[2];

		if (user == "settings") {
			document.querySelector("#msg-invalid").hidden = false;
		} else {
			/*
			 * ask content script to get information about the page
			 *  - valid - is it a valid github repository
			 *  - private - is it private
			 *  - user - current authenticated username
			 */
			chrome.tabs.sendMessage(tab.id, {
				action: "probe"
			}, function(response) {
				if (response) {
					if (response.img404) {
						document.querySelector("#parallax_error_text").src = response.img404;
						document.querySelector("#parallax_error_text").hidden = false;
					} else if (response.disabled) {
						document.querySelector("#msg").innerText = "This repository has been disabled.";
					} else {
						var promise = Promise.resolve();
						/*
						 * TODO use token for 403 (Forbidden)
						 */
						if (response.private) {
							promise = new Promise(function(resolve, reject) {
								chrome.storage.sync.get(["token"], function(result) {
									if (result) {
										console.log("Value currently is " + result.token);
										resolve("Basic " + btoa(response.user + ":" + result.token));
									} else {
										if (isFirefox) {
											reject("Please set webextensions.storage.sync.enabled to true in about:config");
										}
									}
								});
							});
						}
						promise.then(function(authorization) {
							return new PunchCard(authorization).load(user, repo)
							.then(function(punchCard) {
								return punchCard.render(document.querySelector("#container"));
							});
						}).catch(function(message) {
							/*
							 * Requests that require authentication will return 404 Not Found
							 * https://developer.github.com/v3/#authentication
							 *
							 * Authenticating with invalid credentials will return 401 Unauthorized
							 * https://developer.github.com/v3/#failed-login-limit
							 */
							if (response.private && message == "404 (Not Found)") {
								document.querySelector("#msg").innerText = "This is a private repository. A personal access token is required.";
								document.querySelector("#diagnose").hidden = false;
							} else if (response.private && message == "401 (Unauthorized)") {
								document.querySelector("#msg").innerText = "This is a private repository. The personal access token acquired has been revoked.";
								document.querySelector("#diagnose").hidden = false;
							} else if (message == "204 (No Content)" && document.querySelector(".repository-content")
									.innerText.startsWith("This repository is empty.")) {
								document.querySelector("#msg").innerText = "This repository is empty.";
							} else {
								document.querySelector("#msg").innerText = message;
								document.querySelector("#msg-feedback").hidden = false;
							}
						});
					}
				} else {
					console.log(chrome.runtime.lastError);
					if (chrome.runtime.lastError.message == "Could not establish connection. Receiving end does not exist.") {
						document.querySelector("#refresh").onclick = function() {
							/*
							 * https://stackoverflow.com/questions/8342756/chrome-extension-api-for-refreshing-the-page
							 */
							chrome.tabs.executeScript(tab.id, {code: "location.reload();"});
						};
						document.querySelector("#msg-refresh").hidden = false;
					} else {
						document.querySelector("#msg").innerText = chrome.runtime.lastError.message;
						document.querySelector("#msg-feedback").hidden = false;
					}
				}
			});
		}
	} else {
		document.querySelector("#msg-invalid").hidden = false;
	}
});
