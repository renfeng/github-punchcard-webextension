document.querySelector("#token").onclick = function() {

	var tokenTab = null;
	var tokenAction = null;
	var currentTab = null;

	chrome.tabs.getCurrent(function(tab){
		currentTab = tab.id;
	});

	/*
	 * https://stackoverflow.com/questions/16503879/chrome-extension-how-to-open-a-link-in-new-tab
	 */
	chrome.tabs.create({
		url: "https://github.com/settings/tokens/new"
	}, function(tab) {
		console.log(tab);
		tokenTab = tab.id;
		tokenAction = "generate-token";
	});

	chrome.tabs.onUpdated.addListener(function(tabId , info) {
		if (tokenTab != tabId) {
			return;
		}

		/*
		 * https://stackoverflow.com/questions/2149917/chrome-extensions-how-to-know-when-a-tab-has-finished-loading-from-the-backgr
		 */
		if (info.status != chrome.tabs.TabStatus.COMPLETE) {
			return;
		}

		chrome.tabs.get(tabId, function(tab) {
			console.log(tab.url);
			if (tab.url == "https://github.com/settings/tokens/new" &&
					tokenAction == "generate-token") {
				chrome.tabs.sendMessage(tabId, {
					action: "generate-token",
				}, function(response) {
					if (response) {
						console.log(response);
						tokenAction = response.action;
					} else {
						console.log(chrome.runtime.lastError);
					}
				});
			} else if (tab.url == "https://github.com/settings/tokens" &&
					tokenAction == "copy-token") {
				chrome.tabs.sendMessage(tabId, {
					action: "copy-token",
				}, function(response) {
					if (response) {
						console.log(response);

						if (!response.error) {
							/*
							 * auto close login page, and not enabling sync button
							 */
							delete tokenTab;
							delete tokenAction;
							chrome.tabs.remove(tabId);

							/*
							 * https://stackoverflow.com/questions/25225964/is-there-a-way-to-focus-on-a-specific-tab-in-chrome-via-plugin
							 */
							chrome.tabs.update(currentTab, { active: true });
							document.querySelector("#message").hidden = false;
							document.querySelector("#message").innerText = "Token generated.";
						} else {
							document.querySelector("#message").hidden = false;
							document.querySelector("#message").innerText = response.error + " - click here to find more.";
							document.querySelector("#message").onclick = function() {
								/*
								 * TODO cancel the click (prompt) when the tab is closed
								 */
								chrome.tabs.update(tabId, { active: true });
								return false;
							};
						}
					} else {
						console.log(chrome.runtime.lastError);
					}
				});
			}
		});
	});
	return false;
}
