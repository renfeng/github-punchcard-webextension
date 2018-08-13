/*
 * https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769
 */
var isFirefox = typeof InstallTrigger != 'undefined';

function insertMenu(user, repo) {
	/*
	 * https://stackoverflow.com/questions/37098405/javascript-queryselector-find-div-by-innertext
	 */
	var x = document.evaluate("//a[text()='Punchcard']", document, null, XPathResult.ANY_TYPE, null);
	if (x.iterateNext()) {
		console.log("Skipped as Punchcard menu exists");
		return;
	}

	/*
	 * Add Punchcard menu above Code frequency
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

		/*
		 * Firefox doesn't support loading and replacing a 404 page.
		 * So, cancel the click to prevent it.
		 * The only drawback is the url won't change to graphs/punchcard
		 * to reflect the content of the page, a punch card graph.
		 */
		if (isFirefox) {
			b.onclick = function() {
				renderGraph(user, repo);
				return false;
			}
		}
		a.parentElement.insertBefore(b, a);
	}
}

function renderGraph(user, repo) {

	var private = document.body.innerText.match(/\bPrivate\b/) != null;
	var disabled = document.body.innerText.indexOf("This repository has been disabled.") != -1;
	var login = document.querySelector("strong.css-truncate-target");

	/*
	 * TODO use token for 403 (Forbidden)
{
  "message": "API rate limit exceeded for 46.101.82.23. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)",
  "documentation_url": "https://developer.github.com/v3/#rate-limiting"
}
	 */
	var promise;
	if (private) {
		promise = new Promise(function(resolve, reject) {
			chrome.storage.sync.get(["token"], function(result) {
				if (result) {
					console.log("Value currently is " + result.token);
					var token = result.token;
					resolve("Basic " + btoa(login.innerText + ":" + token));
				} else {
					if (isFirefox) {
						reject("Please set webextensions.storage.sync.enabled to true in about:config");
					} else {
						reject("Cannot get stored token");
					}
				}
			});
		});
	} else {
		promise = Promise.resolve();
	}

	promise.then(function(authorization) {
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

		var c = document.querySelector("div.column.three-fourths");
		if (c) {
			/*
			 * https://stackoverflow.com/questions/3955229/remove-all-child-elements-of-a-dom-node-in-javascript
			 */
			while (c.firstChild) {
				c.removeChild(c.firstChild);
			}

			return new PunchCard(authorization).load(user, repo)
			.then(function(punchCard) {
				return punchCard.render(c);
			}).catch(function(message) {
				/*
				 * TODO test this block
				 */
				var private = document.body.innerText.match(/\bPrivate\b/) != null;
				if (private && (message == "404 (Not Found)" || message == "401 (Unauthorized)")) {
					var p = document.createElement("p");
					p.innerText = message;
					c.appendChild(p);

					/*
					 * TODO link to open options page
					 * https://stackoverflow.com/questions/3418043/link-from-content-script-to-options-page
					 */
					var a = document.createElement("a");
					a.href = chrome.extension.getURL("options.html");
//					a.onclick = function() {
//						window.open(chrome.extension.getURL("options.html"));
//					};
					a.target = a.href;
					a.innerText = "Why?";
					c.appendChild(a);
				}
			});
		} else {
			return Promise.reject("container not found: div.column.three-fourths");
		}
	}).catch(function(error) {
		/*
		 * TODO present error message as toast which will display until dismissed by user
		 * https://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values
		 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout
		 */
		//var maxDelay = 2147483647;
		console.error(error);
	});
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponseCallback) {
	console.log("message received by content script");

	var response;

	try {
		if (message.action == "generate-token") {
			if (document.querySelector("#sudo_password")) {
				response = {
					action: "generate-token"
				};
			} else {
				var step1 = document.querySelector("#oauth_access_description");
				step1.value = "Github Punchcard Web Extension for " + (isFirefox ? "Firefox" : "Chrome");
				step1.setAttribute("data-intro", "The description is for you to easily recognize what this token will be used for.");
				step1.setAttribute("data-step", 1);

				var step2 = document.querySelector("#oauth_access_scopes_repo");
				if (!step2.checked) {
					step2.click();
				}
				step2.setAttribute("data-intro", "Access to private repositories is the minimum scope required.");
				step2.setAttribute("data-step", 2);

				var x = document.evaluate("//button[text()='Generate token']", document, null, XPathResult.ANY_TYPE, null);
				var step3 = x.iterateNext();
				step3.setAttribute("data-intro", "Click the button when you're ready.");
				step3.setAttribute("data-step", 3);

				introJs().start();

				response = {
					action: "copy-token"
				};
			}
		} else if (message.action == "copy-token") {
			var token = document.querySelector("#new-oauth-token");
			if (token) {
				chrome.storage.sync.set({token: token.innerText}, function() {
					console.log("Token copied");
				});
				response = "copy-token: copying";
			} else {
				var e = document.querySelector("dd.error");
				if (e) {
					response = e.innerText;
				} else {
					response = "Unknown error. A clue is probably available on the page.";
				}
			}
		} else if (message.action == "insert-menu") {
			if (document.readyState == "loading") {
				response = "insert-menu: document is loading. Will try again, later.";
			} else {
				insertMenu(message.user, message.repo);
				response = "insert-menu: done";
			}
		} else if (message.action == "render-graph") {
			var page = JSON.parse(sessionStorage.getItem("page"));
			if (page) {
				if (document.readyState == "loading") {
					response = "render-graph: document is loading. Will try again, later.";
				} else {
					document.head.innerHTML = page.head;
					document.body.innerHTML = page.body;
					insertMenu(message.user, message.repo);
					renderGraph(message.user, message.repo);

					response = "render-graph: rendering";
				}
			} else if (document.readyState == "loading") {
				var user = message.user;
				var repo = message.repo;
				fetch("https://github.com/" + user + "/" + repo + "/pulse", {
					credentials: "include"
				}).then(function(response) {
					if (response.status == 200 || response.status == 0) {
						return Promise.resolve(response.text());
					} else {
						return Promise.reject(response.status + " (" + response.statusText + ")");
					}
				}).then(function(text) {
					/*
					 * extracts outerHTML of <head> and <body>
					 * https://regex101.com/r/BUTjaW/3
					 */
					var head = text.match(/<head\b[^>]*>((?:.*\n)+.*)<\/head>/)[1]
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
					var body = text.match(/<body\b[^>]*>((?:.*\n)+.*)<\/body>/)[1];

					page = {
						head: head,
						body: body,
					};
					sessionStorage.setItem("page", JSON.stringify(page));

					document.head.innerHTML = page.head;
					document.body.innerHTML = page.body;
					insertMenu(message.user, message.repo);
					renderGraph(message.user, message.repo);
				});

				response = "render-graph: sample page loading";
			} else {
				response = "render-graph: ignored ready state other than loading";
			}
		} else if (message.action == "probe") {
			var img404 = document.querySelector("img[alt='404 “This is not the web page you are looking for”']");
			var private = document.body.innerText.match(/\bPrivate\b/) != null;
			var disabled = document.body.innerText.indexOf("This repository has been disabled.") != -1;
			var login = document.querySelector("strong.css-truncate-target");

			response = {
				img404: img404 && img404.src,
				private: private,
				disabled: disabled,
				user: login && login.innerText,
			};
		} else {
			response = "unimplemented";
		}
	} catch (error) {
		response = {
			error: error,
		};
	}
	sendResponseCallback(response);
});

/*
 * https://developer.chrome.com/apps/runtime#method-sendMessage
 */
chrome.runtime.sendMessage({}, function(response) {
	if (response) {
		console.log(response);
	} else if (chrome.runtime.lastError) {
		console.log(chrome.runtime.lastError);
	}
});
