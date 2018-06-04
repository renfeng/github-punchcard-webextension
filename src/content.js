/*
 * https://stackoverflow.com/questions/17377337/where-to-find-extensions-installed-folder-for-google-chrome-on-mac
 */

function inject(authorization, user, repo, page, graph) {

	var promise = Promise.resolve();
	if (page == "graphs/punchcard") {
		graph = true;
		document.head.innerHTML = "";
		document.body.innerHTML = "";

		promise = fetch("https://github.com/" + user + "/" + repo + "/pulse", {
			credentials: "include"
		}).then(function(response) {
			if (response.status === 200 || response.status === 0) {
				return Promise.resolve(response.text());
			} else {
				return Promise.reject(response.status + " (" + response.statusText + ")");
			}
		}).then(function(text) {
			/*
			 * extracts outerHTML of <head> and <body>
			 * https://regex101.com/r/BUTjaW/3
			 */

			document.head.innerHTML = text.match(/<head\b[^>]*>((?:.*\n)+.*)<\/head>/)[1]
				/*
				 * Lookbehind assertions (bug 1225665) aren't yet supported in Firefox.
				 * https://bugzilla.mozilla.org/show_bug.cgi?id=1425763
				 */
				//.replace(/(?<=<title>).*(?= · .*<\/title>)/, "Punchcard")
				.replace(/<title>.* · .*<\/title>/, "<title>Punchcard · " + user + "/" + repo + " · GitHub</title>")

				.replace(/<link rel="icon" type="image\/x-icon" class="js-site-favicon" href="https:\/\/assets-cdn\.github\.com\/favicon\.ico">/, "")

				/*
				 * doens't work with firefox due to csp won't be refreshed.
				 */
				.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "");

			document.body.innerHTML = text.match(/<body\b[^>]*>((?:.*\n)+.*)<\/body>/)[1];

			return Promise.resolve(self);
		}).catch(function(error) {
			if (error instanceof TypeError) {
				return Promise.reject(error.stack);
			} else {
				return Promise.reject(error);
			}
		});
	}

	promise.then(function() {
		var x = document.evaluate("//a[text()='Punchcard']", document, null, XPathResult.ANY_TYPE, null);
		if (x.iterateNext()) {
			/*
			 * Punchcard menu added
			 */
			console.log("skipped existing");
		} else {
			/*
			 * Add Punchcard menu above Code frequency
			 */

			/*
			 * https://stackoverflow.com/questions/37098405/javascript-queryselector-find-div-by-innertext
			 */
			x = document.evaluate("//a[text()='Code frequency']", document, null, XPathResult.ANY_TYPE, null);
			var a = x.iterateNext();
			if (!a) {
				console.warn("insertion point, Code frequency, not found");
			} else {
				console.log("Code frequency located");

				var b = a.cloneNode();
				b.innerText = "Punchcard";
				b.href = a.href.replace("code-frequency", "punchcard").replace("https://github.com", "");
				b.setAttribute("data-selected-links", a.getAttribute("data-selected-links").replace("code-frequency", "punchcard"));

				b.onclick = function() {
					if (!serviceWorker) {
						try {
							inject(authorization, user, repo, page, true);
						} finally {
							/*
							 * cancels the link to prevent http 404
							 * the only drawback is the url won't change to graphs/punchcard
							 *
							 * it is not supported by firefox to load and replace 404 page
							 * https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769
							 */
							var isFirefox = typeof InstallTrigger !== 'undefined';
							if (isFirefox) {
								return false;
							}
						}
					}
				}
				a.parentElement.insertBefore(b, a);
			}
		}

		if (graph) {
			var a = document.querySelector("a.selected");
			while (a != null) {
				/*
				 * https://stackoverflow.com/questions/2155737/remove-css-class-from-element-with-javascript-no-jquery
				 */
				a.classList.remove("selected");
				a = document.querySelector("a.selected");
			}

			/*
			 * https://stackoverflow.com/questions/38399089/ignoring-case-sensitiveness-in-queryselectorall
			 */
			var b = document.querySelector("a[href='/" + user + "/" + repo + "/" + "graphs/punchcard" + "' i]");
			b.classList.add("selected");

			new PunchCard(authorization).load(user, repo)
			.then(function(punchCard) {
				var c = document.querySelector("div.column.three-fourths");
				if (c) {
					punchCard.render(c);
				} else {
					console.error("container not found: div.column.three-fourths");
				}
			}).catch(function(e) {
				console.log(e);
			});
		}
	});
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponseCallback) {
	console.log("message received by content");
	//console.log(document.readyState);

	try {
		var img404 = document.querySelector("img[alt='404 “This is not the web page you are looking for”']");
		var private = document.body.innerText.match(/\bPrivate\b/) != null;
		var disabled = document.body.innerText.indexOf("This repository has been disabled.") != -1;
		var user = document.querySelector("strong.css-truncate-target");
		var error = null;

		if (message.tokenGuide == "generate") {
			var isChrome = !!window.chrome && !!window.chrome.webstore;
			if (isChrome) {
				document.querySelector("#oauth_access_description").value = "Github Punchcard Web Extension for Chrome";
			} else {
				var isFirefox = typeof InstallTrigger !== 'undefined';
				if (isFirefox) {
					document.querySelector("#oauth_access_description").value = "Github Punchcard Web Extension for Firefox";
				}
			}
			if (!document.querySelector("#oauth_access_scopes_repo").checked) {
				document.querySelector("#oauth_access_scopes_repo").click();
			}
			var x = document.evaluate("//button[text()='Generate token']", document, null, XPathResult.ANY_TYPE, null);
			var b = x.iterateNext();
			b.click();
		} else if (message.tokenGuide == "copy") {
			var token = document.querySelector("#new-oauth-token");
			if (token) {
				chrome.storage.sync.set({token: token.innerText}, function() {
					console.log("Value is set to " + token.innerText);
				});
			} else {
				var e = document.querySelector("dd.error");
				if (e) {
					error = e.innerText;
				} else {
					error = "Unknown error. A clue is probably available on the page.";
				}
			}
		} else if (message.user && message.repo) {
			inject(message.authorization, message.user, message.repo, message.page);
		}
		sendResponseCallback({
			img404: img404,
			private: private,
			disabled: disabled,
			user: user&&user.innerText,
			error: error,
		});
	} catch (error) {
		sendResponseCallback({
			error: error,
		});
	}
});

//chrome.runtime.sendMessage({}, function(response) {
//	if (response) {
//		console.log(response);
//	} else if (chrome.runtime.lastError) {
//		console.log(chrome.runtime.lastError);
//	}
//});

/*
 * It is impossible to intercept an http request (to a 404 page, graphs/punchcard) with service worker
 * (both https and same origin required)
 *
 * Uncaught (in promise) DOMException: Failed to register a ServiceWorker: The origin of the provided scriptURL ('chrome-extension://iddokbfjdfnbmljmiilblmfnlibmjhhn') does not match the current origin ('https://github.com').
 *
 * Is it possible to serve service workers from CDN/remote origin?
 * No. See https://github.com/w3c/ServiceWorker/issues/940
 */
var serviceWorker = false;
//if (navigator.serviceWorker) {
//	navigator.serviceWorker.register("chrome-extension://" + chrome.runtime.id + "/sw.js").then(function() {
//		serviceWorker = true;
//	});
//}
