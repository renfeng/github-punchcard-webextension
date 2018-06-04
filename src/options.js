document.querySelector("#token").onclick = function() {

	var tokenTab = null;
	var tokenGuide = null;
	var currentTab = null;

	chrome.tabs.getCurrent(function(tab){
		currentTab = tab.id;
	});

	/*
	 * https://stackoverflow.com/questions/16503879/chrome-extension-how-to-open-a-link-in-new-tab
	 */
	chrome.tabs.create({url: "https://github.com/settings/tokens/new"}, function(tab) {
		console.log(tab);
		tokenTab = tab.id;
		tokenGuide = "generate";
	});

	/*
	 * https://stackoverflow.com/questions/2149917/chrome-extensions-how-to-know-when-a-tab-has-finished-loading-from-the-backgr
	 */
	chrome.tabs.onUpdated.addListener(function(tabId , info) {
		if (tokenTab === tabId && info.status === "complete") {
			chrome.tabs.get(tabId, function(tab) {
				console.log(tab.url);
				if (tab.url === "https://github.com/settings/tokens/new" &&
						tokenGuide == "generate") {
					chrome.tabs.sendMessage(tabId, {
						tokenGuide: tokenGuide,
					}, function(response) {
						if (response) {
							console.log(response);
							tokenGuide = "copy";
						} else {
							console.log(chrome.runtime.lastError);
						}
					});
				} else if (tab.url === "https://github.com/settings/tokens" &&
						tokenGuide == "copy") {
					chrome.tabs.sendMessage(tabId, {
						tokenGuide: tokenGuide,
					}, function(response) {
						if (response) {
							console.log(response);

							if (!response.error) {
								/*
								 * auto close login page, and not enabling sync button
								 */
								delete tokenTab;
								delete tokenGuide;
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
		}
	});
	return false;
}
