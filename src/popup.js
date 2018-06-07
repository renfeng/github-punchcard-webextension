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
 * https://developer.chrome.com/extensions/tabs#method-getCurrent
 * May be undefined if called from a non-tab context (for example: a background page or popup view).
 */
//chrome.tabs.getCurrent(function(tab){
/*
 * https://stackoverflow.com/questions/13359421/chrome-extension-get-current-tab-from-popup
 */
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
	var tab = tabs[0];
	console.log("popup");
//	console.log(tab);
	var urlPattern1 = new RegExp("^https://github.com/([^/]+)/([^/#]+)");
	var g = tab.url.match(urlPattern1);
	if (g) {
		var user = g[1];
		var repo = g[2];

		if (user == "settings") {
			document.querySelector("#msg-invalid").hidden = false;
		} else {
			/*
			 * get information on current tab
			 * valid - is it a valid github repository
			 * private - is it private
			 * user - current authenticated username
			 */
			chrome.tabs.sendMessage(tab.id, {
			}, function(response) {
				if (response) {
					//console.log(response);
					if (response.img404) {
						document.querySelector("#parallax_error_text").src = response.img404;
						document.querySelector("#parallax_error_text").hidden = false;
					} else if (response.disabled) {
						document.querySelector("#msg").innerText = "This repository has been disabled.";
					} else {
						var promise = Promise.resolve();
						if (response.private) {
							promise = new Promise(function(resolve, reject) {
								chrome.storage.sync.get(["token"], function(result) {
									if (result) {
										console.log("Value currently is " + result.token);
										//var token = "ff51dfc5b95cd64800b39fe17fae787f8c6bea34";
										var token = result.token;
										resolve("Basic " + btoa(response.user + ":" + token));
									} else {
										var isFirefox = typeof InstallTrigger !== 'undefined';
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
						}).then(function() {
							document.body.classList.add("punchcard");
						}).catch(function(message) {
							/*
							 * https://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values
							 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout
							 */
							//var maxDelay = 2147483647;

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
